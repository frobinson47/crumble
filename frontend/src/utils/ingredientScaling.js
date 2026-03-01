const FRACTION_MAP = {
  0.125: '\u215B',  // 1/8
  0.25:  '\u00BC',  // 1/4
  0.333: '\u2153',  // 1/3
  0.375: '\u215C',  // 3/8
  0.5:   '\u00BD',  // 1/2
  0.625: '\u215D',  // 5/8
  0.667: '\u2154',  // 2/3
  0.75:  '\u00BE',  // 3/4
  0.875: '\u215E',  // 7/8
};

function parseSingleAmount(str) {
  str = str.trim();
  // Mixed number: "1 1/2"
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  }
  // Fraction: "1/2"
  const frac = str.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  }
  // Integer or decimal
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Parse an amount string to a number (or range object).
 * Returns null for unparseable values.
 */
export function parseAmount(str) {
  if (str == null || str === '') return null;
  str = String(str).trim();
  if (!str) return null;

  // Range: "2-3" or "2 - 3"
  const rangeParts = str.split(/\s*-\s*/);
  if (rangeParts.length === 2) {
    const low = parseSingleAmount(rangeParts[0]);
    const high = parseSingleAmount(rangeParts[1]);
    if (low !== null && high !== null && high > low) {
      return { low, high };
    }
  }

  return parseSingleAmount(str);
}

/**
 * Format a number back to a display string, using unicode fractions where possible.
 */
export function formatAmount(num) {
  if (num == null) return '';
  if (typeof num === 'object' && num.low != null) {
    return `${formatAmount(num.low)}-${formatAmount(num.high)}`;
  }

  const whole = Math.floor(num);
  const frac = num - whole;

  if (frac < 0.01) return String(whole || 0);

  // Find closest fraction symbol
  let closest = null;
  let minDiff = Infinity;
  for (const [key, symbol] of Object.entries(FRACTION_MAP)) {
    const diff = Math.abs(frac - parseFloat(key));
    if (diff < minDiff) {
      minDiff = diff;
      closest = symbol;
    }
  }

  if (minDiff < 0.02) {
    return whole > 0 ? `${whole}${closest}` : closest;
  }

  // Fallback: round to 1 decimal
  const rounded = Math.round(num * 10) / 10;
  return String(rounded);
}

// Regex to extract a leading amount (with optional fraction/range) from an ingredient name string.
// Matches: "2 cups flour", "1/2 tsp salt", "1 1/2 cups sugar", "2-3 cloves garlic"
const LEADING_AMOUNT_RE = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?(?:\s*-\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?))?)\s+(.+)$/;

function scaleAmount(parsed, ratio) {
  if (typeof parsed === 'object' && parsed.low != null) {
    return { low: parsed.low * ratio, high: parsed.high * ratio };
  }
  return parsed * ratio;
}

/**
 * Scale ingredients array based on servings ratio.
 * Returns a new array with scaled amounts.
 * Handles both structured (amount field) and unstructured (amount baked into name) ingredients.
 */
export function scaleIngredients(ingredients, originalServings, newServings) {
  if (!originalServings || !newServings || originalServings === newServings) {
    return ingredients;
  }

  const ratio = newServings / originalServings;

  return ingredients.map(ing => {
    // Case 1: Structured amount field
    const parsed = parseAmount(ing.amount);
    if (parsed !== null) {
      return { ...ing, amount: formatAmount(scaleAmount(parsed, ratio)) };
    }

    // Case 2: Amount embedded in name (imported recipes)
    if (ing.name) {
      const match = ing.name.match(LEADING_AMOUNT_RE);
      if (match) {
        const nameParsed = parseAmount(match[1]);
        if (nameParsed !== null) {
          const scaled = formatAmount(scaleAmount(nameParsed, ratio));
          return { ...ing, name: `${scaled} ${match[2]}` };
        }
      }
    }

    return ing;
  });
}
