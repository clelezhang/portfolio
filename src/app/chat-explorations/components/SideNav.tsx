'use client';

import { useState, useCallback } from 'react';
import { useResponsive } from '../hooks/useResponsive';

const NAV_ITEMS = [
  { id: 'threads', label: 'a. threads', section: 'dig-deeper' },
  { id: 'swipe', label: 'b. swipe deeper', section: 'swipe-deeper' },
  { id: 'comments', label: '2a. comments, editing', section: 'comments' },
  { id: 'index', label: '2b. more powerful index', section: 'index' },
  { id: 'queue', label: '2c. index becomes queue', section: 'queue' },
] as const;

interface SideNavProps {
  isFocused: boolean;
  onToggleFocus: () => void;
}

export function SideNav({ isFocused, onToggleFocus }: SideNavProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { isWideScreen, isMounted } = useResponsive();

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.querySelector(`[data-demo-name="${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleMouseEnter = useCallback((item: string) => setHoveredItem(item), []);
  const handleMouseLeave = useCallback(() => setHoveredItem(null), []);

  // Don't render until mounted to prevent flash
  if (!isMounted) {
    return null;
  }

  // Floating button for narrow screens
  if (!isWideScreen) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        zIndex: 1000,
      }}>
        <button
          onClick={onToggleFocus}
          onMouseEnter={() => handleMouseEnter('floating-toggle')}
          onMouseLeave={handleMouseLeave}
          className="bg-glass backdrop-blur-[20px] rounded-full px-5 py-3 hover:bg-glass-bg-hover active:bg-glass-bg-hover transition-all duration-200 cursor-pointer border-none"
          tabIndex={-1}
          style={{
            color: 'var(--color-gray)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span style={{ display: 'inline-block', position: 'relative' }}>
            <span
              style={{
                display: 'inline-block',
                maxWidth: isFocused ? '2rem' : '0',
                overflow: 'hidden',
                transition: 'max-width 200ms ease-in-out',
                verticalAlign: 'bottom',
              }}
            >
              un
            </span>
            focus demos
          </span>
        </button>
      </div>
    );
  }

  // Full side nav for wide screens
  return (
    <div style={{
      position: 'fixed',
      left: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.2rem',
    }}>
      {/* Nav items */}
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollToSection(item.section)}
          className="nav-pill-button"
          tabIndex={-1}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--color-accentgray)',
            border: 'none',
            borderRadius: '999px',
            padding: '0.3rem .75rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 200ms ease-out',
            fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          {item.label}
        </button>
      ))}

      {/* Focus/Unfocus toggle */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={onToggleFocus}
          onMouseEnter={() => handleMouseEnter('toggle')}
          onMouseLeave={handleMouseLeave}
          className="rounded-full hover:bg-glass transition-all duration-200 cursor-pointer border-none"
          tabIndex={-1}
          style={{
            color: 'var(--color-accentgray)',
            fontSize: '0.8rem',
            padding: '0.3rem .75rem',
            fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textAlign: 'left',
          }}
        >
          <span style={{ display: 'inline-block', position: 'relative' }}>
            <span
              style={{
                display: 'inline-block',
                maxWidth: isFocused ? '2rem' : '0',
                overflow: 'hidden',
                transition: 'max-width 200ms ease-in-out',
                verticalAlign: 'bottom',
              }}
            >
              un
            </span>
            focus demos
          </span>
        </button>

        {/* Tooltip */}
        {hoveredItem === 'toggle' && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              padding: '0.25rem 0.5rem',
              color: 'var(--color-gray-400)',
              fontSize: '1rem',
              fontFamily: 'var(--font-caveat)',
              pointerEvents: 'none',
              opacity: hoveredItem === 'toggle' ? 1 : 0,
            }}
          >
            {isFocused ? 'this disables the demos' : 'bring demos into focus'}
          </div>
        )}
      </div>
    </div>
  );
}
