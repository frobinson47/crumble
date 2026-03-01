import React from 'react';
import { Trash2 } from 'lucide-react';

export default function GroceryItem({ item, onToggle, onDelete }) {
  const isChecked = item.checked === true || item.checked === 1;

  return (
    <div
      className={`
        flex items-center gap-3 py-3 px-4 rounded-xl
        group transition-all duration-200
        ${isChecked ? 'bg-cream-dark/50' : 'hover:bg-cream-dark/30'}
      `}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => onToggle(item.id, !isChecked)}
        className="w-5 h-5 rounded border-cream-dark text-terracotta focus:ring-terracotta cursor-pointer shrink-0"
      />

      <div className={`flex-1 min-w-0 transition-all duration-200 ${isChecked ? 'opacity-50' : ''}`}>
        <span className={`text-brown-light ${isChecked ? 'line-through' : ''}`}>
          {item.amount && <span className="font-semibold">{item.amount} </span>}
          {item.unit && <span>{item.unit} </span>}
          {item.name}
        </span>
        {item.recipe_name && (
          <span className="text-xs text-warm-gray ml-2">
            from {item.recipe_name}
          </span>
        )}
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="p-2 text-warm-gray opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center md:opacity-0 md:group-hover:opacity-100"
        aria-label="Delete item"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
