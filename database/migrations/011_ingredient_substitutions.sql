CREATE TABLE IF NOT EXISTS ingredient_substitutions (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  ingredient VARCHAR(255) NOT NULL,
  substitute VARCHAR(255) NOT NULL,
  ratio VARCHAR(50) DEFAULT '1:1',
  notes TEXT DEFAULT NULL,
  UNIQUE KEY unique_sub (ingredient, substitute)
) ENGINE=InnoDB;

CREATE INDEX idx_sub_ingredient ON ingredient_substitutions(ingredient);

-- Seed common substitutions
INSERT IGNORE INTO ingredient_substitutions (ingredient, substitute, ratio, notes) VALUES
-- Dairy
('butter', 'coconut oil', '1:1', 'Works for baking and sautéing'),
('butter', 'olive oil', '3/4 cup per 1 cup', 'Not for baking, good for savory'),
('butter', 'applesauce', '1:1', 'For baking only, reduces fat'),
('milk', 'oat milk', '1:1', 'Best dairy-free substitute for baking'),
('milk', 'almond milk', '1:1', 'Thinner than dairy milk'),
('milk', 'coconut milk', '1:1', 'Adds coconut flavor, rich'),
('heavy cream', 'coconut cream', '1:1', 'Dairy-free, similar richness'),
('sour cream', 'greek yogurt', '1:1', 'Lower fat, similar tang'),
('cream cheese', 'mascarpone', '1:1', 'Richer, slightly sweeter'),
('parmesan', 'pecorino romano', '1:1', 'Sharper, saltier'),
('mozzarella', 'provolone', '1:1', 'Similar melt, stronger flavor'),
('egg', 'flax egg', '1 tbsp ground flax + 3 tbsp water per egg', 'Vegan, works for baking'),
('egg', 'applesauce', '1/4 cup per egg', 'Vegan, for baking only'),
('egg', 'banana', '1/2 mashed banana per egg', 'Adds sweetness, for baking'),
('yogurt', 'sour cream', '1:1', 'Higher fat, less tangy'),

-- Oils & Fats
('olive oil', 'avocado oil', '1:1', 'Higher smoke point'),
('olive oil', 'coconut oil', '1:1', 'Adds coconut flavor'),
('vegetable oil', 'canola oil', '1:1', 'Neutral flavor'),
('vegetable oil', 'melted butter', '1:1', 'Adds richness'),

-- Baking
('flour', 'almond flour', '1:1', 'Gluten-free, denser result'),
('flour', 'oat flour', '1:1', 'Blend oats in food processor'),
('brown sugar', 'white sugar + molasses', '1 cup + 1 tbsp molasses', 'Exact substitute'),
('sugar', 'honey', '3/4 cup per 1 cup', 'Reduce other liquids slightly'),
('sugar', 'maple syrup', '3/4 cup per 1 cup', 'Adds maple flavor'),
('baking powder', 'baking soda + cream of tartar', '1/4 tsp soda + 1/2 tsp cream of tartar per 1 tsp', NULL),
('cornstarch', 'flour', '2 tbsp flour per 1 tbsp cornstarch', 'For thickening'),
('vanilla extract', 'maple syrup', '1:1', 'Different flavor but works'),
('chocolate chips', 'cocoa powder + sugar + butter', '3 tbsp cocoa + 1 tbsp sugar + 1 tbsp butter per 1 oz', NULL),

-- Alliums
('onion', 'shallot', '3 shallots per 1 onion', 'Milder, slightly sweet'),
('garlic', 'garlic powder', '1/8 tsp per clove', 'Less pungent'),
('shallot', 'red onion', '1:1', 'Stronger flavor'),
('scallion', 'chives', '1:1', 'Milder'),
('leek', 'onion', '1:1', 'Stronger, less sweet'),

-- Proteins
('chicken breast', 'turkey breast', '1:1', 'Leaner, similar texture'),
('chicken breast', 'tofu', '1:1', 'Press firm tofu, vegan option'),
('ground beef', 'ground turkey', '1:1', 'Leaner'),
('ground beef', 'lentils', '1:1', 'Vegan, add spices'),
('bacon', 'turkey bacon', '1:1', 'Lower fat'),
('salmon', 'trout', '1:1', 'Similar flavor and texture'),

-- Acids & Vinegars
('lemon juice', 'lime juice', '1:1', 'Slightly different flavor'),
('lemon juice', 'white wine vinegar', '1/2 amount', 'Stronger, use less'),
('red wine vinegar', 'balsamic vinegar', '1:1', 'Sweeter'),
('rice vinegar', 'apple cider vinegar', '1:1', 'Slightly stronger'),

-- Sauces & Condiments
('soy sauce', 'tamari', '1:1', 'Gluten-free option'),
('soy sauce', 'coconut aminos', '1:1', 'Lower sodium, slightly sweet'),
('worcestershire sauce', 'soy sauce + vinegar', '1:1 with splash of vinegar', NULL),
('dijon mustard', 'yellow mustard + pinch of sugar', '1:1', 'Milder'),
('hot sauce', 'red pepper flakes', '1/4 tsp per tsp', 'Dry heat, no vinegar tang'),
('tomato paste', 'ketchup', '1:1', 'Sweeter, thinner'),

-- Herbs & Spices
('basil', 'oregano', '1:1', 'Different flavor, works in Italian'),
('cilantro', 'parsley', '1:1', 'For cilantro haters'),
('parsley', 'cilantro', '1:1', 'Adds more flavor'),
('thyme', 'oregano', '1:1', 'Similar earthy flavor'),
('cumin', 'coriander', '1:1', 'Lighter, citrusy'),
('paprika', 'cayenne + pinch', '1/4 amount', 'Much hotter, use less'),
('italian seasoning', 'oregano + basil + thyme', 'equal parts', NULL),

-- Starches & Grains
('rice', 'quinoa', '1:1', 'Higher protein'),
('rice', 'cauliflower rice', '1:1', 'Low carb option'),
('pasta', 'zucchini noodles', '1:1', 'Low carb, spiralize'),
('bread crumbs', 'crushed crackers', '1:1', NULL),
('bread crumbs', 'oats', '1:1', 'Blend for finer texture'),

-- Liquids
('chicken broth', 'vegetable broth', '1:1', 'Vegetarian option'),
('white wine', 'chicken broth + splash of vinegar', '1:1', NULL),
('red wine', 'beef broth + splash of vinegar', '1:1', NULL),
('beer', 'chicken broth', '1:1', 'For cooking only'),
('coconut milk', 'heavy cream', '1:1', 'Not dairy-free but works');
