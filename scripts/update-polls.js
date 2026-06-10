import fs from "fs/promises";

import { getVoteHubData } from "./sources/votehub.js";
import { getFiftyPlusOneData } from "./sources/fiftyplusone.js";
import { getRaceToWHData } from "./sources/race-to-wh.js";
import { getCNNData } from "./sources/cnn.js";
import { getSilverData } from "./sources/silver.js";
import { getNYTData } from "./sources/nyt.js";

const sourceOrder = ["votehub", "fiftyplusone", "silver", "cnn", "racetowh", "nyt"];

async function readJson(path) {
  const text = await fs.readFile(path, "utf8");
  return JSON.parse(text);
}

function byKey(items) {
  return Object.fromEntries(items.map(item => [item.key, item]));
}


function sourceCanCountInAverage(item) {
  // Only live scraped data counts in automated averages.
  // Fallback/manual values can remain visible on source cards, but they do not affect the average.
  return item && item.included === true && item.scrapeStatus === "live";
}

function average(items, firstKey, secondKey) {
  const included = items.filter(
    item =>
      sourceCanCountInAverage(item) &&
      typeof item[firstKey] === "number" &&
      typeof item[secondKey] === "number"
  );

  if (included.length === 0) {
    return {
      [firstKey]: null,
      [secondKey]: null
    };
  }

  const first = included.reduce((sum, item) => sum + item[firstKey], 0) / included.length;
  const second = included.reduce((sum, item) => sum + item[secondKey], 0) / included.length;

  return {
    [firstKey]: Number(first.toFixed(1)),
    [secondKey]: Number(second.toFixed(1))
  };
}

function orderSources(items) {
  const map = byKey(items);

  return sourceOrder
    .filter(key => map[key])
    .map(key => map[key])
    .concat(items.filter(item => !sourceOrder.includes(item.key)));
}

async function runSource(label, key, getter, fallback) {
  console.log(`Starting ${label}...`);

  try {
    const result = await getter({
      genericBallot: fallback.genericBallot[key],
      trumpApproval: fallback.trumpApproval[key]
    });

    console.log(`Finished ${label}.`);
    return result;
  } catch (error) {
    console.warn(`${label} failed completely, using manual fallback:`, error.message);

    return {
      genericBallot: fallback.genericBallot[key]
        ? {
            ...fallback.genericBallot[key],
            included: false,
            scrapeStatus: "fallback",
            scrapeNote: `Source failed completely; fallback shown but not counted: ${error.message}`
          }
        : null,
      trumpApproval: fallback.trumpApproval[key]
        ? {
            ...fallback.trumpApproval[key],
            included: false,
            scrapeStatus: "fallback",
            scrapeNote: `Source failed completely; fallback shown but not counted: ${error.message}`
          }
        : null
    };
  }
}


function formatValue(value) {
  return typeof value === "number" ? value.toFixed(1) : "N/A";
}

function sourceStatus(source) {
  if (source.scrapeStatus) {
    return source.scrapeStatus;
  }

  if (source.included === false) {
    return "not included";
  }

  return "unknown";
}

function printGenericSourceSummary(sources) {
  console.log("");
  console.log("Generic ballot source summary:");

  for (const source of sources) {
    const values =
      typeof source.democrats === "number" && typeof source.republicans === "number"
        ? `D ${formatValue(source.democrats)} / R ${formatValue(source.republicans)}`
        : source.note || "No usable values";

    const counted = sourceCanCountInAverage(source) ? "counted" : "not counted";

    console.log(
      `- ${source.name}: ${values} | ${sourceStatus(source)} | ${counted}`
    );
  }
}

function printApprovalSourceSummary(sources) {
  console.log("");
  console.log("Trump approval source summary:");

  for (const source of sources) {
    const values =
      typeof source.approve === "number" && typeof source.disapprove === "number"
        ? `Approve ${formatValue(source.approve)} / Disapprove ${formatValue(source.disapprove)}`
        : source.note || "No usable values";

    const counted = sourceCanCountInAverage(source) ? "counted" : "not counted";

    console.log(
      `- ${source.name}: ${values} | ${sourceStatus(source)} | ${counted}`
    );
  }
}


function roundOne(value) {
  return Number(Number(value).toFixed(1));
}

function dateKeyFromTimestamp(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function summarizeGenericSources(sources) {
  return sources.map(source => ({
    key: source.key,
    democrats: source.democrats,
    republicans: source.republicans,
    included: sourceCanCountInAverage(source),
    status: source.scrapeStatus || null
  }));
}

function summarizeApprovalSources(sources) {
  return sources.map(source => ({
    key: source.key,
    approve: source.approve,
    disapprove: source.disapprove,
    included: sourceCanCountInAverage(source),
    status: source.scrapeStatus || null
  }));
}

function makeHistoryRun(data) {
  const date = dateKeyFromTimestamp(data.updatedAt);
  const genericAverage = data.genericBallot.average;
  const approvalAverage = data.trumpApproval.average;

  return {
    date,
    timestamp: data.updatedAt,
    estimated: false,
    genericBallot: {
      average: {
        democrats: genericAverage.democrats,
        republicans: genericAverage.republicans,
        margin: roundOne(genericAverage.democrats - genericAverage.republicans)
      },
      sources: summarizeGenericSources(data.genericBallot.sources)
    },
    trumpApproval: {
      average: {
        approve: approvalAverage.approve,
        disapprove: approvalAverage.disapprove,
        net: roundOne(approvalAverage.approve - approvalAverage.disapprove)
      },
      sources: summarizeApprovalSources(data.trumpApproval.sources)
    }
  };
}

async function migrateOldHistoryIfNeeded() {
  try {
    return await readJson("data/polling-history.json");
  } catch {
    // Continue and build a new history file.
  }

  let oldHistory = null;

  try {
    oldHistory = await readJson("data/history.json");
  } catch {
    oldHistory = null;
  }

  const runsByDate = new Map();

  if (oldHistory) {
    for (const row of oldHistory.genericBallot || []) {
      if (!row.date) continue;

      const existing = runsByDate.get(row.date) || {
        date: row.date,
        timestamp: `${row.date}T00:00:00.000Z`,
        estimated: true,
        genericBallot: null,
        trumpApproval: null
      };

      existing.genericBallot = {
        average: {
          democrats: row.democrats,
          republicans: row.republicans,
          margin: roundOne(row.democrats - row.republicans)
        },
        sources: []
      };

      runsByDate.set(row.date, existing);
    }

    for (const row of oldHistory.trumpApproval || []) {
      if (!row.date) continue;

      const existing = runsByDate.get(row.date) || {
        date: row.date,
        timestamp: `${row.date}T00:00:00.000Z`,
        estimated: true,
        genericBallot: null,
        trumpApproval: null
      };

      existing.trumpApproval = {
        average: {
          approve: row.approve,
          disapprove: row.disapprove,
          net: roundOne(row.approve - row.disapprove)
        },
        sources: []
      };

      runsByDate.set(row.date, existing);
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    note: "Estimated points before automated collection are carried over from data/history.json. New scraper runs append or replace dated points here.",
    runs: Array.from(runsByDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  };
}

async function updatePollingHistory(data) {
  const history = await migrateOldHistoryIfNeeded();
  const newRun = makeHistoryRun(data);
  const runsByDate = new Map();

  for (const run of history.runs || []) {
    if (run && run.date) {
      runsByDate.set(run.date, run);
    }
  }

  // Replace today's run instead of creating duplicates if the scraper runs twice in one day.
  runsByDate.set(newRun.date, newRun);

  const runs = Array.from(runsByDate.values())
    .filter(run => run.genericBallot || run.trumpApproval)
    .sort((a, b) => a.date.localeCompare(b.date));

  const nextHistory = {
    ...history,
    updatedAt: data.updatedAt,
    runs
  };

  await fs.writeFile("data/polling-history.json", JSON.stringify(nextHistory, null, 2));
  console.log(`Updated data/polling-history.json with ${runs.length} dated points.`);
}

async function main() {
  console.log("Poll tracker updater version 0.8.36");
  console.log("Automatic polling update started.");
  const manual = await readJson("data/manual-overrides.json");

  const fallback = {
    genericBallot: byKey(manual.genericBallot.sources),
    trumpApproval: byKey(manual.trumpApproval.sources)
  };

  const sourceFunctions = [
    ["VoteHub", "votehub", getVoteHubData],
    ["FiftyPlusOne", "fiftyplusone", getFiftyPlusOneData],
    ["Race to WH", "racetowh", getRaceToWHData],
    ["CNN", "cnn", getCNNData],
    ["Silver Bulletin", "silver", getSilverData],
    ["The New York Times", "nyt", getNYTData]
  ];

  const results = [];

  // Run sequentially so one site does not cause multiple browser scrapes to hang at once.
  for (const [label, key, getter] of sourceFunctions) {
    results.push(await runSource(label, key, getter, fallback));
  }

  const genericSources = orderSources(results.map(result => result.genericBallot).filter(Boolean));
  const approvalSources = orderSources(results.map(result => result.trumpApproval).filter(Boolean));

  const data = {
    updatedAt: new Date().toISOString(),
    genericBallot: {
      average: average(genericSources, "democrats", "republicans"),
      sources: genericSources
    },
    trumpApproval: {
      average: average(approvalSources, "approve", "disapprove"),
      sources: approvalSources
    }
  };

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile("data/polling.json", JSON.stringify(data, null, 2));

  console.log("Updated data/polling.json");
  await updatePollingHistory(data);

  printGenericSourceSummary(data.genericBallot.sources);
  printApprovalSourceSummary(data.trumpApproval.sources);
  console.log("Generic ballot average:", data.genericBallot.average);
  console.log("Trump approval average:", data.trumpApproval.average);
  console.log("Polling update complete.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
