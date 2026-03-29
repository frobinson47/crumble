import { fullImageUrl } from './imageUrl';

/**
 * Build a Schema.org/Recipe JSON-LD object from a recipe.
 * Returns null if the recipe is missing essential data.
 */
export function buildRecipeJsonLd(recipe) {
  if (!recipe || !recipe.title) return null;

  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : typeof recipe.instructions === 'string'
      ? (() => { try { return JSON.parse(recipe.instructions); } catch { return []; } })()
      : [];

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
  };

  if (recipe.description) {
    ld.description = recipe.description;
  }

  if (recipe.image_path) {
    const img = fullImageUrl(recipe.image_path);
    if (img) ld.image = img.startsWith('http') ? img : `${window.location.origin}${img}`;
  }

  if (recipe.prep_time > 0) {
    ld.prepTime = `PT${recipe.prep_time}M`;
  }
  if (recipe.cook_time > 0) {
    ld.cookTime = `PT${recipe.cook_time}M`;
  }
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  if (totalTime > 0) {
    ld.totalTime = `PT${totalTime}M`;
  }

  if (recipe.servings) {
    ld.recipeYield = String(recipe.servings);
  }

  if (recipe.ingredients && recipe.ingredients.length > 0) {
    ld.recipeIngredient = recipe.ingredients.map(ing => {
      const parts = [];
      if (ing.amount) parts.push(ing.amount);
      if (ing.unit && ing.unit !== 'to taste') parts.push(ing.unit);
      parts.push(ing.name || '');
      if (ing.unit === 'to taste') parts.push('to taste');
      return parts.join(' ').trim();
    });
  }

  if (instructions.length > 0) {
    ld.recipeInstructions = instructions.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: typeof step === 'string' ? step : step.text || String(step),
    }));
  }

  if (recipe.tags && recipe.tags.length > 0) {
    ld.recipeCategory = recipe.tags.map(t => t.name || t).join(', ');
  }

  if (recipe.avg_rating !== null && recipe.avg_rating !== undefined && recipe.avg_rating > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: recipe.avg_rating,
      bestRating: 5,
    };
  }

  // Nutrition
  const nutrition = {};
  if (recipe.calories) nutrition.calories = `${recipe.calories} calories`;
  if (recipe.protein) nutrition.proteinContent = `${recipe.protein}g`;
  if (recipe.carbs) nutrition.carbohydrateContent = `${recipe.carbs}g`;
  if (recipe.fat) nutrition.fatContent = `${recipe.fat}g`;
  if (recipe.fiber) nutrition.fiberContent = `${recipe.fiber}g`;
  if (recipe.sugar) nutrition.sugarContent = `${recipe.sugar}g`;
  if (Object.keys(nutrition).length > 0) {
    ld.nutrition = { '@type': 'NutritionInformation', ...nutrition };
  }

  if (recipe.source_url) {
    ld.isBasedOn = recipe.source_url;
  }

  return ld;
}

/**
 * Inject or update a JSON-LD script tag in <head>.
 */
export function injectJsonLd(jsonLd) {
  if (!jsonLd) return;
  const id = 'recipe-jsonld';
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(jsonLd);
}

/**
 * Remove the JSON-LD script tag.
 */
export function removeJsonLd() {
  const script = document.getElementById('recipe-jsonld');
  if (script) script.remove();
}
