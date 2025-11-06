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
}: DemoSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        style={{
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
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

  // Desktop: Show preview until loaded
  if (!isLoaded && (previewGif || previewImage)) {
    return (
      <div
        ref={containerRef}
        className="demo-section preview"
        style={{
          width: '100%',
          minHeight: '400px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
          position: 'relative',
          cursor: loadOnScroll ? 'default' : 'pointer',
        }}
        onClick={() => !loadOnScroll && setIsLoaded(true)}
      >
        <img
          src={previewGif || previewImage}
          alt={`${name} demo preview`}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
        {!loadOnScroll && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '1rem 2rem',
              background: 'var(--color-olive-dark)',
              color: 'var(--color-white)',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {title}
          </div>
        )}
      </div>
    );
  }

  // Desktop: Show interactive demo
  return (
    <div
      ref={containerRef}
      className="demo-section interactive"
      style={{
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        marginBottom: '4rem',
      }}
    >
      <Suspense
        fallback={
          <div
            style={{
              width: '100%',
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-off-white)',
              color: 'var(--color-gray)',
            }}
          >
            Loading demo...
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}

