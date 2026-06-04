export function toNumber(value) {
  if (value === null || value === undefined) return null;

  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

export function findPercentNearLabel(text, labels, options = {}) {
  const searchText = text.replace(/\s+/g, " ");
  const labelList = Array.isArray(labels) ? labels : [labels];
  const windowSize = options.windowSize ?? 900;

  for (const label of labelList) {
    const index = searchText.toLowerCase().indexOf(label.toLowerCase());

    if (index === -1) continue;

    const nearby = searchText.slice(index, index + windowSize);
    const matches = [...nearby.matchAll(/(\d{1,2}(?:\.\d+)?)\s*%/g)];

    for (const match of matches) {
      const value = Number(match[1]);

      if (Number.isFinite(value) && value >= 20 && value <= 80) {
        return value;
      }
    }
  }

  return null;
}

export function mergeWithFallback(scraped, fallback = {}) {
  const hasFallbackValues =
    Object.values(fallback).some(value => typeof value === "number");

  const merged = {
    ...fallback,
    ...Object.fromEntries(
      Object.entries(scraped).filter(([, value]) => value !== null && value !== undefined)
    )
  };

  // If scraping fails or only partially succeeds, keep trusted manual fallback inclusion.
  if (scraped.included === true) {
    merged.included = true;
  } else if (hasFallbackValues && fallback.included === true) {
    merged.included = true;
  } else if (scraped.included !== undefined) {
    merged.included = scraped.included;
  }

  if (scraped.scrapeStatus) {
    merged.scrapeStatus = scraped.scrapeStatus;
  } else if (!merged.scrapeStatus) {
    merged.scrapeStatus = hasFallbackValues ? "fallback" : "unknown";
  }

  if (scraped.scrapeNote) {
    merged.scrapeNote = scraped.scrapeNote;
  }

  return merged;
}


export function findPairNearLabels(text, firstLabels, secondLabels, options = {}) {
  const searchText = String(text || "").replace(/\s+/g, " ");
  const firstLabelList = Array.isArray(firstLabels) ? firstLabels : [firstLabels];
  const secondLabelList = Array.isArray(secondLabels) ? secondLabels : [secondLabels];
  const windowSize = options.windowSize ?? 650;

  function find(labelList) {
    for (const label of labelList) {
      const pattern = new RegExp(`${label}[^0-9]{0,80}(\\d{1,2}(?:\\.\\d+)?)\\s*%?`, "i");
      const match = searchText.match(pattern);

      if (match) {
        const value = Number(match[1]);

        if (Number.isFinite(value) && value >= 20 && value <= 80) {
          return value;
        }
      }

      const index = searchText.toLowerCase().indexOf(String(label).toLowerCase());

      if (index !== -1) {
        const nearby = searchText.slice(index, index + windowSize);
        const percentMatch = nearby.match(/(\d{1,2}(?:\.\d+)?)\s*%/);

        if (percentMatch) {
          const value = Number(percentMatch[1]);

          if (Number.isFinite(value) && value >= 20 && value <= 80) {
            return value;
          }
        }
      }
    }

    return null;
  }

  return {
    first: find(firstLabelList),
    second: find(secondLabelList)
  };
}

export function findValuesFromJsonText(text, labelPairs) {
  const raw = String(text || "");
  const matches = [...raw.matchAll(/"([^"]{1,80})"\s*:\s*("?)(-?\d{1,2}(?:\.\d+)?)\2/g)];
  const entries = matches.map(match => ({
    key: match[1].toLowerCase(),
    value: Number(match[3])
  })).filter(entry => Number.isFinite(entry.value) && entry.value >= 20 && entry.value <= 80);

  const output = {};

  for (const [outputKey, possibleKeys] of Object.entries(labelPairs)) {
    const found = entries.find(entry =>
      possibleKeys.some(key => entry.key.includes(String(key).toLowerCase()))
    );

    output[outputKey] = found ? found.value : null;
  }

  return output;
}


export function validateScrapedPair(values, fallback = {}, options = {}) {
  const firstKey = options.firstKey;
  const secondKey = options.secondKey;
  const minValue = options.minValue ?? 20;
  const maxValue = options.maxValue ?? 80;
  const maxGap = options.maxGap ?? 45;
  const requireSecondHigher = options.requireSecondHigher ?? false;
  const requireFirstHigher = options.requireFirstHigher ?? false;

  const first = values[firstKey];
  const second = values[secondKey];

  const bothNumbers =
    typeof first === "number" &&
    typeof second === "number" &&
    Number.isFinite(first) &&
    Number.isFinite(second);

  if (!bothNumbers) {
    return {
      ok: false,
      reason: "missing one or both values"
    };
  }

  if (first < minValue || first > maxValue || second < minValue || second > maxValue) {
    return {
      ok: false,
      reason: `values out of allowed range: ${firstKey} ${first}, ${secondKey} ${second}`
    };
  }

  if (Math.abs(first - second) > maxGap) {
    return {
      ok: false,
      reason: `gap is too large: ${Math.abs(first - second).toFixed(1)}`
    };
  }

  if (requireSecondHigher && second <= first) {
    return {
      ok: false,
      reason: `${secondKey} should be higher than ${firstKey}`
    };
  }

  if (requireFirstHigher && first <= second) {
    return {
      ok: false,
      reason: `${firstKey} should be higher than ${secondKey}`
    };
  }

  return {
    ok: true,
    reason: "passed validation"
  };
}


export function valuesLookUsable(values, keys, options = {}) {
  const minValue = options.minValue ?? 20;
  const maxValue = options.maxValue ?? 80;
  const maxGap = options.maxGap ?? 45;
  const requireSecondHigher = options.requireSecondHigher ?? false;

  const first = values[keys[0]];
  const second = values[keys[1]];

  if (
    typeof first !== "number" ||
    typeof second !== "number" ||
    !Number.isFinite(first) ||
    !Number.isFinite(second)
  ) {
    return {
      ok: false,
      reason: "missing one or both values"
    };
  }

  if (first < minValue || first > maxValue || second < minValue || second > maxValue) {
    return {
      ok: false,
      reason: `out of range: ${keys[0]} ${first}, ${keys[1]} ${second}`
    };
  }

  if (Math.abs(first - second) > maxGap) {
    return {
      ok: false,
      reason: `gap too large: ${Math.abs(first - second).toFixed(1)}`
    };
  }

  if (requireSecondHigher && second <= first) {
    return {
      ok: false,
      reason: `${keys[1]} should be higher than ${keys[0]}`
    };
  }

  return {
    ok: true,
    reason: "passed validation"
  };
}
