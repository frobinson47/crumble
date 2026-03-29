/**
 * Client-side ingredient parser — port of api/services/IngredientParser.php.
 * Parses free-text ingredient strings into structured { amount, unit, name }.
 */

const UNITS = {
  cup:     ['cup', 'cups', 'c'],
  tbsp:    ['tbsp', 'tablespoon', 'tablespoons', 'tbs'],
  tsp:     ['tsp', 'teaspoon', 'teaspoons'],
  oz:      ['oz', 'ounce', 'ounces'],
  lb:      ['lb', 'pound', 'pounds', 'lbs'],
  g:       ['g', 'gram', 'grams'],
  kg:      ['kg', 'kilogram', 'kilograms'],
  ml:      ['ml', 'milliliter', 'milliliters'],
  L:       ['l', 'liter', 'liters'],
  clove:   ['clove', 'cloves'],
  pinch:   ['pinch', 'pinches'],
  piece:   ['piece', 'pieces', 'pcs'],
  can:     ['can', 'cans'],
  bunch:   ['bunch', 'bunches'],
  sprig:   ['sprig', 'sprigs'],
  slice:   ['slice', 'slices'],
  stick:   ['stick', 'sticks'],
  head:    ['head', 'heads'],
  dash:    ['dash', 'dashes'],
  package: ['package', 'packages', 'pkg'],
  bag:     ['bag', 'bags'],
  bottle:  ['bottle', 'bottles'],
  jar:     ['jar', 'jars'],
  handful: ['handful', 'handfuls'],
  quart:   ['quart', 'quarts', 'qt'],
  pint:    ['pint', 'pints', 'pt'],
  gallon:  ['gallon', 'gallons', 'gal'],
};

// Unicode fraction → decimal string mapping
const UNICODE_FRACTIONS = {
  '\u00BC': '1/4',   // ¼
  '\u00BD': '1/2',   // ½
  '\u00BE': '3/4',   // ¾
  '\u2153': '1/3',   // ⅓
  '\u2154': '2/3',   // ⅔
  '\u215B': '1/8',   // ⅛
  '\u215C': '3/8',   // ⅜
  '\u215D': '5/8',   // ⅝
  '\u215E': '7/8',   // ⅞
};

// Build reverse lookup once
const aliasToCanonical = {};
for (const [canonical, aliases] of Object.entries(UNITS)) {
  for (const alias of aliases) {
    aliasToCanonical[alias.toLowerCase()] = canonical;
  }
}

function lookupUnit(word) {
  return aliasToCanonical[word.toLowerCase().replace(/[.,;:]+$/, '')] ?? null;
}

/**
 * Normalize unicode fractions and clean whitespace.
 */
function normalize(text) {
  text = text.trim().replace(/\s+/g, ' ');
  // Replace unicode fractions with ASCII equivalents
  for (const [unicode, ascii] of Object.entries(UNICODE_FRACTIONS)) {
    text = text.replaceAll(unicode, ascii);
  }
  return text;
}

/**
 * Parse a single ingredient line.
 * "2 cups all-purpose flour" → { amount: "2", unit: "cup", name: "all-purpose flour" }
 * "salt and pepper to taste" → { amount: null, unit: null, name: "salt and pepper to taste" }
 */
export function parseIngredient(text) {
  text = normalize(text);
  if (!text) return { amount: null, unit: null, name: '' };

  let amount = null;
  let unit = null;
  let remaining = text;

  // Step 1: Extract amount (integer, decimal, fraction, mixed number, or range)
  const numPart = '(?:\\d+\\s+\\d+/\\d+|\\d+\\.\\d+|\\d+/\\d+|\\d+)';
  const amountRe = new RegExp(`^(${numPart}(?:\\s*-\\s*${numPart})?)\\s*`);
  const amountMatch = remaining.match(amountRe);

  if (amountMatch) {
    amount = amountMatch[1].trim();
    remaining = remaining.slice(amountMatch[0].length);
  }

  if (!amount) return { amount: null, unit: null, name: text };

  remaining = remaining.trimStart();

  // Step 2: Parenthetical units — "2 (14 oz) cans tomatoes"
  const parenRe = /^\(([^)]*)\)\s+(\S+)(.*)/s;
  const parenMatch = remaining.match(parenRe);
  if (parenMatch) {
    const canonical = lookupUnit(parenMatch[2]);
    if (canonical) {
      return {
        amount,
        unit: canonical,
        name: `(${parenMatch[1]}) ${parenMatch[3]}`.trim(),
      };
    }
  }

  // Step 3: First word as unit
  const wordRe = /^(\S+)(.*)$/s;
  const wordMatch = remaining.match(wordRe);
  if (wordMatch) {
    const canonical = lookupUnit(wordMatch[1]);
    if (canonical) {
      unit = canonical;
      remaining = wordMatch[2].trimStart();
    }
  }

  // Strip leading "of" — "2 cups of flour" → "flour"
  remaining = remaining.replace(/^of\s+/i, '');

  return { amount: amount || null, unit, name: remaining.trim() };
}

/**
 * Parse multiple ingredient lines (for paste-all feature).
 * Splits on newlines, filters blanks, parses each line.
 */
export function parseIngredientBlock(text) {
  return text
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((line, i) => ({ ...parseIngredient(line), sort_order: i }));
}
