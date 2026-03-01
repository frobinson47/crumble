import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import Button from './Button';

export default function Timer({ initialMinutes, onClose }) {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;

      // Play 3 beeps
      for (let i = 0; i < 3; i++) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        const startTime = ctx.currentTime + i * 0.4;
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
      }
    } catch {
      // Audio not available
    }
  }, []);

  useEffect(() => {
    if (isRunning && totalSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTotalSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setIsDone(true);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, totalSeconds, playBeep]);

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const toggleRunning = () => {
    if (isDone) return;
    setIsRunning(prev => !prev);
  };

  const reset = () => {
    setIsRunning(false);
    setIsDone(false);
    setTotalSeconds(initialMinutes * 60);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-xl
      ${isDone ? 'bg-terracotta/20 animate-pulse' : 'bg-cream-dark'}
    `}>
      <div className="text-2xl font-bold text-brown tabular-nums min-w-[80px] text-center">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleRunning}
          className="p-2 rounded-lg bg-terracotta text-white hover:bg-terracotta-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          onClick={reset}
          className="p-2 rounded-lg bg-warm-gray/30 text-brown hover:bg-warm-gray/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Reset"
        >
          <RotateCcw size={20} />
        </button>

        {isDone && (
          <button
            onClick={() => { playBeep(); }}
            className="p-2 rounded-lg bg-sage text-white hover:bg-sage-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Play sound again"
          >
            <Volume2 size={20} />
          </button>
        )}
      </div>

      {isDone && (
        <span className="text-terracotta font-bold text-sm">Time is up!</span>
      )}
    </div>
  );
}
