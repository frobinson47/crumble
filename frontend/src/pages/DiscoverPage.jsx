import React, { useState, useEffect } from 'react';
import { Search, Compass, Download, Loader2, ChefHat, X, ExternalLink } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import * as api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';

export default function DiscoverPage() {
  useDocumentTitle('Discover Recipes');
  const navigate = useNavigate();

  const [meals, setMeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [mealDetail, setMealDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Load initial random meals and categories
  useEffect(() => {
    Promise.all([
      api.getDiscoverMeals(),
      api.getDiscoverCategories(),
    ]).then(([mealsData, catsData]) => {
      setMeals(mealsData.meals || []);
      setCategories(catsData.categories || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setActiveCategory('');
    const data = await api.searchDiscoverMeals(search);
    setMeals(data.meals || []);
    setLoading(false);
  };

  const handleCategory = async (cat) => {
    setActiveCategory(cat);
    setSearch('');
    setLoading(true);
    const data = await api.getDiscoverByCategory(cat);
    setMeals(data.meals || []);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setActiveCategory('');
    setSearch('');
    const data = await api.getDiscoverMeals();
    setMeals(data.meals || []);
    setLoading(false);
  };

  const handleViewMeal = async (meal) => {
    setSelectedMeal(meal);
    setMealDetail(null);
    setDetailLoading(true);
    try {
      const detail = await api.getDiscoverMeal(meal.mealdb_id);
      setMealDetail(detail);
    } catch { }
    setDetailLoading(false);
  };

  const handleImport = async () => {
    if (!mealDetail) return;
    setImporting(true);
    try {
      const recipe = await api.importDiscoverMeal(mealDetail.mealdb_id);
      setSelectedMeal(null);
      navigate(`/recipe/${recipe.id}`);
    } catch { }
    setImporting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Compass size={24} className="text-terracotta" />
          <h1 className="text-2xl font-bold text-brown font-display">Discover Recipes</h1>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <ChefHat size={16} />
          Surprise Me
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={18} />
          <input
            type="text"
            placeholder="Search world recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-dark bg-surface text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta transition-colors"
          />
        </div>
      </form>

      {/* Category chips */}
      <div className="overflow-x-auto scrollbar-hide pb-2 mb-6">
        <div className="flex gap-2 min-w-min">
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => handleCategory(cat.name)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors min-h-[36px] ${
                activeCategory === cat.name
                  ? 'bg-terracotta text-white'
                  : 'bg-cream hover:bg-terracotta/10 text-brown-light hover:text-terracotta'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-terracotta" size={32} />
        </div>
      ) : meals.length === 0 ? (
        <EmptyState
          icon={Compass}
          accent="cream"
          title="No recipes found"
          description="Try a different search term or browse by category."
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {meals.map(meal => (
            <button
              key={meal.mealdb_id}
              onClick={() => handleViewMeal(meal)}
              className="group text-left bg-surface rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-cream-dark"
            >
              <div className="aspect-[4/3] bg-cream-dark overflow-hidden">
                {meal.image && (
                  <img
                    src={meal.image + '/preview'}
                    alt={meal.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-brown line-clamp-2 group-hover:text-terracotta transition-colors">
                  {meal.title}
                </h3>
                {meal.area && (
                  <p className="text-xs text-warm-gray mt-1">{meal.area}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Meal detail modal */}
      <Modal
        isOpen={!!selectedMeal}
        onClose={() => setSelectedMeal(null)}
        title={selectedMeal?.title || 'Recipe Details'}
        size="lg"
      >
        {detailLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-terracotta" size={32} />
          </div>
        ) : mealDetail ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {mealDetail.image && (
              <img src={mealDetail.image} alt={mealDetail.title} className="w-full rounded-xl" />
            )}

            <div className="flex flex-wrap gap-2">
              {mealDetail.category && (
                <span className="px-2.5 py-1 bg-terracotta/10 text-terracotta rounded-full text-xs font-semibold">{mealDetail.category}</span>
              )}
              {mealDetail.area && (
                <span className="px-2.5 py-1 bg-sage/10 text-sage rounded-full text-xs font-semibold">{mealDetail.area}</span>
              )}
              {(mealDetail.tags || []).map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-cream text-brown-light rounded-full text-xs font-semibold">{tag}</span>
              ))}
            </div>

            {/* Ingredients */}
            <div>
              <h3 className="text-sm font-bold text-brown mb-2">Ingredients ({mealDetail.ingredients?.length || 0})</h3>
              <div className="grid grid-cols-2 gap-1">
                {(mealDetail.ingredients || []).map((ing, i) => (
                  <p key={i} className="text-sm text-brown-light">
                    <span className="text-warm-gray">{ing.amount} {ing.unit}</span> {ing.name}
                  </p>
                ))}
              </div>
            </div>

            {/* Instructions preview */}
            <div>
              <h3 className="text-sm font-bold text-brown mb-2">Instructions ({mealDetail.instructions?.length || 0} steps)</h3>
              <div className="space-y-2">
                {(mealDetail.instructions || []).slice(0, 3).map((step, i) => (
                  <p key={i} className="text-sm text-brown-light">
                    <span className="font-semibold text-terracotta mr-1">{i + 1}.</span>
                    {step.length > 150 ? step.substring(0, 150) + '...' : step}
                  </p>
                ))}
                {(mealDetail.instructions || []).length > 3 && (
                  <p className="text-xs text-warm-gray">+ {mealDetail.instructions.length - 3} more steps</p>
                )}
              </div>
            </div>

            {/* Source link */}
            {mealDetail.source && (
              <a href={mealDetail.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-terracotta hover:underline">
                <ExternalLink size={14} />
                Original recipe
              </a>
            )}

            {/* Import button */}
            <div className="pt-2 border-t border-cream-dark">
              <Button onClick={handleImport} disabled={importing} className="w-full">
                {importing ? (
                  <><Loader2 size={18} className="animate-spin" /> Importing...</>
                ) : (
                  <><Download size={18} /> Import to Cookslate</>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
