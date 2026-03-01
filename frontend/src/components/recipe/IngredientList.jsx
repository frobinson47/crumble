import React from 'react';

export default function IngredientList({ ingredients, checkable = false, checkedItems = {}, onToggle }) {
  if (!ingredients || ingredients.length === 0) {
    return (
      <p className="text-warm-gray italic">No ingredients listed</p>
    );
  }

  return (
    <ul className="space-y-2">
      {ingredients.map((ingredient, index) => {
        const key = ingredient.id || index;
        const isChecked = checkedItems[key];

        return (
          <li
            key={key}
            className={`
              flex items-start gap-3 py-2 px-3 rounded-xl
              ${checkable ? 'cursor-pointer hover:bg-cream-dark' : ''}
              transition-colors duration-200
            `}
            onClick={checkable ? () => onToggle?.(key) : undefined}
          >
            {checkable && (
              <input
                type="checkbox"
                checked={isChecked || false}
                onChange={() => onToggle?.(key)}
                className="mt-1 w-5 h-5 rounded border-cream-dark text-terracotta focus:ring-terracotta cursor-pointer"
              />
            )}
            <span className={`text-brown-light ${isChecked ? 'line-through opacity-50' : ''} transition-all duration-200`}>
              {ingredient.amount && (
                <span className="font-semibold text-brown">{ingredient.amount} </span>
              )}
              {ingredient.unit && ingredient.unit !== 'to taste' && (
                <span className="text-brown">{ingredient.unit} </span>
              )}
              <span>{ingredient.name}</span>
              {ingredient.unit === 'to taste' && (
                <span className="text-warm-gray italic"> (to taste)</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
