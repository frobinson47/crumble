import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, UtensilsCrossed, Clock, Check, Pencil } from 'lucide-react';
import useWakeLock from '../../hooks/useWakeLock';
import Timer from '../ui/Timer';
import IngredientList from './IngredientList';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import * as api from '../../services/api';

const TIME_REGEX = /(\d+)\s*(minutes?|mins?|hours?|hrs?)/gi;

function parseTimers(text) {
  const timers = [];
  let match;
  const regex = new RegExp(TIME_REGEX.source, 'gi');
  while ((match = regex.exec(text)) !== null) {
    let minutes = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      minutes = minutes * 60;
    }
    timers.push(minutes);
  }
  return timers;
}

function highlightIngredients(text, ingredients) {
  if (!ingredients || ingredients.length === 0) return text;

  const names = ingredients
    .map(ing => (ing.name || '').trim())
    .filter(n => n.length >= 3)
    .sort((a, b) => b.length - a.length);

  if (names.length === 0) return text;

  const escapedNames = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'gi');

  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<span key={match.index} className="text-terracotta font-medium">{match[0]}</span>);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 1 ? parts : text;
}

const COOK_PROGRESS_KEY = 'cookslate-cook-progress';

function getSavedProgress(recipeId) {
  try {
    const raw = sessionStorage.getItem(COOK_PROGRESS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.recipeId === recipeId && data.step > 0) return data.step;
  } catch {}
  return null;
}

function saveProgress(recipeId, step) {
  try {
    sessionStorage.setItem(COOK_PROGRESS_KEY, JSON.stringify({ recipeId, step }));
  } catch {}
}

function clearProgress() {
  try { sessionStorage.removeItem(COOK_PROGRESS_KEY); } catch {}
}

export default function CookMode({ steps, ingredients, onClose, recipeId, onDone, annotations = {} }) {
  const savedStep = recipeId ? getSavedProgress(recipeId) : null;
  const [currentStep, setCurrentStep] = useState(savedStep || 0);
  const [showResumeBar, setShowResumeBar] = useState(savedStep !== null && savedStep > 0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [activeTimers, setActiveTimers] = useState([]);
  const touchStartRef = useRef(null);
  const touchDiffRef = useRef(0);
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  // Save progress when step changes
  useEffect(() => {
    if (recipeId) saveProgress(recipeId, currentStep);
  }, [recipeId, currentStep]);

  // Acquire wake lock on mount
  useEffect(() => {
    requestWakeLock();
    return () => {
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const [showDoneModal, setShowDoneModal] = useState(false);
  const [doneNotes, setDoneNotes] = useState('');
  const [doneLoading, setDoneLoading] = useState(false);
  const [logged, setLogged] = useState(false);

  const totalSteps = steps.length;
  const stepText = typeof steps[currentStep] === 'string'
    ? steps[currentStep]
    : steps[currentStep]?.text || String(steps[currentStep]);
  const detectedTimers = parseTimers(stepText);
  const highlightedText = useMemo(
    () => highlightIngredients(stepText, ingredients),
    [stepText, ingredients]
  );

  const handleDone = () => {
    if (recipeId) {
      setShowDoneModal(true);
    } else {
      clearProgress();
      onClose();
    }
  };

  const handleLogCook = async (withNotes = false) => {
    if (doneLoading) return;
    setDoneLoading(true);
    try {
      await api.logCook(recipeId, withNotes ? doneNotes.trim() : null);
      clearProgress();
      setLogged(true);
      setShowDoneModal(false);
      setDoneNotes('');
      if (onDone) onDone();
      setTimeout(() => onClose(), 1200);
    } catch {
      onClose();
    } finally {
      setDoneLoading(false);
    }
  };

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onClose]);

  // Touch swipe handling
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchDiffRef.current = 0;
  };

  const handleTouchMove = (e) => {
    if (touchStartRef.current === null) return;
    touchDiffRef.current = e.touches[0].clientX - touchStartRef.current;
  };

  const handleTouchEnd = () => {
    const diff = touchDiffRef.current;
    const threshold = 50;

    if (diff > threshold) {
      goPrev();
    } else if (diff < -threshold) {
      goNext();
    }

    touchStartRef.current = null;
    touchDiffRef.current = 0;
  };

  const startTimer = (minutes) => {
    setActiveTimers(prev => [...prev, { id: Date.now(), minutes, step: currentStep + 1 }]);
  };

  // Auto-start timers when navigating to a step
  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep;
      const stepTimers = parseTimers(
        typeof steps[currentStep] === 'string'
          ? steps[currentStep]
          : steps[currentStep]?.text || String(steps[currentStep])
      );
      stepTimers.forEach(minutes => {
        const alreadyActive = activeTimers.some(t => t.minutes === minutes && t.step === currentStep + 1);
        if (!alreadyActive) {
          startTimer(minutes);
        }
      });
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#3E2723', color: '#FFF8F0' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Resume notification */}
      {showResumeBar && (
        <div className="flex items-center justify-between px-4 py-2 bg-terracotta/80 text-sm">
          <span>Resumed at step {currentStep + 1}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCurrentStep(0); setShowResumeBar(false); }}
              className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors text-xs"
            >
              Start over
            </button>
            <button
              onClick={() => setShowResumeBar(false)}
              className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setShowIngredients(!showIngredients)}
          className="p-3 rounded-xl bg-white/10 text-[#FFF8F0] hover:bg-white/20 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle ingredients"
        >
          <UtensilsCrossed size={22} />
        </button>

        <span className="text-[#FFF8F0]/70 font-medium text-sm">
          Step {currentStep + 1} of {totalSteps}
        </span>

        <button
          onClick={onClose}
          className="p-3 rounded-xl bg-white/10 text-[#FFF8F0] hover:bg-white/20 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close cook mode"
        >
          <X size={22} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4">
        <div className="h-1 bg-white/15 rounded-full overflow-hidden">
          <div
            className="h-full bg-terracotta rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Ingredient slide-out panel */}
      <div
        className={`
          absolute top-0 left-0 h-full w-80 max-w-[85vw]
          bg-cream shadow-2xl z-10
          transform transition-transform duration-300
          ${showIngredients ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-brown">Ingredients</h3>
            <button
              onClick={() => setShowIngredients(false)}
              className="p-2 rounded-xl text-warm-gray hover:bg-cream-dark min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>
          <IngredientList ingredients={ingredients} />
        </div>
      </div>

      {/* Overlay for ingredient panel */}
      {showIngredients && (
        <div
          className="absolute inset-0 bg-black/30 z-[5]"
          onClick={() => setShowIngredients(false)}
        />
      )}

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-16 py-8">
        <div className="max-w-2xl text-center">
          <p className="text-[#FFF8F0] text-xl md:text-2xl lg:text-3xl leading-relaxed font-light">
            {highlightedText}
          </p>

          {/* Annotation for this step */}
          {annotations.instruction && annotations.instruction[currentStep] && (
            <div className="mt-4 flex items-start gap-2 justify-center text-terracotta/80">
              <Pencil size={14} className="mt-0.5 shrink-0" />
              <span className="text-base italic">{annotations.instruction[currentStep]}</span>
            </div>
          )}

          {/* Timer detection */}
          {detectedTimers.length > 0 && (
            <div className="mt-8 space-y-3">
              {detectedTimers.map((minutes, idx) => {
                const isActive = activeTimers.some(t => t.minutes === minutes && t.step === currentStep + 1);
                if (isActive) return null;
                return (
                  <button
                    key={idx}
                    onClick={() => startTimer(minutes)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-terracotta text-white rounded-xl font-semibold hover:bg-terracotta-dark transition-colors duration-200 min-h-[44px] mx-2"
                  >
                    <Clock size={18} />
                    Start {minutes} min timer
                  </button>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Persistent active timers — visible regardless of current step */}
      {activeTimers.length > 0 && (
        <div className="px-6 pb-2 flex flex-wrap justify-center gap-2">
          {activeTimers.map((timer) => (
            <div key={timer.id} className="flex items-center gap-2">
              <span className="text-[#FFF8F0]/50 text-xs">Step {timer.step}</span>
              <Timer
                initialMinutes={timer.minutes}
                autoStart
                onClose={() => setActiveTimers(prev => prev.filter(t => t.id !== timer.id))}
              />
            </div>
          ))}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between p-6 gap-4">
        <button
          onClick={goPrev}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-6 py-4 bg-white/10 text-[#FFF8F0] rounded-xl font-semibold hover:bg-white/20 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed min-h-[56px] min-w-[120px] justify-center"
        >
          <ChevronLeft size={22} />
          Previous
        </button>

        {currentStep === totalSteps - 1 ? (
          <button
            onClick={handleDone}
            className="flex items-center gap-2 px-6 py-4 bg-sage text-white rounded-xl font-semibold hover:bg-sage-dark transition-colors duration-200 min-h-[56px] min-w-[120px] justify-center"
          >
            {logged ? <><Check size={20} /> Logged!</> : 'Done!'}
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-6 py-4 bg-terracotta text-white rounded-xl font-semibold hover:bg-terracotta-dark transition-colors duration-200 min-h-[56px] min-w-[120px] justify-center"
          >
            Next
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Cook completion modal */}
      <Modal
        isOpen={showDoneModal}
        onClose={() => { setShowDoneModal(false); onClose(); }}
        title="Nice! How'd it go?"
        size="sm"
      >
        <div className="space-y-4">
          <textarea
            value={doneNotes}
            onChange={(e) => setDoneNotes(e.target.value)}
            placeholder="Add a note... (optional)&#10;e.g., Used half the sugar, turned out perfect."
            className="w-full h-24 p-3 rounded-xl border border-cream-dark text-brown text-sm placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta resize-none"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLogCook(false)}
              disabled={doneLoading}
            >
              Just Log It
            </Button>
            <Button
              size="sm"
              onClick={() => handleLogCook(true)}
              disabled={doneLoading || !doneNotes.trim()}
            >
              {doneLoading ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
