import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import * as api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function FavoriteButton({ recipeId, initialFavorited = false, size = 'md', overlay = false }) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setFavorited(!favorited);
    try {
      const result = await api.toggleFavorite(recipeId);
      setFavorited(result.favorited);
    } catch {
      setFavorited(favorited);
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center justify-center transition-all duration-200 min-w-[44px] min-h-[44px]
        ${overlay
          ? 'absolute top-2 right-2 z-10 p-2 rounded-full bg-surface/80 backdrop-blur-sm hover:bg-surface shadow-sm'
          : 'p-2 rounded-xl hover:bg-cream-dark'
        }
        ${favorited ? 'text-red-500' : 'text-warm-gray hover:text-red-400'}
      `}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        size={iconSize}
        fill={favorited ? 'currentColor' : 'none'}
        className={`transition-transform duration-200 ${loading ? 'scale-90' : 'scale-100'}`}
      />
    </button>
  );
}
