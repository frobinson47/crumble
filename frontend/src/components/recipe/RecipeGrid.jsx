import React from 'react';
import RecipeCard from './RecipeCard';
import Spinner from '../ui/Spinner';

export default function RecipeGrid({ recipes, isLoading, hasMore, onLoadMore }) {
  if (isLoading && recipes.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isLoading && recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-5xl mb-4">📖</p>
        <p className="text-lg text-warm-gray">No recipes found</p>
        <p className="text-sm text-warm-gray mt-1">Try a different search or add a new recipe</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-3 bg-cream-dark text-brown-light font-semibold rounded-xl hover:bg-terracotta/10 hover:text-terracotta transition-colors duration-200 min-h-[44px] disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More Recipes'}
          </button>
        </div>
      )}
    </div>
  );
}
