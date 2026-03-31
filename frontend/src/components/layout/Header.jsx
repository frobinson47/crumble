import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, X, CookingPot, Sun, Moon, Monitor, Menu, BookOpen, TrendingUp, Upload, Shield, LogOut, User, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';

export default function Header({ onSearch }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const { theme, cycle } = useTheme();

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [drawerOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchValue);
    }
    navigate('/');
  };

  const clearSearch = () => {
    setSearchValue('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-surface shadow-sm border-b border-cream-dark">
      <div className="max-w-7xl mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between gap-2 md:gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <CookingPot className="text-terracotta" size={24} />
          <span className="text-lg md:text-2xl font-bold text-brown font-display">
            Cookslate
          </span>
        </Link>

        {/* Desktop search */}
        <div className="hidden md:flex flex-1 max-w-md mx-auto">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={18} />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-xl border border-cream-dark bg-surface text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors duration-200"
            />
            {searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray hover:text-brown"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            className="p-2 rounded-xl text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={cycle}
            aria-label={`Theme: ${theme}. Click to change.`}
            title={`Theme: ${theme}`}
          >
            <ThemeIcon size={20} />
          </button>

          {/* Mobile search toggle */}
          <button
            className="md:hidden p-2 rounded-xl text-warm-gray hover:bg-cream-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Toggle search"
          >
            {searchOpen ? <X size={22} /> : <Search size={22} />}
          </button>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-xl text-warm-gray hover:bg-cream-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile search bar (expandable) */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={18} />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-cream-dark bg-surface text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors duration-200"
            />
            {searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray hover:text-brown"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>
      )}

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed top-0 right-0 z-50 h-full w-72 bg-surface shadow-2xl transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex flex-col h-full">
          {/* Drawer header */}
          <div className="flex items-center justify-between p-4 border-b border-cream-dark">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center">
                <User size={16} className="text-sage-dark" />
              </div>
              <div>
                <p className="text-sm font-semibold text-brown">{user?.username}</p>
                <p className="text-xs text-warm-gray capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded-xl text-warm-gray hover:bg-cream-dark min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          {/* Drawer navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {[
              { to: '/cook-history', icon: BookOpen, label: 'Cook History' },
              { to: '/stats', icon: TrendingUp, label: 'Kitchen Stats' },
              { to: '/bulk-import', icon: Upload, label: 'Bulk Import' },
              ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
            ].map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  min-h-[44px] font-medium transition-colors duration-200
                  ${isActive
                    ? 'bg-terracotta/10 text-terracotta'
                    : 'text-brown-light hover:bg-cream-dark hover:text-brown'
                  }
                `}
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Drawer footer */}
          <div className="p-3 border-t border-cream-dark space-y-1">
            <a
              href="/api/recipes/export-zip"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-brown-light hover:bg-cream-dark hover:text-brown transition-colors duration-200 min-h-[44px] font-medium"
            >
              <Download size={20} />
              <span>Export Recipes</span>
            </a>
            <button
              onClick={() => { cycle(); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-brown-light hover:bg-cream-dark hover:text-brown transition-colors duration-200 min-h-[44px] font-medium"
            >
              <ThemeIcon size={20} />
              <span>{theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'} Mode</span>
            </button>
            <button
              onClick={async () => {
                setDrawerOpen(false);
                try { await logout(); } catch {}
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-brown-light hover:bg-cream-dark hover:text-brown transition-colors duration-200 min-h-[44px] font-medium"
            >
              <LogOut size={20} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
