import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, UtensilsCrossed } from 'lucide-react';
import TagBadge from '../ui/TagBadge';
import StarRating from '../ui/StarRating';
import FavoriteButton from './FavoriteButton';

export default function RecipeCard({ recipe }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const imageUrl = recipe.image_path
    ? `/uploads/${recipe.image_path}`
    : null;

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="group block bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-cream-dark overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream to-cream-dark">
            <UtensilsCrossed size={48} className="text-warm-gray/40" />
          </div>
        )}

        {/* Favorite overlay */}
        <FavoriteButton
          recipeId={recipe.id}
          initialFavorited={recipe.is_favorited}
          size="sm"
          overlay
        />

        {/* Time badge */}
        {totalTime > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-brown/70 text-white px-2 py-1 rounded-lg text-xs">
            <Clock size={12} />
            {totalTime} min
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-brown mb-1 line-clamp-2 group-hover:text-terracotta transition-colors duration-200 font-serif">
          {recipe.title}
        </h3>

        {/* Star rating */}
        {recipe.avg_rating && (
          <div className="mb-2">
            <StarRating value={recipe.avg_rating} size="sm" />
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-warm-gray mb-3">
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users size={14} />
              {recipe.servings}
            </span>
          )}
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id || tag.name || tag} tag={tag.name || tag} />
            ))}
            {recipe.tags.length > 3 && (
              <span className="text-xs text-warm-gray self-center">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
