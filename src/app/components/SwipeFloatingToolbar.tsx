'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface SwipeFloatingToolbarProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onExpandSelection?: () => void;
  onHighlight?: () => void;
  isExpanding?: boolean;
}

export default function SwipeFloatingToolbar({
  isVisible,
  position,
  onExpandSelection,
  onHighlight,
  isExpanding = false,
}: SwipeFloatingToolbarProps) {
  const [mounted, setMounted] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Ensure portal only renders on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toolbar = (
    <div
      ref={toolbarRef}
      className={`fixed z-50 ${
        isVisible
          ? 'pointer-events-auto'
          : 'pointer-events-none'
      }`}
      style={{
        top: position.y - 50, // Position above selection
        left: Math.max(12.5, Math.min(position.x - 60, typeof window !== 'undefined' ? window.innerWidth - 150 : 300)),
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(-4px)',
        transition: 'opacity 130ms cubic-bezier(0.34, 1.3, 0.64, 1), transform 130ms cubic-bezier(0.34, 1.3, 0.64, 1)',
      }}
    >
      <div className="pointer-events-auto">
        <div className="inline-flex items-stretch h-9 overflow-hidden text-sm leading-tight rounded-lg shadow-lg p-1 gap-0.5"
          style={{
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--border-toolbar)'
          }}
        >
          {/* Question Mark - Expand Selection */}
          <button
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent blur
              if (!isExpanding) {
                onExpandSelection?.();
              }
            }}
            disabled={isExpanding}
            className="toolbar-btn flex items-center justify-center w-[1.625rem] h-[1.625rem] rounded-md disabled:opacity-50"
            style={{ color: 'var(--text-700)' }}
            title="Expand selection (dig deeper)"
          >
            <HelpCircle className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(toolbar, document.body);
}
