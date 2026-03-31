import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { isDemo } = useAuth();
  const navigate = useNavigate();

  // Global paste shortcut: paste a URL anywhere to start import
  useEffect(() => {
    const handlePaste = (e) => {
      const active = document.activeElement;
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.isContentEditable) return;
      const text = e.clipboardData?.getData('text')?.trim();
      if (text && /^https?:\/\/.+/i.test(text)) {
        e.preventDefault();
        navigate(`/add?url=${encodeURIComponent(text)}`);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [navigate]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  return (
    <div className="min-h-screen bg-cream flex w-full">
      {/* Skip to content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-terracotta focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Demo Banner */}
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
            You're viewing a demo account — actions are read-only
          </div>
        )}

        {/* Header */}
        <Header onSearch={handleSearch} />

        {/* Page content */}
        <main id="main-content" className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            {typeof children === 'function' ? children({ searchQuery }) : children}
          </div>
        </main>

        {/* Footer */}
        <footer className="hidden md:flex items-center justify-center gap-1.5 py-3 text-xs text-warm-gray border-t border-cream-dark">
          <Github size={14} />
          <span>Open source on</span>
          <a
            href="https://github.com/frobinson47/cookslate"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terracotta hover:underline"
          >
            GitHub
          </a>
        </footer>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </div>
  );
}
