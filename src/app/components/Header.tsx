'use client';

import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import LeleIcon from './icons/LeleIcon';
import HeartIcon from './icons/HeartIcon';
import MusicPlayer from './MusicPlayer';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header>
      <div className="fixed w-full left-0 top-0 flex justify-between items-center p-4 z-[90]">
        
        {/* Desktop/Tablet: Left pills */}
        <div className="hidden md:flex items-center gap-2">
          <div className="bg-gray-50 text-brown px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px]">
            contact
          </div>
          <div className="bg-gray-50 text-brown px-5 py-3 rounded-full text-xs font-sans flex items-center gap-2 backdrop-blur-[20px]">
            <HeartIcon className="text-accentgray"/>
            working & playing
          </div>
        </div>

        {/* Mobile: Empty space for layout */}
        <div className="md:hidden"></div>
        
        {/* Center: Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <LeleIcon className="text-accentgray" />
        </div>
        
        {/* Desktop/Tablet: Right pills */}
        <div className="hidden md:flex items-center gap-2">
          <div className="bg-gray-50 text-brown px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px]">
            san francisco, ca
          </div>
          <MusicPlayer />
        </div>

        {/* Mobile: Social icons */}
        <div className="md:hidden flex items-center gap-4">
          <button 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Twitter"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Contact"
          >
            <Mail className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Mobile menu only */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute top-20 right-6 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <button 
              className="bg-accentgray text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-600 transition-colors whitespace-nowrap"
              onClick={() => setIsMenuOpen(false)}
            >
              contact
            </button>
            <div className="bg-accentgray text-white px-6 py-3 rounded-full text-sm whitespace-nowrap">
              san francisco, ca
            </div>
            <div className="bg-accentgray text-white px-6 py-3 rounded-full text-sm flex items-center gap-2 whitespace-nowrap">
              <HeartIcon className="text-accentgray" size={12} />
              working & playing
            </div>
          </div>
        </div>
      )}
    </header>
  );
}