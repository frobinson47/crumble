/**
 * Plain-text recipe parser.
 * Takes a blob of text (pasted from email, message, PDF, etc.)
 * and extracts structured recipe data using heuristics.
 *
 * Returns: { title, description, prepTime, cookTime, servings, ingredients[], instructions[] }
 */

import { parseIngredient } from './ingredientParser';

// Section header patterns (case-insensitive)
const SECTION_PATTERNS = {
  ingredients: /^(?:ingredients|what you(?:'ll)? need|you(?:'ll)? need)\s*:?\s*$/i,
  instructions: /^(?:instructions|directions|method|steps|preparation|how to (?:make|cook|prepare)|procedure)\s*:?\s*$/i,
  description: /^(?:description|about|intro(?:duction)?|notes?)\s*:?\s*$/i,
  nutrition: /^(?:nutrition(?:al)?\s*(?:info(?:rmation)?|facts)?)\s*:?\s*$/i,
};

// Time extraction patterns
const PREP_TIME_RE = /prep(?:\s*time)?\s*[:=]?\s*(\d+)\s*(?:min(?:ute)?s?|hrs?|hours?)/i;
const COOK_TIME_RE = /cook(?:ing)?\s*(?:time)?\s*[:=]?\s*(\d+)\s*(?:min(?:ute)?s?|hrs?|hours?)/i;
const TOTAL_TIME_RE = /total\s*(?:time)?\s*[:=]?\s*(\d+)\s*(?:min(?:ute)?s?|hrs?|hours?)/i;
const SERVINGS_RE = /(?:serves?|servings?|yield|makes?|portions?)\s*[:=]?\s*(\d+)/i;

// Line classification helpers
const NUMBERED_LINE_RE = /^\d+[\.\)]\s+/;
const BULLET_RE = /^[\-•●◦▪▸]\s+/;
const INGREDIENT_AMOUNT_RE = /^(?:\d+[\s/¼½¾⅓⅔⅛⅜⅝⅞]|½|¼|¾|⅓|⅔|\d+(?:lb|oz|g|kg|ml|tsp|tbsp|cup)s?\b)/;

/**
 * Check if a line looks like an ingredient (starts with amount or has unit keywords).
 */
function looksLikeIngredient(line) {
  const cleaned = line.replace(BULLET_RE, '').replace(NUMBERED_LINE_RE, '').trim();
  if (!cleaned) return false;

  // Starts with a number/fraction
  if (INGREDIENT_AMOUNT_RE.test(cleaned)) return true;

  // Contains a unit word early in the line
  const words = cleaned.toLowerCase().split(/\s+/).slice(0, 4);
  const unitWords = [
    'cup', 'cups', 'tbsp', 'tablespoon', 'tsp', 'teaspoon', 'oz', 'ounce',
    'lb', 'pound', 'g', 'kg', 'ml', 'liter', 'clove', 'cloves', 'pinch',
    'can', 'cans', 'bunch', 'head', 'sprig', 'slice', 'stick', 'package',
    'handful', 'dash', 'quart', 'pint', 'gallon',
  ];
  if (words.some(w => unitWords.includes(w))) return true;

  // Common no-amount ingredients (short lines only — avoid matching instructions)
  if (cleaned.length < 40) {
    const lower = cleaned.toLowerCase();
    const noAmountIngredients = [
      'salt and pepper', 'salt & pepper', 'salt', 'pepper', 'water', 'ice',
      'oil', 'butter', 'nonstick spray', 'cooking spray', 'fresh herbs',
      'kosher salt', 'sea salt', 'flaky salt',
    ];
    if (noAmountIngredients.some(kw => lower.startsWith(kw))) return true;
  }

  return false;
}

/**
 * Check if a line looks like an instruction step.
 */
function looksLikeInstruction(line) {
  const cleaned = line.replace(BULLET_RE, '').replace(NUMBERED_LINE_RE, '').trim();
  if (!cleaned) return false;
  // Instructions tend to be longer and start with a verb
  if (cleaned.length < 15) return false;
  // Starts with an action verb
  const actionVerbs = [
    'preheat', 'heat', 'cook', 'bake', 'boil', 'mix', 'stir', 'add', 'combine',
    'pour', 'place', 'put', 'set', 'let', 'allow', 'bring', 'reduce', 'remove',
    'transfer', 'slice', 'chop', 'dice', 'mince', 'season', 'serve', 'garnish',
    'whisk', 'fold', 'beat', 'cream', 'sift', 'drain', 'rinse', 'spread',
    'top', 'cover', 'brush', 'toss', 'roll', 'shape', 'form', 'cut',
    'mash', 'blend', 'process', 'grill', 'roast', 'fry', 'sauté', 'saute',
    'simmer', 'brown', 'sear', 'melt', 'warm', 'chill', 'refrigerate', 'freeze',
    'marinate', 'knead', 'assemble', 'arrange', 'layer', 'grease', 'line',
    'prepare', 'pat', 'rub', 'stuff', 'thread', 'skewer', 'deglaze', 'butterfly',
    'shred', 'grate', 'zest', 'squeeze', 'peel', 'trim', 'score', 'flatten',
    'in a', 'using', 'once', 'when', 'after', 'while', 'meanwhile',
  ];
  const firstWord = cleaned.toLowerCase().split(/[\s,]+/)[0];
  if (actionVerbs.includes(firstWord)) return true;
  // Numbered lines that are long enough are likely instructions
  if (NUMBERED_LINE_RE.test(line) && cleaned.length > 20) return true;
  return false;
}

/**
 * Clean a line by removing bullet/number prefixes.
 */
function cleanLine(line) {
  return line.replace(BULLET_RE, '').replace(NUMBERED_LINE_RE, '').trim();
}

/**
 * Extract times and servings from the full text.
 */
function extractMeta(text) {
  const meta = { prepTime: null, cookTime: null, servings: null };

  const prepMatch = text.match(PREP_TIME_RE);
  if (prepMatch) {
    let val = parseInt(prepMatch[1], 10);
    if (/hrs?|hours?/i.test(prepMatch[0])) val *= 60;
    meta.prepTime = val;
  }

  const cookMatch = text.match(COOK_TIME_RE);
  if (cookMatch) {
    let val = parseInt(cookMatch[1], 10);
    if (/hrs?|hours?/i.test(cookMatch[0])) val *= 60;
    meta.cookTime = val;
  }

  // If only total time found, split it roughly
  if (!meta.prepTime && !meta.cookTime) {
    const totalMatch = text.match(TOTAL_TIME_RE);
    if (totalMatch) {
      let val = parseInt(totalMatch[1], 10);
      if (/hrs?|hours?/i.test(totalMatch[0])) val *= 60;
      meta.cookTime = val;
    }
  }

  const servingsMatch = text.match(SERVINGS_RE);
  if (servingsMatch) {
    meta.servings = parseInt(servingsMatch[1], 10);
  }

  return meta;
}

/**
 * Parse a full recipe from plain text.
 */
export function parseRecipeText(text) {
  if (!text || !text.trim()) {
    return null;
  }

  const lines = text.split(/\n/).map(l => l.trimEnd());
  const result = {
    title: '',
    description: '',
    prepTime: null,
    cookTime: null,
    servings: null,
    ingredients: [],
    instructions: [],
  };

  // Extract meta (times, servings) from full text
  const meta = extractMeta(text);
  Object.assign(result, meta);

  // Strategy 1: Section headers present — use them to partition lines
  let currentSection = null;
  const sections = { title: [], description: [], ingredients: [], instructions: [], unknown: [] };
  let hasExplicitSections = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Check if this line is a section header
    let matched = false;
    for (const [section, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(trimmed)) {
        currentSection = section;
        hasExplicitSections = true;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Skip meta lines (prep time, cook time, servings)
    if (PREP_TIME_RE.test(trimmed) || COOK_TIME_RE.test(trimmed) ||
        TOTAL_TIME_RE.test(trimmed) || SERVINGS_RE.test(trimmed)) {
      continue;
    }

    if (currentSection && sections[currentSection]) {
      sections[currentSection].push(trimmed);
    } else if (currentSection === 'nutrition') {
      // Skip nutrition lines
    } else {
      sections.unknown.push({ line: trimmed, index: i });
    }
  }

  if (hasExplicitSections) {
    // We found section headers — use the partitioned data
    result.ingredients = sections.ingredients.map(line => {
      const cleaned = cleanLine(line);
      return parseIngredient(cleaned);
    }).filter(ing => ing.name);

    result.instructions = sections.instructions
      .map(line => cleanLine(line))
      .filter(s => s.length > 0);

    // Title: first unknown line, or first line of the text
    if (sections.unknown.length > 0) {
      result.title = sections.unknown[0].line;
      // Remaining unknown lines before ingredients section → description
      const descLines = sections.unknown.slice(1).map(u => u.line);
      if (descLines.length > 0 && descLines.length <= 5) {
        result.description = descLines.join(' ');
      }
    }

    if (sections.description.length > 0) {
      result.description = sections.description.join(' ');
    }
  } else {
    // Strategy 2: No section headers — classify each line by heuristics
    const nonEmptyLines = lines.map(l => l.trim()).filter(l => l);

    // Skip meta lines
    const contentLines = nonEmptyLines.filter(line =>
      !PREP_TIME_RE.test(line) && !COOK_TIME_RE.test(line) &&
      !TOTAL_TIME_RE.test(line) && !SERVINGS_RE.test(line)
    );

    if (contentLines.length === 0) return null;

    // First line is the title
    result.title = contentLines[0];

    // Classify remaining lines
    const ingredientLines = [];
    const instructionLines = [];
    const otherLines = [];

    for (let i = 1; i < contentLines.length; i++) {
      const line = contentLines[i];
      if (looksLikeIngredient(line)) {
        ingredientLines.push(line);
      } else if (looksLikeInstruction(line)) {
        instructionLines.push(line);
      } else {
        otherLines.push(line);
      }
    }

    result.ingredients = ingredientLines.map(line => {
      const cleaned = cleanLine(line);
      return parseIngredient(cleaned);
    }).filter(ing => ing.name);

    result.instructions = instructionLines
      .map(line => cleanLine(line))
      .filter(s => s.length > 0);

    // Short "other" lines at the start → description
    if (otherLines.length > 0 && otherLines.length <= 3) {
      result.description = otherLines.join(' ');
    }
  }

  // Clean up title (remove trailing colons, leading "Recipe:", etc.)
  result.title = result.title
    .replace(/^recipe\s*[:—–-]\s*/i, '')
    .replace(/[:]\s*$/, '')
    .trim();

  // Only return if we got something meaningful
  if (!result.title && result.ingredients.length === 0 && result.instructions.length === 0) {
    return null;
  }

  return result;
}
