import fs from "fs/promises";

import { browserSnapshot, getTextFromUrl } from "../lib/fetch-page.js";
import { mergeWithFallback, validateScrapedPair } from "../lib/extract.js";

const source = {
  key: "ddhq",
  name: "Decision Desk HQ",
  shortName: "DDHQ",
  cookieEnv: "DDHQ_COOKIE",
  preferBrowser: true,
  urls: {
    generic: "https://votes.decisiondeskhq.com/polls/generic-ballot/national/lv-rv-adults",
    approval: "https://votes.decisiondeskhq.com/polls/presidential-approval/donald-j-trump-5/national/lv-rv-adults"
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

function parseNumber(value) {
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function findCandidateValue(blob, candidateLabels) {
  const text = normalizeText(blob);
  const labels = Array.isArray(candidateLabels) ? candidateLabels : [candidateLabels];

  for (const label of labels) {
    const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const labelPattern = `\\b${escaped}\\b`;

    const patterns = [
      // Table text: Democratic 45.30%
      new RegExp(`${labelPattern}\\s+(\\d{1,2}(?:\\.\\d+)?)\\s*%`, "i"),

      // JSON: "candidate":"Democratic"... "average":45.30
      new RegExp(`"${escaped}"[^{}\\[\\]]{0,800}?(?:"average"|"value"|"pct"|"percentage"|"estimate"|"support")\\s*:\\s*"?(-?\\d{1,2}(?:\\.\\d+)?)`, "i"),

      // JSON: "name":"Democratic"... "average":"45.30"
      new RegExp(`(?:"name"|"candidate"|"label"|"choice"|"party")\\s*:\\s*"${escaped}"[^{}\\[\\]]{0,800}?(?:"average"|"value"|"pct"|"percentage"|"estimate"|"support")\\s*:\\s*"?(-?\\d{1,2}(?:\\.\\d+)?)`, "i"),

      // JSON reversed order: "average":45.30 ... "name":"Democratic"
      new RegExp(`(?:"average"|"value"|"pct"|"percentage"|"estimate"|"support")\\s*:\\s*"?(-?\\d{1,2}(?:\\.\\d+)?)"?[^{}\\[\\]]{0,800}(?:"name"|"candidate"|"label"|"choice"|"party")\\s*:\\s*"${escaped}"`, "i")
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);

      if (match) {
        const value = parseNumber(match[1]);

        if (value !== null) {
          return value;
        }
      }
    }
  }

  return null;
}

function extractGenericFromText(text) {
  const blob = normalizeText(text);

  const democrats = findCandidateValue(blob, ["Democratic", "Democrat", "Democrats"]);
  const republicans = findCandidateValue(blob, ["Republican", "Republicans"]);

  return {
    democrats,
    republicans
  };
}

function extractApprovalFromText(text) {
  const blob = normalizeText(text);

  const approve = findCandidateValue(blob, ["Approve"]);
  const disapprove = findCandidateValue(blob, ["Disapprove"]);

  return {
    approve,
    disapprove
  };
}

async function getSnapshotText(url, debugName, waitForText = []) {
  try {
    const snapshot = await browserSnapshot(url, {
      cookie: process.env[source.cookieEnv],
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

async function scrapeGeneric(fallback) {
  try {
    const text = await getSnapshotText(
      source.urls.generic,
      "ddhq-generic",
      ["Democratic", "Republican", "Candidate", "Average"]
    );

    const { democrats, republicans } = extractGenericFromText(text);

    const validation = validateScrapedPair(
      { democrats, republicans },
      fallback,
      {
        firstKey: "democrats",
        secondKey: "republicans",
        minValue: 30,
        maxValue: 65,
        maxGap: 35
      }
    );

    if (validation.ok) {
      console.log(`[DDHQ] Generic ballot table/network scrape worked: D ${democrats} / R ${republicans}`);
    } else {
      console.warn(`[DDHQ] Generic ballot scrape rejected (${validation.reason}). Using fallback.`);
      console.warn("[DDHQ] Debug saved to data/scrape-debug/ddhq-generic.txt");
    }

    return mergeWithFallback({
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.generic,
      democrats: validation.ok ? democrats : null,
      republicans: validation.ok ? republicans : null,
      included: validation.ok,
      scrapeStatus: validation.ok ? "live" : "fallback",
      scrapeNote: validation.ok ? "Validated DDHQ table/network scrape" : `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`${source.name} generic scrape failed. Using fallback:`, error.message);
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
      "ddhq-approval",
      ["Approve", "Disapprove", "Candidate", "Average"]
    );

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
      console.log(`[DDHQ] Trump approval table/network scrape worked: Approve ${approve} / Disapprove ${disapprove}`);
    } else {
      console.warn(`[DDHQ] Trump approval scrape rejected (${validation.reason}). Using fallback.`);
      console.warn("[DDHQ] Debug saved to data/scrape-debug/ddhq-approval.txt");
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
      scrapeNote: validation.ok ? "Validated DDHQ table/network scrape" : `Rejected live scrape: ${validation.reason}`
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

export async function getDDHQData(fallback = {}) {
  return {
    genericBallot: await scrapeGeneric(fallback.genericBallot),
    trumpApproval: await scrapeApproval(fallback.trumpApproval)
  };
}
