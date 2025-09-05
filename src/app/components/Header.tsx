'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LeleIcon from './icons/LeleIcon';
import HeartIcon from './icons/HeartIcon';
import TwitterIcon from './icons/TwitterIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import ExpandCollapseButton from './ExpandCollapseButton';
import MusicPlayer from './MusicPlayer';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleEmailCopy = () => {
    navigator.clipboard.writeText('clzhang@berkeley.edu');
  };

  return (
    <header>
      {/* Desktop/Tablet: Full header - use CSS media queries only */}
      <div className="hidden md:block">
        <div className="fixed w-full left-0 top-0 flex justify-between items-center p-4 z-[90]">
          {/* Left pills */}
          <div className="flex items-center gap-2">
            <div className="bg-gray-50 text-brown px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px]">
              contact
            </div>
            <div className="bg-gray-50 text-brown px-5 py-3 rounded-full text-xs font-sans flex items-center gap-2 backdrop-blur-[20px]">
              <HeartIcon className="text-accentgray"/>
              working & playing
            </div>
          </div>
          
          {/* Center: Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <LeleIcon className="text-accentgray" />
          </div>
          
          {/* Right pills */}
          <div className="flex items-center gap-2">
            <div className="bg-gray-50 text-brown px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px]">
              san francisco, ca
            </div>
            <MusicPlayer />
          </div>
        </div>
      </div>

      {/* Mobile: New layout - use CSS media queries for reliable display */}
      <div className="block md:hidden">
        {/* Mobile header - always visible */}
        <div className="fixed w-full left-0 top-0 flex justify-between items-center p-4 z-[90]">
          {/* Left: Logo */}
          <LeleIcon className="text-accentgray" />
          
          {/* Right: Social icons */}
          <div className="flex items-center gap-3">
            <a
              href="https://x.com/CherrilynnZ"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Twitter"
            >
              <TwitterIcon className="text-gray-500" size={20} />
            </a>
            <button 
              onClick={handleEmailCopy}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Email"
            >
              <EnvelopeIcon className="text-gray-500" size={20} />
            </button>
          </div>
        </div>

        {/* Mobile music player - always at bottom */}
        <div className="fixed bottom-0 right-0 z-[80] p-4">
          <div className="flex justify-between items-end">
            <MusicPlayer className="flex-1 mr-4 w-[180px]" />
                          <ExpandCollapseButton
                isExpanded={isMenuOpen}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex-shrink-0"
                size={40}
              />
          </div>
        </div>

        {/* Mobile expanded menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              className="fixed inset-0 z-[70]"
              exit={{ 
                opacity: 0,
                transition: { 
                  duration: 0.3,
                  ease: "easeOut"
                }
              }}
            >
              <div className="absolute bottom-16 right-18 flex flex-col gap-2 items-end">
                <button 
                  onClick={handleEmailCopy}
                  className="bg-gray-50/90 text-brown px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px] hover:bg-gray-100/90 transition-colors whitespace-nowrap"
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  contact
                </button>
                <div 
                  className="bg-gray-50/90 text-brown px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px] whitespace-nowrap"
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  san francisco, ca
                </div>
                <div 
                  className="bg-gray-50/90 text-brown px-5 py-3 rounded-full text-xs font-sans flex items-center gap-2 backdrop-blur-[20px] whitespace-nowrap"
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  <HeartIcon className="text-accentgray" size={12} />
                  working & playing
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}