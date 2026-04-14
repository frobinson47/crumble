/**
 * Categorize grocery items by store section for aisle-grouped display.
 * Pure client-side — no backend changes needed.
 *
 * Strategy: exact match first, then substring match against keyword map.
 * Falls back to "Other" for unrecognized items.
 */

const CATEGORY_ORDER = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Frozen',
  'Pantry',
  'Canned Goods',
  'Pasta & Grains',
  'Spices & Seasonings',
  'Condiments & Sauces',
  'Baking',
  'Oils & Vinegars',
  'Beverages',
  'Other',
];

// Keywords mapped to categories. Longer/more specific entries first within each category.
// The categorizer checks if the ingredient name CONTAINS any keyword.
const KEYWORD_MAP = {
  // === COMPOUND TERMS (must match before single-word terms) ===

  // Broth/stock → Pantry (not Meat, not Beverages — it's a shelf-stable cooking ingredient)
  'chicken broth': 'Pantry', 'beef broth': 'Pantry', 'vegetable broth': 'Pantry',
  'chicken stock': 'Pantry', 'beef stock': 'Pantry', 'vegetable stock': 'Pantry',
  'bone broth': 'Pantry',

  // Juice as ingredient → Produce (lime juice, lemon juice are produce-adjacent)
  'lime juice': 'Produce', 'lemon juice': 'Produce', 'orange juice': 'Beverages',

  // Canned goods with meat/produce words — must match before "chicken", "tomato", etc.
  'canned tomato': 'Canned Goods', 'diced tomato': 'Canned Goods',
  'crushed tomato': 'Canned Goods', 'tomato paste': 'Canned Goods',
  'tomato sauce': 'Canned Goods', 'tomato puree': 'Canned Goods',
  'canned corn': 'Canned Goods', 'canned bean': 'Canned Goods',
  'canned chili': 'Canned Goods', 'canned green': 'Canned Goods',
  'coconut milk': 'Canned Goods', 'coconut cream': 'Canned Goods',
  'chickpea': 'Canned Goods', 'black bean': 'Canned Goods', 'kidney bean': 'Canned Goods',
  'pinto bean': 'Canned Goods', 'white bean': 'Canned Goods', 'navy bean': 'Canned Goods',
  'cannellini': 'Canned Goods', 'great northern': 'Canned Goods',
  'chili bean': 'Canned Goods', 'lentil': 'Canned Goods',
  'canned': 'Canned Goods', 'can of': 'Canned Goods',

  // Frozen items
  'frozen vegetable': 'Frozen', 'frozen fruit': 'Frozen', 'frozen mixed': 'Frozen',
  'frozen corn': 'Frozen', 'frozen pea': 'Frozen', 'frozen spinach': 'Frozen',
  'ice cream': 'Frozen', 'sorbet': 'Frozen',
  'frozen': 'Frozen',

  // Compound spices/seasonings (before "pepper", "garlic", etc.)
  'chili powder': 'Spices & Seasonings', 'garlic powder': 'Spices & Seasonings',
  'onion powder': 'Spices & Seasonings', 'smoked paprika': 'Spices & Seasonings',
  'italian seasoning': 'Spices & Seasonings', 'cajun seasoning': 'Spices & Seasonings',
  'garam masala': 'Spices & Seasonings', 'red pepper flake': 'Spices & Seasonings',
  'bay leaf': 'Spices & Seasonings', 'bay leaves': 'Spices & Seasonings',
  'black pepper': 'Spices & Seasonings', 'white pepper': 'Spices & Seasonings',
  'kosher salt': 'Spices & Seasonings', 'sea salt': 'Spices & Seasonings',
  'salt and pepper': 'Spices & Seasonings',

  // Compound dairy
  'half and half': 'Dairy & Eggs', 'half-and-half': 'Dairy & Eggs',
  'cream cheese': 'Dairy & Eggs', 'sour cream': 'Dairy & Eggs',
  'whipping cream': 'Dairy & Eggs', 'heavy cream': 'Dairy & Eggs',

  // Compound oils
  'olive oil': 'Oils & Vinegars', 'extra-virgin olive oil': 'Oils & Vinegars',
  'vegetable oil': 'Oils & Vinegars', 'canola oil': 'Oils & Vinegars',
  'coconut oil': 'Oils & Vinegars', 'sesame oil': 'Oils & Vinegars',
  'avocado oil': 'Oils & Vinegars', 'cooking oil': 'Oils & Vinegars',
  'cooking spray': 'Oils & Vinegars', 'nonstick spray': 'Oils & Vinegars',
  'red wine vinegar': 'Oils & Vinegars', 'white wine vinegar': 'Oils & Vinegars',
  'apple cider vinegar': 'Oils & Vinegars', 'rice vinegar': 'Oils & Vinegars',

  // Compound condiments
  'soy sauce': 'Condiments & Sauces', 'fish sauce': 'Condiments & Sauces',
  'oyster sauce': 'Condiments & Sauces', 'hot sauce': 'Condiments & Sauces',
  'maple syrup': 'Condiments & Sauces',

  // Compound meats (before single words)
  'ground beef': 'Meat & Seafood', 'ground turkey': 'Meat & Seafood',
  'ground pork': 'Meat & Seafood', 'chicken breast': 'Meat & Seafood',
  'chicken thigh': 'Meat & Seafood', 'pork chop': 'Meat & Seafood',
  'pork tenderloin': 'Meat & Seafood',

  // Compound baking
  'all-purpose flour': 'Baking', 'bread flour': 'Baking', 'cake flour': 'Baking',
  'whole wheat flour': 'Baking', 'almond flour': 'Baking',
  'brown sugar': 'Baking', 'powdered sugar': 'Baking', 'granulated sugar': 'Baking',
  'baking soda': 'Baking', 'baking powder': 'Baking',
  'vanilla extract': 'Baking', 'almond extract': 'Baking',
  'chocolate chip': 'Baking',

  // Compound produce
  'sweet potato': 'Produce', 'green onion': 'Produce', 'bell pepper': 'Produce',
  'bean sprout': 'Produce', 'bok choy': 'Produce',

  // Compound bakery
  'english muffin': 'Bakery',

  // Compound pantry
  'peanut butter': 'Pantry', 'almond butter': 'Pantry',
  'tortilla chip': 'Pantry',

  // === SINGLE-WORD TERMS ===

  // Produce
  'romaine': 'Produce', 'arugula': 'Produce', 'spinach': 'Produce', 'kale': 'Produce',
  'lettuce': 'Produce', 'cabbage': 'Produce', 'broccoli': 'Produce', 'cauliflower': 'Produce',
  'asparagus': 'Produce', 'zucchini': 'Produce', 'squash': 'Produce', 'eggplant': 'Produce',
  'cucumber': 'Produce', 'celery': 'Produce', 'carrot': 'Produce', 'potato': 'Produce',
  'onion': 'Produce', 'shallot': 'Produce', 'scallion': 'Produce',
  'leek': 'Produce', 'garlic': 'Produce', 'ginger': 'Produce',
  'tomato': 'Produce', 'pepper': 'Produce', 'jalapeño': 'Produce', 'jalapeno': 'Produce',
  'chili': 'Produce', 'chile': 'Produce',
  'mushroom': 'Produce', 'corn': 'Produce', 'peas': 'Produce',
  'avocado': 'Produce', 'lemon': 'Produce', 'lime': 'Produce', 'orange': 'Produce',
  'apple': 'Produce', 'banana': 'Produce', 'berry': 'Produce', 'berries': 'Produce',
  'strawberry': 'Produce', 'blueberry': 'Produce', 'raspberry': 'Produce',
  'grape': 'Produce', 'melon': 'Produce', 'watermelon': 'Produce', 'pineapple': 'Produce',
  'mango': 'Produce', 'peach': 'Produce', 'pear': 'Produce', 'plum': 'Produce',
  'cherry': 'Produce', 'cranberry': 'Produce', 'fig': 'Produce', 'date': 'Produce',
  'coconut': 'Produce', 'herb': 'Produce', 'parsley': 'Produce', 'cilantro': 'Produce',
  'basil': 'Produce', 'mint': 'Produce', 'dill': 'Produce', 'thyme': 'Produce',
  'rosemary': 'Produce', 'sage': 'Produce', 'chive': 'Produce', 'tarragon': 'Produce',
  'oregano': 'Produce', 'radish': 'Produce', 'turnip': 'Produce', 'beet': 'Produce',
  'artichoke': 'Produce', 'fennel': 'Produce',

  // Meat & Seafood
  'chicken': 'Meat & Seafood', 'beef': 'Meat & Seafood', 'pork': 'Meat & Seafood',
  'steak': 'Meat & Seafood', 'turkey': 'Meat & Seafood', 'lamb': 'Meat & Seafood',
  'veal': 'Meat & Seafood', 'bacon': 'Meat & Seafood', 'sausage': 'Meat & Seafood',
  'kielbasa': 'Meat & Seafood', 'ham': 'Meat & Seafood',
  'prosciutto': 'Meat & Seafood', 'pancetta': 'Meat & Seafood', 'salami': 'Meat & Seafood',
  'salmon': 'Meat & Seafood', 'tuna': 'Meat & Seafood', 'shrimp': 'Meat & Seafood',
  'prawn': 'Meat & Seafood', 'crab': 'Meat & Seafood', 'lobster': 'Meat & Seafood',
  'scallop': 'Meat & Seafood', 'clam': 'Meat & Seafood', 'mussel': 'Meat & Seafood',
  'cod': 'Meat & Seafood', 'tilapia': 'Meat & Seafood', 'halibut': 'Meat & Seafood',
  'fish': 'Meat & Seafood', 'anchovy': 'Meat & Seafood', 'sardine': 'Meat & Seafood',
  'duck': 'Meat & Seafood',

  // Dairy & Eggs
  'milk': 'Dairy & Eggs', 'cream': 'Dairy & Eggs',
  'buttermilk': 'Dairy & Eggs', 'butter': 'Dairy & Eggs', 'margarine': 'Dairy & Eggs',
  'cheese': 'Dairy & Eggs', 'cheddar': 'Dairy & Eggs', 'mozzarella': 'Dairy & Eggs',
  'parmesan': 'Dairy & Eggs', 'ricotta': 'Dairy & Eggs', 'feta': 'Dairy & Eggs',
  'gouda': 'Dairy & Eggs', 'brie': 'Dairy & Eggs', 'gruyere': 'Dairy & Eggs',
  'yogurt': 'Dairy & Eggs', 'egg': 'Dairy & Eggs', 'eggs': 'Dairy & Eggs',

  // Bakery
  'bread': 'Bakery', 'baguette': 'Bakery', 'ciabatta': 'Bakery', 'sourdough': 'Bakery',
  'roll': 'Bakery', 'bun': 'Bakery', 'pita': 'Bakery', 'naan': 'Bakery',
  'tortilla': 'Bakery', 'wrap': 'Bakery', 'croissant': 'Bakery', 'bagel': 'Bakery',
  'flatbread': 'Bakery', 'crouton': 'Bakery',

  // Pasta & Grains
  'pasta': 'Pasta & Grains', 'spaghetti': 'Pasta & Grains', 'penne': 'Pasta & Grains',
  'fusilli': 'Pasta & Grains', 'linguine': 'Pasta & Grains', 'fettuccine': 'Pasta & Grains',
  'fettuccini': 'Pasta & Grains', 'macaroni': 'Pasta & Grains', 'rigatoni': 'Pasta & Grains',
  'orzo': 'Pasta & Grains', 'lasagna': 'Pasta & Grains', 'noodle': 'Pasta & Grains',
  'ramen': 'Pasta & Grains', 'rice': 'Pasta & Grains', 'quinoa': 'Pasta & Grains',
  'couscous': 'Pasta & Grains', 'barley': 'Pasta & Grains', 'oat': 'Pasta & Grains',
  'polenta': 'Pasta & Grains', 'cornmeal': 'Pasta & Grains', 'bulgur': 'Pasta & Grains',
  'farro': 'Pasta & Grains',

  // Spices & Seasonings
  'cumin': 'Spices & Seasonings', 'paprika': 'Spices & Seasonings',
  'cinnamon': 'Spices & Seasonings', 'nutmeg': 'Spices & Seasonings',
  'turmeric': 'Spices & Seasonings', 'coriander': 'Spices & Seasonings',
  'cardamom': 'Spices & Seasonings', 'clove': 'Spices & Seasonings',
  'allspice': 'Spices & Seasonings', 'cayenne': 'Spices & Seasonings',
  'curry': 'Spices & Seasonings', 'seasoning': 'Spices & Seasonings',
  'salt': 'Spices & Seasonings',

  // Condiments & Sauces
  'worcestershire': 'Condiments & Sauces', 'sriracha': 'Condiments & Sauces',
  'ketchup': 'Condiments & Sauces', 'mustard': 'Condiments & Sauces',
  'mayonnaise': 'Condiments & Sauces', 'mayo': 'Condiments & Sauces',
  'salsa': 'Condiments & Sauces', 'barbecue': 'Condiments & Sauces',
  'bbq': 'Condiments & Sauces', 'teriyaki': 'Condiments & Sauces',
  'hoisin': 'Condiments & Sauces', 'tahini': 'Condiments & Sauces',
  'pesto': 'Condiments & Sauces', 'miso': 'Condiments & Sauces',
  'marinara': 'Condiments & Sauces', 'jam': 'Condiments & Sauces',
  'honey': 'Condiments & Sauces', 'molasses': 'Condiments & Sauces',

  // Baking
  'flour': 'Baking', 'sugar': 'Baking', 'confectioner': 'Baking',
  'yeast': 'Baking', 'vanilla': 'Baking', 'cocoa': 'Baking', 'chocolate': 'Baking',
  'cornstarch': 'Baking', 'gelatin': 'Baking', 'food coloring': 'Baking',
  'sprinkle': 'Baking',

  // Oils & Vinegars
  'oil': 'Oils & Vinegars', 'vinegar': 'Oils & Vinegars', 'balsamic': 'Oils & Vinegars',

  // Beverages
  'wine': 'Beverages', 'beer': 'Beverages', 'broth': 'Pantry',
  'stock': 'Pantry', 'juice': 'Beverages', 'coffee': 'Beverages',
  'tea': 'Beverages',

  // Nuts & Seeds (→ Pantry)
  'almond': 'Pantry', 'walnut': 'Pantry', 'pecan': 'Pantry', 'cashew': 'Pantry',
  'peanut': 'Pantry', 'pistachio': 'Pantry', 'pine nut': 'Pantry',
  'sesame seed': 'Pantry', 'sunflower seed': 'Pantry', 'pumpkin seed': 'Pantry',
  'flax': 'Pantry', 'chia': 'Pantry',
  'dried': 'Pantry', 'raisin': 'Pantry', 'craisin': 'Pantry',
  'breadcrumb': 'Pantry', 'panko': 'Pantry', 'cracker': 'Pantry',
  'chip': 'Pantry',
  'tofu': 'Pantry', 'tempeh': 'Pantry',
  'water': 'Other',
};

// Sort keywords by length descending so longer (more specific) matches come first
const SORTED_KEYWORDS = Object.entries(KEYWORD_MAP)
  .sort(([a], [b]) => b.length - a.length);

/**
 * Categorize an ingredient name into a store section.
 * @param {string} name - The ingredient name (e.g., "parmesan cheese", "olive oil")
 * @returns {string} Category name from CATEGORY_ORDER
 */
export function categorizeIngredient(name) {
  if (!name) return 'Other';

  const lower = name.toLowerCase()
    .replace(/\b(fresh|frozen|organic|large|small|medium|whole|ground|minced|diced|chopped|sliced|shredded|grated|boneless|skinless|extra|virgin)\b/g, '')
    .trim();

  for (const [keyword, category] of SORTED_KEYWORDS) {
    if (lower.includes(keyword)) {
      return category;
    }
  }

  return 'Other';
}

/**
 * Group an array of grocery items by store section.
 * @param {Array} items - Array of { id, name, amount, unit, checked, ... }
 * @returns {Array} Array of { category, items[] } in store-walk order
 */
export function groupByCategory(items) {
  const groups = {};

  for (const item of items) {
    const category = categorizeIngredient(item.name);
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  }

  // Sort pantry items to bottom within each group
  Object.values(groups).forEach(groupItems => {
    groupItems.sort((a, b) => {
      const aPantry = a.in_pantry ? 1 : 0;
      const bPantry = b.in_pantry ? 1 : 0;
      return aPantry - bPantry;
    });
  });

  return CATEGORY_ORDER
    .filter(cat => groups[cat])
    .map(cat => ({ category: cat, items: groups[cat] }));
}

export { CATEGORY_ORDER };
