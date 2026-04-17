import React from 'react';
import { LayoutGrid, List, AlignJustify } from 'lucide-react';

const MODES = [
  { value: 'grid', icon: LayoutGrid, label: 'Grid view' },
  { value: 'list', icon: List, label: 'List view' },
  { value: 'compact', icon: AlignJustify, label: 'Compact view' },
];

export default function DensityToggle({ value, onChange }) {
  return (
    <div className="flex bg-surface-sunken rounded-xl p-0.5 gap-0.5">
      {MODES.map(({ value: v, icon: Icon, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`
            w-9 h-8 rounded-lg flex items-center justify-center transition-all duration-150
            ${value === v
              ? 'bg-surface shadow-sm text-terracotta'
              : 'text-warm-gray hover:text-brown'
            }
          `}
          aria-label={label}
          title={label}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
