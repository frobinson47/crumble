import { useState, useCallback } from 'react';
import * as api from '../services/api';

export function usePantry() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPantry = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getPantryItems();
      setItems(data.items || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = useCallback(async (ingredientName) => {
    setError(null);
    try {
      const data = await api.addPantryItem(ingredientName);
      const newItem = data.item || data;
      setItems(prev => {
        if (prev.some(i => i.id === newItem.id)) return prev;
        return [...prev, newItem].sort((a, b) =>
          a.ingredient_name.localeCompare(b.ingredient_name)
        );
      });
      return newItem;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeItem = useCallback(async (id) => {
    setError(null);
    try {
      await api.removePantryItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const isInPantry = useCallback((ingredientName) => {
    const normalized = ingredientName.toLowerCase().trim();
    return items.some(i => i.ingredient_name.toLowerCase().trim() === normalized);
  }, [items]);

  return { items, isLoading, error, fetchPantry, addItem, removeItem, isInPantry };
}

export default usePantry;
