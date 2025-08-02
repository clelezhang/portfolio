'use client';

import { useState } from 'react';
import { Mail, X } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        {/* Desktop/Tablet: Left pills */}
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-grey-500 text-white px-4 py-2 rounded-full text-sm font-sans">
            currently viewing
          </div>
          <div className="bg-grey-500 text-white px-4 py-2 rounded-full text-sm font-sans">
            projects
          </div>
        </div>

        {/* Mobile: Empty space for layout */}
        <div className="md:hidden"></div>
        
        {/* Center: Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 text-red font-mono font-bold text-2xl">
          lele
        </div>
        
        {/* Desktop/Tablet: Right pills */}
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-grey-500 text-white px-4 py-2 rounded-full text-sm font-sans">
            contact
          </div>
          <div className="bg-grey-500 text-white px-4 py-2 rounded-full text-sm font-sans flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            working & playing
          </div>
        </div>

        {/* Mobile: Social icons */}
        <div className="md:hidden flex items-center gap-4">
          <button 
            className="p-2 hover:bg-grey-100 rounded-full transition-colors"
            aria-label="Twitter"
          >
            <X className="w-5 h-5 text-grey-600" />
          </button>
          <button 
            className="p-2 hover:bg-grey-100 rounded-full transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Contact"
          >
            <Mail className="w-5 h-5 text-grey-600" />
          </button>
        </div>
      </div>
      
      {/* Mobile menu only */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute top-20 right-6 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <button 
              className="bg-grey-500 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-grey-600 transition-colors whitespace-nowrap"
              onClick={() => setIsMenuOpen(false)}
            >
              contact
            </button>
            <div className="bg-grey-500 text-white px-6 py-3 rounded-full text-sm whitespace-nowrap">
              san francisco, ca
            </div>
            <div className="bg-grey-500 text-white px-6 py-3 rounded-full text-sm flex items-center gap-2 whitespace-nowrap">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              working & playing
            </div>
          </div>
        </div>
      )}
    </header>
  );
}