import { getTextFromUrl } from "../lib/fetch-page.js";
import { mergeWithFallback, valuesLookUsable } from "../lib/extract.js";
import { saveScrapeDebug } from "../lib/debug.js";

const source = {
  key: "fiftyplusone",
  name: "FiftyPlusOne",
  shortName: "FiftyPlusOne",
  urls: {
    generic: "https://fiftyplusone.news/polls/generic-ballot/generic-ballot",
    approval: "https://fiftyplusone.news/polls/approval/president"
  }
};

function normalizeText(text) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\u0022/g, '"')
    .replace(/\\u0025/g, "%")
    .replace(/\s+/g, " ")
    .trim();
}

async function getPageText(url, debugName) {
  const text = await getTextFromUrl(url, {
    preferBrowser: false,
    timeout: 35000
  });

  await saveScrapeDebug(debugName, text);
  return text;
}

function extractGeneric(text) {
  const clean = normalizeText(text);

  // Target current summary block:
  // Jun 3, 2026 Democrats +6
  // Democrats 49.4%
  // Republicans 43.5%
  const summary = clean.match(
    /Democrats\s*\+\s*-?\d{1,2}(?:\.\d+)?[\s\S]{0,500}?Democrats\s+(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Republicans\s+(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (summary) {
    return {
      democrats: Number(summary[1]),
      republicans: Number(summary[2])
    };
  }

  const labels = clean.match(
    /Democrats\s+(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Republicans\s+(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (labels) {
    return {
      democrats: Number(labels[1]),
      republicans: Number(labels[2])
    };
  }

  return {
    democrats: null,
    republicans: null
  };
}

function extractApproval(text) {
  const clean = normalizeText(text);

  // Target current summary block:
  // Jun 3, 2026 Disapprove +23
  // Disapprove 59.9%
  // Approve 36.5%
  const disapproveFirst = clean.match(
    /Disapprove\s*\+\s*-?\d{1,2}(?:\.\d+)?[\s\S]{0,500}?Disapprove\s+(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Approve\s+(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (disapproveFirst) {
    return {
      disapprove: Number(disapproveFirst[1]),
      approve: Number(disapproveFirst[2])
    };
  }

  const labels = clean.match(
    /Disapprove\s+(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Approve\s+(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (labels) {
    return {
      disapprove: Number(labels[1]),
      approve: Number(labels[2])
    };
  }

  const approveFirst = clean.match(
    /Approve\s+(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,250}?Disapprove\s+(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (approveFirst) {
    return {
      approve: Number(approveFirst[1]),
      disapprove: Number(approveFirst[2])
    };
  }

  return {
    approve: null,
    disapprove: null
  };
}

async function scrapeGeneric(fallback) {
  try {
    const text = await getPageText(source.urls.generic, `${source.key}-generic`);
    const values = extractGeneric(text);
    const validation = valuesLookUsable(values, ["democrats", "republicans"], {
      minValue: 30,
      maxValue: 65,
      maxGap: 35
    });

    if (validation.ok) {
      console.log(`[${source.shortName}] Generic ballot live scrape worked: D ${values.democrats} / R ${values.republicans}`);
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
      scrapeStatus: validation.ok ? "live" : "fallback",
      scrapeNote: validation.ok ? "Validated FiftyPlusOne public page scrape" : `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Generic ballot scrape failed. Using fallback: ${error.message}`);
    return {
      ...fallback,
      included: false,
      scrapeStatus: "fallback",
      scrapeNote: `Generic scrape failed: ${error.message}`
    };
  }
}

async function scrapeApproval(fallback) {
  try {
    const text = await getPageText(source.urls.approval, `${source.key}-approval`);
    const values = extractApproval(text);
    const validation = valuesLookUsable(values, ["approve", "disapprove"], {
      minValue: 30,
      maxValue: 75,
      maxGap: 45,
      requireSecondHigher: true
    });

    if (validation.ok) {
      console.log(`[${source.shortName}] Trump approval live scrape worked: Approve ${values.approve} / Disapprove ${values.disapprove}`);
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
      scrapeStatus: validation.ok ? "live" : "fallback",
      scrapeNote: validation.ok ? "Validated FiftyPlusOne public page scrape" : `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Trump approval scrape failed. Using fallback: ${error.message}`);
    return {
      ...fallback,
      included: false,
      scrapeStatus: "fallback",
      scrapeNote: `Approval scrape failed: ${error.message}`
    };
  }
}

export async function getFiftyPlusOneData(fallback = {}) {
  return {
    genericBallot: await scrapeGeneric(fallback.genericBallot),
    trumpApproval: await scrapeApproval(fallback.trumpApproval)
  };
}
