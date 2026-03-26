import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Plus, Heart, ShoppingCart, CalendarDays } from 'lucide-react';
import { useLicense } from '../../pro/hooks/useLicense';

const baseNavItems = [
  { to: '/', icon: LayoutGrid, label: 'Home' },
  { to: '/add', icon: Plus, label: 'Add' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/grocery', icon: ShoppingCart, label: 'Grocery' },
];

const proNavItems = [
  { to: '/meal-plan', icon: CalendarDays, label: 'Plan' },
];

export default function BottomNav() {
  const { active: proActive } = useLicense();
  const navItems = proActive ? [...baseNavItems.slice(0, 3), ...proNavItems, baseNavItems[3]] : baseNavItems;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-sm border-t border-cream-dark shadow-lg">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `
              flex flex-col items-center justify-center gap-0.5
              min-w-[44px] min-h-[44px] px-3 py-1
              rounded-xl transition-colors duration-200
              ${isActive ? 'text-terracotta' : 'text-warm-gray hover:text-brown'}
            `}
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
