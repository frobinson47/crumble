import React from 'react';

/**
 * Cookslate branded logo — the pot SVG from cookslate.app.
 * Supports light and dark mode via currentColor or explicit props.
 */
export default function CookslateLogo({ size = 32, className = '' }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
    >
      <rect width="512" height="512" rx="96" className="fill-cream-dark dark:fill-brown" />
      <g stroke="currentColor" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M144 240h224v120c0 40-32 72-72 72H216c-40 0-72-32-72-72V240z" />
        <line x1="124" y1="240" x2="388" y2="240" />
        <path d="M124 264h-20c-16 0-28-12-28-28v0c0-16 12-28 28-28h20" />
        <path d="M388 264h20c16 0 28-12 28-28v0c0-16-12-28-28-28h-20" />
        <path d="M224 192h64" />
        <path d="M208 160c0-16 16-24 16-40" strokeWidth="18" />
        <path d="M256 148c0-16 16-24 16-40" strokeWidth="18" />
        <path d="M304 160c0-16 16-24 16-40" strokeWidth="18" />
      </g>
    </svg>
  );
}
