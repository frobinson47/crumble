import React, { lazy, Suspense } from 'react';
import { findGlossaryTerms } from '../../utils/cookingGlossary';
import GlossaryTerm from '../ui/GlossaryTerm';
const AnnotationNote = lazy(() => import('../../pro/ProAnnotations'));

function renderWithGlossary(text, enabled) {
  if (!enabled) return text;

  const matches = findGlossaryTerms(text);
  if (matches.length === 0) return text;

  const parts = [];
  let lastIndex = 0;
  // Deduplicate by index (same term matched twice won't happen due to word boundaries, but safety)
  const seen = new Set();
  for (const match of matches) {
    if (seen.has(match.index)) continue;
    seen.add(match.index);
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <GlossaryTerm key={match.index} term={match.term} definition={match.definition} />
    );
    lastIndex = match.index + match.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export default function StepList({ steps, glossary = true, annotations = {}, onAnnotationSave, onAnnotationDelete }) {
  if (!steps || steps.length === 0) {
    return (
      <p className="text-warm-gray italic">No instructions listed</p>
    );
  }

  const hasAnnotations = onAnnotationSave && onAnnotationDelete;

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => {
        const text = typeof step === 'string' ? step : step.text || step;
        const note = annotations[index];
        return (
          <li key={index} className="flex gap-4 group">
            <div className="shrink-0 w-8 h-8 rounded-full bg-terracotta/10 text-terracotta font-bold flex items-center justify-center text-sm">
              {index + 1}
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-brown-light text-lg leading-relaxed">
                {renderWithGlossary(text, glossary)}
              </p>
              {hasAnnotations && (
                <Suspense fallback={null}>
                  <AnnotationNote
                    note={note}
                    onSave={(text) => onAnnotationSave('instruction', index, text)}
                    onDelete={() => onAnnotationDelete('instruction', index)}
                  />
                </Suspense>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
