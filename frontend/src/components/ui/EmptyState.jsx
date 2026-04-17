import React from 'react';
import { Link } from 'react-router-dom';

/**
 * EmptyState — branded empty state with illustration circle, title, description, and CTA.
 *
 * @param {object} props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} props.title - Heading text
 * @param {string} props.description - Body text
 * @param {'terracotta'|'sage'|'cream'} [props.accent='terracotta'] - Illustration circle color
 * @param {string} [props.actionLabel] - CTA button text
 * @param {string} [props.actionTo] - CTA link destination (renders Link)
 * @param {function} [props.onAction] - CTA click handler (renders button)
 * @param {React.ReactNode} [props.children] - Extra content below CTA
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  accent = 'terracotta',
  actionLabel,
  actionTo,
  onAction,
  children,
}) {
  const circleColors = {
    terracotta: 'bg-terracotta-50',
    sage: 'bg-sage-50',
    cream: 'bg-cream-dark',
  };

  const iconColors = {
    terracotta: 'text-terracotta',
    sage: 'text-sage',
    cream: 'text-warm-gray',
  };

  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      {/* Illustration circle */}
      <div className={`relative w-24 h-24 rounded-full ${circleColors[accent]} flex items-center justify-center mb-5`}>
        <Icon size={40} className={`${iconColors[accent]} opacity-70`} />
      </div>

      <h2 className="text-xl font-bold text-brown font-display mb-2">{title}</h2>
      <p className="text-warm-gray text-[15px] leading-relaxed max-w-xs mb-6">{description}</p>

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-terracotta text-white font-bold text-[15px] hover:bg-terracotta-dark transition-colors shadow-warm hover:-translate-y-0.5 hover:shadow-warm-lg"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && onAction && !actionTo && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-terracotta text-white font-bold text-[15px] hover:bg-terracotta-dark transition-colors shadow-warm hover:-translate-y-0.5 hover:shadow-warm-lg"
        >
          {actionLabel}
        </button>
      )}

      {children}
    </div>
  );
}
