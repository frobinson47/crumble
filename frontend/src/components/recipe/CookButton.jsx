import React, { useState } from 'react';
import { ChefHat, Check } from 'lucide-react';
import * as api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function CookButton({ recipeId, cookCount = 0, onCook }) {
  const { user } = useAuth();
  const [count, setCount] = useState(cookCount);
  const [justCooked, setJustCooked] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleCook = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.logCook(recipeId);
      setCount(prev => prev + 1);
      setJustCooked(true);
      setTimeout(() => setJustCooked(false), 2000);
      if (onCook) onCook();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCook}
      disabled={loading}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
        transition-all duration-200 min-h-[44px]
        ${justCooked
          ? 'bg-sage text-white'
          : 'bg-cream-dark text-brown hover:bg-sage/20 hover:text-sage-dark'
        }
        disabled:opacity-50
      `}
    >
      {justCooked ? <Check size={16} /> : <ChefHat size={16} />}
      {justCooked ? 'Logged!' : 'I Cooked This'}
      {count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs ${
          justCooked ? 'bg-white/20' : 'bg-warm-gray/15'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
