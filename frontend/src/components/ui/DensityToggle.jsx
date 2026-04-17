import React from 'react';
import { LayoutGrid, List, AlignJustify } from 'lucide-react';

const MODES = [
  { value: 'grid', icon: LayoutGrid, label: 'Grid view' },
  { value: 'list', icon: List, label: 'List view' },
  { value: 'compact', icon: AlignJustify, label: 'Compact view' },
];

export default function DensityToggle({ value, onChange }) {
  return (
    <div className="flex border border-cream-dark rounded-xl p-1 gap-1 bg-surface">
      {MODES.map(({ value: v, icon: Icon, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`
            w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150
            ${value === v
              ? 'bg-terracotta/10 text-terracotta shadow-sm'
              : 'text-warm-gray hover:text-brown hover:bg-cream-dark'
            }
          `}
          aria-label={label}
          title={label}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}
