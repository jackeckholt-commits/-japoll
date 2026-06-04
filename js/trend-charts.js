function parseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(value) : date;
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatMonth(value) {
  return parseDate(value).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit"
  });
}

function formatPercent(value) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "N/A";
}

function getAdjustmentSettings(adjustments) {
  const raw = adjustments && adjustments.genericBallot ? adjustments.genericBallot : {};
  const enabled = raw.enabled !== false;
  const party = String(raw.party || "D").toUpperCase() === "R" ? "R" : "D";
  const points = Number(raw.points);

  return {
    enabled,
    party,
    points: Number.isFinite(points) ? points : 0
  };
}

function applyGenericAdjustmentToRow(row, settings) {
  const adjusted = { ...row };

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

function makeSvgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function makePath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function getNearestPoint(points, mouseX) {
  return points.reduce((nearest, point) => {
    if (!nearest) return point;
    return Math.abs(point.x - mouseX) < Math.abs(nearest.x - mouseX) ? point : nearest;
  }, null);
}

function renderLegend(legend, config, rows) {
  legend.innerHTML = config.series.map(series => {
    const latest = rows[rows.length - 1][series.key];

    return `
      <div class="trend-legend-item">
        <span class="legend-dot ${series.className}"></span>
        <div>
          <strong>${series.label}</strong>
          <em>${formatPercent(latest)}</em>
        </div>
      </div>
    `;
  }).join("");
}

function renderHoverPanel(panel, config, row) {
  panel.innerHTML = `
    <strong>${formatDate(row.date)}</strong>
    <div class="hover-value-list">
      ${config.series.map(series => `
        <span>
          <i class="${series.className}"></i>
          ${series.label}: ${formatPercent(row[series.key])}
        </span>
      `).join("")}
    </div>
  `;
}

function getCollectionStartRow(rows) {
  const index = rows.findIndex(row => row.estimated === false);

  return index > 0 ? rows[index] : null;
}

function getCollectionPanelPrompt(collectionStartRow) {
  return collectionStartRow
    ? "Dotted line marks when live data collection began. Hover over the chart to see values."
    : "Hover over the chart to see values.";
}

function renderTrendChart(container, config, rows) {
  const collectionStartRow = getCollectionStartRow(rows);
  const panelPrompt = getCollectionPanelPrompt(collectionStartRow);

  container.innerHTML = `
    <div class="trend-chart-shell">
      <div class="trend-svg-box"></div>
      <aside class="trend-legend"></aside>
      <div class="trend-hover-panel">${panelPrompt}</div>
    </div>
  `;

  const svgBox = container.querySelector(".trend-svg-box");
  const legend = container.querySelector(".trend-legend");
  const panel = container.querySelector(".trend-hover-panel");

  renderLegend(legend, config, rows);

  const width = 980;
  const height = 430;
  const margin = { top: 34, right: 28, bottom: 66, left: 68 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const dates = rows.map(row => parseDate(row.date));
  const minDate = new Date(Math.min(...dates.map(date => date.getTime())));
  const maxDate = new Date(Math.max(...dates.map(date => date.getTime())));

  const allValues = rows.flatMap(row => config.series.map(series => row[series.key]));
  const minValue = Math.floor((Math.min(...allValues) - 2) / 5) * 5;
  const maxValue = Math.ceil((Math.max(...allValues) + 2) / 5) * 5;

  const xScale = date => {
    const range = maxDate.getTime() - minDate.getTime();
    return range === 0
      ? margin.left
      : margin.left + ((date.getTime() - minDate.getTime()) / range) * plotWidth;
  };

  const yScale = value => margin.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;

  const svg = makeSvgElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": config.title,
    preserveAspectRatio: "xMidYMid meet"
  });

  svg.appendChild(makeSvgElement("rect", {
    x: margin.left,
    y: margin.top,
    width: plotWidth,
    height: plotHeight,
    class: "trend-plot-background"
  }));

  const grid = makeSvgElement("g", { class: "trend-grid" });

  for (let value = minValue; value <= maxValue; value += 5) {
    const y = yScale(value);

    grid.appendChild(makeSvgElement("line", {
      x1: margin.left,
      x2: width - margin.right,
      y1: y,
      y2: y
    }));

    const label = makeSvgElement("text", {
      x: margin.left - 14,
      y: y + 5,
      "text-anchor": "end"
    });
    label.textContent = `${value}%`;
    grid.appendChild(label);
  }

  svg.appendChild(grid);

  const monthIndexes = [0, Math.floor(rows.length / 3), Math.floor((rows.length / 3) * 2), rows.length - 1];
  const seenIndexes = new Set();

  monthIndexes.forEach(index => {
    if (seenIndexes.has(index) || !rows[index]) return;
    seenIndexes.add(index);

    const label = makeSvgElement("text", {
      x: xScale(parseDate(rows[index].date)),
      y: height - 24,
      "text-anchor": "middle",
      class: "trend-axis-label"
    });
    label.textContent = formatMonth(rows[index].date);
    svg.appendChild(label);
  });

  if (collectionStartRow) {
    const x = xScale(parseDate(collectionStartRow.date));
    const labelFitsRight = x < width - 220;
    const labelX = labelFitsRight ? x + 12 : x - 12;
    const textAnchor = labelFitsRight ? "start" : "end";

    const marker = makeSvgElement("g", { class: "trend-collection-start" });

    marker.appendChild(makeSvgElement("line", {
      x1: x,
      x2: x,
      y1: margin.top,
      y2: margin.top + plotHeight,
      class: "trend-collection-start-line"
    }));

    const label = makeSvgElement("text", {
      x: labelX,
      y: margin.top + 18,
      "text-anchor": textAnchor,
      class: "trend-collection-start-label"
    });
    label.textContent = "Live data begins";
    marker.appendChild(label);

    const dateLabel = makeSvgElement("text", {
      x: labelX,
      y: margin.top + 38,
      "text-anchor": textAnchor,
      class: "trend-collection-start-date"
    });
    dateLabel.textContent = formatDate(collectionStartRow.date);
    marker.appendChild(dateLabel);

    svg.appendChild(marker);
  }

  const seriesPoints = config.series.map(series => {
    const points = rows.map(row => ({
      date: row.date,
      value: row[series.key],
      x: xScale(parseDate(row.date)),
      y: yScale(row[series.key])
    }));

    svg.appendChild(makeSvgElement("path", {
      d: makePath(points),
      class: `trend-line ${series.className}`
    }));

    points.forEach(point => {
      svg.appendChild(makeSvgElement("circle", {
        cx: point.x,
        cy: point.y,
        r: 4,
        class: `trend-point ${series.className}`
      }));
    });

    return { series, points };
  });

  const hoverDots = config.series.map(series => {
    const dot = makeSvgElement("circle", {
      r: 6,
      class: `trend-hover-dot ${series.className}`
    });
    dot.style.opacity = "0";
    svg.appendChild(dot);
    return dot;
  });

  const overlay = makeSvgElement("rect", {
    x: margin.left,
    y: margin.top,
    width: plotWidth,
    height: plotHeight,
    fill: "transparent"
  });

  svg.appendChild(overlay);
  svgBox.appendChild(svg);

  overlay.addEventListener("mousemove", event => {
    const rect = svg.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * width;

    const datePoints = rows.map(row => ({
      ...row,
      x: xScale(parseDate(row.date))
    }));

    const nearest = getNearestPoint(datePoints, mouseX);
    const x = xScale(parseDate(nearest.date));

    hoverDots.forEach((dot, index) => {
      const series = config.series[index];
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", yScale(nearest[series.key]));
      dot.style.opacity = "1";
    });

    renderHoverPanel(panel, config, nearest);
  });

  overlay.addEventListener("mouseleave", () => {
    hoverDots.forEach(dot => dot.style.opacity = "0");
    panel.innerHTML = panelPrompt;
  });
}

function rowFromHistoryRun(run, type) {
  if (type === "generic" && run.genericBallot && run.genericBallot.average) {
    return {
      date: run.date,
      estimated: run.estimated === true,
      democrats: run.genericBallot.average.democrats,
      republicans: run.genericBallot.average.republicans
    };
  }

  if (type === "approval" && run.trumpApproval && run.trumpApproval.average) {
    return {
      date: run.date,
      estimated: run.estimated === true,
      approve: run.trumpApproval.average.approve,
      disapprove: run.trumpApproval.average.disapprove
    };
  }

  return null;
}

function rowsFromLegacyHistory(history, polling, type) {
  const today = new Date(polling.updatedAt || Date.now()).toISOString().slice(0, 10);

  if (type === "generic") {
    const rows = [...(history.genericBallot || [])];

    if (!rows.some(row => row.date === today)) {
      rows.push({
        date: today,
        estimated: false,
        democrats: polling.genericBallot.average.democrats,
        republicans: polling.genericBallot.average.republicans
      });
    }

    return rows;
  }

  const rows = [...(history.trumpApproval || [])];

  if (!rows.some(row => row.date === today)) {
    rows.push({
      date: today,
      approve: polling.trumpApproval.average.approve,
      disapprove: polling.trumpApproval.average.disapprove
    });
  }

  return rows;
}

function rowsFromPollingHistory(history, polling, type) {
  const runs = Array.isArray(history.runs) ? history.runs : [];

  if (!runs.length) {
    return rowsFromLegacyHistory({}, polling, type);
  }

  const rows = runs
    .map(run => rowFromHistoryRun(run, type))
    .filter(Boolean);

  const today = new Date(polling.updatedAt || Date.now()).toISOString().slice(0, 10);

  // If polling.json is newer than the history file for any reason, still show the latest point.
  if (!rows.some(row => row.date === today)) {
    if (type === "generic") {
      rows.push({
        date: today,
        estimated: false,
        democrats: polling.genericBallot.average.democrats,
        republicans: polling.genericBallot.average.republicans
      });
    } else {
      rows.push({
        date: today,
        estimated: false,
        approve: polling.trumpApproval.average.approve,
        disapprove: polling.trumpApproval.average.disapprove
      });
    }
  }

  return rows.sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

async function loadHistoryData() {
  const pollingHistory = await fetch("data/polling-history.json", { cache: "no-store" }).catch(() => null);

  if (pollingHistory && pollingHistory.ok) {
    return {
      type: "polling-history",
      data: await pollingHistory.json()
    };
  }

  const legacyHistory = await fetch("data/history.json", { cache: "no-store" });

  return {
    type: "legacy",
    data: await legacyHistory.json()
  };
}

async function loadTrendCharts() {
  const chartElements = document.querySelectorAll("[data-trend-chart]");
  if (!chartElements.length) return;

  const [historyResult, pollingResponse, adjustmentsResponse] = await Promise.all([
    loadHistoryData(),
    fetch("data/polling.json", { cache: "no-store" }),
    fetch("data/adjustments.json", { cache: "no-store" }).catch(() => null)
  ]);

  const history = historyResult.data;
  const polling = await pollingResponse.json();
  const adjustments = adjustmentsResponse && adjustmentsResponse.ok ? await adjustmentsResponse.json() : {};
  const genericAdjustment = getAdjustmentSettings(adjustments);

  const genericRows =
    historyResult.type === "polling-history"
      ? rowsFromPollingHistory(history, polling, "generic")
      : rowsFromLegacyHistory(history, polling, "generic");

  const approvalRows =
    historyResult.type === "polling-history"
      ? rowsFromPollingHistory(history, polling, "approval")
      : rowsFromLegacyHistory(history, polling, "approval");

  const adjustedGenericRows = genericRows.map(row => applyGenericAdjustmentToRow(row, genericAdjustment));

  chartElements.forEach(element => {
    const type = element.dataset.trendChart;

    if (type === "generic") {
      renderTrendChart(element, {
        title: "Generic congressional ballot trend",
        series: [
          { key: "democrats", label: "Democrats", className: "blue-line" },
          { key: "republicans", label: "Republicans", className: "red-line" }
        ]
      }, adjustedGenericRows);
    }

    if (type === "approval") {
      renderTrendChart(element, {
        title: "Trump approval trend",
        series: [
          { key: "approve", label: "Approve", className: "red-line" },
          { key: "disapprove", label: "Disapprove", className: "blue-line" }
        ]
      }, approvalRows);
    }
  });
}

loadTrendCharts().catch(error => {
  console.error("Could not load trend charts:", error);
});
