import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange = null, size = 'md', count = null }) {
  const [hoverValue, setHoverValue] = useState(0);
  const interactive = typeof onChange === 'function';
  const displayValue = hoverValue || value;

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayValue >= star;
        const halfFilled = !filled && displayValue >= star - 0.5;

        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange(star)}
            onMouseEnter={() => interactive && setHoverValue(star)}
            onMouseLeave={() => interactive && setHoverValue(0)}
            className={`
              ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
              transition-transform duration-150 p-0
              ${filled || halfFilled ? 'text-amber-400' : 'text-warm-gray/60'}
            `}
            style={{ background: 'none', border: 'none', minWidth: 'auto', minHeight: 'auto' }}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              size={iconSize}
              fill={filled ? 'currentColor' : halfFilled ? 'currentColor' : 'none'}
              strokeWidth={filled || halfFilled ? 0 : 1.5}
            />
          </button>
        );
      })}
      {count !== null && count !== undefined && (
        <span className={`ml-1 text-warm-gray ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          ({count})
        </span>
      )}
    </div>
  );
}
