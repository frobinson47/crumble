import React from 'react';
import RecipeCard from './RecipeCard';
import RecipeListItem from './RecipeListItem';
import RecipeCompactItem from './RecipeCompactItem';
import { RecipeCardSkeleton } from '../ui/Skeleton';
import { BookOpen } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

export default function RecipeGrid({ recipes, isLoading, hasMore, onLoadMore, density = 'grid' }) {
  if (isLoading && recipes.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <RecipeCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!isLoading && recipes.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        accent="cream"
        title="No recipes found"
        description="Try a different search or add a new recipe."
        actionLabel="Add Recipe"
        actionTo="/add"
      />
    );
  }

  const loadMoreBtn = hasMore && (
    <div className="flex justify-center mt-8 mb-4">
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="px-8 py-4 bg-terracotta text-white font-bold rounded-xl hover:bg-terracotta-dark transition-colors duration-200 min-h-[48px] disabled:opacity-50 text-base"
      >
        {isLoading ? 'Loading...' : 'Load More Recipes'}
      </button>
    </div>
  );

  if (density === 'list') {
    return (
      <div>
        <div className="flex flex-col gap-2">
          {recipes.map((recipe) => (
            <RecipeListItem key={recipe.id} recipe={recipe} />
          ))}
        </div>
        {loadMoreBtn}
      </div>
    );
  }

  if (density === 'compact') {
    return (
      <div>
        <div className="flex flex-col gap-px bg-cream-dark rounded-xl overflow-hidden">
          {recipes.map((recipe) => (
            <RecipeCompactItem key={recipe.id} recipe={recipe} />
          ))}
        </div>
        {loadMoreBtn}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
      {loadMoreBtn}
    </div>
  );
}
