'use client';

import React, { useState, useEffect, useRef } from 'react';

interface HeroDemoProps {
  isVisible?: boolean;
}

export default function HeroDemo({ isVisible = false }: HeroDemoProps) {
  const [showContent, setShowContent] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      setTimeout(() => setShowContent(true), 200);
    }
  }, [isVisible]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div 
      className="pearl-hero-demo"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        backgroundImage: 'url(/work-images/2CC16435-0FC3-4CC6-889C-C8166568D59F.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Note Window */}
      <div
        className={`pearl-note-window ${isDragging ? 'dragging' : ''} ${showContent ? 'visible' : 'hidden'}`}
        onMouseDown={handleMouseDown}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'opacity 800ms ease, transform 800ms ease',
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
            href="https://pearl-journal.com" 
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
        </div>

        {/* Editor Content */}
        <div className="pearl-note-content">
          {/* Emotion Tags */}
          <div className="pearl-note-emotions">
            <span className="pearl-note-emotion-tag enthusiasm">Enthusiasm</span>
            <span className="pearl-note-emotion-tag interest">Interest</span>
            <span className="pearl-note-emotion-tag nostalgia">Nostalgia</span>
          </div>

          {/* Title */}
          <div className="pearl-note-title">
            pearl, a journal that reflects with you
          </div>

          {/* Content */}
          <div className="pearl-note-body">
            <p>
              Journaling is one of the most recommended tools for mental health, but most people start and stop within weeks. Their entries sit unread, with unnoticed patterns and nonexistent insights.
            </p>
            <p>
              Last fall, Emily Zhang and I started prototyping Pearl to create a journaling app that reflects with you.
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
    </div>
  );
}
