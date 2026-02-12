'use client';

import { useState, useRef } from 'react';
import '../draw.css';
import { COLOR_PALETTES } from '../constants';

// Minimal slot machine test - no tooltips, just the animation
export default function TestSlotPage() {
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [targetPaletteIndex, setTargetPaletteIndex] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const duration = 1000; // 1 second for easy debugging
  const stagger = 100; // 100ms between each color

  const handleClick = () => {
    if (isRolling) return;

    const nextIndex = (paletteIndex + 1) % COLOR_PALETTES.length;
    setTargetPaletteIndex(nextIndex);
    setIsRolling(true);

    // Update palette near end of animation
    setTimeout(() => {
      setPaletteIndex(nextIndex);
    }, duration * 0.8);

    // End rolling after animation
    timeoutRef.current = setTimeout(() => {
      setIsRolling(false);
      setTargetPaletteIndex(null);
    }, duration + 100);
  };

  // Build reel colors - all 6 palettes cycling 3 times + target
  const buildReelColors = (colorIndex: number) => {
    if (!isRolling || targetPaletteIndex === null) {
      return [COLOR_PALETTES[paletteIndex][colorIndex]];
    }

    const colors: string[] = [];
    // Cycle through all palettes 3 times
    for (let cycle = 0; cycle < 3; cycle++) {
      for (let p = 0; p < COLOR_PALETTES.length; p++) {
        colors.push(COLOR_PALETTES[p][colorIndex]);
      }
    }
    // End on target
    colors.push(COLOR_PALETTES[targetPaletteIndex][colorIndex]);
    return colors;
  };

  return (
    <div style={{ padding: 48, fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 24 }}>Slot Machine Animation Test</h1>
      <p style={{ marginBottom: 24, color: '#666' }}>
        Click the button to trigger the slot animation. Each color should scroll through all palettes.
      </p>

      <button
        onClick={handleClick}
        disabled={isRolling}
        style={{
          padding: '12px 24px',
          fontSize: 16,
          marginBottom: 32,
          cursor: isRolling ? 'not-allowed' : 'pointer',
        }}
      >
        {isRolling ? 'Rolling...' : 'Roll!'}
      </button>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {COLOR_PALETTES[paletteIndex].map((color, index) => {
          const reelColors = buildReelColors(index);

          return (
            <div
              key={index}
              style={{
                width: 48,
                height: 48,
                overflow: 'hidden',
                position: 'relative',
                borderRadius: 8,
                border: '2px solid #ddd',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  // Start at first color when rolling, last color when not
                  transform: isRolling
                    ? 'translateY(0)'
                    : `translateY(calc(-100% + 48px))`,
                  // Only apply animation when rolling
                  animation: isRolling
                    ? `slotScroll ${duration}ms linear forwards`
                    : 'none',
                  animationDelay: `${index * stagger}ms`,
                }}
              >
                {reelColors.map((reelColor, ri) => (
                  <div
                    key={ri}
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: reelColor,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, fontSize: 14, color: '#666' }}>
        <p>Current palette: {paletteIndex}</p>
        <p>Target palette: {targetPaletteIndex ?? 'none'}</p>
        <p>Is rolling: {isRolling ? 'yes' : 'no'}</p>
        <p>Reel items: {buildReelColors(0).length}</p>
      </div>

      <style>{`
        @keyframes slotScroll {
          0% {
            transform: translateY(0);
          }
          80% {
            transform: translateY(calc(-100% + 48px + 48px));
          }
          90% {
            transform: translateY(calc(-100% + 48px - 4px));
          }
          95% {
            transform: translateY(calc(-100% + 48px + 2px));
          }
          100% {
            transform: translateY(calc(-100% + 48px));
          }
        }
      `}</style>
    </div>
  );
}
