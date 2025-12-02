'use client';

import React, { useState, useEffect, useRef } from 'react';

// Icons
const DesktopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const MobileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

// Emotion colors from Pearl emotionColors.js - text colors only for labels
const EMOTION_LABELS = [
  { name: 'EXCITEMENT', color: '#AB6C00', x: 82, y: 12 },
  { name: 'LOVE', color: '#B53674', x: 72, y: 30 },
  { name: 'FEAR', color: '#8B5039', x: 22, y: 28 },
  { name: 'SATISFACTION', color: '#177BB9', x: 75, y: 48 },
  { name: 'INTEREST', color: '#2D8A8F', x: 45, y: 52 },
  { name: 'SADNESS', color: '#4262B3', x: 28, y: 62 },
  { name: 'EMBARRASSMENT', color: '#8C7E01', x: 68, y: 70 },
  { name: 'PAIN', color: '#C94261', x: 52, y: 78 },
];

// Dots with background colors from emotionColors.js
const DOTS = [
  // Excitement cluster (top right)
  { x: 85, y: 18, bg: 'rgba(249, 216, 0, 0.35)' },
  { x: 78, y: 15, bg: 'rgba(249, 216, 0, 0.35)' },
  { x: 88, y: 22, bg: 'rgba(249, 216, 0, 0.35)' },
  // Love cluster
  { x: 70, y: 25, bg: 'rgba(248, 10, 152, 0.22)' },
  { x: 65, y: 32, bg: 'rgba(248, 10, 152, 0.22)' },
  { x: 75, y: 35, bg: 'rgba(248, 10, 152, 0.22)' },
  // Fear cluster
  { x: 25, y: 32, bg: 'rgba(174, 135, 76, 0.25)' },
  { x: 18, y: 28, bg: 'rgba(174, 135, 76, 0.25)' },
  // Satisfaction cluster (right middle)
  { x: 82, y: 45, bg: 'rgba(4, 196, 255, 0.28)' },
  { x: 75, y: 52, bg: 'rgba(4, 196, 255, 0.28)' },
  { x: 88, y: 48, bg: 'rgba(4, 196, 255, 0.28)' },
  { x: 80, y: 55, bg: 'rgba(4, 196, 255, 0.28)' },
  // Interest cluster (center)
  { x: 45, y: 48, bg: 'rgba(50, 233, 209, 0.25)' },
  { x: 52, y: 55, bg: 'rgba(50, 233, 209, 0.25)' },
  { x: 40, y: 52, bg: 'rgba(50, 233, 209, 0.25)' },
  // Sadness cluster (left lower)
  { x: 25, y: 58, bg: 'rgba(0, 83, 210, 0.2)' },
  { x: 30, y: 65, bg: 'rgba(0, 83, 210, 0.2)' },
  { x: 22, y: 70, bg: 'rgba(0, 83, 210, 0.2)' },
  // Embarrassment cluster
  { x: 65, y: 68, bg: 'rgba(249, 236, 0, 0.38)' },
  { x: 72, y: 72, bg: 'rgba(249, 236, 0, 0.38)' },
  // Pain cluster
  { x: 55, y: 75, bg: 'rgba(203, 1, 14, 0.2)' },
  { x: 48, y: 80, bg: 'rgba(203, 1, 14, 0.2)' },
];

interface EmotionVisualizationDemoProps {
  isVisible?: boolean;
}

export default function EmotionVisualizationDemo({ isVisible = false }: EmotionVisualizationDemoProps) {
  const [showContent, setShowContent] = useState(false);
  const [dotOpacities, setDotOpacities] = useState<number[]>(DOTS.map(() => 0));
  const [activeTimeFilter, setActiveTimeFilter] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      setTimeout(() => setShowContent(true), 200);
      
      // Animate dots appearing with stagger
      DOTS.forEach((_, i) => {
        setTimeout(() => {
          setDotOpacities(prev => {
            const next = [...prev];
            next[i] = 1;
            return next;
          });
        }, 400 + i * 40);
      });
    }
  }, [isVisible]);

  const timeFilters = ['week', 'month', 'year'];
  const categoryFilters = ['all', 'work', 'health', 'art', 'family'];
  const dayFilters = ['ALL', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="pearl-demo-wrapper">
      <div 
        className="pearl-demo-container"
        style={{ backgroundImage: 'url(/work-images/DF6C469A-DA5D-4B52-8162-412B786F6C8B.jpeg)' }}
      >
        {/* Main Container - exact .emotion-graph-container styling */}
        <div style={{
        width: '100%',
        maxWidth: '480px',
        height: '560px',
        background: '#fdfafb',
        borderRadius: '8px',
        border: '1px solid rgba(179, 175, 215, 0.12)',
        boxShadow: '0 5px 12px rgba(162, 166, 217, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
        overflow: 'hidden',
      }}>
        {/* Title - exact .dashboard-title styling */}
        <h2 style={{
          fontSize: '18px',
          fontWeight: 400,
          fontFamily: '"gelica", Georgia, serif',
          color: '#322e33',
          margin: 0,
          padding: '20px 20px 0',
        }}>My reflections</h2>

        {/* Graph Content Area */}
        <div style={{
          display: 'flex',
          flex: 1,
          position: 'relative',
          minHeight: 0,
          overflow: 'hidden',
        }}>
          {/* Main Graph Area */}
          <div style={{
            position: 'relative',
            flex: 1,
            margin: '12px 0 12px 20px',
          }}>
            {/* Emotion Labels */}
            {EMOTION_LABELS.map((label) => (
              <span
                key={label.name}
                style={{
                  position: 'absolute',
                  left: `${label.x}%`,
                  top: `${label.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: '10px',
                  fontFamily: '"Instrument Sans", sans-serif',
                  fontVariationSettings: '"wght" 500',
                  textTransform: 'uppercase',
                  color: label.color,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  zIndex: 2,
                }}
              >
                {label.name}
              </span>
            ))}

            {/* Dots */}
            {DOTS.map((dot, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: dot.bg,
                  opacity: dotOpacities[i],
                  transform: `scale(${dotOpacities[i]})`,
                  transition: 'opacity 300ms ease, transform 300ms ease',
                  cursor: 'pointer',
                  zIndex: 1,
                }}
              />
            ))}
          </div>

          {/* Side Filters - exact .side-filters styling */}
          <div style={{
            width: '36px',
            padding: '16px 0',
            marginRight: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flexShrink: 0,
            justifyContent: 'center',
          }}>
            {dayFilters.map((day, i) => (
              <div
                key={day}
                style={{
                  display: 'flex',
                  paddingTop: '2px',
                  height: '18px',
                  width: '36px',
                  borderRadius: '4px',
                  background: i === 0 ? 'linear-gradient(135deg, #f1eff4 0%, #f5eff6 100%)' : 'transparent',
                  textAlign: 'center',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#3838688c',
                  fontFamily: '"Instrument Sans", sans-serif',
                  fontVariationSettings: '"wght" 500',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Filter Bar - exact .filter-bar styling */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: '12px',
          padding: '12px 20px',
        }}>
          {/* Time Filters - exact .time-filters styling */}
          <div style={{
            position: 'relative',
            display: 'flex',
            height: '24px',
            borderRadius: '4px',
            background: 'linear-gradient(90deg, #f5f3f6, #f7f2f6)',
            alignItems: 'center',
            overflow: 'hidden',
            padding: '0 2px',
          }}>
            {/* Sliding indicator */}
            <div style={{
              position: 'absolute',
              top: '3px',
              left: '2px',
              width: '54px',
              height: '18px',
              background: 'linear-gradient(45deg, #eae8ed, #eee7ee)',
              borderRadius: '4px',
              transition: 'transform 0.15s ease-out',
              transform: `translateX(${activeTimeFilter * 56}px)`,
              zIndex: 0,
            }} />
            
            {timeFilters.map((filter, i) => (
              <button
                key={filter}
                onClick={() => setActiveTimeFilter(i)}
                style={{
                  padding: '0 12px',
                  height: '18px',
                  width: '54px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: '#3838688c',
                  fontFamily: '"gelica", Georgia, serif',
                  fontSize: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Category Filters */}
          <div style={{
            display: 'flex',
            height: '24px',
            borderRadius: '4px',
            background: 'linear-gradient(90deg, #f5f3f6, #f7f2f6)',
            alignItems: 'center',
            padding: '0 2px',
            gap: '2px',
          }}>
            {categoryFilters.map((filter, i) => (
              <button
                key={filter}
                style={{
                  padding: '0 10px',
                  height: '18px',
                  borderRadius: '4px',
                  border: 'none',
                  background: i === 0 ? 'linear-gradient(45deg, #eae8ed, #eee7ee)' : 'transparent',
                  color: '#3838688c',
                  fontFamily: '"gelica", Georgia, serif',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div style={{ padding: '0 20px 20px' }}>
          {/* Heading */}
          <div style={{
            fontFamily: '"Instrument Sans", sans-serif',
            fontVariationSettings: '"wght" 500',
            fontSize: '10px',
            textTransform: 'uppercase',
            color: '#3838688c',
            marginBottom: '12px',
          }}>
            OVER THE PAST WEEK...
          </div>

          {/* Input Bar - exact .bar-text styling */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#FDFCFCea',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(179, 175, 215, 0.12)',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 3px 24px rgba(162, 166, 217, 0.12)',
          }}>
            <span style={{
              flex: 1,
              fontSize: '16px',
              fontFamily: '"Instrument Sans", sans-serif',
              fontVariationSettings: '"wght" 400',
              color: 'rgba(56, 56, 104, 0.55)',
            }}>
              How do you feel today?
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fdfafb',
              borderRadius: '6px',
              border: '1px solid rgba(179, 175, 215, 0.12)',
            }}>
              {/* Chat icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3838688c" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="pearl-demo-toggle-wrapper">
        <button className="pearl-demo-toggle" onClick={() => setIsMobileView(!isMobileView)}>
          <div className="pearl-demo-toggle-switch">
            <div className={`pearl-demo-toggle-option ${!isMobileView ? 'active' : ''}`}>
              <DesktopIcon />
            </div>
            <div className={`pearl-demo-toggle-option ${isMobileView ? 'active' : ''}`}>
              <MobileIcon />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
