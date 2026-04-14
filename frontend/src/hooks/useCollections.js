import { useState, useCallback } from 'react';
import * as api from '../services/api';

export function useCollections() {
  const [collections, setCollections] = useState([]);
  const [currentCollection, setCurrentCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCollections();
      setCollections(data.collections || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCollection = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCollection(id);
      setCurrentCollection(data.collection || data);
      return data.collection || data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCollection = useCallback(async (name, description) => {
    setError(null);
    try {
      const data = await api.createCollection(name, description);
      const newCol = data.collection || data;
      setCollections(prev => [...prev, newCol]);
      return newCol;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeCollection = useCallback(async (id) => {
    setError(null);
    try {
      await api.deleteCollection(id);
      setCollections(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const addRecipe = useCallback(async (collectionId, recipeId) => {
    await api.addRecipeToCollection(collectionId, recipeId);
  }, []);

  const removeRecipe = useCallback(async (collectionId, recipeId) => {
    await api.removeRecipeFromCollection(collectionId, recipeId);
  }, []);

  return {
    collections, currentCollection, isLoading, error,
    fetchCollections, fetchCollection, createCollection, removeCollection,
    addRecipe, removeRecipe,
  };
}

export default useCollections;
