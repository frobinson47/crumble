import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { isDemo } = useAuth();

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Demo Banner */}
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
            You're viewing a demo account — actions are read-only
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden">
          <Header onSearch={handleSearch} />
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <Header onSearch={handleSearch} />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            {typeof children === 'function' ? children({ searchQuery }) : children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </div>
  );
}
