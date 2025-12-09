'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';

// California sky color palettes - warm, golden, hazy
// [zenith, upper, mid, lower, horizon]
// Uses hour as decimal for fine control during sunrise/sunset peaks
const skyPalettes = [
  { hour: 0, colors: ['#050510', '#0a0e1a', '#121828', '#1e2238', '#322840'], stops: [0, 20, 45, 72, 100] },
  { hour: 1, colors: ['#060512', '#0b0f1c', '#14182a', '#1a2035', '#2e2638'], stops: [0, 22, 48, 75, 100] },
  { hour: 2, colors: ['#050510', '#090d18', '#101624', '#182030', '#2a2435'], stops: [0, 20, 45, 70, 100] },
  { hour: 3, colors: ['#060614', '#0c1020', '#141a2c', '#1c2438', '#302840'], stops: [0, 18, 42, 68, 100] },
  { hour: 4, colors: ['#0c0e18', '#121620', '#1a1e2a', '#2a2838', '#3d3040'], stops: [0, 30, 60, 88, 100] },
  { hour: 5, colors: ['#141828', '#1e2438', '#2e3448', '#4a4050', '#6a4858'], stops: [0, 28, 55, 82, 100] },
  { hour: 6, colors: ['#1e2438', '#242a3d', '#3d3b54', '#675667', '#83636d'], stops: [0, 22, 48, 75, 100] },
  { hour: 6.08, colors: ['#304068', '#465078', '#555972', '#675667', '#83636d'], stops: [0, 21, 46, 73, 100] },
  { hour: 6.17, colors: ['#384870', '#4e5880', '#59596e', '#675667', '#83636d'], stops: [0, 20, 45, 72, 100] },
  { hour: 6.25, colors: ['#405078', '#566088', '#66637e', '#675667', '#83636d'], stops: [0, 19, 44, 71, 100] },
  { hour: 6.33, colors: ['#486088', '#5e7090', '#787a91', '#7e6d7e', '#927288'], stops: [25, 30, 43, 70, 100] },
  { hour: 6.42, colors: ['#4870a0', '#6888a1', '#ada4ac', '#bb9b9b', '#c3838d'], stops: [22, 32, 50, 70, 100] },
  { hour: 6.5, colors: ['#4878a8', '#6894b1', '#9cb7c9', '#cfbfb0', '#d99191'], stops: [20, 30, 48, 70, 100] },
  { hour: 7, colors: ['#4878a8', '#5888a8', '#8ba2b1', '#c3b7a7', '#e8c078'], stops: [20, 40, 70, 90, 100] },
  { hour: 8, colors: ['#5090c0', '#60a0c8', '#80b8d0', '#b0d0d8', '#d8e0d0'], stops: [20, 30, 50, 80, 100] },
  { hour: 9, colors: ['#4888b8', '#58a0c8', '#78b8d8', '#a8d0e0', '#c8dce0'], stops: [0, 24, 50, 78, 100] },
  { hour: 10, colors: ['#4888b8', '#58a0c8', '#78b8d8', '#a8d0e0', '#c8dce0'], stops: [0, 22, 48, 76, 100] },
  { hour: 11, colors: ['#4080b0', '#5098c0', '#68b0d0', '#90c8dc', '#b0d8e0'], stops: [0, 20, 45, 72, 100] },
  { hour: 12, colors: ['#4080b0', '#5098c0', '#68b0d0', '#90c8dc', '#b0d8e0'], stops: [0, 20, 45, 72, 100] },
  { hour: 13, colors: ['#3878a8', '#4890b8', '#60a8c8', '#88c0d8', '#a8d0dc'], stops: [0, 18, 42, 70, 100] },
  { hour: 14, colors: ['#3070a0', '#4088b0', '#58a0c0', '#80b8d0', '#a0c8d8'], stops: [0, 16, 40, 68, 100] },
  { hour: 15, colors: ['#3070a0', '#4088b0', '#58a0c0', '#80b8d0', '#a0c8d8'], stops: [0, 16, 40, 68, 100] },
  { hour: 16, colors: ['#3878a8', '#4890b8', '#60a8c8', '#88c0d8', '#a8d0dc'], stops: [0, 18, 42, 70, 100] },
  { hour: 17, colors: ['#4080a0', '#5898b0', '#80a8b8', '#a8c0c0', '#c8d0c0'], stops: [0, 20, 45, 72, 100] },
  { hour: 18, colors: ['#5088a0', '#7090a0', '#90a0a0', '#c0b898', '#e0c888'], stops: [0, 18, 42, 68, 100] },
  { hour: 19, colors: ['#3e768e', '#7896a5', '#9ea59c', '#b4ab88', '#bd9651'], stops: [15, 25, 50, 65, 100] },
  { hour: 19.08, colors: ['#3e768e', '#7694a2', '#a4a4a2', '#b6a891', '#c78f60'], stops: [20, 35, 44, 71, 100] },
  { hour: 19.17, colors: ['#50889f', '#7e99a5', '#b9a788', '#d1a17a', '#d2896a'], stops: [22, 35, 45, 70, 100] },
  { hour: 19.25, colors: ['#50889f', '#8ea8b4', '#c0baaa', '#daa48b', '#d4837d'], stops: [20, 28, 40, 60, 100] },
  { hour: 19.33, colors: ['#498197', '#8ea8b4', '#ccad93', '#c99799', '#7c829c'], stops: [14, 26, 37, 73, 100] },
  { hour: 19.42, colors: ['#417a90', '#8ea8b4', '#b1aaa0', '#a39ca5', '#7b9aad'], stops: [22, 32, 46, 68, 100] },
  { hour: 19.5, colors: ['#2a6379', '#5c828a', '#838277', '#8c7d63', '#9b6450'], stops: [20, 35, 48, 75, 100] },
  { hour: 20, colors: ['#1e3249', '#31373f', '#3f3f4b', '#493c48', '#383249'], stops: [20, 33, 50, 75, 100] },
  { hour: 21, colors: ['#181830', '#1f1f2e', '#2c2c3a', '#3a363a', '#584850'], stops: [0, 25, 50, 75, 100] },
  { hour: 22, colors: ['#080818', '#0e1424', '#161e30', '#20263a', '#302840'], stops: [0, 22, 48, 75, 100] },
  { hour: 23, colors: ['#060514', '#0a0e1c', '#121828', '#1a2032', '#28243a'], stops: [0, 20, 45, 72, 100] },
];

function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex = (c: string) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function interpolatePalette(palette1: string[], palette2: string[], factor: number): string[] {
  return palette1.map((color, i) => interpolateColor(color, palette2[i], factor));
}

function interpolateStops(stops1: number[], stops2: number[], factor: number): number[] {
  return stops1.map((stop, i) => Math.round(stop + (stops2[i] - stop) * factor));
}

type BlendMode = 'normal' | 'multiply' | 'overlay' | 'soft-light' | 'hard-light' | 'difference' | 'exclusion' | 'luminosity';

interface SkySettings {
  // Fine grain
  grainOpacity: number;
  grainSize: number;
  grainBlendMode: BlendMode;
  grainFrequency: number;
  grainBlur: number;
  grainAnimate: boolean;
  // Large grain
  largeGrainOpacity: number;
  largeGrainScale: number;
  largeGrainBlur: number;
  largeGrainFrequency: number;
}

const blendModes: BlendMode[] = ['normal', 'multiply', 'overlay', 'soft-light', 'hard-light', 'difference', 'exclusion', 'luminosity'];

const defaultSettings: SkySettings = {
  // Fine grain
  grainOpacity: 0.10,
  grainSize: 140,
  grainBlendMode: 'hard-light',
  grainFrequency: 0.10,
  grainBlur: 0,
  grainAnimate: true,
  // Large grain
  largeGrainOpacity: 0.02,
  largeGrainScale: 1.1,
  largeGrainBlur: 0,
  largeGrainFrequency: 0.05,
};

// Palette entry type
interface PaletteEntry {
  hour: number;
  colors: string[];
  stops: number[];
}

// Get current time as fraction of day (0-1)
const getCurrentTimeAsFraction = () => {
  const now = new Date();
  return (now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600) / 24;
};

export default function SkyClockPage() {
  // Time value as fraction of day (0-1), synced with local time
  // Start at noon (0.5) for consistent SSR, then sync to real time on mount
  const [timeValue, setTimeValue] = useState(0.5);
  const [animTime, setAnimTime] = useState(0); // Continuous animation time for effects
  const [showSettings, setShowSettings] = useState(false);
  const [showColorEditor, setShowColorEditor] = useState(false);
  const [settings, setSettings] = useState<SkySettings>(defaultSettings);
  const [palettes, setPalettes] = useState<PaletteEntry[]>([...skyPalettes]);
  const [expandedPalette, setExpandedPalette] = useState<number | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [clockCentered, setClockCentered] = useState(false);
  const [ready, setReady] = useState(false);

  const lastTouchY = useRef(0);
  const animFrameRef = useRef<number>(0);
  const scrollVelocity = useRef(0);

  // Sync to real time after hydration and mark as ready
  useEffect(() => {
    setTimeValue(getCurrentTimeAsFraction());
    // Small delay to ensure styles are applied before enabling transitions
    requestAnimationFrame(() => {
      setReady(true);
    });
  }, []);

  // Continuous animation loop - advances real time and handles effects
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Animation speed increases with scroll velocity
      const speedMultiplier = 1 + Math.abs(scrollVelocity.current) * 50;

      // Advance animation time for effects (grain, stars)
      setAnimTime(prev => prev + delta * speedMultiplier);

      // Apply momentum: velocity affects time value
      // Advance time value in real-time (1 day = 86400 seconds) plus momentum
      setTimeValue(prev => prev + delta / 86400 + scrollVelocity.current * delta * 2);

      // Decay scroll velocity smoothly for momentum feel
      scrollVelocity.current *= 0.92;

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Handle wheel events for scrolling through time
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    // Scroll to adjust time - more sensitive for better feel
    const delta = e.deltaY / 8000;
    // Add to velocity for momentum effect (accumulates)
    scrollVelocity.current += delta;
    if (Math.abs(delta) > 0.0001) setHasScrolled(true);
  }, []);

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: TouchEvent) => {
    lastTouchY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const currentY = e.touches[0].clientY;
    const delta = (lastTouchY.current - currentY) / 4000;
    lastTouchY.current = currentY;
    // Add to velocity for momentum effect
    scrollVelocity.current += delta;
    if (Math.abs(delta) > 0.0001) setHasScrolled(true);
  }, []);

  // Reset to real time
  const resetToRealTime = useCallback(() => {
    setTimeValue(getCurrentTimeAsFraction());
    setHasScrolled(false);
    scrollVelocity.current = 0;
  }, []);

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove]);

  // Calculate current hour (wrapping infinitely)
  const exactHour = ((timeValue * 24) % 24 + 24) % 24; // Ensure positive modulo

  // Find surrounding palettes based on hour value (not array index)
  const { currentPalette, nextPalette, progress } = useMemo(() => {
    // Find the palette at or before current hour
    let currentIdx = 0;
    for (let i = 0; i < palettes.length; i++) {
      if (palettes[i].hour <= exactHour) {
        currentIdx = i;
      } else {
        break;
      }
    }

    // Handle wrap-around at midnight
    const nextIdx = (currentIdx + 1) % palettes.length;
    const current = palettes[currentIdx];
    const next = palettes[nextIdx];

    // Calculate progress between the two palettes
    let hourSpan: number;
    if (nextIdx === 0) {
      // Wrapping from last palette (e.g., 23:00) to first (0:00)
      hourSpan = (24 - current.hour) + next.hour;
    } else {
      hourSpan = next.hour - current.hour;
    }

    let hoursSinceCurrent: number;
    if (nextIdx === 0 && exactHour >= current.hour) {
      hoursSinceCurrent = exactHour - current.hour;
    } else if (nextIdx === 0) {
      hoursSinceCurrent = (24 - current.hour) + exactHour;
    } else {
      hoursSinceCurrent = exactHour - current.hour;
    }

    const prog = hourSpan > 0 ? hoursSinceCurrent / hourSpan : 0;

    return { currentPalette: current, nextPalette: next, progress: Math.min(1, Math.max(0, prog)) };
  }, [exactHour, palettes]);

  const interpolatedColors = useMemo(() =>
    interpolatePalette(currentPalette.colors, nextPalette.colors, progress),
    [currentPalette.colors, nextPalette.colors, progress]
  );

  const interpolatedStops = useMemo(() =>
    interpolateStops(currentPalette.stops, nextPalette.stops, progress),
    [currentPalette.stops, nextPalette.stops, progress]
  );

  // Rotation: continuous based on time value
  const rotation = timeValue * 360;

  // Current time display with seconds
  const hours = Math.floor(exactHour) % 12 || 12;
  const minutesDecimal = (exactHour % 1) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.floor((minutesDecimal % 1) * 60);
  const ampm = exactHour >= 12 ? 'PM' : 'AM';
  const timeDisplay = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;

  // Determine if it's night time for stars
  const isNight = exactHour < 6 || exactHour > 19;
  const isDusk = (exactHour >= 5 && exactHour < 6) || (exactHour > 18 && exactHour <= 19);

  // Realistic stars with power law brightness distribution and color variation
  const stars = useMemo(() => {
    // Seeded pseudo-random for deterministic but natural-looking distribution
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    // Star colors by temperature (spectral class) - muted/subtle
    const starColors = [
      '#c8d4f0', // O/B - subtle blue-white
      '#d4ddf0', // A - pale blue-white
      '#e0e4ed', // F - off-white
      '#f0ebe0', // G - warm white (sun-like)
      '#e8dcd0', // K - subtle warm
      '#e0d0c0', // M - pale warm (rare bright ones)
    ];

    return [...Array(800)].map((_, i) => {
      const r1 = seededRandom(i * 1.1);
      const r2 = seededRandom(i * 2.3);
      const r3 = seededRandom(i * 3.7);
      const r4 = seededRandom(i * 5.1);
      const r5 = seededRandom(i * 7.3);
      const r6 = seededRandom(i * 11.7);

      // Power law distribution: many dim stars, few bright
      // Using inverse transform sampling for realistic brightness
      const brightnessRaw = Math.pow(r1, 2.5); // Skewed toward dim
      const isBrightStar = brightnessRaw > 0.85; // Top ~5% are notably bright

      // Size based on apparent magnitude (brighter = larger apparent size + glow)
      const baseSize = isBrightStar
        ? 1.5 + brightnessRaw * 2
        : 0.5 + brightnessRaw * 1.2;

      // Color - most stars appear white, some show color
      // Brighter stars more likely to show color
      const colorIndex = isBrightStar
        ? Math.floor(r4 * starColors.length)
        : r4 > 0.7 ? Math.floor(r4 * 4) : 3; // Dimmer stars mostly white/yellow

      // Position with slight clustering (stars aren't perfectly uniform)
      const clusterX = Math.sin(r2 * Math.PI * 4) * 5;
      const clusterY = Math.cos(r3 * Math.PI * 3) * 5;

      return {
        size: baseSize,
        left: (r2 * 100 + clusterX + 100) % 100,
        top: (r3 * 100 + clusterY + 100) % 100,
        opacity: 0.25 + brightnessRaw * 0.5,
        color: starColors[colorIndex],
        // Scintillation (atmospheric twinkling) - slower for bright stars
        twinkleDuration: isBrightStar ? 4 + r5 * 4 : 2 + r5 * 3,
        twinkleDelay: r6 * 5,
        twinkleAmount: isBrightStar ? 0.15 : 0.3, // Bright stars twinkle less
        glow: isBrightStar ? baseSize * 0.5 : 0, // Very subtle glow for bright stars
      };
    });
  }, []);

  const updateSetting = (key: keyof SkySettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      data-ready={ready}
      style={{
        opacity: ready ? 1 : 0,
        transition: ready ? 'opacity 0.5s ease-out' : 'none',
      }}
    >
      {/* Base Sky Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse 150% 100% at 50% 120%,
            ${interpolatedColors[4]} ${interpolatedStops[0]}%,
            ${interpolatedColors[3]} ${interpolatedStops[1]}%,
            ${interpolatedColors[2]} ${interpolatedStops[2]}%,
            ${interpolatedColors[1]} ${interpolatedStops[3]}%,
            ${interpolatedColors[0]} ${interpolatedStops[4]}%
          )`,
        }}
      />

      {/* Sun glow - warm light that rises/sets with time */}
      {(exactHour >= 5 && exactHour <= 8) || (exactHour >= 17 && exactHour <= 20) ? (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: (() => {
              // Calculate sun position and intensity based on time
              const isMorning = exactHour < 12;
              // Sun rises from bottom, peaks at horizon, sets
              const sunProgress = isMorning
                ? Math.max(0, (exactHour - 5) / 3) // 5am-8am: 0 to 1
                : Math.max(0, 1 - (exactHour - 17) / 3); // 5pm-8pm: 1 to 0
              const sunY = 150 - (sunProgress * 30); // moves up as sun rises
              const intensity = Math.sin(sunProgress * Math.PI) * 0.4; // peaks in middle
              const warmth = isMorning ? '#f8d070' : '#f09050'; // morning more yellow, evening more orange
              return `radial-gradient(
                ellipse 80% 40% at 50% ${sunY}%,
                ${warmth}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%,
                ${warmth}${Math.round(intensity * 0.5 * 255).toString(16).padStart(2, '0')} 30%,
                transparent 70%
              )`;
            })(),
          }}
        />
      ) : null}

      {/* Subtle vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(
            ellipse 120% 120% at 50% 50%,
            transparent 30%,
            rgba(0, 0, 0, 0.12) 100%
          )`,
        }}
      />

      {/* Large blurry grain layer - reduced at night */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          opacity: settings.largeGrainOpacity * (isNight ? 0.4 : isDusk ? 0.6 : 1),
          mixBlendMode: settings.grainBlendMode,
          filter: `blur(${settings.largeGrainBlur}px)`,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${settings.largeGrainFrequency}' numOctaves='3' stitchTiles='stitch' seed='${settings.grainAnimate ? Math.floor(animTime * 5) % 100 : 0}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${settings.grainSize * settings.largeGrainScale}px ${settings.grainSize * settings.largeGrainScale}px`,
        }}
      />

      {/* Fine grain overlay - reduced at night */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          opacity: settings.grainOpacity * (isNight ? 0.3 : isDusk ? 0.6 : 1),
          mixBlendMode: settings.grainBlendMode,
          filter: `blur(${settings.grainBlur}px)`,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${settings.grainFrequency}' numOctaves='4' stitchTiles='stitch' seed='${settings.grainAnimate ? Math.floor(animTime * 8) % 100 : 0}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${settings.grainSize}px ${settings.grainSize}px`,
        }}
      />

      {/* Stars overlay - visible at night, rotates with time (client-side only to avoid hydration mismatch) */}
      {ready && (
        <div
          className="absolute pointer-events-none transition-opacity duration-1000"
          style={{
            width: '200%',
            height: '200%',
            left: '-50%',
            top: '-50%',
            opacity: isNight ? 1 : isDusk ? 0.4 : 0,
            transform: `rotate(${exactHour * 15}deg)`,
            transformOrigin: '50% 50%',
          }}
        >
          {stars.map((star, i) => {
            const twinklePhase = animTime * 2 + star.twinkleDelay;
            const twinkle = 0.7 + 0.3 * Math.sin(twinklePhase * (6 / star.twinkleDuration));

            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: star.size,
                  height: star.size,
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  opacity: star.opacity * twinkle,
                  backgroundColor: star.color,
                  boxShadow: star.glow > 0
                    ? `0 0 ${star.glow * twinkle}px ${(star.glow / 2) * twinkle}px ${star.color}`
                    : 'none',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Time display - center top of screen */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center flex items-center gap-3">
        <div className="sky-time-display">{timeDisplay}</div>
        {/* Reset button - shows when scrolled */}
        <button
          onClick={resetToRealTime}
          className="sky-reset-btn"
          data-visible={hasScrolled}
          title="Reset to current time"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: 4 }}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Clock at bottom (or center when clicked) */}
      <div
        onClick={() => setClockCentered(!clockCentered)}
        className="sky-clock"
        data-centered={clockCentered}
      >
        <div className="sky-clock-inner">
          {/* Dieter Rams inspired minimal clock face */}
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {/* Clock background - no border */}
            <circle
              cx="200"
              cy="200"
              r="195"
              fill="rgba(255, 255, 255, 0.12)"
            />

            {/* Hour marks - shorter ticks */}
            {[...Array(24)].map((_, i) => {
              const angle = (i / 24) * 360 - 90;
              const radian = (angle * Math.PI) / 180;

              const outerRadius = 195;
              const innerRadius = 179;

              const x1 = Math.round((200 + Math.cos(radian) * innerRadius) * 100) / 100;
              const y1 = Math.round((200 + Math.sin(radian) * innerRadius) * 100) / 100;
              const x2 = Math.round((200 + Math.cos(radian) * outerRadius) * 100) / 100;
              const y2 = Math.round((200 + Math.sin(radian) * outerRadius) * 100) / 100;

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth={2}
                />
              );
            })}

            {/* Minor tick marks between hours - 4 per hour */}
            {[...Array(120)].map((_, i) => {
              // Skip positions where hour marks are (every 5th position)
              if (i % 5 === 0) return null;

              const angle = (i / 120) * 360 - 90;
              const radian = (angle * Math.PI) / 180;

              const outerRadius = 195;
              const innerRadius = 185;

              const x1 = Math.round((200 + Math.cos(radian) * innerRadius) * 100) / 100;
              const y1 = Math.round((200 + Math.sin(radian) * innerRadius) * 100) / 100;
              const x2 = Math.round((200 + Math.cos(radian) * outerRadius) * 100) / 100;
              const y2 = Math.round((200 + Math.sin(radian) * outerRadius) * 100) / 100;

              return (
                <line
                  key={`minor-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth={1}
                />
              );
            })}

            {/* Hour numbers for all 24 hours */}
            {[...Array(24)].map((_, i) => {
              const angle = (i / 24) * 360 - 90;
              const radian = (angle * Math.PI) / 180;
              const labelRadius = 164;

              const labelX = Math.round((200 + Math.cos(radian) * labelRadius) * 100) / 100;
              const labelY = Math.round((200 + Math.sin(radian) * labelRadius) * 100) / 100;

              return (
                <text
                  key={i}
                  x={labelX}
                  y={labelY}
                  fill="rgba(255, 255, 255, 0.6)"
                  fontSize="13"
                  fontWeight="300"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    transform: `rotate(${-rotation}deg)`,
                    transformOrigin: `${labelX}px ${labelY}px`,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    letterSpacing: '0.02em',
                  }}
                >
                  {i}
                </text>
              );
            })}

            {/* Clock hands - counter-rotate to show actual time */}
            {(() => {
              const hourAngle = (exactHour / 24) * 360;
              const minuteAngle = (minutesDecimal / 60) * 360 - rotation;
              const secondAngle = (seconds / 60) * 360 - rotation;
              const isScrolling = Math.abs(scrollVelocity.current) > 0.001;

              return (
                <g>
                  {/* Hour hand */}
                  <line
                    x1="200"
                    y1="200"
                    x2="200"
                    y2="110"
                    stroke="rgba(255, 255, 255, 0.85)"
                    strokeWidth="4"
                    style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: '200px 200px' }}
                  />

                  {/* Minute hand */}
                  <line
                    x1="200"
                    y1="200"
                    x2="200"
                    y2="65"
                    stroke="rgba(255, 255, 255, 0.7)"
                    strokeWidth="3"
                    style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: '200px 200px' }}
                  />

                  {/* Second hand - hidden when scrolling */}
                  {!isScrolling && (
                    <line
                      x1="200"
                      y1="215"
                      x2="200"
                      y2="50"
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeWidth="1.5"
                      style={{ transform: `rotate(${secondAngle}deg)`, transformOrigin: '200px 200px' }}
                    />
                  )}

                  {/* Center cap */}
                  <circle
                    cx="200"
                    cy="200"
                    r="5"
                    fill="rgba(255, 255, 255, 0.6)"
                  />
                </g>
              );
            })()}
          </svg>

        </div>
      </div>

      {/* Curved text above the clock */}
      <svg
        className="sky-scroll-text"
        data-hidden={clockCentered}
        viewBox="0 0 200 50"
      >
        <defs>
          <path
            id="textCurve"
            d="M 15,48 Q 100,10 185,48"
            fill="none"
          />
        </defs>
        <text fill="rgba(255, 255, 255, 0.6)" className="sky-scroll-text-content">
          <textPath href="#textCurve" startOffset="50%" textAnchor="middle">
            scroll the time away
          </textPath>
        </text>
      </svg>

      {/* NOTE: Do not delete the commented out settings below - they may be needed later */}

      {/* Settings toggle button
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white/80 transition-all z-50"
        style={{ pointerEvents: 'auto' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
      */}

      {/* Color Editor toggle button
      <button
        onClick={() => setShowColorEditor(!showColorEditor)}
        className="fixed bottom-6 left-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white/80 transition-all z-50"
        style={{ pointerEvents: 'auto' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      */}

      {/* Color Editor Panel - NOTE: Do not delete, may be needed later */}
      {false && showColorEditor && (
        <div
          className="fixed left-6 top-6 bottom-20 w-80 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 z-50 flex flex-col"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div className="text-white/80 text-sm font-medium tracking-wide">Color Editor</div>
              <div className="text-white/40 text-xs">
                {palettes.length} palettes
              </div>
            </div>
            <div className="text-white/40 text-xs mt-1">
              Current: {Math.floor(exactHour)}:{String(Math.floor((exactHour % 1) * 60)).padStart(2, '0')}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {palettes.map((palette, paletteIdx) => {
              const hourStr = palette.hour < 12
                ? `${palette.hour === 0 ? 12 : Math.floor(palette.hour)}:${String(Math.round((palette.hour % 1) * 60)).padStart(2, '0')} AM`
                : `${palette.hour === 12 ? 12 : Math.floor(palette.hour - 12)}:${String(Math.round((palette.hour % 1) * 60)).padStart(2, '0')} PM`;
              const isActive = palette.hour <= exactHour && (paletteIdx === palettes.length - 1 || palettes[paletteIdx + 1].hour > exactHour);

              return (
                <div
                  key={paletteIdx}
                  className={`mb-2 rounded-lg border ${isActive ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5'}`}
                >
                  {/* Palette Header */}
                  <button
                    onClick={() => setExpandedPalette(expandedPalette === paletteIdx ? null : paletteIdx)}
                    className="w-full p-2 flex items-center gap-2 text-left"
                  >
                    {/* Color preview bar */}
                    <div className="flex-1 h-6 rounded overflow-hidden flex">
                      {palette.colors.map((color, colorIdx) => (
                        <div
                          key={colorIdx}
                          className="flex-1"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {/* Time */}
                    <div className="text-white/60 text-xs w-16 text-right">{hourStr}</div>
                    {/* Expand icon */}
                    <svg
                      className={`w-4 h-4 text-white/40 transition-transform ${expandedPalette === paletteIdx ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded Editor */}
                  {expandedPalette === paletteIdx && (
                    <div className="px-2 pb-2 border-t border-white/10">
                      {/* Hour editor */}
                      <div className="mt-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-xs w-12">Hour:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="23.99"
                            value={palette.hour}
                            onChange={(e) => {
                              const newPalettes = [...palettes];
                              newPalettes[paletteIdx] = { ...palette, hour: parseFloat(e.target.value) || 0 };
                              newPalettes.sort((a, b) => a.hour - b.hour);
                              setPalettes(newPalettes);
                            }}
                            className="flex-1 h-6 bg-white/10 rounded text-white/80 text-xs px-2 border border-white/10"
                          />
                        </div>
                      </div>

                      {/* Colors */}
                      <div className="text-white/40 text-xs mb-1">Colors (zenith → horizon)</div>
                      {['Zenith', 'Upper', 'Mid', 'Lower', 'Horizon'].map((label, colorIdx) => (
                        <div key={colorIdx} className="flex items-center gap-2 mb-1">
                          <span className="text-white/30 text-xs w-12">{label}</span>
                          <input
                            type="color"
                            value={palette.colors[colorIdx]}
                            onChange={(e) => {
                              const newPalettes = [...palettes];
                              const newColors = [...palette.colors];
                              newColors[colorIdx] = e.target.value;
                              newPalettes[paletteIdx] = { ...palette, colors: newColors };
                              setPalettes(newPalettes);
                            }}
                            className="w-8 h-6 rounded border border-white/20 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={palette.colors[colorIdx]}
                            onChange={(e) => {
                              const newPalettes = [...palettes];
                              const newColors = [...palette.colors];
                              newColors[colorIdx] = e.target.value;
                              newPalettes[paletteIdx] = { ...palette, colors: newColors };
                              setPalettes(newPalettes);
                            }}
                            className="flex-1 h-6 bg-white/10 rounded text-white/60 text-xs px-2 border border-white/10 font-mono"
                          />
                        </div>
                      ))}

                      {/* Stops */}
                      <div className="text-white/40 text-xs mt-3 mb-1">Gradient Stops (%)</div>
                      <div className="flex gap-1">
                        {palette.stops.map((stop, stopIdx) => (
                          <input
                            key={stopIdx}
                            type="number"
                            min="0"
                            max="100"
                            value={stop}
                            onChange={(e) => {
                              const newPalettes = [...palettes];
                              const newStops = [...palette.stops];
                              newStops[stopIdx] = parseInt(e.target.value) || 0;
                              newPalettes[paletteIdx] = { ...palette, stops: newStops };
                              setPalettes(newPalettes);
                            }}
                            className="flex-1 h-6 bg-white/10 rounded text-white/60 text-xs px-1 text-center border border-white/10"
                          />
                        ))}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => {
                          if (palettes.length > 2) {
                            const newPalettes = palettes.filter((_, idx) => idx !== paletteIdx);
                            setPalettes(newPalettes);
                            setExpandedPalette(null);
                          }
                        }}
                        className="mt-3 w-full py-1.5 text-xs text-red-400/70 hover:text-red-400 border border-red-400/30 hover:border-red-400/50 rounded transition-all"
                      >
                        Delete Palette
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="p-3 border-t border-white/10 space-y-2">
            <button
              onClick={() => {
                const newPalette: PaletteEntry = {
                  hour: exactHour,
                  colors: [...interpolatedColors],
                  stops: [...interpolatedStops],
                };
                const newPalettes = [...palettes, newPalette].sort((a, b) => a.hour - b.hour);
                setPalettes(newPalettes);
              }}
              className="w-full py-2 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all"
            >
              + Add Palette at Current Time
            </button>
            <button
              onClick={() => {
                const json = JSON.stringify(palettes, null, 2);
                navigator.clipboard.writeText(json);
              }}
              className="w-full py-2 text-xs text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 rounded-lg transition-all"
            >
              Copy Palettes as JSON
            </button>
            <button
              onClick={() => setPalettes([...skyPalettes])}
              className="w-full py-2 text-xs text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 rounded-lg transition-all"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel - NOTE: Do not delete, may be needed later */}
      {false && showSettings && (
        <div
          className="fixed bottom-20 right-6 w-72 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 z-50 max-h-[70vh] overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="text-white/80 text-sm font-medium mb-4 tracking-wide">Sky Settings</div>

          {/* Fine Grain Section */}
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Fine Grain</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Opacity</span>
              <span>{(settings.grainOpacity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={settings.grainOpacity}
              onChange={(e) => updateSetting('grainOpacity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Size</span>
              <span>{settings.grainSize}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={settings.grainSize}
              onChange={(e) => updateSetting('grainSize', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Frequency</span>
              <span>{settings.grainFrequency.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.05"
              value={settings.grainFrequency}
              onChange={(e) => updateSetting('grainFrequency', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Blur</span>
              <span>{settings.grainBlur.toFixed(1)}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={settings.grainBlur}
              onChange={(e) => updateSetting('grainBlur', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          {/* Large Grain Section */}
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2 mt-4">Large Grain</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Opacity</span>
              <span>{(settings.largeGrainOpacity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={settings.largeGrainOpacity}
              onChange={(e) => updateSetting('largeGrainOpacity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Scale</span>
              <span>{settings.largeGrainScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={settings.largeGrainScale}
              onChange={(e) => updateSetting('largeGrainScale', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Frequency</span>
              <span>{settings.largeGrainFrequency.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.01"
              value={settings.largeGrainFrequency}
              onChange={(e) => updateSetting('largeGrainFrequency', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Blur</span>
              <span>{settings.largeGrainBlur.toFixed(1)}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={settings.largeGrainBlur}
              onChange={(e) => updateSetting('largeGrainBlur', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          {/* Shared Settings */}
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2 mt-4">Shared</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Blend Mode</span>
              <span>{settings.grainBlendMode}</span>
            </div>
            <select
              value={settings.grainBlendMode}
              onChange={(e) => setSettings(prev => ({ ...prev, grainBlendMode: e.target.value as BlendMode }))}
              className="w-full h-7 bg-white/10 rounded text-white/70 text-xs px-2 border border-white/10 cursor-pointer"
            >
              {blendModes.map(mode => (
                <option key={mode} value={mode} className="bg-gray-900">{mode}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-white/50 text-xs">Animate</span>
            <button
              onClick={() => setSettings(prev => ({ ...prev, grainAnimate: !prev.grainAnimate }))}
              className={`w-10 h-5 rounded-full transition-colors ${settings.grainAnimate ? 'bg-white/30' : 'bg-white/10'}`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.grainAnimate ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {/* Reset button */}
          <button
            onClick={() => setSettings(defaultSettings)}
            className="w-full mt-3 py-2 text-xs text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 rounded-lg transition-all"
          >
            Reset to defaults
          </button>
        </div>
      )}

      {/* Sky Clock Styles */}
      <style jsx global>{`
        header, nav {
          display: none !important;
        }

        /* Clock container */
        .sky-clock {
          position: absolute;
          left: 50%;
          width: min(70vw, 70vh);
          height: min(70vw, 70vh);
          cursor: pointer;
          top: calc(100% - min(35vw, 35vh));
          transform: translateX(-50%) translateY(0) scale(1);
        }
        [data-ready="true"] .sky-clock {
          transition: top 0.25s ease-out, transform 0.25s ease-out;
        }
        .sky-clock[data-centered="true"] {
          top: 50%;
          transform: translateX(-50%) translateY(-50%) scale(0.65);
        }

        /* Clock inner */
        .sky-clock-inner {
          position: relative;
          width: 100%;
          height: min(70vw, 70vh);
        }

        /* Scroll text */
        .sky-scroll-text {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
          bottom: min(32.5vw, 32.5vh);
          width: min(38vw, 38vh);
          height: min(8vw, 8vh);
          opacity: 1;
        }
        [data-ready="true"] .sky-scroll-text {
          transition: bottom 0.3s ease-out, opacity 0.3s ease-out;
        }
        .sky-scroll-text[data-hidden="true"] {
          bottom: calc(50% + min(5vw, 5vh));
          opacity: 0;
        }

        /* Time display */
        .sky-time-display {
          font-size: min(4vw, 18px);
          font-family: var(--font-compagnon), system-ui, sans-serif;
          color: rgba(255, 255, 255, 0.85);
          letter-spacing: 0.15em;
          font-weight: 400;
        }

        /* Reset button */
        .sky-reset-btn {
          color: rgba(255, 255, 255, 0.6);
          opacity: 0;
          transform: translateX(-8px);
          pointer-events: none;
        }
        [data-ready="true"] .sky-reset-btn {
          transition: all 0.3s;
        }
        .sky-reset-btn[data-visible="true"] {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }

        /* Scroll text styling */
        .sky-scroll-text-content {
          font-size: 8px;
          font-family: var(--font-compagnon), system-ui, sans-serif;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        /* Slider styles (for commented settings) */
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
