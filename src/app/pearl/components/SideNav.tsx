'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'problem', label: 'the problem' },
  { id: 'outcome', label: 'outcome' },
  { id: 'inline-reflection', label: 'inline reflection' },
  { id: 'weekly-reflection', label: 'weekly reflection' },
  { id: 'emotion-visualization', label: 'emotion visualization' },
  { id: 'impact', label: 'impact' },
  { id: 'reflection', label: 'reflection' },
] as const;

export function SideNav() {
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkWidth = () => setIsWideScreen(window.innerWidth >= 1280);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Show sidebar only after scrolling past the hero
  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('.pearl-hero-demo');
      if (heroSection) {
        const heroBottom = heroSection.getBoundingClientRect().bottom;
        setIsPastHero(heroBottom < 1);
      }
    };
    
    handleScroll(); // Check initial position
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.querySelector(`[data-section="${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (!isMounted || !isWideScreen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isPastHero && (
        <motion.aside 
          className="pearl-sidenav-column"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <nav className="pearl-sidenav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="pearl-nav-button"
                tabIndex={-1}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
