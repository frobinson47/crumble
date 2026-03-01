import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, UtensilsCrossed } from 'lucide-react';
import * as api from '../../services/api';

export default function RelatedRecipes({ recipeId }) {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recipeId) return;
    setLoading(true);
    api.getRelatedRecipes(recipeId)
      .then(data => setRelated(data.recipes || []))
      .catch(() => setRelated([]))
      .finally(() => setLoading(false));
  }, [recipeId]);

  if (loading || related.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold text-brown mb-4 font-serif">Related Recipes</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {related.map(recipe => {
          const imageUrl = recipe.image_path ? `/uploads/${recipe.image_path}` : null;
          const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
          return (
            <Link
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              className="group block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              <div className="aspect-[4/3] bg-cream-dark overflow-hidden">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream to-cream-dark">
                    <UtensilsCrossed size={32} className="text-warm-gray/40" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-brown line-clamp-2 group-hover:text-terracotta transition-colors duration-200 font-serif">
                  {recipe.title}
                </h3>
                {totalTime > 0 && (
                  <div className="flex items-center gap-1 text-xs text-warm-gray mt-1">
                    <Clock size={12} />
                    {totalTime} min
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
