'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import LeleIcon from './icons/LeleIcon';
import HeartIcon from './icons/HeartIcon';
import TwitterIcon from './icons/TwitterIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import ExpandCollapseButton from './ExpandCollapseButton';
import MusicPlayer from './MusicPlayer';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleEmailCopy = () => {
    navigator.clipboard.writeText('clzhang@berkeley.edu');
  };

  const scrollToSection = (sectionId: string) => {
    // If we're on the home page, scroll to the section
    if (pathname === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    } else {
      // If we're on another page, navigate to home with hash
      router.push(`/#${sectionId}`);
    }
  };

  return (
    <header>
      {/* Desktop/Tablet: Full header - use CSS media queries only */}
      <div className="hidden md:block">
        <div className="fixed w-full left-0 top-0 flex justify-between items-center p-4 z-[90]">
          {/* Left pills */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => scrollToSection('talk-to-me')}
              className="text-slate px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px] transition-all duration-150 cursor-pointer bg-glass border-none hover:bg-glass-bg-hover active:bg-glass-bg-hover"
            >
              contact
            </button>
            <button 
              onClick={() => scrollToSection('portfolio-grid')}
              className="text-slate px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px] transition-all duration-150 cursor-pointer bg-glass border-none hover:bg-glass-bg-hover active:bg-glass-bg-hover flex items-center gap-2"
            >
              <HeartIcon className="text-accentgray"/>
              working & playing
            </button>
          </div>
          
          {/* Center: Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <button
              onClick={() => router.push('/')}
              className="cursor-pointer bg-transparent border-none"
              aria-label="Go to home"
            >
              <LeleIcon className="text-accentgray" />
            </button>
          </div>
          
          {/* Right pills */}
          <div className="flex items-center gap-2">
            <div className="text-slate px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px] bg-glass">
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
          <button
            onClick={() => router.push('/')}
            className="cursor-pointer bg-transparent border-none"
            aria-label="Go to home"
          >
            <LeleIcon className="text-accentgray" />
          </button>
          
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
            <a 
              href="mailto:clzhang@berkeley.edu"
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Email"
            >
              <EnvelopeIcon className="text-gray-500" size={20} />
            </a>
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
                  onClick={() => {
                    handleEmailCopy();
                    scrollToSection('talk-to-me');
                    setIsMenuOpen(false);
                  }}
                  className="text-slate px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px] transition-all duration-150 cursor-pointer bg-glass border-none whitespace-nowrap hover:bg-glass-bg-hover active:bg-glass-bg-hover"
                >
                  contact
                </button>
                <div 
                  className="text-slate px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px] whitespace-nowrap bg-glass"
                >
                  san francisco, ca
                </div>
                <button 
                  onClick={() => {
                    scrollToSection('portfolio-grid');
                    setIsMenuOpen(false);
                  }}
                  className="text-slate px-5 py-3 rounded-full text-xs font-sans backdrop-blur-[20px] transition-all duration-150 cursor-pointer bg-glass border-none hover:bg-glass-bg-hover active:bg-glass-bg-hover flex items-center gap-2 whitespace-nowrap"
                >
                  <HeartIcon className="text-accentgray" size={12} />
                  working & playing
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}