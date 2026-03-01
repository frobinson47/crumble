import React from 'react';
import { X } from 'lucide-react';

export default function TagBadge({ tag, onRemove, onClick, isActive = false }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-3 py-1 rounded-full text-sm font-medium
        transition-colors duration-200
        ${isActive
          ? 'bg-sage text-white'
          : 'bg-sage-light text-sage-dark'
        }
        ${onClick ? 'cursor-pointer hover:bg-sage hover:text-white' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {tag}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:text-white transition-colors min-w-[20px] min-h-[20px] flex items-center justify-center"
          aria-label={`Remove ${tag}`}
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}
