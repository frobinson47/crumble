import React from 'react';

export default function StepList({ steps }) {
  if (!steps || steps.length === 0) {
    return (
      <p className="text-warm-gray italic">No instructions listed</p>
    );
  }

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => {
        const text = typeof step === 'string' ? step : step.text || step;
        return (
          <li key={index} className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-terracotta/10 text-terracotta font-bold flex items-center justify-center text-sm">
              {index + 1}
            </div>
            <div className="flex-1 pt-1">
              <p className="text-brown-light leading-relaxed">{text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
