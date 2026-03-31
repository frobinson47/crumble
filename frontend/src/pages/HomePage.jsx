import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { Plus, Search, Clock, ArrowRight, UtensilsCrossed, X, ChefHat, CalendarDays, RotateCcw, Sparkles, Link2, FileUp, ClipboardPaste } from 'lucide-react';
import RecipeGrid from '../components/recipe/RecipeGrid';
import useRecipes from '../hooks/useRecipes';
import useRecentlyViewed from '../hooks/useRecentlyViewed';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import { thumbImageUrl, fullImageUrl } from '../utils/imageUrl';

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
  const [searchMode, setSearchMode] = useState('text'); // 'text' | 'ingredients'
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredientList, setIngredientList] = useState([]);
  const [ingredientResults, setIngredientResults] = useState(null);
  const [ingredientLoading, setIngredientLoading] = useState(false);
  const [todayMeals, setTodayMeals] = useState([]);
  const [forgottenFavorites, setForgottenFavorites] = useState([]);
  const [uncookedRecipes, setUncookedRecipes] = useState([]);
  const [deleteTagConfirm, setDeleteTagConfirm] = useState(null);

  // Fetch today's meal plan, forgotten favorites, and uncooked recipes
  useEffect(() => {
    api.getTodayMeals()
      .then(data => setTodayMeals(data.meals || []))
      .catch(() => setTodayMeals([]));
    api.getForgottenFavorites()
      .then(data => setForgottenFavorites(data.recipes || []))
      .catch(() => setForgottenFavorites([]));
    api.getUncookedRecipes()
      .then(data => setUncookedRecipes(data.recipes || []))
      .catch(() => setUncookedRecipes([]));
  }, []);

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

  const handleDeleteTag = (tag) => {
    setDeleteTagConfirm(tag);
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

  const addIngredient = (name) => {
    const trimmed = name.trim().toLowerCase();
    if (trimmed && !ingredientList.includes(trimmed)) {
      const next = [...ingredientList, trimmed];
      setIngredientList(next);
      setIngredientInput('');
      fetchIngredientResults(next);
    }
  };

  const removeIngredient = (name) => {
    const next = ingredientList.filter(i => i !== name);
    setIngredientList(next);
    if (next.length > 0) {
      fetchIngredientResults(next);
    } else {
      setIngredientResults(null);
    }
  };

  const fetchIngredientResults = async (list) => {
    setIngredientLoading(true);
    try {
      const data = await api.findByIngredients(list);
      setIngredientResults(data.recipes || []);
    } catch {
      setIngredientResults([]);
    } finally {
      setIngredientLoading(false);
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
          <div className="aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1]">
            <img
              src={thumbImageUrl(featured.image_path)}
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

      {/* Tonight's Dinner — from meal plan */}
      {todayMeals.length > 0 && !isFiltering && (
        <div className="bg-surface rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={18} className="text-sage" />
            <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}'s Plan
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {todayMeals.map(meal => (
              <Link
                key={meal.id}
                to={`/recipe/${meal.recipe.id}`}
                className="flex items-center gap-3 shrink-0 group"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-cream-dark shrink-0">
                  {meal.recipe.image_path ? (
                    <img
                      src={thumbImageUrl(meal.recipe.image_path)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat size={20} className="text-warm-gray/40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-brown text-sm group-hover:text-terracotta transition-colors line-clamp-1">
                    {meal.recipe.title}
                  </p>
                  {(meal.recipe.prep_time || meal.recipe.cook_time) && (
                    <p className="text-xs text-warm-gray flex items-center gap-1">
                      <Clock size={12} />
                      {(meal.recipe.prep_time || 0) + (meal.recipe.cook_time || 0)} min
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Desktop header with search */}
      <div className="hidden md:flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown">
          {user && !isFiltering ? (() => {
            const h = new Date().getHours();
            const greeting = h < 5 ? 'Late night cooking' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Late night cooking';
            const name = (user.display_name || user.username || '').split(' ')[0];
            return name ? `${greeting}, ${name}` : greeting;
          })() : 'Recipes'}
        </h1>
        <Link
          to="/add"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors duration-200 min-h-[44px]"
        >
          <Plus size={20} />
          Add Recipe
        </Link>
      </div>

      {/* Search bar with mode toggle */}
      <div className="hidden md:block">
        <div className="flex items-center gap-3 max-w-2xl">
          {/* Mode toggle */}
          <div className="flex bg-cream rounded-xl p-1 shrink-0">
            <button
              onClick={() => { setSearchMode('text'); setIngredientResults(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                searchMode === 'text' ? 'bg-surface text-brown shadow-sm' : 'text-warm-gray hover:text-brown'
              }`}
            >
              <Search size={14} className="inline mr-1" />
              Search
            </button>
            <button
              onClick={() => setSearchMode('ingredients')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                searchMode === 'ingredients' ? 'bg-surface text-brown shadow-sm' : 'text-warm-gray hover:text-brown'
              }`}
            >
              <UtensilsCrossed size={14} className="inline mr-1" />
              By Ingredient
            </button>
          </div>

          {searchMode === 'text' ? (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={18} />
              <input
                type="text"
                placeholder="Search recipes..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-dark bg-surface text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors duration-200"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl border border-cream-dark bg-surface focus-within:border-terracotta focus-within:ring-1 focus-within:ring-terracotta transition-colors duration-200">
              {ingredientList.map(ing => (
                <span key={ing} className="inline-flex items-center gap-1 px-2.5 py-1 bg-terracotta/10 text-terracotta rounded-full text-sm font-medium">
                  {ing}
                  <button onClick={() => removeIngredient(ing)} className="hover:text-terracotta-dark">
                    <X size={14} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={ingredientList.length === 0 ? "Type an ingredient and press Enter..." : "Add more..."}
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && ingredientInput.trim()) {
                    e.preventDefault();
                    addIngredient(ingredientInput);
                  } else if (e.key === 'Backspace' && !ingredientInput && ingredientList.length > 0) {
                    removeIngredient(ingredientList[ingredientList.length - 1]);
                  }
                }}
                className="flex-1 min-w-[120px] bg-transparent text-brown placeholder:text-warm-gray focus:outline-none text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile ingredient search */}
      <div className="md:hidden">
        <button
          onClick={() => setSearchMode(searchMode === 'ingredients' ? 'text' : 'ingredients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            searchMode === 'ingredients'
              ? 'bg-terracotta/10 text-terracotta'
              : 'bg-cream text-brown-light'
          }`}
        >
          <UtensilsCrossed size={16} />
          {searchMode === 'ingredients' ? 'Back to search' : "What can I make?"}
        </button>
        {searchMode === 'ingredients' && (
          <div className="flex flex-wrap items-center gap-2 mt-3 min-h-[44px] px-3 py-2 rounded-xl border border-cream-dark bg-surface">
            {ingredientList.map(ing => (
              <span key={ing} className="inline-flex items-center gap-1 px-2.5 py-1 bg-terracotta/10 text-terracotta rounded-full text-sm font-medium">
                {ing}
                <button onClick={() => removeIngredient(ing)} className="hover:text-terracotta-dark">
                  <X size={14} />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder={ingredientList.length === 0 ? "Type ingredient + Enter" : "Add more..."}
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && ingredientInput.trim()) {
                  e.preventDefault();
                  addIngredient(ingredientInput);
                } else if (e.key === 'Backspace' && !ingredientInput && ingredientList.length > 0) {
                  removeIngredient(ingredientList[ingredientList.length - 1]);
                }
              }}
              className="flex-1 min-w-[100px] bg-transparent text-brown placeholder:text-warm-gray focus:outline-none text-sm"
            />
          </div>
        )}
      </div>

      {/* Quick filter chips */}
      {tags.length > 0 && (
        <div className="overflow-x-auto scrollbar-hide pb-1">
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

      {/* Forgotten Favorites — recipes cooked often but not recently */}
      {forgottenFavorites.length > 0 && !isFiltering && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw size={16} className="text-terracotta" />
            <h2 className="text-lg font-bold text-brown">It's Been a While</h2>
          </div>
          <div className="overflow-x-auto scrollbar-hide pb-1">
            <div className="flex gap-3 min-w-min">
              {forgottenFavorites.map(r => {
                return (
                  <Link
                    key={r.id}
                    to={`/recipe/${r.id}`}
                    className="shrink-0 w-[140px] group"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-cream-dark mb-1.5 shadow-sm relative">
                      {r.image_path ? (
                        <img
                          src={thumbImageUrl(r.image_path)}
                          alt={r.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream to-cream-dark">
                          <ChefHat size={24} className="text-warm-gray/40" />
                        </div>
                      )}
                      <span className="absolute bottom-1.5 right-1.5 bg-brown/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {r.times_cooked}x
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-brown line-clamp-2 group-hover:text-terracotta transition-colors duration-200">
                      {r.title}
                    </p>
                    <p className="text-[10px] text-warm-gray mt-0.5">
                      {r.days_since} days ago
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Something New — recipes you've saved but never cooked */}
      {uncookedRecipes.length > 0 && !isFiltering && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-sage" />
            <h2 className="text-lg font-bold text-brown">Something New?</h2>
          </div>
          <div className="overflow-x-auto scrollbar-hide pb-1">
            <div className="flex gap-3 min-w-min">
              {uncookedRecipes.map(r => {
                const totalTime = (r.prep_time || 0) + (r.cook_time || 0);
                return (
                  <Link
                    key={r.id}
                    to={`/recipe/${r.id}`}
                    className="shrink-0 w-[140px] group"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-cream-dark mb-1.5 shadow-sm">
                      {r.image_path ? (
                        <img
                          src={thumbImageUrl(r.image_path)}
                          alt={r.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream to-cream-dark">
                          <ChefHat size={24} className="text-warm-gray/40" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-brown line-clamp-2 group-hover:text-terracotta transition-colors duration-200">
                      {r.title}
                    </p>
                    {totalTime > 0 && (
                      <p className="text-[10px] text-warm-gray mt-0.5 flex items-center gap-0.5">
                        <Clock size={10} />
                        {totalTime} min
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      {recent.length > 0 && !isFiltering && (
        <div>
          <h2 className="text-lg font-bold text-brown mb-3">Recently Viewed</h2>
          <div className="overflow-x-auto scrollbar-hide pb-1">
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
                        src={thumbImageUrl(r.image_path)}
                        alt={r.title}
                        loading="lazy"
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

      {/* Welcome state for new users */}
      {!isLoading && recipes.length === 0 && !isFiltering && searchMode === 'text' && (
        <div className="py-8 space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-terracotta/10 flex items-center justify-center">
              <ChefHat size={36} className="text-terracotta" />
            </div>
            <h2 className="text-2xl font-bold text-brown font-serif">Welcome to Cookslate</h2>
            <p className="text-warm-gray mt-2 max-w-md mx-auto">
              Your recipe collection is empty. Here are a few ways to get started:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Link
              to="/add"
              className="flex flex-col items-center gap-3 p-6 bg-surface rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-terracotta/10 flex items-center justify-center group-hover:bg-terracotta/20 transition-colors">
                <Link2 size={22} className="text-terracotta" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-brown text-sm">Import from URL</h3>
                <p className="text-xs text-warm-gray mt-1">
                  Paste a link from any recipe website
                </p>
              </div>
            </Link>

            <Link
              to="/add"
              className="flex flex-col items-center gap-3 p-6 bg-surface rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center group-hover:bg-sage/20 transition-colors">
                <ClipboardPaste size={22} className="text-sage" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-brown text-sm">Paste or Type</h3>
                <p className="text-xs text-warm-gray mt-1">
                  Enter a recipe manually or paste text
                </p>
              </div>
            </Link>

            <Link
              to="/bulk-import"
              className="flex flex-col items-center gap-3 p-6 bg-surface rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-brown/5 flex items-center justify-center group-hover:bg-brown/10 transition-colors">
                <FileUp size={22} className="text-brown-light" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-brown text-sm">Bulk Import</h3>
                <p className="text-xs text-warm-gray mt-1">
                  Import from Mealie, Paprika, or multiple URLs
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Recipe grid / Ingredient search results */}
      {searchMode === 'ingredients' && ingredientList.length > 0 ? (
        <div>
          <h2 className="text-lg font-bold text-brown mb-3">
            {ingredientLoading ? 'Searching...' : ingredientResults?.length ? `${ingredientResults.length} recipes you can make` : 'No matching recipes'}
          </h2>
          {ingredientResults && ingredientResults.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {ingredientResults.map(recipe => {
                const pct = recipe.countable_ingredients > 0
                  ? Math.round((recipe.matched / recipe.countable_ingredients) * 100)
                  : 0;
                return (
                  <Link
                    key={recipe.id}
                    to={`/recipe/${recipe.id}`}
                    className="group bg-surface rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="relative aspect-[4/3] bg-cream-dark overflow-hidden">
                      {recipe.image_path ? (
                        <img
                          src={thumbImageUrl(recipe.image_path)}
                          alt={recipe.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream to-cream-dark">
                          <UtensilsCrossed size={48} className="text-warm-gray/40" />
                        </div>
                      )}
                      <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold text-white ${
                        pct >= 60 ? 'bg-sage' : pct >= 30 ? 'bg-terracotta-light' : 'bg-warm-gray'
                      }`}>
                        {recipe.matched}/{recipe.countable_ingredients}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-brown group-hover:text-terracotta transition-colors line-clamp-2">
                        {recipe.title}
                      </h3>
                      <p className="text-sm text-warm-gray mt-1">
                        {pct}% ingredient match
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <RecipeGrid
          recipes={recipes}
          isLoading={isLoading}
          hasMore={pagination.page < pagination.totalPages}
          onLoadMore={handleLoadMore}
        />
      )}

      {/* Mobile FAB */}
      <Link
        to="/add"
        className="md:hidden fixed bottom-20 right-4 z-20 w-14 h-14 bg-terracotta text-white rounded-full shadow-lg flex items-center justify-center hover:bg-terracotta-dark transition-colors duration-200"
        aria-label="Add recipe"
      >
        <Plus size={28} />
      </Link>

      {/* Delete tag confirmation modal */}
      <Modal
        isOpen={deleteTagConfirm !== null}
        onClose={() => setDeleteTagConfirm(null)}
        title="Delete Tag"
        size="sm"
      >
        <p className="text-brown-light mb-6">
          Delete tag &ldquo;{deleteTagConfirm?.name}&rdquo;? It will be removed from all recipes.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteTagConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={async () => {
            try {
              await api.deleteTag(deleteTagConfirm.id);
              setTags(prev => prev.filter(t => t.id !== deleteTagConfirm.id));
              if (activeTag === deleteTagConfirm.name) setActiveTag('');
            } catch {}
            setDeleteTagConfirm(null);
          }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
