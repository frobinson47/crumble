import React, { useState } from 'react';
import { CalendarPlus, Check, ChevronLeft, Sunrise, Sun, Moon, Cookie } from 'lucide-react';
import { useLicense } from '../../hooks/useLicense';
import { useToast } from '../../hooks/useToast';
import * as api from '../../services/api';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', Icon: Sunrise },
  { value: 'lunch', label: 'Lunch', Icon: Sun },
  { value: 'dinner', label: 'Dinner', Icon: Moon },
  { value: 'snack', label: 'Snack', Icon: Cookie },
];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getDayDate(mondayStr, dayIndex) {
  const d = new Date(mondayStr + 'T00:00:00');
  d.setDate(d.getDate() + dayIndex);
  return d;
}

export default function AddToMealPlanButton({ recipeId, variant = 'overlay', className = '' }) {
  const { active: proActive } = useLicense();
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(null);

  const toast = useToast();

  if (!proActive) return null;

  const weekStart = getMonday(new Date());
  const today = new Date();

  const handleSelectDay = (e, dayIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDay(dayIndex);
  };

  const handleAdd = async (e, mealType) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedDay === null) return;
    setAdding(true);
    try {
      await api.addMealPlanItem(recipeId, selectedDay, weekStart, mealType);
      const dayDate = getDayDate(weekStart, selectedDay);
      const meal = MEAL_TYPES.find(m => m.value === mealType);
      setSuccess(`${DAY_NAMES[selectedDay]} ${dayDate.getDate()} ${meal ? meal.label : ''}`);
      toast.success(`Added to ${DAY_NAMES_FULL[selectedDay]} ${meal ? meal.label.toLowerCase() : ''}`);
      setTimeout(() => { setSuccess(null); setOpen(false); setSelectedDay(null); }, 1200);
    } catch {
      toast.error('Failed to add to meal plan');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
    setSuccess(null);
    setSelectedDay(null);
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setSelectedDay(null);
  };

  const handleBack = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDay(null);
  };

  const renderPopover = (position) => (
    <>
      <div className="fixed inset-0 z-10" onClick={handleClose} />
      <div className={`absolute ${position} z-20 bg-surface rounded-xl shadow-lg border border-cream-dark p-2 min-w-[200px]`}>
        {success ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-sage font-medium">
            <Check size={14} />
            Added to {success}
          </div>
        ) : selectedDay === null ? (
          <>
            <p className="text-xs text-warm-gray px-2 py-1 font-semibold">Pick a day</p>
            <div className="grid grid-cols-7 gap-0.5 mt-1">
              {DAY_NAMES.map((name, idx) => {
                const dayDate = getDayDate(weekStart, idx);
                const isToday = today.toDateString() === dayDate.toDateString();
                return (
                  <button
                    key={idx}
                    onClick={(e) => handleSelectDay(e, idx)}
                    className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-xs transition-colors hover:bg-terracotta/10 hover:text-terracotta ${
                      isToday ? 'text-terracotta font-bold' : 'text-brown'
                    }`}
                  >
                    <span className="font-semibold">{name.charAt(0)}</span>
                    <span>{dayDate.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 px-1 mb-1">
              <button
                onClick={handleBack}
                className="p-1 rounded-lg text-warm-gray hover:text-brown hover:bg-cream-dark transition-colors"
                aria-label="Back to day picker"
              >
                <ChevronLeft size={14} />
              </button>
              <p className="text-xs text-warm-gray font-semibold">
                {DAY_NAMES_FULL[selectedDay]} — which meal?
              </p>
            </div>
            <div className="space-y-0.5">
              {MEAL_TYPES.map((meal) => (
                <button
                  key={meal.value}
                  onClick={(e) => handleAdd(e, meal.value)}
                  disabled={adding}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-brown hover:bg-terracotta/10 hover:text-terracotta transition-colors text-left"
                >
                  <meal.Icon size={16} />
                  <span className="font-medium">{meal.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );

  if (variant === 'overlay') {
    return (
      <div className={`absolute bottom-2 right-2 z-10 ${className}`}>
        <button
          onClick={handleToggle}
          className="w-8 h-8 rounded-full bg-brown/70 text-white hover:bg-terracotta flex items-center justify-center transition-colors shadow-sm"
          aria-label="Add to meal plan"
          title="Add to meal plan"
        >
          <CalendarPlus size={14} />
        </button>
        {open && renderPopover('bottom-full right-0 mb-2')}
      </div>
    );
  }

  // variant === 'button' — for recipe detail page
  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cream-dark bg-surface text-brown-light hover:bg-cream-dark hover:text-brown transition-colors duration-200 font-medium min-h-[44px]"
      >
        <CalendarPlus size={18} />
        Add to Meal Plan
      </button>
      {open && renderPopover('top-full left-0 mt-2')}
    </div>
  );
}
