import React, { useState } from 'react';
import { ChefHat, Check } from 'lucide-react';
import * as api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function CookButton({ recipeId, cookCount = 0, onCook }) {
  const { user } = useAuth();
  const [count, setCount] = useState(cookCount);
  const [justCooked, setJustCooked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');

  if (!user) return null;

  const handleCook = async (withNotes = false) => {
    if (loading) return;
    setLoading(true);
    try {
      await api.logCook(recipeId, withNotes ? notes.trim() : null);
      setCount(prev => prev + 1);
      setJustCooked(true);
      setShowModal(false);
      setNotes('');
      setTimeout(() => setJustCooked(false), 2000);
      if (onCook) onCook();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
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

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setNotes(''); }}
        title="Nice! How'd it go?"
        size="sm"
      >
        <div className="space-y-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note... (optional)&#10;e.g., Used half the sugar, turned out perfect."
            className="w-full h-24 p-3 rounded-xl border border-cream-dark text-brown text-sm placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta resize-none"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCook(false)}
              disabled={loading}
            >
              Just Log It
            </Button>
            <Button
              size="sm"
              onClick={() => handleCook(true)}
              disabled={loading || !notes.trim()}
            >
              {loading ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
