'use client';

import { useEffect, useState } from 'react';

/**
 * Minimal responsive hook using matchMedia API
 * Only used where JS is required for conditional rendering
 * Prefer CSS media queries for styling
 */
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isWideScreen, setIsWideScreen] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const wideQuery = window.matchMedia('(min-width: 1280px)');

    const update = () => {
      setIsMobile(mobileQuery.matches);
      setIsWideScreen(wideQuery.matches);
    };

    update();
    mobileQuery.addEventListener('change', update);
    wideQuery.addEventListener('change', update);

    return () => {
      mobileQuery.removeEventListener('change', update);
      wideQuery.removeEventListener('change', update);
    };
  }, []);

  return { isMobile, isWideScreen };
}
