import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import RecipeGrid from '../components/recipe/RecipeGrid';
import TagBadge from '../components/ui/TagBadge';
import Spinner from '../components/ui/Spinner';
import useRecipes from '../hooks/useRecipes';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';

export default function HomePage({ searchQuery = '' }) {
  const { recipes, pagination, isLoading, fetchRecipes } = useRecipes();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchQuery || searchParams.get('search') || '');
  const [activeTag, setActiveTag] = useState(searchParams.get('tag') || '');
  const [tags, setTags] = useState([]);
  const debounceRef = useRef(null);

  // Fetch tags
  useEffect(() => {
    api.getTags()
      .then(data => setTags(data.tags || data || []))
      .catch(() => {});
  }, []);

  // Fetch recipes on search/tag/page change
  const loadRecipes = useCallback((params = {}) => {
    fetchRecipes({
      page: params.page || 1,
      perPage: 20,
      search: params.search !== undefined ? params.search : localSearch,
      tag: params.tag !== undefined ? params.tag : activeTag,
    });
  }, [fetchRecipes, localSearch, activeTag]);

  // Initial load
  useEffect(() => {
    loadRecipes({ page: 1 });
  }, [activeTag]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync with searchQuery prop from Layout
  useEffect(() => {
    if (searchQuery !== undefined && searchQuery !== localSearch) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadRecipes({ page: 1, search: localSearch });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTagClick = (tagName) => {
    const newTag = activeTag === tagName ? '' : tagName;
    setActiveTag(newTag);
  };

  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`Delete tag "${tag.name}"? It will be removed from all recipes.`)) return;
    try {
      await api.deleteTag(tag.id);
      setTags(prev => prev.filter(t => t.id !== tag.id));
      if (activeTag === tag.name) setActiveTag('');
    } catch {
      // Silently fail
    }
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages) {
      fetchRecipes({
        page: pagination.page + 1,
        perPage: 20,
        search: localSearch,
        tag: activeTag,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Desktop header with search */}
      <div className="hidden md:flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown">Recipes</h1>
        <Link
          to="/add"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors duration-200 min-h-[44px]"
        >
          <Plus size={20} />
          Add Recipe
        </Link>
      </div>

      {/* Search bar (visible on desktop in main content) */}
      <div className="hidden md:block">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={18} />
          <input
            type="text"
            placeholder="Search recipes..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-dark bg-white text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors duration-200"
          />
        </div>
      </div>

      {/* Tag filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <TagBadge
              key={tag.id || tag.name}
              tag={tag.name || tag}
              isActive={activeTag === (tag.name || tag)}
              onClick={() => handleTagClick(tag.name || tag)}
              onRemove={user ? () => handleDeleteTag(tag) : undefined}
            />
          ))}
        </div>
      )}

      {/* Recipe grid */}
      <RecipeGrid
        recipes={recipes}
        isLoading={isLoading}
        hasMore={pagination.page < pagination.totalPages}
        onLoadMore={handleLoadMore}
      />

      {/* Mobile FAB */}
      <Link
        to="/add"
        className="md:hidden fixed bottom-20 right-4 z-20 w-14 h-14 bg-terracotta text-white rounded-full shadow-lg flex items-center justify-center hover:bg-terracotta-dark transition-colors duration-200"
        aria-label="Add recipe"
      >
        <Plus size={28} />
      </Link>
    </div>
  );
}
