import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Clock, ArrowRight } from 'lucide-react';
import RecipeGrid from '../components/recipe/RecipeGrid';
import useRecipes from '../hooks/useRecipes';
import useRecentlyViewed from '../hooks/useRecentlyViewed';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';

export default function HomePage({ searchQuery = '' }) {
  const { recipes, pagination, isLoading, fetchRecipes } = useRecipes();
  const { user } = useAuth();
  const { recent } = useRecentlyViewed();
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchQuery || searchParams.get('search') || '');
  const [activeTag, setActiveTag] = useState(searchParams.get('tag') || '');
  const [tags, setTags] = useState([]);
  const [featured, setFeatured] = useState(null);
  const debounceRef = useRef(null);

  // Fetch tags
  useEffect(() => {
    api.getTags()
      .then(data => setTags(data.tags || data || []))
      .catch(() => {});
  }, []);

  // Fetch featured recipe
  useEffect(() => {
    api.getFeaturedRecipe()
      .then(data => setFeatured(data.recipe))
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

  const isFiltering = localSearch || activeTag;

  return (
    <div className="space-y-6">
      {/* Hero / Featured Recipe */}
      {featured && !isFiltering && (
        <Link
          to={`/recipe/${featured.id}`}
          className="group block relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="aspect-[21/9] md:aspect-[3/1]">
            <img
              src={`/uploads/${featured.image_path}`}
              alt={featured.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-brown/80 via-brown/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white font-serif mb-2 drop-shadow-lg">
              {featured.title}
            </h2>
            {featured.description && (
              <p className="text-white/80 text-sm md:text-base line-clamp-2 max-w-2xl mb-3">
                {featured.description}
              </p>
            )}
            <span className="inline-flex items-center gap-1 text-white/90 text-sm font-semibold group-hover:text-white transition-colors">
              View Recipe <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      )}

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

      {/* Quick filter chips */}
      {tags.length > 0 && (
        <div className="overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          <div className="flex gap-2 min-w-min">
            <button
              onClick={() => setActiveTag('')}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 min-h-[36px] ${
                !activeTag
                  ? 'bg-terracotta text-white'
                  : 'bg-cream hover:bg-terracotta/10 text-brown-light hover:text-terracotta'
              }`}
            >
              All
            </button>
            {tags.map(tag => (
              <button
                key={tag.id || tag.name}
                onClick={() => handleTagClick(tag.name || tag)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 min-h-[36px] ${
                  activeTag === (tag.name || tag)
                    ? 'bg-terracotta text-white'
                    : 'bg-cream hover:bg-terracotta/10 text-brown-light hover:text-terracotta'
                }`}
              >
                {tag.name || tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      {recent.length > 0 && !isFiltering && (
        <div>
          <h2 className="text-lg font-bold text-brown mb-3">Recently Viewed</h2>
          <div className="overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            <div className="flex gap-3 min-w-min">
              {recent.map(r => (
                <Link
                  key={r.id}
                  to={`/recipe/${r.id}`}
                  className="shrink-0 w-[120px] group"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-cream-dark mb-1.5 shadow-sm">
                    {r.image_path ? (
                      <img
                        src={`/uploads/${r.image_path}`}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream to-cream-dark">
                        <Clock size={24} className="text-warm-gray/40" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-brown line-clamp-2 group-hover:text-terracotta transition-colors duration-200">
                    {r.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
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
