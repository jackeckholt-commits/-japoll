import { browserSnapshot, getTextFromUrl } from "../lib/fetch-page.js";
import { mergeWithFallback, valuesLookUsable } from "../lib/extract.js";
import { saveScrapeDebug } from "../lib/debug.js";

const source = {
  key: "silver",
  name: "Silver Bulletin",
  shortName: "Silver",
  urls: {
    generic: "https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls",
    approval: "https://www.natesilver.net/p/trump-approval-ratings-nate-silver-bulletin",
    genericDatawrappers: [
      "https://datawrapper.dwcdn.net/rfiFi/31/",
      "https://datawrapper.dwcdn.net/sEHv2/34/"
    ],
    approvalDatawrappers: [
      "https://datawrapper.dwcdn.net/kSCt4/349/"
    ]
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

function numberFrom(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

async function getSnapshotText(url, debugName) {
  try {
    const snapshot = await browserSnapshot(url, {
      waitAfterLoad: 8000,
      waitForTextTimeout: 12000,
      timeout: 32000
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

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      out.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  out.push(current.trim());
  return out;
}

function parseLatestCsvPair(text, firstHeaderPattern, secondHeaderPattern) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const header = splitCsvLine(lines[0]);
  const firstIndex = header.findIndex(item => firstHeaderPattern.test(item));
  const secondIndex = header.findIndex(item => secondHeaderPattern.test(item));

  if (firstIndex === -1 || secondIndex === -1) {
    return null;
  }

  for (let i = lines.length - 1; i >= 1; i -= 1) {
    const row = splitCsvLine(lines[i]);
    const first = numberFrom(row[firstIndex]);
    const second = numberFrom(row[secondIndex]);

    if (first !== null && second !== null) {
      return {
        first,
        second
      };
    }
  }

  return null;
}

async function fetchDatawrapperBundle(baseUrls, debugName) {
  const urls = Array.isArray(baseUrls) ? baseUrls : [baseUrls];
  const parts = [];

  for (const baseUrl of urls) {
    const trimmed = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const candidates = [
      `${trimmed}data.csv`,
      `${trimmed}dataset.csv`,
      `${trimmed}data.json`,
      `${trimmed}dataset.json`,
      `${trimmed}data`,
      trimmed
    ];

    for (const url of candidates) {
      try {
        const response = await fetch(url, {
          headers: {
            "user-agent": "Mozilla/5.0 poll-tracker/0.5.38",
            "accept": "text/csv,application/json,text/plain,text/html,*/*"
          }
        });

        if (!response.ok) {
          continue;
        }

        const text = await response.text();

        if (text && text.trim().length > 20) {
          parts.push(`=== DATAWRAPPER ${url} ===\n${text}`);
        }
      } catch {
        // Try the next common Datawrapper data URL.
      }
    }
  }

  const combined = parts.join("\n\n---DATAWRAPPER SOURCE BREAK---\n\n");
  if (combined) {
    await saveScrapeDebug(`${debugName}-datawrapper`, combined);
  }

  return combined;
}


async function fetchDatawrapperRenderedBundle(baseUrls, debugName) {
  const urls = Array.isArray(baseUrls) ? baseUrls : [baseUrls];
  const parts = [];

  for (const baseUrl of urls) {
    const url = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

    try {
      const snapshot = await browserSnapshot(url, {
        waitAfterLoad: 9000,
        waitForText: ["Democrats", "Republicans", "Approve", "Disapprove"],
        waitForTextTimeout: 12000,
        timeout: 35000
      });

      const combined = [
        `=== RENDERED DATAWRAPPER ${url} TEXT ===`,
        snapshot.text,
        `=== RENDERED DATAWRAPPER ${url} HTML ===`,
        snapshot.html,
        `=== RENDERED DATAWRAPPER ${url} SCRIPTS ===`,
        snapshot.scripts,
        `=== RENDERED DATAWRAPPER ${url} NETWORK ===`,
        snapshot.networkText
      ].join("\n");

      parts.push(combined);
    } catch (error) {
      parts.push(`=== RENDERED DATAWRAPPER ${url} ERROR ===\n${error.message}`);
    }
  }

  const combined = parts.join("\n\n---RENDERED DATAWRAPPER SOURCE BREAK---\n\n");

  if (combined) {
    await saveScrapeDebug(`${debugName}-datawrapper-rendered`, combined);
  }

  return combined;
}

function extractGenericFromDatawrapper(text) {
  const cleanText = normalizeText(text);

  // Rendered Datawrapper iframe DOM exposes pairs like:
  // <div class="series-label label">Democrats</div>
  // <div class="value-label label last"><span>48.6%</span></div>
  // and the same for Republicans.
  const domDemocrat = cleanText.match(
    /\bDemocrats\b[\s\S]{0,300}?(\d{1,2}(?:\.\d+)?)\s*%/i
  );
  const domRepublican = cleanText.match(
    /\bRepublicans\b[\s\S]{0,300}?(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (domDemocrat && domRepublican) {
    return {
      democrats: Number(domDemocrat[1]),
      republicans: Number(domRepublican[1]),
      source: "rendered_datawrapper_labels"
    };
  }

  const csvPair = parseLatestCsvPair(text, /democrat/i, /republican/i);

  if (csvPair) {
    return {
      democrats: csvPair.first,
      republicans: csvPair.second,
      source: "datawrapper"
    };
  }

  const labels = cleanText.match(
    /Democrats?\s+(\d{1,2}(?:\.\d+)?)\s*%?[\s\S]{0,400}?Republicans?\s+(\d{1,2}(?:\.\d+)?)\s*%?/i
  );

  if (labels) {
    return {
      democrats: Number(labels[1]),
      republicans: Number(labels[2]),
      source: "datawrapper"
    };
  }

  const chartLabelMatch = cleanText.match(
    /\bDemocrats\b\s*(\d{1,2}(?:\.\d+)?)\s*%?[\s\S]{0,500}?\bRepublicans\b\s*(\d{1,2}(?:\.\d+)?)\s*%?/i
  );

  if (chartLabelMatch) {
    return {
      democrats: Number(chartLabelMatch[1]),
      republicans: Number(chartLabelMatch[2]),
      source: "datawrapper"
    };
  }

  return null;
}

function extractApprovalFromDatawrapper(text) {
  const cleanText = normalizeText(text);

  const domApprove = cleanText.match(
    /\bApprove\b[\s\S]{0,300}?(\d{1,2}(?:\.\d+)?)\s*%/i
  );
  const domDisapprove = cleanText.match(
    /\bDisapprove\b[\s\S]{0,300}?(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (domApprove && domDisapprove) {
    return {
      approve: Number(domApprove[1]),
      disapprove: Number(domDisapprove[1]),
      source: "rendered_datawrapper_labels"
    };
  }

  const csvPair = parseLatestCsvPair(text, /^approve$|approval/i, /^disapprove$|disapproval/i);

  if (csvPair) {
    return {
      approve: csvPair.first,
      disapprove: csvPair.second,
      source: "datawrapper"
    };
  }

  const labels = cleanText.match(
    /Approve\s+(\d{1,2}(?:\.\d+)?)\s*%?[\s\S]{0,400}?Disapprove\s+(\d{1,2}(?:\.\d+)?)\s*%?/i
  );

  if (labels) {
    return {
      approve: Number(labels[1]),
      disapprove: Number(labels[2]),
      source: "datawrapper"
    };
  }

  const reverseLabels = cleanText.match(
    /Disapprove\s+(\d{1,2}(?:\.\d+)?)\s*%?[\s\S]{0,400}?Approve\s+(\d{1,2}(?:\.\d+)?)\s*%?/i
  );

  if (reverseLabels) {
    return {
      approve: Number(reverseLabels[2]),
      disapprove: Number(reverseLabels[1]),
      source: "datawrapper"
    };
  }

  return null;
}

function extractGenericFromChartLabels(text) {
  const cleanText = normalizeText(text);

  // Preferred when the Datawrapper/SVG chart exposes the end labels:
  // Democrats 48.6% ... Republicans 41.8%
  const demFirst = cleanText.match(
    /\bDemocrats\b\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,300}?\bRepublicans\b\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (demFirst) {
    return {
      democrats: Number(demFirst[1]),
      republicans: Number(demFirst[2]),
      source: "chart_labels"
    };
  }

  const repFirst = cleanText.match(
    /\bRepublicans\b\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,300}?\bDemocrats\b\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (repFirst) {
    return {
      democrats: Number(repFirst[2]),
      republicans: Number(repFirst[1]),
      source: "chart_labels"
    };
  }

  // Handles compact SVG/HTML text such as:
  // Democrats48.6% Republicans41.8%
  const compactDemFirst = cleanText.match(
    /\bDemocrats\b\s*(\d{1,2}(?:\.\d+)?)\s*%?\s+\bRepublicans\b\s*(\d{1,2}(?:\.\d+)?)\s*%?/i
  );

  if (compactDemFirst) {
    return {
      democrats: Number(compactDemFirst[1]),
      republicans: Number(compactDemFirst[2]),
      source: "chart_labels"
    };
  }

  return null;
}

function deriveGenericFromPublicText(text) {
  const cleanText = normalizeText(text);

  // Silver Bulletin public update text currently says something like:
  // "They began the month with 42.3 percent support in our average,
  // compared to 41.6 percent today. Our generic ballot margin is up to D +6.9."
  //
  // That lets us calculate:
  // Republicans = 41.6
  // Democrats = 41.6 + 6.9 = 48.5
  const latestGenericText = cleanText.match(
    /Republicans[\s\S]{0,500}?began the month with\s+(\d{1,2}(?:\.\d+)?)\s+percent support in our average,\s+compared to\s+(\d{1,2}(?:\.\d+)?)\s+percent today[\s\S]{0,500}?generic ballot margin is up to\s+([DR])\s*\+?\s*(\d{1,2}(?:\.\d+)?)/i
  );

  if (latestGenericText) {
    const todayValue = Number(latestGenericText[2]);
    const marginParty = latestGenericText[3].toUpperCase();
    const margin = Number(latestGenericText[4]);

    if (marginParty === "D") {
      return {
        democrats: Number((todayValue + margin).toFixed(1)),
        republicans: todayValue,
        source: "derived_public_text"
      };
    }

    return {
      democrats: todayValue,
      republicans: Number((todayValue + margin).toFixed(1)),
      source: "derived_public_text"
    };
  }

  // More flexible backup pattern for the same idea.
  const todayAndMargin = cleanText.match(
    /compared to\s+(\d{1,2}(?:\.\d+)?)\s+percent today[\s\S]{0,500}?generic ballot margin is up to\s+([DR])\s*\+?\s*(\d{1,2}(?:\.\d+)?)/i
  );

  if (todayAndMargin) {
    const todayValue = Number(todayAndMargin[1]);
    const marginParty = todayAndMargin[2].toUpperCase();
    const margin = Number(todayAndMargin[3]);

    if (marginParty === "D") {
      return {
        democrats: Number((todayValue + margin).toFixed(1)),
        republicans: todayValue,
        source: "derived_public_text"
      };
    }

    return {
      democrats: todayValue,
      republicans: Number((todayValue + margin).toFixed(1)),
      source: "derived_public_text"
    };
  }

  return null;
}

function deriveApprovalFromPublicText(text) {
  const cleanText = normalizeText(text);
  const netMatch = cleanText.match(/net approval rating is sitting at\s+(-?\d{1,2}(?:\.\d+)?)/i);
  const approveParts = cleanText.match(
    /Just\s+(\d{1,2}(?:\.\d+)?)\s+percent\s+strongly approve[\s\S]{0,200}?another\s+(\d{1,2}(?:\.\d+)?)\s+percent\s+only somewhat approve/i
  );

  if (netMatch && approveParts) {
    const net = Number(netMatch[1]);
    const approve = Number((Number(approveParts[1]) + Number(approveParts[2])).toFixed(1));
    const disapprove = Number((approve - net).toFixed(1));

    return {
      approve,
      disapprove,
      source: "derived_public_text"
    };
  }

  return null;
}

function extractGeneric(text, datawrapperText) {
  return (
    extractGenericFromDatawrapper(datawrapperText) ||
    extractGenericFromDatawrapper(text) ||
    extractGenericFromChartLabels(text) ||
    deriveGenericFromPublicText(text) ||
    { democrats: null, republicans: null, source: "none" }
  );
}

function extractApproval(text, datawrapperText) {
  return (
    extractApprovalFromDatawrapper(datawrapperText) ||
    extractApprovalFromDatawrapper(text) ||
    deriveApprovalFromPublicText(text) ||
    { approve: null, disapprove: null, source: "none" }
  );
}

function statusFromSource(extractionSource) {
  if (extractionSource === "datawrapper" || extractionSource === "rendered_datawrapper_labels") {
    return "live";
  }

  if (extractionSource === "chart_labels") {
    return "chart_labels";
  }

  if (extractionSource === "derived_public_text") {
    return "derived_public_text";
  }

  return "fallback";
}

async function scrapeGeneric(fallback) {
  try {
    const text = await getSnapshotText(source.urls.generic, `${source.key}-generic`);
    const datawrapperText = await fetchDatawrapperBundle(source.urls.genericDatawrappers, `${source.key}-generic`);
    const datawrapperRenderedText = await fetchDatawrapperRenderedBundle(source.urls.genericDatawrappers, `${source.key}-generic`);
    const values = extractGeneric(text, `${datawrapperText}\n${datawrapperRenderedText}`);

    const validation = valuesLookUsable(values, ["democrats", "republicans"], {
      minValue: 30,
      maxValue: 65,
      maxGap: 35
    });

    const scrapeStatus = validation.ok ? statusFromSource(values.source) : "fallback";
    const note =
      values.source === "rendered_datawrapper_labels"
        ? "Read from rendered Silver Bulletin Datawrapper iframe labels"
        : values.source === "datawrapper"
          ? "Read from Silver Bulletin Datawrapper chart data"
          : values.source === "chart_labels"
          ? "Read from visible Silver Bulletin chart-end labels"
          : values.source === "derived_public_text"
            ? "Derived from Silver Bulletin top update text: Republicans today plus the stated generic-ballot margin"
            : `Rejected live scrape: ${validation.reason}`;

    if (validation.ok) {
      console.log(`[${source.shortName}] Generic ballot ${scrapeStatus} worked: D ${values.democrats} / R ${values.republicans}`);
      if (values.source === "rendered_datawrapper_labels") {
        console.log(`[${source.shortName}] Read generic ballot from rendered Datawrapper iframe labels.`);
      }
      if (values.source === "chart_labels") {
        console.log(`[${source.shortName}] Read generic ballot from visible chart labels.`);
      }
      if (values.source === "derived_public_text") {
        console.log(`[${source.shortName}] Derived generic ballot from top update text: Republicans today + D margin.`);
      }
    } else {
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
      scrapeStatus,
      scrapeNote: note
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Generic ballot scrape failed. Using fallback: ${error.message}`);
    return { ...fallback, scrapeStatus: "fallback", scrapeNote: `Generic scrape failed: ${error.message}` };
  }
}

async function scrapeApproval(fallback) {
  try {
    const text = await getSnapshotText(source.urls.approval, `${source.key}-approval`);
    const datawrapperText = await fetchDatawrapperBundle(source.urls.approvalDatawrappers, `${source.key}-approval`);
    const datawrapperRenderedText = await fetchDatawrapperRenderedBundle(source.urls.approvalDatawrappers, `${source.key}-approval`);
    const values = extractApproval(text, `${datawrapperText}\n${datawrapperRenderedText}`);

    const validation = valuesLookUsable(values, ["approve", "disapprove"], {
      minValue: 30,
      maxValue: 75,
      maxGap: 45,
      requireSecondHigher: true
    });

    const scrapeStatus = validation.ok ? statusFromSource(values.source) : "fallback";
    const note =
      values.source === "rendered_datawrapper_labels"
        ? "Read from rendered Silver Bulletin Datawrapper iframe labels"
        : values.source === "datawrapper"
          ? "Read from Silver Bulletin Datawrapper chart data"
          : values.source === "derived_public_text"
          ? "Derived from public Silver Bulletin text: strong+somewhat approve and net approval"
          : `Rejected live scrape: ${validation.reason}`;

    if (validation.ok) {
      console.log(`[${source.shortName}] Trump approval ${scrapeStatus} worked: Approve ${values.approve} / Disapprove ${values.disapprove}`);
    } else {
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
      scrapeStatus,
      scrapeNote: note
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Trump approval scrape failed. Using fallback: ${error.message}`);
    return { ...fallback, scrapeStatus: "fallback", scrapeNote: `Approval scrape failed: ${error.message}` };
  }
}

export async function getSilverData(fallback = {}) {
  return {
    genericBallot: await scrapeGeneric(fallback.genericBallot),
    trumpApproval: await scrapeApproval(fallback.trumpApproval)
  };
}
