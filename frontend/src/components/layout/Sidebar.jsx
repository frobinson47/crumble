import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Plus, ShoppingCart, User, Shield, LogOut, Upload, BookOpen, Heart, CalendarDays, TrendingUp, Sun, Moon, Monitor, Download, Settings, Database, Compass, Library } from 'lucide-react';
import CookslateLogo from '../ui/CookslateLogo';
import { useAuth } from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import { useLicense } from '../../hooks/useLicense';

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, cycle } = useTheme();
  const { active: proActive } = useLicense();
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  const navItems = [
    { to: '/', icon: LayoutGrid, label: 'Recipes' },
    { to: '/add', icon: Plus, label: 'Add Recipe' },
    { to: '/bulk-import', icon: Upload, label: 'Bulk Import' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    ...(proActive ? [{ to: '/meal-plan', icon: CalendarDays, label: 'Meal Plan' }] : []),
    { to: '/grocery', icon: ShoppingCart, label: 'Grocery Lists' },
    { to: '/collections', icon: Library, label: 'Collections' },
    { to: '/discover', icon: Compass, label: 'Discover' },
    { to: '/cook-history', icon: BookOpen, label: 'Cook History' },
    ...(proActive ? [{ to: '/stats', icon: TrendingUp, label: 'Kitchen Stats' }] : []),
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin' });
  }
  navItems.push({ to: '/ingredient-database', icon: Database, label: 'Ingredients' });

  navItems.push({ to: '/settings', icon: Settings, label: 'Settings' });

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore errors on logout
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-cream-dark h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-cream-dark">
        <div className="flex items-center gap-2">
          <CookslateLogo size={32} className="text-terracotta" />
          <span className="text-2xl font-bold text-brown font-display">
            Cookslate
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl
              min-h-[44px]
              font-medium transition-colors duration-200
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

      {/* User section */}
      <div className="p-4 border-t border-cream-dark">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center">
            <User size={16} className="text-sage-dark" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brown">{user?.username}</p>
            <p className="text-xs text-warm-gray capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={cycle}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-brown-light hover:bg-cream-dark hover:text-brown transition-colors duration-200 min-h-[44px] font-medium"
        >
          <ThemeIcon size={20} />
          <span>{themeLabel} Mode</span>
        </button>
        <a
          href="/api/recipes/export-zip"
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-brown-light hover:bg-cream-dark hover:text-brown transition-colors duration-200 min-h-[44px] font-medium"
        >
          <Download size={20} />
          <span>Export Recipes</span>
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-brown-light hover:bg-cream-dark hover:text-brown transition-colors duration-200 min-h-[44px] font-medium"
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
