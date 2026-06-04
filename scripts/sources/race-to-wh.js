import { browserSnapshot, getTextFromUrl } from "../lib/fetch-page.js";
import { mergeWithFallback, valuesLookUsable } from "../lib/extract.js";
import { saveScrapeDebug } from "../lib/debug.js";

const source = {
  key: "racetowh",
  name: "Race to WH",
  shortName: "Race to WH",
  urls: {
    generic: "https://www.racetothewh.com/polls/genericballot",
    approval: "https://www.racetothewh.com/trump"
  }
};

function normalizeText(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function firstMatchingPair(text, patterns, reverseIndexes = new Set()) {
  const cleanText = normalizeText(text);

  for (let index = 0; index < patterns.length; index += 1) {
    const match = cleanText.match(patterns[index]);

    if (match) {
      const first = Number(match[1]);
      const second = Number(match[2]);

      if (Number.isFinite(first) && Number.isFinite(second)) {
        return reverseIndexes.has(index)
          ? { first: second, second: first }
          : { first, second };
      }
    }
  }

  return { first: null, second: null };
}

function extractGeneric(text) {
  const cleanText = normalizeText(text);

  // Race to WH card currently exposes:
  // Generic D: 48.1% ... Generic R: 41.2%
  const genericLabels = cleanText.match(
    /Generic\s+D\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,500}?Generic\s+R\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (genericLabels) {
    return {
      democrats: Number(genericLabels[1]),
      republicans: Number(genericLabels[2])
    };
  }

  const barLabels = cleanText.match(
    /Race\s+to\s+the\s+White\s+House\s+Polling\s+Average[\s\S]{0,500}?Generic\s+D\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,500}?Generic\s+R\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (barLabels) {
    return {
      democrats: Number(barLabels[1]),
      republicans: Number(barLabels[2])
    };
  }

  const partyLabels = cleanText.match(
    /Democrats?\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,500}?Republicans?\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (partyLabels) {
    return {
      democrats: Number(partyLabels[1]),
      republicans: Number(partyLabels[2])
    };
  }

  return {
    democrats: null,
    republicans: null
  };
}

function extractApproval(text) {
  const patterns = [
    /Approve\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%?.*?Disapprove\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%?/is,
    /Disapprove\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%?.*?Approve\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%?/is
  ];
  const reverseIndexes = new Set([1]);
  const pair = firstMatchingPair(text, patterns, reverseIndexes);

  return {
    approve: pair.first,
    disapprove: pair.second
  };
}

async function scrapeGeneric(fallback) {
  try {
    const text = await getSnapshotText(source.urls.generic, `${source.key}-generic`);
    const values = extractGeneric(text);

    const validation = valuesLookUsable(values, ["democrats", "republicans"], {
      minValue: 30,
      maxValue: 65,
      maxGap: 35
    });

    if (validation.ok) {
      console.log(`[${source.shortName}] Generic ballot live scrape worked: D ${values.democrats} / R ${values.republicans}`);

      return mergeWithFallback({
        key: source.key,
        name: source.name,
        shortName: source.shortName,
        url: source.urls.generic,
        democrats: values.democrats,
        republicans: values.republicans,
        included: true,
        scrapeStatus: "live",
        scrapeNote: "Validated live scrape"
      }, fallback);
    }

    const hasVerifiedFallback =
      fallback &&
      typeof fallback.democrats === "number" &&
      typeof fallback.republicans === "number";

    if (hasVerifiedFallback) {
      console.warn(`[${source.shortName}] Generic live scrape found no usable values. Using fallback: D ${fallback.democrats} / R ${fallback.republicans}.`);
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

    return mergeWithFallback({
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.generic,
      democrats: null,
      republicans: null,
      included: false,
      scrapeStatus: "fallback",
      scrapeNote: `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Generic ballot scrape failed. Using fallback: ${error.message}`);
    return {
      ...fallback,
      scrapeStatus: "fallback",
      scrapeNote: `Live scrape unavailable; using fallback values from manual-overrides.json. Error: ${error.message}`
    };
  }
}

async function scrapeApproval(fallback) {
  try {
    const text = await getSnapshotText(source.urls.approval, `${source.key}-approval`);
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
      scrapeNote: validation.ok ? "Validated live scrape" : `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Trump approval scrape failed. Using fallback: ${error.message}`);
    return { ...fallback, scrapeStatus: "fallback", scrapeNote: `Approval scrape failed: ${error.message}` };
  }
}

export async function getRaceToWHData(fallback = {}) {
  return {
    genericBallot: await scrapeGeneric(fallback.genericBallot),
    trumpApproval: await scrapeApproval(fallback.trumpApproval)
  };
}
