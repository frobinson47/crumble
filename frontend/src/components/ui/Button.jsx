import React from 'react';

const variants = {
  primary: 'bg-terracotta text-white hover:bg-terracotta-dark focus:ring-terracotta',
  secondary: 'bg-sage text-white hover:bg-sage-dark focus:ring-sage',
  outline: 'border-2 border-terracotta text-terracotta hover:bg-terracotta hover:text-white focus:ring-terracotta',
  ghost: 'text-brown-light hover:bg-cream-dark focus:ring-brown-light',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-xl
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        min-h-[44px] min-w-[44px]
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
