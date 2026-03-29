import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import RecipeCard from '../components/recipe/RecipeCard';
import { RecipeCardSkeleton } from '../components/ui/Skeleton';
import * as api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function FavoritesPage() {
  useDocumentTitle('Favorites');

  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getFavorites()
      .then(data => setRecipes(data.recipes || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brown font-serif">Favorites</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl shadow-md">
          <Heart size={48} className="mx-auto text-warm-gray mb-3" />
          <p className="text-lg text-warm-gray">No favorites yet!</p>
          <p className="text-sm text-warm-gray mt-1">
            Tap the heart on any recipe to save it here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
