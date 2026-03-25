import { useState, useCallback } from 'react';

const STORAGE_KEY = 'cookslate_recently_viewed';
const MAX_ITEMS = 10;

export default function useRecentlyViewed() {
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const addRecipe = useCallback((recipe) => {
    if (!recipe?.id) return;
    const entry = {
      id: recipe.id,
      title: recipe.title,
      image_path: recipe.image_path,
    };
    setRecent(prev => {
      const filtered = prev.filter(r => r.id !== recipe.id);
      const updated = [entry, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getRecent = useCallback(() => recent, [recent]);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecent([]);
  }, []);

  return { recent, addRecipe, getRecent, clear };
}
