import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, ShoppingCart, CalendarDays, Calendar, GripVertical, ArrowRight } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import * as api from '../../services/api';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { thumbImageUrl } from '../../utils/imageUrl';

// Date helpers
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function formatDateRange(mondayStr) {
  const monday = new Date(mondayStr + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  const yearOpts = { ...opts, year: 'numeric' };
  if (monday.getFullYear() !== new Date().getFullYear()) {
    return `${monday.toLocaleDateString('en-US', yearOpts)} \u2013 ${sunday.toLocaleDateString('en-US', yearOpts)}`;
  }
  return `${monday.toLocaleDateString('en-US', opts)} \u2013 ${sunday.toLocaleDateString('en-US', opts)}`;
}

function getDayDate(mondayStr, dayIndex) {
  const d = new Date(mondayStr + 'T00:00:00');
  d.setDate(d.getDate() + dayIndex);
  return d;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getDefaultMobileDay(weekStart) {
  const today = new Date();
  const monday = new Date(weekStart + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  if (today >= monday && today <= sunday) {
    const jsDay = today.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }
  return 0;
}

// --- Drag & Drop Components ---

function SortableMealItem({ item, onRemove, onMoveToDay, showMoveMenu }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `item-${item.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [moveOpen, setMoveOpen] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 p-2 bg-cream rounded-xl group relative">
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 rounded text-warm-gray/50 hover:text-warm-gray cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
      {item.recipe.image_path && (
        <img
          src={thumbImageUrl(item.recipe.image_path)}
          alt={item.recipe.title}
          loading="lazy"
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
      )}
      <span className="flex-1 text-sm font-medium text-brown truncate">{item.recipe.title}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        {showMoveMenu && (
          <div className="relative">
            <button
              onClick={() => setMoveOpen(!moveOpen)}
              className="p-1 rounded-lg text-warm-gray hover:text-terracotta hover:bg-terracotta/10 transition-colors duration-200 min-w-[28px] min-h-[28px] flex items-center justify-center"
              aria-label={`Move ${item.recipe.title} to another day`}
            >
              <ArrowRight size={14} />
            </button>
            {moveOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoveOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-surface rounded-xl shadow-lg border border-cream-dark p-1 min-w-[120px]">
                  {DAY_NAMES.map((name, idx) => (
                    idx !== item.day_of_week && (
                      <button
                        key={idx}
                        onClick={() => { onMoveToDay(item.id, idx); setMoveOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-brown hover:bg-cream rounded-lg transition-colors"
                      >
                        {DAY_NAMES_FULL[idx]}
                      </button>
                    )
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 rounded-lg text-warm-gray hover:text-red-500 hover:bg-red-50 transition-colors duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 min-w-[28px] min-h-[28px] flex items-center justify-center"
          aria-label={`Remove ${item.recipe.title}`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function DragOverlayCard({ item }) {
  if (!item) return null;
  return (
    <div className="flex items-center gap-1.5 p-2 bg-cream rounded-xl shadow-lg border border-terracotta/30 w-[180px]">
      <GripVertical size={14} className="text-warm-gray/50 shrink-0" />
      {item.recipe.image_path && (
        <img
          src={thumbImageUrl(item.recipe.image_path)}
          alt={item.recipe.title}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
      )}
      <span className="flex-1 text-sm font-medium text-brown truncate">{item.recipe.title}</span>
    </div>
  );
}

function DroppableDayColumn({ dayIndex, children, isToday }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayIndex}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 space-y-2 min-h-[60px] rounded-xl transition-colors duration-200 ${
        isOver ? 'bg-terracotta/5 ring-1 ring-terracotta/20' : ''
      }`}
    >
      {children}
    </div>
  );
}

// --- Main Component ---

export default function MealPlanPage() {
  useDocumentTitle('Meal Plan');

  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [showRecipeSearch, setShowRecipeSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showGroceryConfirm, setShowGroceryConfirm] = useState(false);
  const [groceryListName, setGroceryListName] = useState('');
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [grocerySuccess, setGrocerySuccess] = useState(null);
  const [activeMobileDay, setActiveMobileDay] = useState(() => getDefaultMobileDay(getMonday(new Date())));
  const [activeId, setActiveId] = useState(null);

  const searchTimerRef = useRef(null);

  // DnD sensors — pointer needs a small distance to avoid conflicts with clicks
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Fetch plan on weekStart change
  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMealPlan(weekStart);
      setPlan(data);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Reset mobile day when week changes
  useEffect(() => {
    setActiveMobileDay(getDefaultMobileDay(weekStart));
  }, [weekStart]);

  // Debounced recipe search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await api.getRecipes({ search: searchQuery, perPage: 10 });
        setSearchResults(data.recipes || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  // Get items for a specific day
  const getItemsForDay = useCallback((dayIndex) => {
    if (!plan || !plan.items) return [];
    return plan.items
      .filter(item => item.day_of_week === dayIndex)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [plan]);

  // Build sortable IDs per day for DnD context
  const dayItemIds = useMemo(() => {
    const result = {};
    for (let i = 0; i < 7; i++) {
      result[i] = getItemsForDay(i).map(item => `item-${item.id}`);
    }
    return result;
  }, [getItemsForDay]);

  // Find which day an item belongs to
  const findDayForItem = useCallback((itemId) => {
    if (!plan || !plan.items) return null;
    const numId = parseInt(itemId.replace('item-', ''));
    const item = plan.items.find(i => i.id === numId);
    return item ? item.day_of_week : null;
  }, [plan]);

  // Active drag item for overlay
  const activeItem = useMemo(() => {
    if (!activeId || !plan) return null;
    const numId = parseInt(activeId.replace('item-', ''));
    return plan.items.find(i => i.id === numId) || null;
  }, [activeId, plan]);

  // --- DnD Handlers ---

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over || !plan) return;

    const activeItemId = active.id;
    const overId = over.id;

    const fromDay = findDayForItem(activeItemId);
    let toDay;

    if (String(overId).startsWith('day-')) {
      toDay = parseInt(overId.replace('day-', ''));
    } else {
      toDay = findDayForItem(overId);
    }

    if (fromDay === null || toDay === null || fromDay === toDay) return;

    // Move item to new day in local state (optimistic)
    const numId = parseInt(activeItemId.replace('item-', ''));
    setPlan(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === numId
          ? { ...item, day_of_week: toDay, sort_order: 999 }
          : item
      ),
    }));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !plan) return;

    const activeItemId = active.id;
    const numId = parseInt(activeItemId.replace('item-', ''));
    const overId = over.id;

    // Determine target day
    let targetDay;
    if (String(overId).startsWith('day-')) {
      targetDay = parseInt(overId.replace('day-', ''));
    } else {
      targetDay = findDayForItem(overId);
    }

    if (targetDay === null) return;

    // Get the items for the target day (current state) and compute final order
    const dayItems = plan.items
      .filter(i => i.day_of_week === targetDay)
      .sort((a, b) => a.sort_order - b.sort_order);

    const itemIds = dayItems.map(i => `item-${i.id}`);
    const oldIndex = itemIds.indexOf(activeItemId);
    let newIndex = itemIds.indexOf(String(overId));

    let finalOrder;
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      finalOrder = arrayMove(itemIds, oldIndex, newIndex);
    } else {
      finalOrder = itemIds;
    }

    // Update local state with new sort_order values
    const updates = {};
    finalOrder.forEach((id, index) => {
      const itemNum = parseInt(id.replace('item-', ''));
      updates[itemNum] = index;
    });

    setPlan(prev => ({
      ...prev,
      items: prev.items.map(item =>
        updates[item.id] !== undefined
          ? { ...item, day_of_week: targetDay, sort_order: updates[item.id] }
          : item
      ),
    }));

    // Persist to backend
    try {
      await Promise.all(
        Object.entries(updates).map(([itemId, sortOrder]) =>
          api.updateMealPlanItem(parseInt(itemId), {
            day_of_week: targetDay,
            sort_order: sortOrder,
          })
        )
      );
    } catch {
      // Revert on failure
      await fetchPlan();
    }
  };

  // Move item to a different day (mobile menu)
  const handleMoveToDay = async (itemId, newDay) => {
    // Get sort_order for end of target day
    const targetDayItems = getItemsForDay(newDay);
    const newSortOrder = targetDayItems.length > 0
      ? Math.max(...targetDayItems.map(i => i.sort_order)) + 1
      : 0;

    // Optimistic update
    setPlan(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, day_of_week: newDay, sort_order: newSortOrder }
          : item
      ),
    }));

    try {
      await api.updateMealPlanItem(itemId, {
        day_of_week: newDay,
        sort_order: newSortOrder,
      });
    } catch {
      await fetchPlan();
    }
  };

  // Week navigation
  const goToPreviousWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const goToNextWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getMonday(new Date()));
  };

  // Add recipe to day
  const handleOpenSearch = (dayIndex) => {
    setSelectedDay(dayIndex);
    setSearchQuery('');
    setSearchResults([]);
    setShowRecipeSearch(true);
  };

  const handleAddRecipe = async (recipeId) => {
    try {
      await api.addMealPlanItem(recipeId, selectedDay, weekStart);
      setShowRecipeSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      await fetchPlan();
    } catch {
      // Error handled by api layer
    }
  };

  // Remove recipe
  const handleRemove = async (itemId) => {
    try {
      await api.removeMealPlanItem(itemId);
      await fetchPlan();
    } catch {
      // Error handled by api layer
    }
  };

  // Grocery generation
  const handleOpenGrocery = () => {
    const monday = new Date(weekStart + 'T00:00:00');
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const opts = { month: 'short', day: 'numeric' };
    const defaultName = `Meal Plan \u2014 ${monday.toLocaleDateString('en-US', opts)}-${sunday.toLocaleDateString('en-US', opts)}`;
    setGroceryListName(defaultName);
    setGrocerySuccess(null);
    setShowGroceryConfirm(true);
  };

  const handleGenerateGrocery = async () => {
    setGroceryLoading(true);
    try {
      const result = await api.generateGroceryFromPlan(weekStart, groceryListName);
      setGrocerySuccess(result.grocery_list_id);
    } catch {
      // Error handled by api layer
    } finally {
      setGroceryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={28} className="text-terracotta shrink-0" />
          <h1 className="text-2xl md:text-3xl font-bold text-brown font-serif">Meal Plan</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/meal-plan/ical?week=${weekStart}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-warm-gray hover:text-brown hover:bg-cream-dark rounded-xl transition-colors min-h-[44px]"
            title="Export to calendar"
          >
            <Calendar size={16} />
            iCal
          </a>
          <Button variant="secondary" onClick={handleOpenGrocery} disabled={!plan || !plan.items || plan.items.length === 0}>
            <ShoppingCart size={18} />
            Generate Grocery List
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-surface rounded-2xl shadow-md px-4 py-3">
        <button
          onClick={goToPreviousWeek}
          className="p-2 rounded-xl text-brown-light hover:bg-cream-dark transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Previous week"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg md:text-xl font-bold text-brown font-serif">
          {formatDateRange(weekStart)}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold text-terracotta hover:bg-terracotta/10 transition-colors duration-200 min-h-[44px]"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-xl text-brown-light hover:bg-cream-dark transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Next week"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Desktop: 7-column grid */}
          <div className="hidden md:grid grid-cols-7 gap-3">
            {DAY_NAMES.map((dayName, dayIndex) => {
              const dayDate = getDayDate(weekStart, dayIndex);
              const items = getItemsForDay(dayIndex);
              const isToday = new Date().toDateString() === dayDate.toDateString();

              return (
                <div
                  key={dayIndex}
                  className={`bg-surface rounded-2xl shadow-md p-3 flex flex-col min-h-[200px] ${isToday ? 'ring-2 ring-terracotta/30' : ''}`}
                >
                  {/* Day header */}
                  <div className="text-center mb-3 pb-2 border-b border-cream-dark">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-terracotta' : 'text-warm-gray'}`}>
                      {dayName}
                    </p>
                    <p className={`text-lg font-bold ${isToday ? 'text-terracotta' : 'text-brown'}`}>
                      {dayDate.getDate()}
                    </p>
                  </div>

                  {/* Droppable + Sortable meal items */}
                  <DroppableDayColumn dayIndex={dayIndex} isToday={isToday}>
                    <SortableContext items={dayItemIds[dayIndex]} strategy={verticalListSortingStrategy}>
                      {items.map(item => (
                        <SortableMealItem
                          key={item.id}
                          item={item}
                          onRemove={handleRemove}
                          onMoveToDay={handleMoveToDay}
                          showMoveMenu={false}
                        />
                      ))}
                    </SortableContext>
                  </DroppableDayColumn>

                  {/* Add button */}
                  <button
                    onClick={() => handleOpenSearch(dayIndex)}
                    className="mt-2 w-full flex items-center justify-center gap-1 py-2 rounded-xl border-2 border-dashed border-cream-dark text-warm-gray hover:border-terracotta hover:text-terracotta transition-colors duration-200 min-h-[44px]"
                  >
                    <Plus size={16} />
                    <span className="text-sm font-medium">Add</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Mobile: day picker + single day view */}
          <div className="md:hidden space-y-4">
            {/* Day picker */}
            <div className="flex items-center justify-around bg-surface rounded-2xl shadow-md p-2">
              {DAY_NAMES.map((dayName, dayIndex) => {
                const dayDate = getDayDate(weekStart, dayIndex);
                const isActive = activeMobileDay === dayIndex;
                const isToday = new Date().toDateString() === dayDate.toDateString();
                const hasItems = getItemsForDay(dayIndex).length > 0;

                return (
                  <button
                    key={dayIndex}
                    onClick={() => setActiveMobileDay(dayIndex)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl min-w-[44px] min-h-[44px] transition-colors duration-200 ${
                      isActive
                        ? 'bg-terracotta text-white'
                        : isToday
                          ? 'text-terracotta'
                          : 'text-brown-light'
                    }`}
                  >
                    <span className="text-xs font-semibold">{dayName.charAt(0)}</span>
                    <span className="text-sm font-bold">{dayDate.getDate()}</span>
                    {hasItems && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-terracotta" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day content */}
            <div className="bg-surface rounded-2xl shadow-md p-4">
              <h3 className="text-lg font-bold text-brown font-serif mb-4">
                {DAY_NAMES_FULL[activeMobileDay]}, {getDayDate(weekStart, activeMobileDay).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </h3>

              {getItemsForDay(activeMobileDay).length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays size={32} className="mx-auto text-warm-gray/40 mb-2" />
                  <p className="text-warm-gray">No meals planned</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <SortableContext items={dayItemIds[activeMobileDay]} strategy={verticalListSortingStrategy}>
                    {getItemsForDay(activeMobileDay).map(item => (
                      <SortableMealItem
                        key={item.id}
                        item={item}
                        onRemove={handleRemove}
                        onMoveToDay={handleMoveToDay}
                        showMoveMenu={true}
                      />
                    ))}
                  </SortableContext>
                </div>
              )}

              <button
                onClick={() => handleOpenSearch(activeMobileDay)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-cream-dark text-warm-gray hover:border-terracotta hover:text-terracotta transition-colors duration-200 min-h-[44px]"
              >
                <Plus size={18} />
                <span className="font-medium">Add Recipe</span>
              </button>
            </div>
          </div>

          <DragOverlay>
            <DragOverlayCard item={activeItem} />
          </DragOverlay>
        </DndContext>
      )}

      {/* Recipe search modal */}
      <Modal isOpen={showRecipeSearch} onClose={() => setShowRecipeSearch(false)} title="Add Recipe" size="lg">
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-surface text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors duration-200"
          autoFocus
        />
        <div className="mt-3 max-h-96 overflow-y-auto space-y-2">
          {searchLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : searchResults.length === 0 && searchQuery ? (
            <p className="text-warm-gray text-center py-4">No recipes found</p>
          ) : (
            searchResults.map(recipe => (
              <button
                key={recipe.id}
                onClick={() => handleAddRecipe(recipe.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream transition-colors text-left min-h-[44px]"
              >
                {recipe.image_path && (
                  <img
                    src={thumbImageUrl(recipe.image_path)}
                    alt={recipe.title}
                    loading="lazy"
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brown truncate">{recipe.title}</p>
                  {recipe.description && (
                    <p className="text-sm text-warm-gray truncate">{recipe.description}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Grocery generation modal */}
      <Modal
        isOpen={showGroceryConfirm}
        onClose={() => setShowGroceryConfirm(false)}
        title="Generate Grocery List"
        size="sm"
      >
        {grocerySuccess ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-sage-light/30 rounded-full flex items-center justify-center mx-auto">
              <ShoppingCart size={24} className="text-sage" />
            </div>
            <p className="text-brown font-medium">Grocery list created!</p>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={() => setShowGroceryConfirm(false)}>
                Close
              </Button>
              <Button onClick={() => navigate('/grocery')}>
                View Grocery Lists
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-brown-light text-sm">
              Create a grocery list from all recipes in this week's meal plan.
            </p>
            <div>
              <label className="block text-sm font-semibold text-brown mb-1">List Name</label>
              <input
                type="text"
                value={groceryListName}
                onChange={(e) => setGroceryListName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-surface text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors duration-200"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowGroceryConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateGrocery} disabled={groceryLoading || !groceryListName.trim()}>
                {groceryLoading ? <Spinner /> : <ShoppingCart size={16} />}
                {groceryLoading ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
