import React from 'react';

export default function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          ${sizeClasses[size] || sizeClasses.md}
          border-4 border-cream-dark border-t-terracotta
          rounded-full animate-spin
        `}
      />
    </div>
  );
}
