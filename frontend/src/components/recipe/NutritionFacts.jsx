import React from 'react';

export default function NutritionFacts({ nutrition }) {
  if (!nutrition) return null;

  const { calories, protein, carbs, fat, fiber, sugar } = nutrition;

  // Only render if at least one field has a value
  const hasData = [calories, protein, carbs, fat, fiber, sugar].some(v => v !== null && v !== undefined && v !== '');
  if (!hasData) return null;

  const items = [
    { label: 'Calories', value: calories, unit: 'kcal', highlight: true },
    { label: 'Protein', value: protein, unit: 'g' },
    { label: 'Carbs', value: carbs, unit: 'g' },
    { label: 'Fat', value: fat, unit: 'g' },
    { label: 'Fiber', value: fiber, unit: 'g' },
    { label: 'Sugar', value: sugar, unit: 'g' },
  ].filter(r => r.value !== null && r.value !== undefined && r.value !== '');

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-brown mb-1 font-display">Nutrition Facts</h2>
      <p className="text-xs text-warm-gray mb-3">Per serving</p>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="text-center py-4 px-2 bg-surface-sunken rounded-xl"
          >
            <div className={`text-2xl font-bold leading-none mb-1 ${item.highlight ? 'text-terracotta' : 'text-brown'}`}>
              {item.value}{item.unit !== 'kcal' ? item.unit : ''}
            </div>
            <div className="text-xs font-semibold text-warm-gray uppercase tracking-wide">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
