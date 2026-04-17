import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChefHat } from 'lucide-react';

export default function RecipeCompactItem({ recipe }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="flex items-center gap-3 px-3.5 py-2 bg-surface hover:bg-cream-50 transition-colors min-h-[40px]"
    >
      {/* Favorite indicator */}
      <Heart
        size={14}
        className={`shrink-0 ${recipe.is_favorited ? 'text-red-500 fill-red-500' : 'text-cream-400'}`}
      />

      {/* Title */}
      <span className="flex-1 min-w-0 text-sm font-semibold text-brown truncate">
        {recipe.title}
      </span>

      {/* Rating */}
      {recipe.avg_rating > 0 && (
        <span className="text-[11px] text-amber-400 shrink-0 min-w-[40px]">
          {'★'.repeat(Math.round(recipe.avg_rating))}
        </span>
      )}

      {/* Tags (max 2) */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="hidden md:flex gap-1 shrink-0">
          {recipe.tags.slice(0, 2).map(tag => (
            <span key={tag.id || tag.name || tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-sunken text-brown-light">
              {tag.name || tag}
            </span>
          ))}
        </div>
      )}

      {/* Time */}
      {totalTime > 0 && (
        <span className="text-xs text-warm-gray shrink-0 min-w-[40px] text-right">
          {totalTime}m
        </span>
      )}

      {/* Cook count */}
      {recipe.cook_count > 0 && (
        <span className="text-[11px] font-semibold text-sage shrink-0 min-w-[24px] text-right">
          {recipe.cook_count}×
        </span>
      )}
    </Link>
  );
}
