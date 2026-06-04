import fs from "fs/promises";

import { browserSnapshot, getTextFromUrl } from "../lib/fetch-page.js";
import { mergeWithFallback, validateScrapedPair } from "../lib/extract.js";

const source = {
  key: "nyt",
  name: "The New York Times",
  shortName: "NYT",
  cookieEnv: "NYT_COOKIE",
  preferBrowser: true,
  urls: {
    generic: "https://www.nytimes.com/interactive/2026/us/elections/polls.html",
    approval: "https://www.nytimes.com/interactive/polls/donald-trump-approval-rating-polls.html"
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

async function writeDebugFile(name, text) {
  try {
    await fs.mkdir("data/scrape-debug", { recursive: true });
    await fs.writeFile(`data/scrape-debug/${name}.txt`, String(text || "").slice(0, 250000), "utf8");
  } catch {
    // Debug output should never break scraping.
  }
}

function extractApprovalFromText(text) {
  const cleanText = normalizeText(text);

  // Current NYT visible text exposes chart labels as:
  // June 3 38% Approve Approve 58% Disapprove Disapprove
  const percentApproveFirst = cleanText.match(
    /(\d{1,2}(?:\.\d+)?)\s*%\s*Approve\b.*?(\d{1,2}(?:\.\d+)?)\s*%\s*Disapprove\b/i
  );

  if (percentApproveFirst) {
    return {
      approve: Number(percentApproveFirst[1]),
      disapprove: Number(percentApproveFirst[2])
    };
  }

  const percentDisapproveFirst = cleanText.match(
    /(\d{1,2}(?:\.\d+)?)\s*%\s*Disapprove\b.*?(\d{1,2}(?:\.\d+)?)\s*%\s*Approve\b/i
  );

  if (percentDisapproveFirst) {
    return {
      approve: Number(percentDisapproveFirst[2]),
      disapprove: Number(percentDisapproveFirst[1])
    };
  }

  const disapproveFirst = cleanText.match(
    /Disapprove\s+(\d{1,2}(?:\.\d+)?)\s*%.*?Approve\s+(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (disapproveFirst) {
    return {
      approve: Number(disapproveFirst[2]),
      disapprove: Number(disapproveFirst[1])
    };
  }

  const approveFirst = cleanText.match(
    /Approve\s+(\d{1,2}(?:\.\d+)?)\s*%.*?Disapprove\s+(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (approveFirst) {
    return {
      approve: Number(approveFirst[1]),
      disapprove: Number(approveFirst[2])
    };
  }

  const articleText = cleanText.match(
    /(\d{1,2})\s+percent\s+of\s+Americans\s+approve.*?(\d{1,2})\s+percent\s+disapprove/i
  );

  if (articleText) {
    return {
      approve: Number(articleText[1]),
      disapprove: Number(articleText[2])
    };
  }

  return {
    approve: null,
    disapprove: null
  };
}

async function getSnapshotText(url, debugName) {
  try {
    const snapshot = await browserSnapshot(url, {
      cookie: process.env[source.cookieEnv],
      waitAfterLoad: 9000,
      waitForText: ["Approve", "Disapprove"],
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

    await writeDebugFile(debugName, combined);

    return combined;
  } catch (error) {
    console.warn(`${source.name} browser scrape failed for ${url}:`, error.message);

    const text = await getTextFromUrl(url, {
      cookie: process.env[source.cookieEnv],
      preferBrowser: false
    });

    await writeDebugFile(debugName, text);

    return text;
  }
}

async function scrapeApproval(fallback) {
  try {
    const text = await getSnapshotText(source.urls.approval, "nyt-approval");
    const { approve, disapprove } = extractApprovalFromText(text);

    const validation = validateScrapedPair(
      { approve, disapprove },
      fallback,
      {
        firstKey: "approve",
        secondKey: "disapprove",
        minValue: 34,
        maxValue: 75,
        maxGap: 45,
        requireSecondHigher: true
      }
    );

    if (validation.ok) {
      console.log(`[NYT] Trump approval chart/network scrape worked: Approve ${approve} / Disapprove ${disapprove}`);
    } else {
      console.warn(`[NYT] Trump approval scrape rejected (${validation.reason}). Using fallback.`);
      console.warn("[NYT] Debug saved to data/scrape-debug/nyt-approval.txt");
    }

    return mergeWithFallback({
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.approval,
      approve: validation.ok ? approve : null,
      disapprove: validation.ok ? disapprove : null,
      included: validation.ok,
      scrapeStatus: validation.ok ? "live" : "fallback",
      scrapeNote: validation.ok ? "Validated NYT chart/network scrape" : `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`${source.name} approval scrape failed. Using fallback:`, error.message);
    return {
      ...fallback,
      scrapeStatus: "fallback",
      scrapeNote: `Approval scrape failed: ${error.message}`
    };
  }
}

export async function getNYTData(fallback = {}) {
  return {
    genericBallot: {
      ...fallback.genericBallot,
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.generic,
      included: false,
      note: "No national generic ballot average available",
      scrapeStatus: "not_applicable"
    },
    trumpApproval: await scrapeApproval(fallback.trumpApproval)
  };
}
