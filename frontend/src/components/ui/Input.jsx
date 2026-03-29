import React from 'react';

export default function Input({
  label,
  error,
  className = '',
  type = 'text',
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-brown mb-1"
        >
          {label}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-xl
            border border-cream-dark
            bg-surface text-brown
            placeholder:text-warm-gray
            focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta
            transition-colors duration-200
            min-h-[44px]
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          className={`
            w-full px-4 py-2.5 rounded-xl
            border border-cream-dark
            bg-surface text-brown
            placeholder:text-warm-gray
            focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta
            transition-colors duration-200
            min-h-[44px]
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      )}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
