import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function ServingsAdjuster({ servings, onChange, min = 1, max = 99 }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, servings - 1))}
        disabled={servings <= min}
        className="w-[44px] h-[44px] flex items-center justify-center rounded-full bg-terracotta/10 text-terracotta hover:bg-terracotta/20 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Decrease servings"
      >
        <Minus size={18} />
      </button>
      <span className="text-sm font-semibold text-brown min-w-[80px] text-center">
        {servings} {servings === 1 ? 'serving' : 'servings'}
      </span>
      <button
        onClick={() => onChange(Math.min(max, servings + 1))}
        disabled={servings >= max}
        className="w-[44px] h-[44px] flex items-center justify-center rounded-full bg-terracotta/10 text-terracotta hover:bg-terracotta/20 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Increase servings"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
