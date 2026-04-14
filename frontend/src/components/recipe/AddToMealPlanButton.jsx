import React, { useState } from 'react';
import { CalendarPlus, Check } from 'lucide-react';
import { useLicense } from '../../hooks/useLicense';
import * as api from '../../services/api';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];

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
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(null);

  if (!proActive) return null;

  const weekStart = getMonday(new Date());
  const today = new Date();

  const handleAdd = async (e, dayIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    try {
      await api.addMealPlanItem(recipeId, dayIndex, weekStart);
      const dayDate = getDayDate(weekStart, dayIndex);
      setSuccess(DAY_NAMES[dayIndex] + ' ' + dayDate.getDate());
      setTimeout(() => { setSuccess(null); setOpen(false); }, 1200);
    } catch {
      // handled by api layer
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
    setSuccess(null);
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
  };

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
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={handleClose} />
            <div className="absolute bottom-full right-0 mb-2 z-20 bg-surface rounded-xl shadow-lg border border-cream-dark p-2 min-w-[180px]">
              {success ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-sage font-medium">
                  <Check size={14} />
                  Added to {success}
                </div>
              ) : (
                <>
                  <p className="text-xs text-warm-gray px-2 py-1 font-semibold">Add to this week</p>
                  <div className="grid grid-cols-7 gap-0.5 mt-1">
                    {DAY_NAMES.map((name, idx) => {
                      const dayDate = getDayDate(weekStart, idx);
                      const isToday = today.toDateString() === dayDate.toDateString();
                      return (
                        <button
                          key={idx}
                          onClick={(e) => handleAdd(e, idx)}
                          disabled={adding}
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
              )}
            </div>
          </>
        )}
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
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={handleClose} />
          <div className="absolute top-full left-0 mt-2 z-20 bg-surface rounded-xl shadow-lg border border-cream-dark p-3 min-w-[220px]">
            {success ? (
              <div className="flex items-center gap-2 px-2 py-2 text-sm text-sage font-medium">
                <Check size={16} />
                Added to {success}
              </div>
            ) : (
              <>
                <p className="text-xs text-warm-gray font-semibold mb-2">Pick a day this week</p>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((name, idx) => {
                    const dayDate = getDayDate(weekStart, idx);
                    const isToday = today.toDateString() === dayDate.toDateString();
                    return (
                      <button
                        key={idx}
                        onClick={(e) => handleAdd(e, idx)}
                        disabled={adding}
                        className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs transition-colors hover:bg-terracotta/10 hover:text-terracotta ${
                          isToday ? 'text-terracotta font-bold bg-terracotta/5' : 'text-brown'
                        }`}
                      >
                        <span className="font-semibold">{name}</span>
                        <span className="text-sm">{dayDate.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
