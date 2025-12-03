'use client';

import React, { useRef, useState, useEffect, ReactNode } from 'react';

interface PearlDemoSectionProps {
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export default function PearlDemoSection({ 
  children, 
  fullWidth = false,
  className = ''
}: PearlDemoSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5, rootMargin: '-100px 0px' }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ isVisible?: boolean }>, { isVisible });
        }
        return child;
      })}
    </div>
  );
}

