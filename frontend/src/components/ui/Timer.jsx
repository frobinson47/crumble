import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import Button from './Button';

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(minutes) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Timer Done!', {
        body: `Your ${minutes} minute timer has finished.`,
        icon: '/cookslate_icon.png',
        tag: `cookslate-timer-${minutes}`,
        requireInteraction: true,
      });
    } catch {
      // Notification not available (e.g. some mobile browsers)
    }
  }
}

export default function Timer({ initialMinutes, onClose, autoStart = false }) {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Request notification permission when timer auto-starts
  useEffect(() => {
    if (autoStart) requestNotificationPermission();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      // Resume if suspended (iOS requires user gesture to resume)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      return audioContextRef.current;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = ctx;
    return ctx;
  }, []);

  const playBeep = useCallback(() => {
    try {
      const ctx = getAudioContext();

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
  }, [getAudioContext]);

  useEffect(() => {
    if (isRunning && totalSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTotalSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setIsDone(true);
            playBeep();
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
            sendNotification(initialMinutes);
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
    if (!isRunning) requestNotificationPermission();
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
        <span className="text-terracotta font-bold text-sm" role="alert">Time is up!</span>
      )}
    </div>
  );
}
