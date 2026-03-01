import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, UtensilsCrossed, Clock } from 'lucide-react';
import useWakeLock from '../../hooks/useWakeLock';
import Timer from '../ui/Timer';
import IngredientList from './IngredientList';

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

export default function CookMode({ steps, ingredients, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [activeTimers, setActiveTimers] = useState([]);
  const touchStartRef = useRef(null);
  const touchDiffRef = useRef(0);
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

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

  const totalSteps = steps.length;
  const stepText = typeof steps[currentStep] === 'string'
    ? steps[currentStep]
    : steps[currentStep]?.text || String(steps[currentStep]);
  const detectedTimers = parseTimers(stepText);

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      setActiveTimers([]);
    }
  }, [currentStep, totalSteps]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setActiveTimers([]);
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
    setActiveTimers(prev => [...prev, { id: Date.now(), minutes }]);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-brown flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setShowIngredients(!showIngredients)}
          className="p-3 rounded-xl bg-brown-light/50 text-cream hover:bg-brown-light transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle ingredients"
        >
          <UtensilsCrossed size={22} />
        </button>

        <span className="text-cream/70 font-medium text-sm">
          Step {currentStep + 1} of {totalSteps}
        </span>

        <button
          onClick={onClose}
          className="p-3 rounded-xl bg-brown-light/50 text-cream hover:bg-brown-light transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close cook mode"
        >
          <X size={22} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4">
        <div className="h-1 bg-brown-light/30 rounded-full overflow-hidden">
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
          <p className="text-cream text-xl md:text-2xl lg:text-3xl leading-relaxed font-light">
            {stepText}
          </p>

          {/* Timer detection */}
          {detectedTimers.length > 0 && (
            <div className="mt-8 space-y-3">
              {detectedTimers.map((minutes, idx) => {
                const isActive = activeTimers.some(t => t.minutes === minutes);
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

          {/* Active timers */}
          {activeTimers.length > 0 && (
            <div className="mt-6 space-y-3 flex flex-col items-center">
              {activeTimers.map((timer) => (
                <Timer
                  key={timer.id}
                  initialMinutes={timer.minutes}
                  onClose={() => setActiveTimers(prev => prev.filter(t => t.id !== timer.id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between p-6 gap-4">
        <button
          onClick={goPrev}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-6 py-4 bg-brown-light/50 text-cream rounded-xl font-semibold hover:bg-brown-light transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed min-h-[56px] min-w-[120px] justify-center"
        >
          <ChevronLeft size={22} />
          Previous
        </button>

        {currentStep === totalSteps - 1 ? (
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-4 bg-sage text-white rounded-xl font-semibold hover:bg-sage-dark transition-colors duration-200 min-h-[56px] min-w-[120px] justify-center"
          >
            Done!
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
    </div>
  );
}
