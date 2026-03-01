import { useState, useCallback } from 'react';
import * as api from '../services/api';

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecipes = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getRecipes(params);
      if (params.page > 1) {
        setRecipes(prev => [...prev, ...(data.recipes || [])]);
      } else {
        setRecipes(data.recipes || []);
      }
      setPagination({
        page: data.page || 1,
        totalPages: data.totalPages || 1,
        total: data.total || 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRecipe = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getRecipe(id);
      setRecipe(data.recipe || data);
      return data.recipe || data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRecipe = useCallback(async (data, imageFile) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.createRecipe(data, imageFile);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateRecipe = useCallback(async (id, data, imageFile) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.updateRecipe(id, data, imageFile);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeRecipe = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.deleteRecipe(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importRecipe = useCallback(async (url) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.importRecipe(url);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    recipes,
    recipe,
    pagination,
    isLoading,
    error,
    fetchRecipes,
    fetchRecipe,
    createRecipe,
    updateRecipe,
    removeRecipe,
    importRecipe,
  };
}

export default useRecipes;
