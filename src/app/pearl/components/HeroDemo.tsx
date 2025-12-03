'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReflectionsDashboardDemo from './ReflectionsDashboardDemo';

interface HeroDemoProps {
  isVisible?: boolean;
}

const TITLE_TEXT = 'pearl, a journal that reflects with you';
const EMOTIONS = ['Enthusiasm', 'Interest', 'Nostalgia'];

export default function HeroDemo({ isVisible = false }: HeroDemoProps) {
  const [position1, setPosition1] = useState({ x: 0, y: 0 });
  const [position2, setPosition2] = useState({ x: 0, y: 0 });
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [visibleEmotions, setVisibleEmotions] = useState<number[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hasAnimated = useRef(false);

  // Client-side initialization
  useEffect(() => {
    setIsClient(true);
    setIsMobile(window.innerWidth < 768);

    // Listen for window resize
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      
      // Animate emotion bubbles with stagger
      setTimeout(() => {
        EMOTIONS.forEach((_, i) => {
          setTimeout(() => {
            setVisibleEmotions(prev => [...prev, i]);
          }, i * 150);
        });
      }, 400);
      
      // Animate title typing (after emotions)
      setTimeout(() => {
        let charIndex = 0;
        const typeInterval = setInterval(() => {
          if (charIndex <= TITLE_TEXT.length) {
            setDisplayedTitle(TITLE_TEXT.slice(0, charIndex));
            charIndex++;
          } else {
            clearInterval(typeInterval);
          }
        }, 35);
      }, 1000);
    }
  }, [isVisible]);

  const handleMouseDown1 = (e: React.MouseEvent) => {
    if (isMobile) return; // Disable dragging on mobile
    setIsDragging1(true);
    setDragStart({ x: e.clientX - position1.x, y: e.clientY - position1.y });
  };

  const handleMouseDown2 = (e: React.MouseEvent) => {
    if (isMobile) return; // Disable dragging on mobile
    setIsDragging2(true);
    setDragStart({ x: e.clientX - position2.x, y: e.clientY - position2.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging1 && !isMobile) {
      setPosition1({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (isDragging2 && !isMobile) {
      setPosition2({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging1(false);
    setIsDragging2(false);
  };

  return (
    <div 
      className="pearl-hero-demo"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        backgroundImage: 'url(/work-images/i1.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Window 1 - Note */}
      <div
        className={`pearl-note-window ${isDragging1 ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown1}
        style={{
          transform: isMobile
            ? `translate(-50%, calc(-50% + 60px))`
            : `translate(calc(-50% - 70px + ${position1.x}px), calc(-50% + 60px + ${position1.y}px))`,
          transition: isDragging1 ? 'none' : 'transform 200ms ease',
          position: 'absolute',
          top: '50%',
          left: '50%',
          zIndex: 2,
          cursor: !isMobile ? (isDragging1 ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {/* Window Title Bar */}
        <div className="pearl-demo-titlebar">
          <div className="pearl-demo-titlebar-dots">
            <div className="pearl-demo-titlebar-dot" />
            <div className="pearl-demo-titlebar-dot" />
            <div className="pearl-demo-titlebar-dot" />
          </div>
          <a
            className="pearl-demo-titlebar-link"
            href="https://info.writewithprl.com/"
            target="_blank"
            rel="noopener noreferrer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            Open Pearl
          </a>
        </div>

        {/* Header */}
        <div className="pearl-note-header">
          <span className="pearl-note-date">August 23rd 2024 at 11:24</span>
          <span className="pearl-note-saved">
            Saved
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
        </div>

        {/* Editor Content */}
        <div className="pearl-note-content">
          {/* Emotion Tags - animate in */}
          <div className="pearl-note-emotions">
            {EMOTIONS.map((emotion, i) => (
              <span 
                key={emotion}
                className={`pearl-note-emotion-tag ${emotion.toLowerCase()}`}
                style={{
                  opacity: visibleEmotions.includes(i) ? 1 : 0,
                  transform: visibleEmotions.includes(i) ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.8)',
                  transition: 'opacity 300ms ease, transform 300ms ease',
                }}
              >
                {emotion}
              </span>
            ))}
          </div>

          {/* Title - types in (fixed height to prevent resize) */}
          <div className="pearl-note-title" style={{ position: 'relative' }}>
            {/* Invisible text to reserve space */}
            <span style={{ visibility: 'hidden' }}>{TITLE_TEXT}</span>
            {/* Animated text overlay */}
            <span style={{ position: 'absolute', top: 0, left: 0 }}>
              {displayedTitle}
              {displayedTitle.length < TITLE_TEXT.length && displayedTitle.length > 0 && (
                <span className="pearl-demo-cursor" style={{ marginLeft: '2px' }} />
              )}
            </span>
          </div>

          {/* Content */}
          <div className="pearl-note-body">
            <p>
              Journaling is one of the most recommended tools for mental health, but most people start and stop within weeks. Their entries sit unread, with unnoticed patterns and nonexistent insights.
            </p>
            <p>
              Last fall,{' '}
              <a
                href="https://www.emilyz.sh/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-black)',
                  textDecoration: 'none',
                  transition: 'color 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-accentgray)';
                  const span = e.currentTarget.querySelector('span');
                  if (span) span.style.color = 'var(--color-accentgray)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-black)';
                  const span = e.currentTarget.querySelector('span');
                  if (span) span.style.color = 'var(--color-black)';
                }}
              >
                Emily Zhang <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-black)', letterSpacing: '.05em', transition: 'color 200ms ease' }}>[1]</span>
              </a>{' '}
              and I started prototyping Pearl to create a journaling app that reflects with you.
            </p>
            <p>
              I designed the core experiences, including inline reflection that digs deeper into your statements, weekly summaries that synthesize your entries, and emotion visualization that makes progress feel tangible.
            </p>
            <p>
              We imagined the digital notepad as a cozier, more welcoming place to write and a tool that helps you actually understand yourself.
            </p>
          </div>
        </div>
      </div>

      {/* Window 2 - Reflection Dashboard (Desktop only) */}
      <div
        onMouseDown={handleMouseDown2}
        style={{
          transform: `translate(calc(-50% + 80px + ${position2.x}px), calc(-50% + ${position2.y}px))`,
          transition: isDragging2 ? 'none' : 'transform 200ms ease, opacity 600ms ease',
          position: 'absolute',
          top: '50%',
          left: '50%',
          zIndex: 1,
          cursor: isDragging2 ? 'grabbing' : 'grab',
          opacity: (isClient && !isMobile) ? 1 : 0,
          pointerEvents: (isClient && !isMobile) ? 'auto' : 'none',
        }}
      >
        <ReflectionsDashboardDemo isVisible={isVisible} variant="default" embedded={true} />
      </div>
    </div>
  );
}
