const US_ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const FIPS_TO_POSTAL = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE",
  "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS",
  "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY",
  "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC",
  "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY"
};

const COMPACT_LABEL_STATES = new Set(["CT", "DE", "MD", "MA", "NH", "NJ", "RI", "VT", "DC"]);
const TINY_LABEL_STATES = new Set(["HI"]);


function getRaceClass(race) {
  if (!race || race.active !== true) return "state-no-race";
  if (race.marginCategory && race.marginCategory !== "no-data") return `state-${race.marginCategory}`;
  if (race.status === "called" && race.party === "dem") return "state-called-dem";
  if (race.status === "called" && race.party === "rep") return "state-called-rep";
  if (race.status === "leading" && race.party === "dem") return "state-lead-dem";
  if (race.status === "leading" && race.party === "rep") return "state-lead-rep";
  if (race.status === "tossup") return "state-tossup";
  return "state-active-no-data";
}

function formatRaceStatus(race) {
  if (!race || race.active !== true) return "No active race on this map";
  if (race.status === "prediction") {
    const partyName = race.party === "dem" ? "Democratic" : "Republican";
    return `${partyName} advantage (${race.marginLabel || "margin pending"})`;
  }
  if (race.status === "called") return `${race.party === "dem" ? "Democratic" : "Republican"} hold/pickup`;
  if (race.status === "leading") return `${race.party === "dem" ? "Democrats" : "Republicans"} currently leading`;
  if (race.status === "tossup") return "Toss-up";
  return "No rating data yet";
}

function renderProjectionBar(container, mapData) {
  if (renderMarginSummary(container, mapData)) return;
  const control = mapData.control || null;

  if (control) {
    const total = Number(control.total || 1);
    const demValue = Number(control.dem || 0);
    const repValue = Number(control.rep || 0);
    const demWidth = Math.max((demValue / total) * 100, 3);
    const repWidth = Math.max((repValue / total) * 100, 3);
    const formatValue = value => control.showDecimals ? value.toFixed(1) : String(Math.round(value));

    container.innerHTML = `
      <div class="race-control-heading">
        <h3>${control.title || "Current Control"}</h3>
        <p>${control.majorityText || ""}</p>
      </div>
      <div class="race-control-bar current-control-bar" aria-label="${control.title || "Current control"}">
        <div class="race-bar-segment bar-dem-solid" style="width:${demWidth}%">
          <span><strong class="bar-count">${formatValue(demValue)}</strong><strong class="bar-label">${control.leftLabel || "D"}</strong></span>
        </div>
        <div class="race-bar-segment bar-rep-solid" style="width:${repWidth}%">
          <span><strong class="bar-count">${formatValue(repValue)}</strong><strong class="bar-label">${control.rightLabel || "R"}</strong></span>
        </div>
      </div>
      <div class="race-bar-subnote">${control.subtitle || ""}</div>
    `;
    return;
  }

  const projection = mapData.projection || {};
  const total = projection.total || 1;
  const segments = [
    ["demSolid", "Called/held D", "bar-dem-solid"],
    ["demLead", "D leading", "bar-dem-lead"],
    ["noData", "No data yet", "bar-no-data"],
    ["repLead", "R leading", "bar-rep-lead"],
    ["repSolid", "Called/held R", "bar-rep-solid"]
  ];

  const markup = segments.map(([key, label, className]) => {
    const value = Number(projection[key] || 0);
    if (value <= 0) return "";
    const width = Math.max((value / total) * 100, 3);
    return `<div class="race-bar-segment ${className}" style="width:${width}%"><span>${value}</span></div>`;
  }).join("");

  container.innerHTML = `
    <div class="race-bar-topline">
      <strong>${mapData.totalLabel || "Race map"}</strong>
      <span>placeholder race data</span>
    </div>
    <div class="race-control-bar" aria-label="Race control bar">${markup}</div>
    <div class="race-bar-legend">
      <span><i class="legend-swatch dem-solid"></i>Dem held/called</span>
      <span><i class="legend-swatch dem-lead"></i>Dem leading</span>
      <span><i class="legend-swatch no-data"></i>No data yet</span>
      <span><i class="legend-swatch rep-lead"></i>GOP leading</span>
      <span><i class="legend-swatch rep-solid"></i>GOP held/called</span>
    </div>
  `;
}


function renderCandidateList(race) {
  const candidates = Array.isArray(race.candidates) ? race.candidates : [];
  if (!candidates.length) {
    return `
      <div class="candidate-waiting">
        <strong>Waiting on primary for full results.</strong>
        <span>Candidate names and Wikipedia links will be added once nominees are selected.</span>
      </div>
    `;
  }
  return `
    <div class="candidate-list">
      ${candidates.map(candidate => `
        <a class="candidate-link" href="${candidate.wikipedia || "#"}" target="_blank" rel="noopener noreferrer">
          <span>${candidate.name}</span>
          <small>${candidate.party || ""}</small>
        </a>
      `).join("")}
    </div>
  `;
}

function renderMarginSummary(container, mapData) {
  const summary = mapData.marginSummary;
  if (!summary || !Array.isArray(summary.segments)) return false;
  const total = Number(summary.total || summary.segments.reduce((sum, segment) => sum + Number(segment.count || 0), 0) || 1);
  const segments = summary.segments.map(segment => {
    const count = Number(segment.count || 0);
    if (count <= 0) return "";
    const width = Math.max((count / total) * 100, 3);
    return `<div class="margin-bar-segment ${segment.className || ""}" style="width:${width}%"><strong>${count}</strong><span>${segment.label || ""}</span></div>`;
  }).join("");
  container.innerHTML = `
    <div class="race-control-heading prediction-heading">
      <h3>${summary.title || "Race Prediction"}</h3>
      <p>${summary.subtitle || ""}</p>
    </div>
    <div class="margin-control-bar" aria-label="${summary.title || "Race prediction margin bar"}">${segments}</div>
    <div class="margin-legend-note">Margins are estimates and should update as polling, ratings, and primary results become available.</div>
  `;
  return true;
}

function renderRaceDetail(panel, race, mapData) {
  if (!race) {
    panel.innerHTML = `
      <h3>Select a state</h3>
      <p>Clickable states show prediction margins and candidate status. Candidate names will be added after primaries.</p>
    `;
    return;
  }
  const marginLine = race.status === "prediction" ? `<p><strong>Prediction margin:</strong> ${race.marginLabel || "Pending"}</p>` : "";
  panel.innerHTML = `
    <span class="detail-kicker">${race.state}</span>
    <h3>${race.label || race.name}</h3>
    <p><strong>Status:</strong> ${formatRaceStatus(race)}</p>
    ${marginLine}
    <p>${race.note || mapData.subtitle || ""}</p>
    <h4 class="candidate-heading">Candidates</h4>
    ${renderCandidateList(race)}
  `;
}

async function loadRaceResources() {
  const [raceResponse, atlasResponse] = await Promise.all([
    fetch("data/races.json", { cache: "no-store" }),
    fetch(US_ATLAS_URL)
  ]);

  if (!raceResponse.ok) throw new Error("Could not load data/races.json");
  if (!atlasResponse.ok) throw new Error("Could not load US map geometry");

  return {
    raceData: await raceResponse.json(),
    atlas: await atlasResponse.json()
  };
}

function renderRaceMap(section, mapData, atlas) {
  const mapSlot = section.querySelector("[data-race-map-svg]");
  const detailPanel = section.querySelector("[data-race-detail]");
  const barSlot = section.querySelector("[data-race-bar]");

  if (!mapSlot || !detailPanel || !barSlot) return;

  renderProjectionBar(barSlot, mapData);
  renderRaceDetail(detailPanel, null, mapData);

  const raceByFips = new Map((mapData.races || []).map(race => [String(race.fips).padStart(2, "0"), race]));
  const stateFeatures = topojson.feature(atlas, atlas.objects.states).features;

  const width = 980;
  const height = 610;
  const projection = d3.geoAlbersUsa().fitSize([width, height], {
    type: "FeatureCollection",
    features: stateFeatures
  });
  const path = d3.geoPath(projection);

  const svg = d3.select(mapSlot)
    .html("")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `${mapData.title} map`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .classed("race-map-svg", true);

  svg.append("g")
    .attr("class", "race-map-states")
    .selectAll("path")
    .data(stateFeatures)
    .join("path")
    .attr("d", path)
    .attr("class", feature => {
      const fips = String(feature.id).padStart(2, "0");
      const race = raceByFips.get(fips);
      const clickable = race && race.active === true ? " is-clickable" : "";
      return `race-state ${getRaceClass(race)}${clickable}`;
    })
    .attr("tabindex", feature => {
      const race = raceByFips.get(String(feature.id).padStart(2, "0"));
      return race && race.active === true ? "0" : null;
    })
    .attr("role", feature => {
      const race = raceByFips.get(String(feature.id).padStart(2, "0"));
      return race && race.active === true ? "button" : "img";
    })
    .attr("aria-label", feature => {
      const fips = String(feature.id).padStart(2, "0");
      const race = raceByFips.get(fips);
      const postal = FIPS_TO_POSTAL[fips] || fips;
      return race ? `${race.name}: ${formatRaceStatus(race)}` : `${postal}: no active race`;
    })
    .on("click", function(event, feature) {
      const fips = String(feature.id).padStart(2, "0");
      const race = raceByFips.get(fips);
      if (!race || race.active !== true) return;

      svg.selectAll(".race-state").classed("is-selected", false);
      d3.select(this).classed("is-selected", true);
      renderRaceDetail(detailPanel, race, mapData);
    })
    .on("keydown", function(event, feature) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    })
    .append("title")
    .text(feature => {
      const fips = String(feature.id).padStart(2, "0");
      const race = raceByFips.get(fips);
      const postal = FIPS_TO_POSTAL[fips] || fips;
      return race ? `${race.name}: ${formatRaceStatus(race)}` : `${postal}: no active race`;
    });

  svg.append("g")
    .attr("class", "race-map-labels")
    .selectAll("text")
    .data(stateFeatures)
    .join("text")
    .attr("class", feature => {
      const fips = String(feature.id).padStart(2, "0");
      const postal = FIPS_TO_POSTAL[fips] || "";
      const race = raceByFips.get(fips);
      const classes = ["race-state-label"];
      if (race && race.active === true) classes.push("is-active");
      if (COMPACT_LABEL_STATES.has(postal)) classes.push("is-compact");
      if (TINY_LABEL_STATES.has(postal)) classes.push("is-tiny");
      return classes.join(" ");
    })
    .attr("x", feature => {
      const centroid = path.centroid(feature);
      return Number.isFinite(centroid[0]) ? centroid[0] : -999;
    })
    .attr("y", feature => {
      const centroid = path.centroid(feature);
      return Number.isFinite(centroid[1]) ? centroid[1] : -999;
    })
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text(feature => FIPS_TO_POSTAL[String(feature.id).padStart(2, "0")] || "");
}

async function initializeRaceMaps() {
  const sections = document.querySelectorAll("[data-race-map]");
  if (!sections.length) return;

  try {
    const { raceData, atlas } = await loadRaceResources();

    sections.forEach(section => {
      const key = section.getAttribute("data-race-map");
      const mapData = raceData.maps && raceData.maps[key];

      if (!mapData) return;
      renderRaceMap(section, mapData, atlas);
    });
  } catch (error) {
    console.error("Could not load race map:", error);
    sections.forEach(section => {
      const mapSlot = section.querySelector("[data-race-map-svg]");
      if (mapSlot) {
        mapSlot.innerHTML = `
          <div class="map-error">
            <strong>Map could not load.</strong>
            <p>Try refreshing the page. The map uses a public U.S. state geometry file.</p>
          </div>
        `;
      }
    });
  }
}

initializeRaceMaps();
