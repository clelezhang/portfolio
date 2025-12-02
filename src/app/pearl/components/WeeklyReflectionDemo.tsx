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

// Exact Pearl emotion colors
const EMOTION_STATS = [
  { emotion: 'Satisfaction', color: '#177BB9', value: 40 },
  { emotion: 'Anxiety', color: '#4D4AB9', value: 21 },
  { emotion: 'Excitement', color: '#AB6C00', value: 18 },
];

// Background colors from EMOTION_COLORS
const EMOTION_BG = {
  Satisfaction: 'rgba(4, 196, 255, 0.2)',
  Anxiety: 'rgba(8, 0, 249, 0.12)',
  Excitement: 'rgba(249, 216, 0, 0.28)',
};

interface WeeklyReflectionDemoProps {
  isVisible?: boolean;
}

export default function WeeklyReflectionDemo({ isVisible = false }: WeeklyReflectionDemoProps) {
  const [showContent, setShowContent] = useState(false);
  const [animatedValues, setAnimatedValues] = useState([0, 0, 0]);
  const [isMobileView, setIsMobileView] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      setTimeout(() => setShowContent(true), 200);
      
      // Animate numbers
      const targetValues = EMOTION_STATS.map(s => s.value);
      const duration = 1200;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        setAnimatedValues(targetValues.map(v => Math.round(v * eased)));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      setTimeout(animate, 400);
    }
  }, [isVisible]);

  return (
    <div className="pearl-demo-wrapper">
      <div 
        className="pearl-demo-container"
        style={{ backgroundImage: 'url(/work-images/1BEF31C7-13A5-4834-B412-1277F8F01A36.jpeg)' }}
      >
        {/* Dashboard container - exact .dashboard-container styling */}
        <div style={{
        width: '100%',
        maxWidth: '288px', /* 18rem from Dashboard.css */
        display: 'flex',
        flexDirection: 'column',
        background: '#fdfafb',
        border: '1px solid rgba(179, 175, 215, 0.12)',
        borderRadius: '8px',
        boxShadow: '0 5px 12px rgba(162, 166, 217, 0.06)',
        padding: '12px',
        paddingTop: '23px', /* 1.45rem */
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      }}>
        {/* Dashboard header - exact .dashboard-header styling */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: '12px',
          height: '24px',
          background: '#fdfafb',
          boxShadow: '0 4px 12px 12px #fdfafb',
          marginBottom: '8px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 400,
            fontFamily: '"gelica", Georgia, serif',
            color: '#322e33',
            margin: 0,
          }}>My reflections</h2>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Heading - exact .heading-1 styling */}
          <div style={{
            fontFamily: '"Instrument Sans", sans-serif',
            fontVariationSettings: '"wght" 500',
            fontSize: '10px',
            textTransform: 'uppercase',
            color: '#3838688c',
            marginLeft: '12px',
            marginRight: '12px',
            marginTop: '8px',
          }}>
            Your past week...
          </div>

          {/* Emotion Summary Section - exact .emotion-summary-section styling */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '6px',
            padding: '12px',
            paddingTop: '18px',
            overflow: 'hidden',
            background: `
              linear-gradient(180deg, #fdfafb3d 10%, #fdfafb9f 30%, #fdfafbb4 100%),
              linear-gradient(90deg, 
                ${EMOTION_BG.Satisfaction} 30%, 
                ${EMOTION_BG.Anxiety} 60%, 
                ${EMOTION_BG.Excitement} 100%
              )
            `,
          }}>
            {/* Emotion Stats Grid - exact .emotion-summary-grid styling */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: '48px',
            }}>
              {EMOTION_STATS.map((stat, i) => (
                <div key={stat.emotion} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '2px',
                  color: stat.color,
                }}>
                  {/* Number - exact .emotion-summary-number styling */}
                  <p style={{
                    fontFamily: '"Instrument Sans", sans-serif',
                    fontVariationSettings: '"wght" 300',
                    fontSize: '32px',
                    lineHeight: '32px',
                    margin: 0,
                  }}>
                    {animatedValues[i]}%
                  </p>
                  {/* Label - exact .emotion-summary-emotion styling */}
                  <p style={{
                    fontFamily: '"Instrument Sans", sans-serif',
                    fontVariationSettings: '"wght" 400',
                    fontSize: '10px',
                    textTransform: 'lowercase',
                    margin: 0,
                  }}>
                    {stat.emotion.toLowerCase()}
                  </p>
                </div>
              ))}
            </div>

            {/* Summary - exact .week-description styling */}
            <div style={{
              fontFamily: '"Instrument Sans", sans-serif',
              fontVariationSettings: '"wght" 400',
              fontSize: '12px',
              lineHeight: '150%',
              color: '#322e33',
            }}>
              <p style={{ margin: 0 }}>
                You&apos;ve been balancing time&apos;s abundance and scarcity. Between moments of beauty like bay views from bus windows and work constraints, you&apos;ve kept your sense of wonder - finding meaning in both daily commutes and life&apos;s deeper questions.
              </p>
            </div>

            {/* Descriptive Words - exact .descriptive-words styling */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              paddingTop: '32px',
            }}>
              {['Temporality', '✦', 'Wonder', '✦', 'Duality', '✦', 'Mindfulness'].map((word, i) => (
                <span key={i} style={{
                  fontFamily: '"Instrument Sans", sans-serif',
                  fontVariationSettings: '"wght" 400',
                  fontSize: word === '✦' ? '5px' : '10px',
                  color: '#322e33',
                }}>
                  {word}
                </span>
              ))}
            </div>
          </div>

          {/* Moments Section - exact .moments-section styling */}
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            padding: '14px 12px 2px 12px',
            background: 'radial-gradient(circle at 35% 80%, #f4c7c75e 0%, #f5d4cb00 50%), linear-gradient(100deg, #f5f3f6 0%, #f7f2f6 100%)',
            borderRadius: '6px',
          }}>
            {/* Number - exact .moments-number styling */}
            <div style={{
              fontFamily: '"Instrument Sans", sans-serif',
              fontVariationSettings: '"wght" 400',
              fontSize: '50px',
              lineHeight: '110%',
              color: '#322e33',
            }}>
              5
            </div>
            {/* Description - exact .moments-description-container styling */}
            <div style={{ paddingBottom: '6px' }}>
              <div style={{
                fontFamily: '"Instrument Sans", sans-serif',
                fontVariationSettings: '"wght" 400',
                fontSize: '14px',
                color: '#322e33',
              }}>
                Moments saved
              </div>
              <div style={{
                fontFamily: '"Instrument Sans", sans-serif',
                fontVariationSettings: '"wght" 400',
                fontSize: '12px',
                color: '#3838688c',
              }}>
                in the last week
              </div>
            </div>
          </div>

          {/* Notes to Self Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            {/* Heading */}
            <div style={{
              fontFamily: '"Instrument Sans", sans-serif',
              fontVariationSettings: '"wght" 500',
              fontSize: '10px',
              textTransform: 'uppercase',
              color: '#3838688c',
              marginLeft: '12px',
            }}>
              Notes to self
            </div>
            
            {/* Notes list - exact .themes styling */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'linear-gradient(135deg, #f5f3f6 0%, #f7f2f6 100%)',
              borderRadius: '6px',
              padding: '12px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {['Message grandma', 'Study for chem exam', 'Message boss'].map(note => (
                  <div key={note} style={{
                    fontFamily: '"Instrument Sans", sans-serif',
                    fontVariationSettings: '"wght" 400',
                    fontSize: '12px',
                    color: '#322e33',
                  }}>
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Review Button - exact .weekly-review-button styling */}
          <button style={{
            minHeight: '36px',
            padding: '3px 16px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            marginTop: '8px',
            width: '100%',
            border: 'none',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #f5f3f6 0%, #f7f2f6 100%)',
          }}>
            {/* Dot icon */}
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#3838688c',
            }} />
            <span style={{ 
              paddingTop: '2px',
              color: '#3838688c',
              fontFamily: '"Instrument Sans", sans-serif',
              fontVariationSettings: '"wght" 400',
              fontSize: '14px',
            }}>
              Write my weekly review
            </span>
          </button>
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
