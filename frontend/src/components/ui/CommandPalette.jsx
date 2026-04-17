import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutGrid, Heart, ShoppingCart, CalendarDays, Plus,
  Upload, BookOpen, Compass, Library, Settings, Shield, Database,
  TrendingUp, FileText, Loader2, Clock, ChefHat
} from 'lucide-react';
import * as api from '../../services/api';
import useRecentlyViewed from '../../hooks/useRecentlyViewed';
import { useAuth } from '../../hooks/useAuth';
import { useLicense } from '../../hooks/useLicense';
import { thumbImageUrl } from '../../utils/imageUrl';

const PAGES = [
  { id: 'p-recipes', label: 'Recipes', to: '/', icon: LayoutGrid, type: 'page' },
  { id: 'p-favorites', label: 'Favorites', to: '/favorites', icon: Heart, type: 'page' },
  { id: 'p-grocery', label: 'Grocery Lists', to: '/grocery', icon: ShoppingCart, type: 'page' },
  { id: 'p-mealplan', label: 'Meal Plan', to: '/meal-plan', icon: CalendarDays, type: 'page', pro: true },
  { id: 'p-collections', label: 'Collections', to: '/collections', icon: Library, type: 'page' },
  { id: 'p-discover', label: 'Discover', to: '/discover', icon: Compass, type: 'page' },
  { id: 'p-cookhistory', label: 'Cook History', to: '/cook-history', icon: BookOpen, type: 'page' },
  { id: 'p-stats', label: 'Kitchen Stats', to: '/stats', icon: TrendingUp, type: 'page', pro: true },
  { id: 'p-ingredients', label: 'Ingredient Database', to: '/ingredient-database', icon: Database, type: 'page' },
  { id: 'p-settings', label: 'Settings', to: '/settings', icon: Settings, type: 'page' },
  { id: 'p-admin', label: 'Admin', to: '/admin', icon: Shield, type: 'page', admin: true },
];

const ACTIONS = [
  { id: 'a-add', label: 'Add new recipe', to: '/add', icon: Plus, type: 'action' },
  { id: 'a-import', label: 'Import from URL', to: '/add', icon: Upload, type: 'action' },
  { id: 'a-bulk', label: 'Bulk Import', to: '/bulk-import', icon: FileText, type: 'action' },
];

const TYPE_STYLES = {
  recipe: 'bg-terracotta-50 text-terracotta',
  page: 'bg-sage-50 text-sage',
  action: 'bg-cream-dark text-brown-light',
  recent: 'bg-cream-dark text-warm-gray',
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const { recent } = useRecentlyViewed();
  const { isAdmin } = useAuth();
  const { active: proActive } = useLicense();

  // Global hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setRecipes([]);
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Search recipes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.startsWith('>')) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.getRecipes({ search: query, perPage: 5 });
        setRecipes((data.recipes || []).map(r => ({
          id: `r-${r.id}`,
          label: r.title,
          to: `/recipe/${r.id}`,
          icon: ChefHat,
          type: 'recipe',
          thumb: thumbImageUrl(r.image_path),
        })));
      } catch {
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Build flat result list
  const getResults = useCallback(() => {
    const q = query.toLowerCase().trim();
    const sections = [];

    if (!q) {
      // Empty query — show recent, actions, pages
      if (recent.length > 0) {
        sections.push({
          heading: 'Recent',
          items: recent.slice(0, 3).map(r => ({
            id: `recent-${r.id}`,
            label: r.title,
            to: `/recipe/${r.id}`,
            icon: Clock,
            type: 'recent',
          })),
        });
      }
      sections.push({ heading: 'Quick Actions', items: ACTIONS });
      sections.push({
        heading: 'Navigate',
        items: PAGES.filter(p => {
          if (p.admin && !isAdmin) return false;
          if (p.pro && !proActive) return false;
          return true;
        }),
      });
    } else if (q.startsWith('>')) {
      // Actions only
      const aq = q.slice(1).trim();
      const filtered = [...ACTIONS, ...PAGES].filter(a =>
        a.label.toLowerCase().includes(aq)
      );
      if (filtered.length) sections.push({ heading: 'Actions & Pages', items: filtered });
    } else {
      // Universal search
      if (recipes.length > 0) {
        sections.push({ heading: 'Recipes', items: recipes });
      }

      const matchedPages = PAGES.filter(p => {
        if (p.admin && !isAdmin) return false;
        if (p.pro && !proActive) return false;
        return p.label.toLowerCase().includes(q);
      });
      if (matchedPages.length) sections.push({ heading: 'Pages', items: matchedPages });

      const matchedActions = ACTIONS.filter(a =>
        a.label.toLowerCase().includes(q)
      );
      if (matchedActions.length) sections.push({ heading: 'Actions', items: matchedActions });
    }

    return sections;
  }, [query, recipes, recent, isAdmin, proActive]);

  const sections = getResults();
  const flatItems = sections.flatMap(s => s.items);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, recipes.length]);

  const executeItem = (item) => {
    setOpen(false);
    navigate(item.to);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
      e.preventDefault();
      executeItem(flatItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (query) {
        setQuery('');
      } else {
        setOpen(false);
      }
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  let itemIndex = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] md:pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-brown/30 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[560px] mx-4 bg-surface rounded-2xl shadow-warm-xl overflow-hidden"
        style={{ animation: 'cmdpal-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-cream-dark">
          {loading ? (
            <Loader2 size={18} className="text-warm-gray animate-spin shrink-0" />
          ) : (
            <Search size={18} className="text-warm-gray shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search recipes, actions, pages..."
            className="flex-1 bg-transparent text-brown text-base placeholder:text-warm-gray focus:outline-none"
          />
          <kbd className="hidden md:inline-flex text-[11px] font-semibold text-warm-gray bg-cream-dark px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {sections.length === 0 && query && !loading && (
            <div className="px-4 py-8 text-center text-warm-gray text-sm">
              No results for "{query}"
            </div>
          )}

          {sections.map(section => {
            const sectionItems = section.items.map(item => {
              const idx = itemIndex++;
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  data-selected={isSelected}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 min-h-[44px] text-left
                    transition-colors duration-75
                    ${isSelected ? 'bg-terracotta/8' : 'hover:bg-cream-dark/50'}
                  `}
                >
                  {item.thumb ? (
                    <img src={item.thumb} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <Icon size={18} className={`shrink-0 ${isSelected ? 'text-terracotta' : 'text-warm-gray'}`} />
                  )}
                  <span className={`flex-1 text-sm font-medium truncate ${isSelected ? 'text-brown' : 'text-brown-light'}`}>
                    {item.label}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_STYLES[item.type] || ''}`}>
                    {item.type}
                  </span>
                </button>
              );
            });

            return (
              <div key={section.heading}>
                <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-warm-gray uppercase tracking-widest">
                  {section.heading}
                </div>
                {sectionItems}
              </div>
            );
          })}
        </div>

        {/* Footer hints */}
        <div className="hidden md:flex items-center gap-4 px-4 py-2 border-t border-cream-dark text-[11px] text-warm-gray">
          <span><kbd className="font-semibold">↑↓</kbd> Navigate</span>
          <span><kbd className="font-semibold">⏎</kbd> Select</span>
          <span><kbd className="font-semibold">esc</kbd> Close</span>
          <span className="ml-auto opacity-60">
            <kbd className="font-semibold">&gt;</kbd> actions · <kbd className="font-semibold">#</kbd> tags · <kbd className="font-semibold">@</kbd> ingredients
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
