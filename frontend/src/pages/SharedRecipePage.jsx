import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Users, ExternalLink } from 'lucide-react';
import { getSharedRecipe } from '../services/api';
import IngredientList from '../components/recipe/IngredientList';
import StepList from '../components/recipe/StepList';
import NutritionFacts from '../components/recipe/NutritionFacts';
import TagBadge from '../components/ui/TagBadge';
import Spinner from '../components/ui/Spinner';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { fullImageUrl } from '../utils/imageUrl';
import { estimateDifficulty, DIFFICULTY_COLORS } from '../utils/recipeDifficulty';
import { buildRecipeJsonLd, injectJsonLd, removeJsonLd } from '../utils/recipeJsonLd';

export default function SharedRecipePage() {
  const { token } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useDocumentTitle(recipe?.title);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        const data = await getSharedRecipe(token);
        setRecipe(data);
        const ld = buildRecipeJsonLd(data);
        injectJsonLd(ld);
      } catch (err) {
        setError(err.message || 'This link has expired or doesn\'t exist');
      } finally {
        setLoading(false);
      }
    }
    fetchRecipe();
    return () => removeJsonLd();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="py-4 px-6 border-b border-cream-dark">
          <div className="max-w-2xl mx-auto">
            <span className="font-serif text-2xl text-terracotta font-bold">Cookslate</span>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-surface rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-brown font-serif mb-3">Link Expired or Not Found</h1>
            <p className="text-brown-light">
              This shared recipe link has expired or doesn't exist. Please ask the recipe owner for a new link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = fullImageUrl(recipe.image_path);
  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : typeof recipe.instructions === 'string'
      ? JSON.parse(recipe.instructions)
      : [];
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  let sourceDomain = null;
  if (recipe.source_url) {
    try {
      sourceDomain = new URL(recipe.source_url).hostname.replace(/^www\./, '');
    } catch {
      sourceDomain = recipe.source_url;
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="py-4 px-6 border-b border-cream-dark">
        <div className="max-w-2xl mx-auto">
          <span className="font-serif text-2xl text-terracotta font-bold">Cookslate</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="bg-surface rounded-2xl shadow-lg p-6 md:p-8">
          {/* Image */}
          {imageUrl && (
            <div className="aspect-[16/9] rounded-xl overflow-hidden mb-6 -mx-6 -mt-6 md:-mx-8 md:-mt-8 md:rounded-t-2xl md:rounded-b-xl">
              <img
                src={imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-brown mb-2">
            {recipe.title}
          </h1>

          {/* Description */}
          {recipe.description && (
            <p className="text-brown-light text-lg leading-relaxed mb-4">
              {recipe.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {recipe.prep_time > 0 && (
              <div className="flex items-center gap-1.5 text-brown-light">
                <Clock size={18} className="text-terracotta" />
                <span className="text-sm">
                  <span className="font-semibold">Prep:</span> {recipe.prep_time} min
                </span>
              </div>
            )}
            {recipe.cook_time > 0 && (
              <div className="flex items-center gap-1.5 text-brown-light">
                <Clock size={18} className="text-terracotta" />
                <span className="text-sm">
                  <span className="font-semibold">Cook:</span> {recipe.cook_time} min
                </span>
              </div>
            )}
            {totalTime > 0 && (
              <div className="flex items-center gap-1.5 text-brown-light">
                <Clock size={18} className="text-sage" />
                <span className="text-sm font-semibold">Total: {totalTime} min</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1.5 text-brown-light">
                <Users size={18} className="text-terracotta" />
                <span className="text-sm">
                  <span className="font-semibold">Servings:</span> {recipe.servings}
                </span>
              </div>
            )}
            {(() => {
              const difficulty = estimateDifficulty(recipe);
              return (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[difficulty]}`}>
                  {difficulty}
                </span>
              );
            })()}
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {recipe.tags.map((tag, index) => (
                <TagBadge key={index} tag={typeof tag === 'string' ? tag : tag.name || tag} />
              ))}
            </div>
          )}

          {/* Nutrition */}
          <NutritionFacts nutrition={{
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            fiber: recipe.fiber,
            sugar: recipe.sugar,
          }} />

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-brown mb-4">Ingredients</h2>
              <IngredientList ingredients={recipe.ingredients} />
            </div>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-brown mb-4">Instructions</h2>
              <StepList steps={instructions} />
            </div>
          )}

          {/* Source URL */}
          {recipe.source_url && (
            <div className="mb-6">
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-terracotta hover:text-terracotta-dark transition-colors text-sm"
              >
                <ExternalLink size={14} />
                {sourceDomain}
              </a>
            </div>
          )}

          {/* Expiration notice */}
          {recipe.expires_at && (
            <p className="text-xs text-warm-gray border-t border-cream-dark pt-4">
              This link expires on {new Date(recipe.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-warm-gray text-sm">
          Made with <span className="font-serif text-terracotta font-semibold">Cookslate</span> &middot; Your recipe manager
        </p>
      </footer>
    </div>
  );
}
