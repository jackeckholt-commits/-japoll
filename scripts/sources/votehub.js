import { browserSnapshot, getTextFromUrl } from "../lib/fetch-page.js";
import { mergeWithFallback, valuesLookUsable } from "../lib/extract.js";
import { saveScrapeDebug } from "../lib/debug.js";

const source = {
  key: "votehub",
  name: "VoteHub",
  shortName: "VoteHub",
  urls: {
    generic: "https://votehub.com/polls/?poll=generic_ballot_2026",
    approval: "https://votehub.com/polls/?poll=trump_approval"
  }
};

function normalizeText(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\u0022/g, '"')
    .replace(/\\u0025/g, "%")
    .replace(/\s+/g, " ")
    .trim();
}

async function getSnapshotText(url, debugName, waitForText = []) {
  try {
    const snapshot = await browserSnapshot(url, {
      waitAfterLoad: 9000,
      waitForText,
      waitForTextTimeout: 15000,
      timeout: 35000
    });

    const combined = [
      "=== VISIBLE TEXT ===",
      snapshot.text,
      "=== HTML ===",
      snapshot.html,
      "=== SCRIPTS ===",
      snapshot.scripts,
      "=== NETWORK ===",
      snapshot.networkText
    ].join("\n");

    await saveScrapeDebug(debugName, combined);
    return combined;
  } catch (error) {
    console.warn(`[${source.shortName}] Browser scrape failed for ${url}: ${error.message}`);
    const text = await getTextFromUrl(url, { preferBrowser: false });
    await saveScrapeDebug(debugName, text);
    return text;
  }
}

function extractVoteHubSummaryLabels(text) {
  const raw = String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\u0022/g, '"')
    .replace(/\\u0025/g, "%");

  const values = {};

  // VoteHub exposes the current right-side values in rendered SVG text nodes:
  // <g class="mouse-summary-row" data-series="approve">
  //   <text class="mouse-text fg summary">Approve: 39.5%</text>
  // </g>
  //
  // This avoids accidentally grabbing axis labels, tooltip dots, or path data.
  const textNodePattern =
    /<text[^>]*class=["'][^"']*mouse-text[^"']*summary[^"']*["'][^>]*>\s*([^:<]+?)\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%?\s*<\/text>/gi;

  let match;
  while ((match = textNodePattern.exec(raw)) !== null) {
    const label = match[1].trim().toLowerCase();
    const value = Number(match[2]);

    if (Number.isFinite(value)) {
      values[label] = value;
    }
  }

  return values;
}

function findSummaryValue(summaryValues, labels) {
  for (const label of labels) {
    const normalized = label.toLowerCase();

    if (typeof summaryValues[normalized] === "number") {
      return summaryValues[normalized];
    }
  }

  return null;
}


function extractGeneric(text) {
  const summaryValues = extractVoteHubSummaryLabels(text);
  const summaryDemocrats = findSummaryValue(summaryValues, ["democrats", "democrat"]);
  const summaryRepublicans = findSummaryValue(summaryValues, ["republicans", "republican"]);

  if (summaryDemocrats !== null && summaryRepublicans !== null) {
    return {
      democrats: summaryDemocrats,
      republicans: summaryRepublicans,
      source: "votehub_svg_summary"
    };
  }

  const cleanText = normalizeText(text);

  // Backup: only accept the right-side summary label block, not random chart values.
  // Screenshot target:
  // NOW
  // Democrats +6.7
  // Democrats: 49.0%
  // Republicans: 42.3%
  const nowIndex = cleanText.toLowerCase().lastIndexOf("now");
  const nowBlock = nowIndex >= 0 ? cleanText.slice(nowIndex, nowIndex + 1000) : "";

  const nowDirect = nowBlock.match(
    /Democrats\s*\+?\s*-?\d{1,2}(?:\.\d+)?[\s\S]{0,300}?Democrats\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Republicans\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (nowDirect) {
    return {
      democrats: Number(nowDirect[1]),
      republicans: Number(nowDirect[2]),
      source: "now_label"
    };
  }

  const nowSimple = nowBlock.match(
    /Democrats\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Republicans\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (nowSimple) {
    return {
      democrats: Number(nowSimple[1]),
      republicans: Number(nowSimple[2]),
      source: "now_label"
    };
  }

  const pageDirect = cleanText.match(
    /NOW[\s\S]{0,300}?Democrats\s*\+?\s*-?\d{1,2}(?:\.\d+)?[\s\S]{0,300}?Democrats\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Republicans\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (pageDirect) {
    return {
      democrats: Number(pageDirect[1]),
      republicans: Number(pageDirect[2]),
      source: "now_label"
    };
  }

  return {
    democrats: null,
    republicans: null,
    source: "missing_summary_labels"
  };
}

function extractApproval(text) {
  const summaryValues = extractVoteHubSummaryLabels(text);
  const summaryApprove = findSummaryValue(summaryValues, ["approve"]);
  const summaryDisapprove = findSummaryValue(summaryValues, ["disapprove"]);

  if (summaryApprove !== null && summaryDisapprove !== null) {
    return {
      approve: summaryApprove,
      disapprove: summaryDisapprove,
      source: "votehub_svg_summary"
    };
  }

  const cleanText = normalizeText(text);

  // Backup: only accept the right-side summary label block, not random chart/axis values.
  // Screenshot target:
  // NOW
  // Disapprove +17.8
  // Disapprove: 57.3%
  // Approve: 39.5%
  const nowIndex = cleanText.toLowerCase().lastIndexOf("now");
  const nowBlock = nowIndex >= 0 ? cleanText.slice(nowIndex, nowIndex + 1000) : "";

  const nowDisapproveFirst = nowBlock.match(
    /Disapprove\s*\+?\s*-?\d{1,2}(?:\.\d+)?[\s\S]{0,300}?Disapprove\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Approve\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (nowDisapproveFirst) {
    return {
      approve: Number(nowDisapproveFirst[2]),
      disapprove: Number(nowDisapproveFirst[1]),
      source: "now_label"
    };
  }

  const nowSimpleDisapproveFirst = nowBlock.match(
    /Disapprove\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Approve\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (nowSimpleDisapproveFirst) {
    return {
      approve: Number(nowSimpleDisapproveFirst[2]),
      disapprove: Number(nowSimpleDisapproveFirst[1]),
      source: "now_label"
    };
  }

  const nowApproveFirst = nowBlock.match(
    /Approve\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Disapprove\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (nowApproveFirst) {
    return {
      approve: Number(nowApproveFirst[1]),
      disapprove: Number(nowApproveFirst[2]),
      source: "now_label"
    };
  }

  const pageDirect = cleanText.match(
    /NOW[\s\S]{0,300}?Disapprove\s*\+?\s*-?\d{1,2}(?:\.\d+)?[\s\S]{0,300}?Disapprove\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Approve\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (pageDirect) {
    return {
      approve: Number(pageDirect[2]),
      disapprove: Number(pageDirect[1]),
      source: "now_label"
    };
  }

  return {
    approve: null,
    disapprove: null,
    source: "missing_summary_labels"
  };
}

async function scrapeGeneric(fallback) {
  try {
    const text = await getSnapshotText(
      source.urls.generic,
      `${source.key}-generic`,
      ["Democrats", "Republicans", "generic congressional ballot"]
    );

    const values = extractGeneric(text);

    const validation = valuesLookUsable(values, ["democrats", "republicans"], {
      minValue: 30,
      maxValue: 65,
      maxGap: 35
    });

    if (validation.ok) {
      if (values.source === "votehub_svg_summary") {
        console.log(`[${source.shortName}] Generic ballot SVG-summary scrape worked: D ${values.democrats} / R ${values.republicans}`);
      } else {
        console.log(`[${source.shortName}] Generic ballot NOW-label scrape worked: D ${values.democrats} / R ${values.republicans}`);
      }
    } else {
      const hasVerifiedFallback =
        fallback &&
        typeof fallback.democrats === "number" &&
        typeof fallback.republicans === "number";

      if (hasVerifiedFallback) {
        console.warn(`[${source.shortName}] Generic live scrape found no usable current values. Using fallback: D ${fallback.democrats} / R ${fallback.republicans}.`);
        console.warn(`[${source.shortName}] Debug saved to data/scrape-debug/${source.key}-generic.txt`);

        return {
          ...fallback,
          key: source.key,
          name: source.name,
          shortName: source.shortName,
          url: source.urls.generic,
          included: true,
          scrapeStatus: "fallback",
          scrapeNote: "Live scrape unavailable; using fallback values from manual-overrides.json"
        };
      }

      console.warn(`[${source.shortName}] Generic ballot scrape rejected (${validation.reason}). Using fallback.`);
      console.warn(`[${source.shortName}] Debug saved to data/scrape-debug/${source.key}-generic.txt`);
    }

    return mergeWithFallback({
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.generic,
      democrats: validation.ok ? values.democrats : null,
      republicans: validation.ok ? values.republicans : null,
      included: validation.ok,
      scrapeStatus: validation.ok ? "live" : "fallback",
      scrapeNote: validation.ok ? values.source === "votehub_svg_summary" ? "Validated VoteHub SVG summary scrape" : "Validated VoteHub NOW label scrape" : `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Generic ballot scrape failed. Using fallback: ${error.message}`);
    return {
      ...fallback,
      scrapeStatus: "fallback",
      scrapeNote: `Generic scrape failed: ${error.message}`
    };
  }
}

async function scrapeApproval(fallback) {
  try {
    const text = await getSnapshotText(
      source.urls.approval,
      `${source.key}-approval`,
      ["Approve", "Disapprove", "Donald Trump"]
    );

    const values = extractApproval(text);

    const validation = valuesLookUsable(values, ["approve", "disapprove"], {
      minValue: 30,
      maxValue: 75,
      maxGap: 45,
      requireSecondHigher: true
    });

    if (validation.ok) {
      if (values.source === "votehub_svg_summary") {
        console.log(`[${source.shortName}] Trump approval SVG-summary scrape worked: Approve ${values.approve} / Disapprove ${values.disapprove}`);
      } else {
        console.log(`[${source.shortName}] Trump approval NOW-label scrape worked: Approve ${values.approve} / Disapprove ${values.disapprove}`);
      }
    } else {
      const hasVerifiedFallback =
        fallback &&
        typeof fallback.approve === "number" &&
        typeof fallback.disapprove === "number";

      if (hasVerifiedFallback) {
        console.warn(`[${source.shortName}] Approval live scrape found no usable current values. Using fallback: Approve ${fallback.approve} / Disapprove ${fallback.disapprove}.`);
        console.warn(`[${source.shortName}] Debug saved to data/scrape-debug/${source.key}-approval.txt`);

        return {
          ...fallback,
          key: source.key,
          name: source.name,
          shortName: source.shortName,
          url: source.urls.approval,
          included: true,
          scrapeStatus: "fallback",
          scrapeNote: "Live scrape unavailable; using fallback values from manual-overrides.json"
        };
      }

      console.warn(`[${source.shortName}] Trump approval scrape rejected (${validation.reason}). Using fallback.`);
      console.warn(`[${source.shortName}] Debug saved to data/scrape-debug/${source.key}-approval.txt`);
    }

    return mergeWithFallback({
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.approval,
      approve: validation.ok ? values.approve : null,
      disapprove: validation.ok ? values.disapprove : null,
      included: validation.ok,
      scrapeStatus: validation.ok ? "live" : "fallback",
      scrapeNote: validation.ok ? values.source === "votehub_svg_summary" ? "Validated VoteHub SVG summary scrape" : "Validated VoteHub NOW label scrape" : `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Trump approval scrape failed. Using fallback: ${error.message}`);
    return {
      ...fallback,
      scrapeStatus: "fallback",
      scrapeNote: `Approval scrape failed: ${error.message}`
    };
  }
}

export async function getVoteHubData(fallback = {}) {
  return {
    genericBallot: await scrapeGeneric(fallback.genericBallot),
    trumpApproval: await scrapeApproval(fallback.trumpApproval)
  };
}
