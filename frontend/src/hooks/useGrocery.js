import { useState, useCallback } from 'react';
import * as api from '../services/api';

export function useGrocery() {
  const [lists, setLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getGroceryLists();
      setLists(data.lists || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchList = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getGroceryList(id);
      setCurrentList(data.list || data);
      return data.list || data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createList = useCallback(async (name) => {
    setError(null);
    try {
      const data = await api.createGroceryList(name);
      const newList = data.list || data;
      setLists(prev => [...prev, newList]);
      return newList;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const addItem = useCallback(async (listId, item) => {
    setError(null);
    try {
      const data = await api.addGroceryItem(listId, item);
      const newItem = data.item || data;
      setCurrentList(prev => {
        if (!prev || prev.id !== listId) return prev;
        return { ...prev, items: [...(prev.items || []), newItem] };
      });
      return newItem;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateItem = useCallback(async (listId, itemId, fields) => {
    setError(null);
    try {
      const data = await api.updateGroceryItem(listId, itemId, fields);
      const updatedItem = data.item || data;
      setCurrentList(prev => {
        if (!prev || prev.id !== listId) return prev;
        return {
          ...prev,
          items: (prev.items || []).map(item =>
            item.id === itemId ? { ...item, ...updatedItem } : item
          ),
        };
      });
      return updatedItem;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeItem = useCallback(async (listId, itemId) => {
    setError(null);
    try {
      await api.deleteGroceryItem(listId, itemId);
      setCurrentList(prev => {
        if (!prev || prev.id !== listId) return prev;
        return {
          ...prev,
          items: (prev.items || []).filter(item => item.id !== itemId),
        };
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteList = useCallback(async (id) => {
    setError(null);
    try {
      await api.deleteGroceryList(id);
      setLists(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const clearChecked = useCallback(async (listId) => {
    setError(null);
    try {
      const data = await api.clearCheckedItems(listId);
      setCurrentList(prev => {
        if (!prev || prev.id !== listId) return prev;
        return { ...prev, items: (prev.items || []).filter(item => !item.checked) };
      });
      return data.removed || 0;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const addRecipeToList = useCallback(async (listId, recipeId) => {
    setError(null);
    try {
      const data = await api.addRecipeToGrocery(listId, recipeId);
      // Refresh the list to get updated items
      await fetchList(listId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchList]);

  return {
    lists,
    currentList,
    isLoading,
    error,
    fetchLists,
    fetchList,
    createList,
    deleteList,
    addItem,
    updateItem,
    removeItem,
    clearChecked,
    addRecipeToList,
  };
}

export default useGrocery;
