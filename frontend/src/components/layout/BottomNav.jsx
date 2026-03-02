import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Plus, Heart, ShoppingCart, User } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutGrid, label: 'Home' },
  { to: '/add', icon: Plus, label: 'Add' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/grocery', icon: ShoppingCart, label: 'Grocery' },
  { to: '/admin', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-cream-dark shadow-lg">
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
