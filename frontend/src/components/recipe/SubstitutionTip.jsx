import React, { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import * as api from '../../services/api';

/**
 * Shows ingredient substitution suggestions when clicked.
 * Renders inline below the ingredient.
 */
export default function SubstitutionTip({ ingredientName }) {
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleToggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (subs !== null) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getSubstitutions(ingredientName);
      setSubs(data.substitutions || []);
    } catch {
      setSubs([]);
    }
    setLoading(false);
    setOpen(true);
  };

  return (
    <span className="inline">
      <button
        onClick={handleToggle}
        className="inline-flex items-center ml-1 p-0.5 rounded text-warm-gray/40 hover:text-sage transition-colors"
        title="Show substitutions"
        aria-label={`Substitutions for ${ingredientName}`}
      >
        <ArrowLeftRight size={12} />
      </button>
      {open && subs && subs.length > 0 && (
        <span className="block mt-1 mb-1 pl-4 text-xs text-sage border-l-2 border-sage/20">
          {subs.slice(0, 2).map((sub, i) => (
            <span key={i} className="block">
              <span className="font-medium">{sub.substitute}</span>
              {sub.ratio && sub.ratio !== '1:1' && <span className="text-warm-gray"> ({sub.ratio})</span>}
              {sub.notes && <span className="text-warm-gray"> — {sub.notes}</span>}
            </span>
          ))}
        </span>
      )}
      {open && subs && subs.length === 0 && (
        <span className="block mt-1 mb-1 pl-4 text-xs text-warm-gray">No substitutions found</span>
      )}
    </span>
  );
}
