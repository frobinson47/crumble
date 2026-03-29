/**
 * Estimate recipe difficulty from structural data.
 * Works with both full recipe objects (RecipePage) and list summaries (RecipeCard).
 * Returns 'Easy', 'Medium', or 'Hard'.
 */
export function estimateDifficulty(recipe) {
  // Ingredient count: from ingredients array or ingredient_count field
  const ingCount = recipe.ingredients?.length || recipe.ingredient_count || 0;

  // Step count: from instructions array, JSON string, or step_count field
  let stepCount = recipe.step_count || 0;
  if (!stepCount && recipe.instructions) {
    stepCount = Array.isArray(recipe.instructions)
      ? recipe.instructions.length
      : typeof recipe.instructions === 'string'
        ? (JSON.parse(recipe.instructions || '[]')).length
        : 0;
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  // Normalize each factor to 0-10 scale
  const ingScore = Math.min(ingCount / 2, 10);     // 20+ ingredients = max
  const stepScore = Math.min(stepCount / 1.5, 10);  // 15+ steps = max
  const timeScore = Math.min(totalTime / 12, 10);   // 120+ min = max

  // Weighted combination (steps matter most, then ingredients, then time)
  const score = (stepScore * 0.45) + (ingScore * 0.35) + (timeScore * 0.20);

  if (score <= 3) return 'Easy';
  if (score <= 6) return 'Medium';
  return 'Hard';
}

export const DIFFICULTY_COLORS = {
  Easy: 'bg-sage/15 text-sage',
  Medium: 'bg-terracotta/15 text-terracotta',
  Hard: 'bg-terracotta-dark/15 text-terracotta-dark',
};
