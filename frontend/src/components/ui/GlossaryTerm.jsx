import React, { useState, useEffect, useCallback } from 'react';

export default function GlossaryTerm({ term, definition }) {
  const [show, setShow] = useState(false);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setShow(false);
  }, []);

  useEffect(() => {
    if (!show) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, handleKeyDown]);

  return (
    <span className="relative inline">
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-expanded={show}
        className="glossary-term border-b border-dotted border-terracotta/40 text-inherit hover:border-terracotta cursor-help"
      >
        {term}
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} aria-hidden="true" />
          <div role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-3 rounded-xl bg-brown text-cream text-sm leading-relaxed shadow-lg">
            <span className="font-semibold text-terracotta-light">{term}</span>
            <span className="mx-1">—</span>
            {definition}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-brown" />
          </div>
        </>
      )}
    </span>
  );
}
