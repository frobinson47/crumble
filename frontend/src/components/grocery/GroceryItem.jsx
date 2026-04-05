import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Warehouse } from 'lucide-react';

export default function GroceryItem({ item, onToggle, onDelete, onPantryToggle }) {
  const isChecked = item.checked === true || item.checked === 1;
  const inPantry = item.in_pantry === true || item.in_pantry === 1;

  return (
    <div
      className={`
        flex items-center gap-3 py-3 px-4 rounded-xl
        group transition-all duration-200
        ${inPantry ? 'bg-green-50/50 opacity-60' : isChecked ? 'bg-cream-dark/50' : 'hover:bg-cream-dark/30'}
      `}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => onToggle(item.id, !isChecked)}
        className="w-5 h-5 rounded border-cream-dark text-terracotta focus:ring-terracotta cursor-pointer shrink-0"
      />

      <div className={`flex-1 min-w-0 transition-all duration-200 ${isChecked ? 'opacity-50' : ''}`}>
        <span className={`text-brown-light ${isChecked || inPantry ? 'line-through' : ''}`}>
          {item.amount && <span className="font-semibold">{item.amount} </span>}
          {item.unit && <span>{item.unit} </span>}
          {item.name}
        </span>
        {inPantry && (
          <span className="text-xs text-green-600 ml-2">in pantry</span>
        )}
        {!inPantry && item.package_display && (
          <div className={`text-xs mt-0.5 ${item.package_suggestion === 'pantry' ? 'text-amber-600' : 'text-warm-gray'}`}>
            {item.package_suggestion === 'pantry' ? item.package_display : `Buy: ${item.package_display}`}
          </div>
        )}
        {item.recipe_title && item.recipe_id && (
          <Link
            to={`/recipe/${item.recipe_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-warm-gray hover:text-terracotta ml-2 transition-colors"
          >
            from {item.recipe_title}
          </Link>
        )}
        {item.recipe_title && !item.recipe_id && (
          <span className="text-xs text-warm-gray ml-2">
            from {item.recipe_title}
          </span>
        )}
      </div>

      {onPantryToggle && (
        <button
          onClick={() => onPantryToggle(item.id, item.name, !inPantry)}
          className={`p-2 transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center ${
            inPantry
              ? 'text-green-600 opacity-100'
              : 'text-warm-gray opacity-60 hover:text-green-600 md:opacity-0 md:group-hover:opacity-100'
          }`}
          aria-label={inPantry ? 'Remove from pantry' : 'Mark as pantry item'}
          title={inPantry ? 'In pantry' : 'Mark as pantry item'}
        >
          <Warehouse size={16} />
        </button>
      )}

      <button
        onClick={() => onDelete(item.id)}
        className="p-2 text-warm-gray opacity-60 hover:text-red-500 transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center md:opacity-0 md:group-hover:opacity-100"
        aria-label="Delete item"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
