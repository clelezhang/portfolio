'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useResponsive } from '@/app/chat-explorations/hooks/useResponsive';

interface DemoSectionProps {
  name: string;
  previewGif?: string;
  previewImage?: string;
  previewVideo?: string; // New prop for video preview
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
  previewVideo,
  children,
  loadOnScroll = true,
  enableMobile = false, // Default to false to keep GIFs unless explicitly enabled
  isFocused = true, // Default to focused
  onFocusRequest,
}: DemoSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();

  const handleClick = (e: React.MouseEvent) => {
    if (!isFocused && onFocusRequest) {
      e.preventDefault();
      e.stopPropagation();
      onFocusRequest();
    }
  };

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

  // On mobile, show video unless enableMobile is true
  if (isMobile && !enableMobile && previewVideo) {
    return (
      <div
        ref={containerRef}
        className="demo-section mobile"
        data-demo-name={name}
        onClick={handleClick}
        style={{
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
          filter: isFocused ? 'none' : 'grayscale(1)',
          opacity: isFocused ? 1 : 0.4,
          pointerEvents: 'auto',
          cursor: !isFocused ? 'pointer' : 'default',
          transition: 'filter 500ms ease-in-out, opacity 500ms ease-in-out',
          backgroundColor: 'transparent',
        }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={previewVideo} type="video/mp4" />
        </video>
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
          height: isMobile ? '500px' : '600px',
          borderRadius: '8px',
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
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        filter: isFocused ? 'none' : 'grayscale(1)',
        opacity: isFocused ? 1 : 0.4,
        cursor: !isFocused ? 'pointer' : 'default',
        transition: 'filter 150ms ease-in-out, opacity 150ms ease-in-out',
        willChange: 'filter, opacity',
        position: 'relative',
      }}
    >
      <div style={{ pointerEvents: isFocused ? 'auto' : 'none' }}>
        <Suspense
          fallback={
            <div
              style={{
                width: '100%',
                height: isMobile ? '500px' : '600px',
                background: 'var(--color-off-white)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          }
        >
          <div style={{
            height: isMobile ? '500px' : '600px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              transform: isMobile ? 'scale(0.833)' : 'none',
              transformOrigin: 'top left',
              width: isMobile ? '120%' : '100%',
              height: isMobile ? '120%' : '100%',
            }}>
              {children}
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}

