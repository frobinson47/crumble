import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChefHat, Users } from 'lucide-react';
import { thumbImageUrl } from '../../utils/imageUrl';
import StarRating from '../ui/StarRating';
import FavoriteButton from './FavoriteButton';

export default function RecipeListItem({ recipe }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const thumb = thumbImageUrl(recipe.image_path);

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="flex items-center gap-4 px-4 py-3 bg-surface rounded-xl shadow-sm hover:shadow-warm transition-all duration-150 group"
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-surface-sunken">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat size={24} className="text-warm-gray/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-bold text-brown font-serif leading-tight truncate group-hover:text-terracotta transition-colors">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-2.5 mt-1 text-xs text-warm-gray">
          <StarRating value={recipe.avg_rating || 0} size="xs" />
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users size={12} />
              {recipe.servings}
            </span>
          )}
          {recipe.cook_count > 0 && (
            <span className="flex items-center gap-1 text-sage">
              <ChefHat size={12} />
              {recipe.cook_count}×
            </span>
          )}
        </div>
      </div>

      {/* Tags (desktop only) */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="hidden md:flex gap-1 shrink-0">
          {recipe.tags.slice(0, 2).map(tag => (
            <span key={tag.id || tag.name || tag} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-brown-light">
              {tag.name || tag}
            </span>
          ))}
        </div>
      )}

      {/* Time */}
      {totalTime > 0 && (
        <span className="text-sm font-semibold text-brown-light shrink-0 min-w-[50px] text-right">
          {totalTime} min
        </span>
      )}
    </Link>
  );
}
