'use client';

import { useState, useEffect, useRef, ComponentType, lazy, Suspense } from 'react';

interface DemoSectionProps {
  name: string;
  previewGif?: string;
  previewImage?: string;
  title?: string;
  children: React.ReactNode;
  loadOnScroll?: boolean;
  enableMobile?: boolean; // New prop to enable interactive demo on mobile
  isFocused?: boolean; // New prop to control focus state
  onFocusRequest?: () => void; // Callback when unfocused demo is clicked
}

/**
 * DemoSection component for lazy-loading interactive demos
 * 
 * Features:
 * - Shows GIF/image preview on mobile
 * - Lazy loads actual component when scrolled into view (desktop)
 * - Optimizes performance by only loading demos when needed
 * 
 * Usage:
 * <DemoSection
 *   name="comments"
 *   previewGif="/demos/comments.gif"
 *   previewImage="/demos/comments.jpg"
 *   title="Try it yourself →"
 *   loadOnScroll
 * >
 *   <CommentsDemo />
 * </DemoSection>
 */
export default function DemoSection({
  name,
  previewGif,
  previewImage,
  title = 'Try the interactive demo →',
  children,
  loadOnScroll = true,
  enableMobile = false, // Default to false to keep GIFs unless explicitly enabled
  isFocused = true, // Default to focused
  onFocusRequest,
}: DemoSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!isFocused && onFocusRequest) {
      e.preventDefault();
      e.stopPropagation();
      onFocusRequest();
    }
  };

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!loadOnScroll || isLoaded || (isMobile && !enableMobile)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsLoaded(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before visible
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [loadOnScroll, isLoaded, isMobile, enableMobile]);

  // On mobile, show GIF unless enableMobile is true
  if (isMobile && !enableMobile && (previewGif || previewImage)) {
    return (
      <div
        ref={containerRef}
        className="demo-section mobile"
        data-demo-name={name}
        onClick={handleClick}
        style={{
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
          filter: isFocused ? 'none' : 'grayscale(1)',
          opacity: isFocused ? 1 : 0.4,
          pointerEvents: 'auto',
          cursor: !isFocused ? 'pointer' : 'default',
          transition: 'filter 500ms ease-in-out, opacity 500ms ease-in-out',
        }}
      >
        <img
          src={previewGif || previewImage}
          alt={`${name} demo`}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
        <div
          style={{
            padding: '1rem',
            background: 'var(--color-off-white)',
            fontSize: '0.875rem',
            color: 'var(--color-gray)',
            textAlign: 'center',
          }}
        >
          💻 <strong>Desktop required</strong> for the interactive version
        </div>
      </div>
    );
  }

  // Desktop: Show loader until loaded
  if (!isLoaded && (previewGif || previewImage)) {
    return (
      <div
        ref={containerRef}
        className="demo-section preview"
        data-demo-name={name}
        style={{
          width: '100%',
          height: '600px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
          background: 'var(--color-off-white',
          animation: 'pulse 1.5s ease-in-out infinite',
          cursor: !isFocused ? 'pointer' : (loadOnScroll ? 'default' : 'pointer'),
          filter: isFocused ? 'none' : 'grayscale(1)',
          opacity: isFocused ? 1 : 0.4,
          pointerEvents: 'auto',
          transition: 'filter 500ms ease-in-out, opacity 500ms ease-in-out',
        }}
        onClick={(e) => {
          if (!isFocused) {
            handleClick(e);
          } else if (!loadOnScroll) {
            setIsLoaded(true);
          }
        }}
      />
    );
  }

  // Desktop: Show interactive demo
  return (
    <div
      ref={containerRef}
      className="demo-section interactive"
      data-demo-name={name}
      onClick={handleClick}
      style={{
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        filter: isFocused ? 'none' : 'grayscale(1)',
        opacity: isFocused ? 1 : 0.4,
        pointerEvents: 'auto',
        cursor: !isFocused ? 'pointer' : 'default',
        transition: 'filter 500ms ease-in-out, opacity 500ms ease-in-out',
      }}
    >
      <Suspense
        fallback={
          <div
            style={{
              width: '100%',
              height: '600px',
              background: 'var(--color-off-white)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        }
      >
        {children}
      </Suspense>
    </div>
  );
}

