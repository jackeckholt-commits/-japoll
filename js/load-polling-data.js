const DEFAULT_GENERIC_ADJUSTMENT = {
  enabled: true,
  party: "D",
  points: 1.6
};

function formatPercent(value) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "N/A";
}

function parseAdjustmentValue(rawValue) {
  if (typeof rawValue === "string") {
    const match = rawValue.trim().match(/^([DR])\s*\+\s*(-?\d+(?:\.\d+)?)$/i);
    if (match) {
      return {
        party: match[1].toUpperCase() === "R" ? "R" : "D",
        points: Number(match[2])
      };
    }
  }

  return null;
}

function getAdjustmentSettings(adjustments) {
  const raw = adjustments && adjustments.genericBallot ? adjustments.genericBallot : {};

  const parsedFromValue = parseAdjustmentValue(raw.value || raw.display || raw.label);
  const enabled = raw.enabled !== false;
  const party = parsedFromValue?.party || (String(raw.party || DEFAULT_GENERIC_ADJUSTMENT.party).toUpperCase() === "R" ? "R" : "D");
  const parsedPoints = parsedFromValue?.points;
  const numericPoints = Number.isFinite(Number(raw.points)) ? Number(raw.points) : parsedPoints;
  const points = Number.isFinite(numericPoints) ? numericPoints : DEFAULT_GENERIC_ADJUSTMENT.points;

  return { enabled, party, points };
}

function getAdjustmentLabel(settings) {
  if (!settings || !settings.enabled || settings.points === 0) {
    return "Algorithm adjustment: none";
  }

  return `Algorithm adjustment: ${settings.party}+${settings.points.toFixed(1)}`;
}

function applyGenericAdjustment(average, settings) {
  const adjusted = {
    democrats: average.democrats,
    republicans: average.republicans
  };

  if (!settings || !settings.enabled || settings.points === 0) {
    return adjusted;
  }

  if (settings.party === "R") {
    adjusted.republicans = Number((adjusted.republicans + settings.points).toFixed(1));
  } else {
    adjusted.democrats = Number((adjusted.democrats + settings.points).toFixed(1));
  }

  return adjusted;
}


function parseDateOnly(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(value) : date;
}

function getRunDate(run) {
  return run && run.date ? run.date : null;
}

function getAverageFromRun(run, type) {
  if (type === "generic" && run.genericBallot && run.genericBallot.average) {
    return run.genericBallot.average;
  }

  if (type === "approval" && run.trumpApproval && run.trumpApproval.average) {
    return run.trumpApproval.average;
  }

  return null;
}

function appendLatestRunIfMissing(runs, data) {
  const latestDate = new Date(data.updatedAt || Date.now()).toISOString().slice(0, 10);
  const nextRuns = Array.isArray(runs) ? [...runs] : [];

  if (!nextRuns.some(run => run.date === latestDate)) {
    const genericAverage = data.genericBallot.average;
    const approvalAverage = data.trumpApproval.average;

    nextRuns.push({
      date: latestDate,
      timestamp: data.updatedAt || new Date().toISOString(),
      estimated: false,
      genericBallot: {
        average: {
          ...genericAverage,
          margin: Number((genericAverage.democrats - genericAverage.republicans).toFixed(1))
        }
      },
      trumpApproval: {
        average: {
          ...approvalAverage,
          net: Number((approvalAverage.approve - approvalAverage.disapprove).toFixed(1))
        }
      }
    });
  }

  return nextRuns.sort((a, b) => parseDateOnly(a.date) - parseDateOnly(b.date));
}

function getSevenDayComparisonRun(runs, latestRun, type) {
  if (!latestRun) return null;

  const latestDate = parseDateOnly(latestRun.date);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const candidates = runs
    .filter(run => run.date !== latestRun.date && getAverageFromRun(run, type))
    .filter(run => {
      const age = latestDate - parseDateOnly(run.date);
      return age > 0 && age <= sevenDaysMs;
    })
    .sort((a, b) => parseDateOnly(a.date) - parseDateOnly(b.date));

  // Use the oldest available point inside the last seven days. This works for daily or every-two-day runs.
  return candidates[0] || null;
}

function formatSignedPoints(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function calculateWeeklyChanges(history, data, adjustmentSettings) {
  const runs = appendLatestRunIfMissing(history && history.runs, data);

  const latestRun = runs[runs.length - 1];
  const genericPastRun = getSevenDayComparisonRun(runs, latestRun, "generic");
  const approvalPastRun = getSevenDayComparisonRun(runs, latestRun, "approval");

  let genericMarginChange = null;
  let approvalNetChange = null;

  if (latestRun && genericPastRun) {
    const latestGeneric = applyGenericAdjustment(latestRun.genericBallot.average, adjustmentSettings);
    const pastGeneric = applyGenericAdjustment(genericPastRun.genericBallot.average, adjustmentSettings);
    const latestMargin = latestGeneric.democrats - latestGeneric.republicans;
    const pastMargin = pastGeneric.democrats - pastGeneric.republicans;
    genericMarginChange = Number((latestMargin - pastMargin).toFixed(1));
  }

  if (latestRun && approvalPastRun) {
    const latestApproval = latestRun.trumpApproval.average;
    const pastApproval = approvalPastRun.trumpApproval.average;
    const latestNet = latestApproval.approve - latestApproval.disapprove;
    const pastNet = pastApproval.approve - pastApproval.disapprove;
    approvalNetChange = Number((latestNet - pastNet).toFixed(1));
  }

  return {
    genericMarginChange,
    approvalNetChange
  };
}

function applyWeeklyChangeText(changes, setText) {
  setText("[data-weekly-label='generic-margin']", "D margin");
  setText("[data-weekly-change='generic-margin']", formatSignedPoints(changes.genericMarginChange));
  setText("[data-weekly-caption='generic-margin']", "Change since last week");

  setText("[data-weekly-label='approval-net']", "Net approval");
  setText("[data-weekly-change='approval-net']", formatSignedPoints(changes.approvalNetChange));
  setText("[data-weekly-caption='approval-net']", "Change since last week");
}

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });

    if (!response.ok) {
      return fallback;
    }

    return await response.json();
  } catch {
    return fallback;
  }
}

async function loadPollingData() {
  const data = await loadJson("data/polling.json", null);

  if (!data) {
    throw new Error("Could not load data/polling.json");
  }

  const adjustments = await loadJson("data/adjustments.json", { genericBallot: DEFAULT_GENERIC_ADJUSTMENT });
  const history = await loadJson("data/polling-history.json", { runs: [] });
  const adjustmentSettings = getAdjustmentSettings(adjustments);
  const adjustedGeneric = applyGenericAdjustment(data.genericBallot.average, adjustmentSettings);
  const adjustmentText = getAdjustmentLabel(adjustmentSettings);

  const setText = (selector, value) => {
    document.querySelectorAll(selector).forEach(element => {
      element.textContent = value;
    });
  };

  const weeklyChanges = calculateWeeklyChanges(history, data, adjustmentSettings);
  applyWeeklyChangeText(weeklyChanges, setText);

  setText("[data-generic-dem]", formatPercent(adjustedGeneric.democrats));
  setText("[data-generic-rep]", formatPercent(adjustedGeneric.republicans));
  setText("[data-trump-approve]", formatPercent(data.trumpApproval.average.approve));
  setText("[data-trump-disapprove]", formatPercent(data.trumpApproval.average.disapprove));
  setText("[data-generic-adjustment]", adjustmentText);

  data.genericBallot.sources.forEach(source => {
    setText(`[data-generic-source="${source.key}"][data-field="democrats"]`, formatPercent(source.democrats));
    setText(`[data-generic-source="${source.key}"][data-field="republicans"]`, formatPercent(source.republicans));

    const margin =
      typeof source.democrats === "number" && typeof source.republicans === "number"
        ? `${Math.abs(source.democrats - source.republicans).toFixed(1)} points`
        : "N/A";

    setText(`[data-generic-source="${source.key}"][data-field="margin"]`, margin);
  });

  data.trumpApproval.sources.forEach(source => {
    setText(`[data-approval-source="${source.key}"][data-field="approve"]`, formatPercent(source.approve));
    setText(`[data-approval-source="${source.key}"][data-field="disapprove"]`, formatPercent(source.disapprove));

    const gap =
      typeof source.approve === "number" && typeof source.disapprove === "number"
        ? `${Math.abs(source.disapprove - source.approve).toFixed(1)} points`
        : "N/A";

    setText(`[data-approval-source="${source.key}"][data-field="gap"]`, gap);
  });

  setText("[data-updated-at]", new Date(data.updatedAt).toLocaleString());
}

loadPollingData().catch(error => {
  console.error("Could not load polling data:", error);
});
