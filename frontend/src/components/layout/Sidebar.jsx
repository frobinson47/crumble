import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, ShoppingCart, Heart, CalendarDays, Search, Settings, Sun, Moon, Monitor, LogOut, Plus, Upload, BookOpen, TrendingUp, Shield, Database, Compass, Library, ChevronRight, Download, FileText, User } from 'lucide-react';
import CookslateLogo from '../ui/CookslateLogo';
import { useAuth } from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import { useLicense } from '../../hooks/useLicense';

function DesktopExportMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors duration-150 text-sm font-medium"
      >
        <Download size={18} />
        <span className="flex-1">Export Recipes</span>
        <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="ml-7 mt-1 space-y-0.5">
          <a
            href="/api/recipes/export-zip"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors duration-150"
          >
            <Download size={14} />
            <span>ZIP (Full Backup)</span>
          </a>
          <a
            href="/api/recipes/export-cooklang"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors duration-150"
          >
            <FileText size={14} />
            <span>Cooklang (.cook)</span>
          </a>
        </div>
      )}
    </div>
  );
}

function NavIcon({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `
        relative group flex items-center justify-center w-11 h-11 rounded-xl
        transition-colors duration-150
        ${isActive
          ? 'bg-terracotta/10 text-terracotta'
          : 'text-warm-gray hover:bg-cream-dark hover:text-brown'
        }
      `}
      aria-label={label}
    >
      <Icon size={20} />
      <span className="absolute left-14 bg-brown text-white text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-warm">
        {label}
      </span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, cycle } = useTheme();
  const { active: proActive } = useLicense();
  const [expanded, setExpanded] = useState(false);
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
  };

  // Tier 2+ items for expanded view
  const tier2Items = [
    { to: '/add', icon: Plus, label: 'Add Recipe' },
    { to: '/bulk-import', icon: Upload, label: 'Bulk Import' },
    { to: '/collections', icon: Library, label: 'Collections' },
    { to: '/discover', icon: Compass, label: 'Discover' },
    { to: '/cook-history', icon: BookOpen, label: 'Cook History' },
    ...(proActive ? [{ to: '/stats', icon: TrendingUp, label: 'Kitchen Stats' }] : []),
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
    { to: '/ingredient-database', icon: Database, label: 'Ingredients' },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-surface border-r border-cream-dark h-screen sticky top-0 transition-all duration-200 overflow-hidden ${expanded ? 'w-60' : 'w-16'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 h-16 shrink-0 border-b border-cream-dark ${expanded ? 'px-4' : 'justify-center'}`}>
        <CookslateLogo size={28} className="text-terracotta shrink-0" />
        {expanded && (
          <span className="text-lg font-bold text-brown font-display whitespace-nowrap">
            Cookslate
          </span>
        )}
      </div>

      {/* Tier 1 Navigation */}
      <nav className={`flex-1 flex flex-col gap-1 py-3 ${expanded ? 'px-3' : 'items-center px-0'}`}>
        {/* Tier 1 items — always visible */}
        {expanded ? (
          <>
            <ExpandedLink to="/" icon={LayoutGrid} label="Recipes" end />
            <ExpandedLink to="/favorites" icon={Heart} label="Favorites" />
            {proActive && <ExpandedLink to="/meal-plan" icon={CalendarDays} label="Meal Plan" />}
            <ExpandedLink to="/grocery" icon={ShoppingCart} label="Grocery Lists" />

            {/* Divider */}
            <div className="h-px bg-cream-dark my-2" />

            {/* Tier 2 */}
            {tier2Items.map(item => (
              <ExpandedLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </>
        ) : (
          <>
            <NavIcon to="/" icon={LayoutGrid} label="Recipes" end />
            <NavIcon to="/favorites" icon={Heart} label="Favorites" />
            {proActive && <NavIcon to="/meal-plan" icon={CalendarDays} label="Meal Plan" />}
            <NavIcon to="/grocery" icon={ShoppingCart} label="Grocery Lists" />

            {/* More indicator */}
            <button
              className="flex items-center justify-center w-11 h-11 rounded-xl text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors duration-150 relative group"
              onClick={() => setExpanded(true)}
              aria-label="More navigation"
            >
              <ChevronRight size={18} />
              <span className="absolute left-14 bg-brown text-white text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-warm">
                More
              </span>
            </button>
          </>
        )}

        {/* Search (opens Cmd+K) */}
        {expanded ? (
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors duration-150 text-sm font-medium"
          >
            <Search size={18} />
            <span>Search</span>
            <kbd className="ml-auto text-[10px] font-semibold text-warm-gray/60 bg-cream-dark px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
        ) : (
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="relative group flex items-center justify-center w-11 h-11 rounded-xl text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors duration-150"
            aria-label="Search (Ctrl+K)"
          >
            <Search size={20} />
            <span className="absolute left-14 bg-brown text-white text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-warm">
              Search ⌘K
            </span>
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Settings + Theme + Logout (bottom) */}
        {expanded ? (
          <>
            <div className="h-px bg-cream-dark my-2" />
            <DesktopExportMenu />
            <button
              onClick={cycle}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors duration-150 text-sm font-medium"
            >
              <ThemeIcon size={18} />
              <span>{theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'}</span>
            </button>
            <ExpandedLink to="/settings" icon={Settings} label="Settings" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors duration-150 text-sm font-medium"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </>
        ) : (
          <>
            <NavIcon to="/settings" icon={Settings} label="Settings" />
            <button
              onClick={cycle}
              className="relative group flex items-center justify-center w-11 h-11 rounded-xl text-warm-gray hover:bg-cream-dark hover:text-brown transition-colors duration-150"
              aria-label="Toggle theme"
            >
              <ThemeIcon size={18} />
              <span className="absolute left-14 bg-brown text-white text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-warm">
                Theme
              </span>
            </button>
          </>
        )}
      </nav>
    </aside>
  );
}

function ExpandedLink({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-sm font-medium transition-colors duration-150 whitespace-nowrap
        ${isActive
          ? 'bg-terracotta/10 text-terracotta'
          : 'text-warm-gray hover:bg-cream-dark hover:text-brown'
        }
      `}
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}
