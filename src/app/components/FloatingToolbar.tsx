'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Strikethrough, Bookmark, MessageSquare } from 'lucide-react';

interface AnimationConfig {
  duration: number;
  springStrength: number;
  scale: number;
  enabled: boolean;
}

interface FloatingToolbarProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onFormat?: (format: string) => void;
  onAIAssist?: () => void;
  onComment?: () => void;
  animationConfig?: AnimationConfig;
}

export default function FloatingToolbar({ 
  isVisible, 
  position, 
  onFormat, 
  onAIAssist, 
  onComment,
  animationConfig = {
    duration: 130,
    springStrength: 1.30,
    scale: 0.90,
    enabled: true,
  }
}: FloatingToolbarProps) {
  const [mounted, setMounted] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Ensure portal only renders on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const { duration, springStrength, scale, enabled } = animationConfig;
  const easing = `cubic-bezier(0.34, ${springStrength}, 0.64, 1)`;

  const toolbar = (
    <div
      ref={toolbarRef}
      className={`fixed z-50 ${
        isVisible 
          ? 'pointer-events-auto' 
          : 'pointer-events-none'
      }`}
      style={{
        top: position.y - 40, // Position above selection
        left: Math.max(12.5, Math.min(position.x - 100, typeof window !== 'undefined' ? window.innerWidth - 312.5 : 300)), // position.x is now the center of selection, subtract half toolbar width (~150px) to center it
        opacity: isVisible ? 1 : 0,
        transform: enabled 
          ? (isVisible ? 'scale(1) translateY(0)' : `scale(${scale}) translateY(-4px)`)
          : 'scale(1) translateY(0)',
        transition: enabled 
          ? `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`
          : 'none',
      }}
    >
      <div className="pointer-events-auto">
        <div className="inline-flex items-stretch h-9 overflow-hidden text-sm leading-tight rounded-lg shadow-lg p-1 gap-0.5"
          style={{
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--border-toolbar)'
          }}
        >
          {/* Bookmark (creates green highlight) */}
          <button
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent blur
              onFormat?.('bookmark');
            }}
            className="toolbar-btn flex items-center justify-center w-[1.625rem] h-[1.625rem] rounded-md"
            style={{ color: 'var(--text-700)' }}
            title="Bookmark (highlight)"
          >
            <Bookmark className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* Divider */}
          <div className="h-6 w-px mx-1 my-auto" style={{ backgroundColor: 'var(--border-subtle)' }} />

          {/* Comment */}
          <button
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent blur
              onComment?.();
            }}
            className="toolbar-btn flex items-center justify-center w-[1.625rem] h-[1.625rem] rounded-md"
            style={{ color: 'var(--text-600)' }}
            title="Comment"
          >
            <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* Divider */}
          <div className="h-6 w-px mx-1 my-auto" style={{ backgroundColor: 'var(--border-subtle)' }} />

          {/* Bold */}
          <button
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent blur
              onFormat?.('bold');
            }}
            className="toolbar-btn flex items-center justify-center w-[1.625rem] h-[1.625rem] rounded-md"
            style={{ color: 'var(--text-700)' }}
            title="Bold"
          >
            <Bold className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* Italic */}
          <button
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent blur
              onFormat?.('italic');
            }}
            className="toolbar-btn flex items-center justify-center w-[1.625rem] h-[1.625rem] rounded-md"
            style={{ color: 'var(--text-700)' }}
            title="Italic"
          >
            <Italic className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* Strikethrough */}
          <button
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent blur
              onFormat?.('strikethrough');
            }}
            className="toolbar-btn flex items-center justify-center w-[1.625rem] h-[1.625rem] rounded-md"
            style={{ color: 'var(--text-700)' }}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(toolbar, document.body);
}
