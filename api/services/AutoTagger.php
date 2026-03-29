<?php

/**
 * Suggests tags for a recipe based on its title, description, and ingredients.
 * Uses keyword matching — no external services or ML.
 */
class AutoTagger {

    /**
     * Tag rules: tag name => array of trigger keywords.
     * A tag is suggested if ANY keyword appears in the recipe text.
     * Keywords are matched as whole words (case-insensitive).
     */
    private const TAG_RULES = [
        // Protein
        'chicken'    => ['chicken', 'poultry'],
        'beef'       => ['beef', 'steak', 'ground beef', 'sirloin', 'chuck', 'brisket', 'flank'],
        'pork'       => ['pork', 'bacon', 'ham', 'prosciutto', 'pancetta', 'sausage'],
        'seafood'    => ['shrimp', 'salmon', 'tuna', 'cod', 'tilapia', 'fish', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'oyster', 'prawn'],
        'vegetarian' => ['vegetarian', 'meatless'],
        'vegan'      => ['vegan'],

        // Meal type
        'breakfast'  => ['breakfast', 'brunch', 'pancake', 'waffle', 'omelet', 'omelette', 'french toast', 'scrambled egg'],
        'soup'       => ['soup', 'stew', 'chowder', 'bisque', 'broth', 'chili'],
        'salad'      => ['salad', 'slaw', 'coleslaw'],
        'sandwich'   => ['sandwich', 'burger', 'wrap', 'panini', 'sub'],
        'pasta'      => ['pasta', 'spaghetti', 'penne', 'linguine', 'fettuccine', 'macaroni', 'lasagna', 'noodle', 'rigatoni', 'orzo', 'ravioli'],
        'rice'       => ['fried rice', 'risotto', 'rice bowl', 'rice pilaf', 'biryani', 'paella'],
        'appetizer'  => ['appetizer', 'bruschetta', 'dip', 'hummus', 'crostini', 'canape'],

        // Dessert
        'dessert'    => ['dessert', 'cake', 'cookie', 'brownie', 'pie', 'tart', 'pudding', 'mousse', 'ice cream', 'cheesecake', 'fudge', 'cupcake', 'truffle', 'cobbler', 'crumble', 'crisp'],
        'baking'     => ['bake', 'baking', 'bread', 'muffin', 'scone', 'biscuit', 'pastry', 'dough', 'yeast', 'sourdough', 'roll'],

        // Cuisine
        'italian'    => ['italian', 'marinara', 'pesto', 'parmesan', 'risotto', 'bruschetta', 'caprese'],
        'mexican'    => ['mexican', 'taco', 'burrito', 'enchilada', 'quesadilla', 'salsa', 'guacamole', 'tortilla', 'chipotle'],
        'asian'      => ['asian', 'stir fry', 'stir-fry', 'teriyaki', 'soy sauce', 'wok', 'sesame', 'ginger soy'],
        'indian'     => ['indian', 'curry', 'tikka', 'masala', 'naan', 'tandoori', 'dal', 'biryani', 'turmeric'],
        'mediterranean' => ['mediterranean', 'hummus', 'falafel', 'tahini', 'pita', 'tzatziki', 'greek'],

        // Method
        'grilling'   => ['grill', 'grilled', 'grilling', 'barbecue', 'bbq'],
        'slow cooker' => ['slow cooker', 'crockpot', 'crock pot', 'crock-pot'],
        'one pot'    => ['one pot', 'one-pot', 'sheet pan', 'sheet-pan', 'one pan'],
        'quick'      => ['15 minute', '15-minute', '20 minute', '20-minute', '30 minute', '30-minute', 'quick meal', 'weeknight'],
    ];

    /**
     * Suggest tags for a recipe.
     *
     * @param array $recipe Recipe data with title, description, ingredients
     * @return string[] Suggested tag names (lowercase)
     */
    public function suggest(array $recipe): array {
        // Build searchable text from recipe fields
        $parts = [];

        if (!empty($recipe['title'])) {
            // Title gets double weight by repeating it
            $parts[] = $recipe['title'];
            $parts[] = $recipe['title'];
        }

        if (!empty($recipe['description'])) {
            $parts[] = $recipe['description'];
        }

        // Ingredient names
        if (!empty($recipe['ingredients']) && is_array($recipe['ingredients'])) {
            foreach ($recipe['ingredients'] as $ing) {
                $name = is_array($ing) ? ($ing['name'] ?? '') : (string) $ing;
                if ($name) $parts[] = $name;
            }
        }

        $text = strtolower(implode(' ', $parts));
        if ($text === '') return [];

        $suggested = [];

        foreach (self::TAG_RULES as $tag => $keywords) {
            foreach ($keywords as $keyword) {
                // Match as whole word (word boundary)
                $pattern = '/\b' . preg_quote($keyword, '/') . '\b/i';
                if (preg_match($pattern, $text)) {
                    $suggested[] = $tag;
                    break; // One match is enough for this tag
                }
            }
        }

        // Time-based "quick" tag: if total time <= 30 minutes
        // Only apply when cook_time is known (otherwise missing cook_time makes everything look "quick")
        if (!in_array('quick', $suggested)) {
            $prepTime = $recipe['prep_time'] ?? 0;
            $cookTime = $recipe['cook_time'] ?? 0;
            if ($cookTime > 0 && ($prepTime + $cookTime) <= 30) {
                $suggested[] = 'quick';
            }
        }

        return $suggested;
    }
}
