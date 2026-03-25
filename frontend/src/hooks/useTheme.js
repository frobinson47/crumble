import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cookslate-theme';

/**
 * Theme hook: 'light', 'dark', or 'system' (default).
 * Applies data-theme attribute on <html> for CSS overrides.
 */
export default function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'system';
    } catch {
      return 'system';
    }
  });

  const applyTheme = useCallback((value) => {
    if (value === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', value);
    }
    // Update theme-color meta tags for mobile browser chrome
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    if (metaTags.length >= 2) {
      if (value === 'system') {
        // Restore media-based theme-color for system mode
        metaTags[0].setAttribute('media', '(prefers-color-scheme: light)');
        metaTags[0].setAttribute('content', '#C75B39');
        metaTags[1].setAttribute('media', '(prefers-color-scheme: dark)');
        metaTags[1].setAttribute('content', '#1A1412');
      } else {
        // Force both tags to the chosen theme color
        const color = value === 'dark' ? '#1A1412' : '#C75B39';
        metaTags.forEach(tag => {
          tag.removeAttribute('media');
          tag.setAttribute('content', color);
        });
      }
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback((value) => {
    setThemeState(value);
    try {
      if (value === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, value);
      }
    } catch {
      // localStorage not available
    }
    applyTheme(value);
  }, [applyTheme]);

  const cycle = useCallback(() => {
    const order = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  }, [theme, setTheme]);

  // Resolve effective theme (what the user actually sees)
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return { theme, setTheme, cycle, isDark };
}
