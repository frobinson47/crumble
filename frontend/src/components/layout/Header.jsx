import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, CookingPot } from 'lucide-react';

export default function Header({ onSearch }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();

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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm shadow-sm border-b border-cream-dark">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <CookingPot className="text-terracotta" size={28} />
          <span className="text-2xl font-bold text-brown font-display">
            Crumble
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
              className="w-full pl-10 pr-10 py-2 rounded-xl border border-cream-dark bg-cream/50 text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors duration-200"
            />
            {searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray hover:text-brown"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        {/* Mobile search toggle */}
        <button
          className="md:hidden p-2 rounded-xl text-warm-gray hover:bg-cream-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label="Toggle search"
        >
          {searchOpen ? <X size={22} /> : <Search size={22} />}
        </button>
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
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-cream-dark bg-cream/50 text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-colors duration-200"
            />
            {searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray hover:text-brown"
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>
      )}
    </header>
  );
}
