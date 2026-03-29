/**
 * Cooking term glossary for inline tooltips in recipe instructions.
 * Terms are matched case-insensitively with word boundaries.
 */
const GLOSSARY = {
  'al dente': 'Cooked until firm to the bite, not soft. Test by biting — it should have a slight resistance in the center.',
  'baste': 'Spoon or brush liquid (pan juices, melted butter, marinade) over food while it cooks to keep it moist.',
  'blanch': 'Briefly boil food (usually vegetables), then plunge into ice water to stop cooking. Preserves color and texture.',
  'braise': 'Brown food in fat, then cook slowly in a covered pot with a small amount of liquid. Great for tough cuts of meat.',
  'broil': 'Cook with intense direct heat from above, usually in the oven\'s top element. Similar to grilling but upside down.',
  'caramelize': 'Cook sugar (or food containing sugar) until it turns golden brown and develops a rich, sweet flavor.',
  'chiffonade': 'Stack leaves (like basil), roll tightly, then slice crosswise into thin ribbons.',
  'cream': 'Beat butter and sugar together vigorously until light, fluffy, and pale in color. Usually 3-5 minutes with a mixer.',
  'deglaze': 'Add liquid (wine, broth, water) to a hot pan with browned bits stuck to the bottom. Scrape them up — that\'s where the flavor is.',
  'dice': 'Cut into small cubes, roughly 1/4 inch. Smaller than chopped, larger than minced.',
  'dock': 'Prick pastry dough with a fork before baking to prevent it from puffing up.',
  'dredge': 'Coat food lightly in flour, breadcrumbs, or another dry mixture before cooking.',
  'emulsify': 'Combine two liquids that normally don\'t mix (like oil and vinegar) into a smooth, unified sauce.',
  'fold': 'Gently combine a light mixture into a heavier one by lifting from the bottom and turning over. Don\'t stir — you\'ll lose the air.',
  'julienne': 'Cut into thin matchstick-sized strips, about 1/8 inch wide and 2 inches long.',
  'macerate': 'Soak fruit in sugar, liquor, or other liquid to soften and release juices.',
  'mince': 'Cut into very tiny pieces, smaller than diced. For garlic, rock the knife back and forth until nearly a paste.',
  'parboil': 'Partially cook in boiling water. Food will finish cooking later by another method.',
  'poach': 'Cook gently in liquid held just below a simmer — small bubbles should barely break the surface.',
  'proof': 'Let yeast dough rise in a warm place until doubled in size. Usually takes 1-2 hours depending on temperature.',
  'reduce': 'Simmer a liquid uncovered until some evaporates, concentrating the flavor and thickening the consistency.',
  'render': 'Cook fatty meat (like bacon) slowly to melt out the fat, leaving crispy solids behind.',
  'rest': 'Let cooked meat sit after removing from heat. Juices redistribute inside — cutting too early lets them run out.',
  'roux': 'Equal parts fat (usually butter) and flour, cooked together as a base for sauces. Cook longer for darker color and nuttier flavor.',
  'sauté': 'Cook quickly in a small amount of fat over medium-high heat, stirring or tossing frequently.',
  'sear': 'Cook over very high heat to create a brown crust. Don\'t move the food — let it sit until it releases naturally.',
  'simmer': 'Cook liquid just below boiling — gentle bubbles should break the surface slowly. Lower heat if it\'s a full boil.',
  'sweat': 'Cook vegetables over low heat with a little fat until they soften and release moisture, without browning.',
  'temper': 'Gradually bring a cold ingredient (like eggs) up to a hot temperature by slowly adding hot liquid, to prevent curdling.',
  'translucent': 'Cooked until partially see-through. For onions, this means soft and slightly glassy — about 5-7 minutes over medium heat.',
  'zest': 'The outermost colored layer of citrus peel, grated finely. Avoid the white pith underneath — it\'s bitter.',
  'bloom': 'Activate an ingredient by adding warm liquid. For gelatin, sprinkle over cold water and let swell. For spices, toast briefly in hot oil to release flavor.',
  'brine': 'Soak meat in salted water (usually 1/4 cup salt per quart) for hours. The salt penetrates deep, making meat juicier and more flavorful.',
  'brown': 'Cook over high heat until the surface turns deep golden via the Maillard reaction. Don\'t crowd the pan — moisture prevents browning.',
  'butterfly': 'Cut meat nearly in half horizontally and open it flat like a book. Creates a thinner, more even piece that cooks faster.',
  'flambé': 'Ignite alcohol in a hot pan to burn it off and caramelize sugars. Tilt the pan away from you and let the flame die naturally.',
  'knead': 'Push and fold dough repeatedly to develop gluten. The dough is ready when it springs back when poked and feels smooth, not sticky.',
  'marinate': 'Soak food in a seasoned liquid (acid + oil + aromatics) to add flavor and tenderize. Refrigerate — never marinate at room temperature.',
  'nappe': 'A sauce thick enough to coat the back of a spoon — draw a line through it with your finger and it should hold.',
  'sift': 'Pass dry ingredients through a fine mesh to remove lumps and incorporate air. Essential for light cakes and pastries.',
  'truss': 'Tie poultry legs and wings snugly against the body with kitchen twine. Promotes even cooking and a compact, attractive shape.',
  'water bath': 'Place a baking dish inside a larger pan filled with hot water. The gentle, even heat prevents cracking in custards and cheesecakes.',
};

// Build sorted term list (longest first to prevent partial matches)
const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

// Build regex pattern
const PATTERN = new RegExp(
  `\\b(${TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'gi'
);

/**
 * Check if text contains any glossary terms.
 */
export function hasGlossaryTerms(text) {
  PATTERN.lastIndex = 0;
  return PATTERN.test(text);
}

/**
 * Find all glossary term matches in text.
 * Returns array of { term, definition, index, length }.
 */
export function findGlossaryTerms(text) {
  const matches = [];
  PATTERN.lastIndex = 0;
  let match;
  while ((match = PATTERN.exec(text)) !== null) {
    const termLower = match[0].toLowerCase();
    // Find the canonical key
    const key = TERMS.find(t => t.toLowerCase() === termLower);
    if (key) {
      matches.push({
        term: match[0],
        definition: GLOSSARY[key],
        index: match.index,
        length: match[0].length,
      });
    }
  }
  return matches;
}

export { GLOSSARY, TERMS };
