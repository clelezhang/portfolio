'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

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

  useEffect(() => {
    setIsMounted(true);
    const checkWidth = () => setIsWideScreen(window.innerWidth >= 1280);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
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
    <aside className="pearl-sidenav-column">
      <motion.nav
        className="pearl-sidenav"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
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
      </motion.nav>
    </aside>
  );
}
