'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';

// California sky color palettes - warm, golden, hazy
// [zenith, upper, mid, lower, horizon]
// Uses hour as decimal for fine control during sunrise/sunset peaks
const skyPalettes = [
  { hour: 0, colors: ['#0a0a1a', '#101828', '#1a2438', '#283048', '#3c3850'], stops: [0, 20, 45, 72, 100] },
  { hour: 1, colors: ['#0c0c1c', '#12182a', '#1c2238', '#242c45', '#383048'], stops: [0, 22, 48, 75, 100] },
  { hour: 2, colors: ['#0a0a1a', '#101826', '#182030', '#202840', '#343045'], stops: [0, 20, 45, 70, 100] },
  { hour: 3, colors: ['#0c0c1e', '#141830', '#1c2438', '#263048', '#3a3850'], stops: [0, 18, 42, 68, 100] },
  { hour: 4, colors: ['#141828', '#1c2030', '#263040', '#364050', '#4a4058'], stops: [0, 30, 60, 88, 100] },
  { hour: 4.75, colors: ['#1a2030', '#283848', '#3a4858', '#4a5060', '#605868'], stops: [0, 28, 55, 82, 100] },
  { hour: 5, colors: ['#1e2838', '#2e3850', '#405060', '#5a5868', '#7a6070'], stops: [0, 28, 55, 82, 100] },
  { hour: 5.75, colors: ['#2a3448', '#364050', '#486068', '#6a6878', '#887080'], stops: [0, 22, 48, 75, 100] },
  { hour: 6, colors: ['#2e3850', '#3a4458', '#506070', '#7a7080', '#987888'], stops: [0, 22, 48, 75, 100] },
  { hour: 6.17, colors: ['#406080', '#587090', '#6a7088', '#7a7080', '#987888'], stops: [0, 21, 46, 73, 100] },
  { hour: 6.33, colors: ['#486090', '#6070a0', '#707888', '#7a7080', '#987888'], stops: [0, 20, 45, 72, 100] },
  { hour: 6.5, colors: ['#5070a0', '#6880a8', '#7880a0', '#7a7080', '#987888'], stops: [0, 19, 44, 71, 100] },
  { hour: 6.67, colors: ['#5880a8', '#7090b0', '#90a0b8', '#98889a', '#a888a0'], stops: [25, 30, 43, 70, 100] },
  { hour: 6.83, colors: ['#5890c0', '#80a8c8', '#c8c8d0', '#d8b8b8', '#d8a0a8'], stops: [22, 32, 50, 70, 100] },
  { hour: 7, colors: ['#60a0d0', '#88b8d8', '#c0d8e8', '#e8d8d0', '#f0b0b0'], stops: [20, 35, 55, 70, 100] },
  { hour: 7.25, colors: ['#60a0d0', '#78b0d0', '#a8c8d8', '#e0d8c8', '#f8d898'], stops: [20, 40, 70, 90, 100] },
  { hour: 7.5, colors: ['#64a8d8', '#7cb8dc', '#a4d0e4', '#d8e0dc', '#f4e8c0'], stops: [20, 35, 60, 85, 100] },
  { hour: 8, colors: ['#68b0e0', '#80c0e8', '#a0d8f0', '#d0e8f0', '#f0f0e8'], stops: [20, 30, 50, 80, 100] },
  { hour: 9, colors: ['#60a8d8', '#78c0e8', '#98d8f8', '#c8e8f8', '#e8f0f0'], stops: [0, 24, 50, 78, 100] },
  { hour: 10, colors: ['#60a8d8', '#78c0e8', '#98d8f8', '#c8e8f8', '#e8f0f0'], stops: [0, 22, 48, 76, 100] },
  { hour: 11, colors: ['#68a8c8', '#70b8e0', '#88d0f0', '#b0e0f0', '#d0f0f8'], stops: [0, 20, 45, 72, 100] },
  { hour: 12, colors: ['#68a8c8', '#70b8e0', '#88d0f0', '#b0e0f0', '#d0f0f8'], stops: [0, 20, 45, 72, 100] },
  { hour: 13, colors: ['#58a0d0', '#68b0d8', '#80c8e8', '#a8e0f0', '#c8e8f0'], stops: [0, 18, 42, 70, 100] },
  { hour: 14, colors: ['#5098c8', '#60a8d0', '#78c0e0', '#a0d8f0', '#c0e8f0'], stops: [0, 16, 40, 68, 100] },
  { hour: 15, colors: ['#4890c0', '#90b8c8', '#b0c8c8', '#e0d8b0', '#f8e0a0'], stops: [0, 18, 42, 68, 100] },
  { hour: 15.5, colors: ['#68a8c0', '#94b8c8', '#c0c8c0', '#d8d0a8', '#e8c888'], stops: [10, 22, 44, 66, 100] },
  { hour: 16, colors: ['#5c9cb8', '#98b8c8', '#c0c8b8', '#d8c8a0', '#e0b070'], stops: [15, 25, 46, 65, 100] },
  { hour: 16.5, colors: ['#5090b0', '#98b8c8', '#c8c8c0', '#d8c0a8', '#e0a878'], stops: [20, 30, 48, 71, 100] },
  { hour: 17, colors: ['#5090b0', '#a0c0c8', '#d8c8a0', '#f0c090', '#f0a080'], stops: [22, 35, 50, 70, 100] },
  { hour: 17.25, colors: ['#5090b0', '#b0c8d8', '#e8d0b0', '#f8c0a0', '#f0a090'], stops: [20, 28, 40, 60, 100] },
  { hour: 17.5, colors: ['#60a0c0', '#b0c8d8', '#ccc0b8', '#e8b0b0', '#d09080'], stops: [14, 22, 37, 65, 100] },
  { hour: 18, colors: ['#3a6080', '#6888a0', '#9090a0', '#a89098', '#b08888'], stops: [20, 35, 50, 75, 100] },
  { hour: 18.5, colors: ['#2e4460', '#4c6478', '#687080', '#7c7480', '#847478'], stops: [20, 35, 52, 76, 100] },
  { hour: 19, colors: ['#283c54', '#425868', '#586070', '#686470', '#706870'], stops: [20, 35, 52, 76, 100] },
  { hour: 19.5, colors: ['#1e3248', '#38505c', '#4c5460', '#5c5c62', '#645c5c'], stops: [20, 35, 52, 76, 100] },
  { hour: 20, colors: ['#1a2a42', '#2e4252', '#444c54', '#52525a', '#5a545a'], stops: [20, 35, 52, 76, 100] },
  { hour: 21, colors: ['#202848', '#303848', '#404858', '#504858', '#686070'], stops: [0, 25, 50, 75, 100] },
  { hour: 22, colors: ['#101028', '#182038', '#243048', '#303850', '#403858'], stops: [0, 22, 48, 75, 100] },
  { hour: 23, colors: ['#0c0c1e', '#121828', '#1a2438', '#243048', '#343050'], stops: [0, 20, 45, 72, 100] },
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
  // Gradient shape
  horizonY: number;        // Where horizon sits (100 = bottom, 150 = below screen)
  gradientStretch: number; // Ellipse width (100 = circular, 200 = wide dome)
  gradientHeight: number;  // Ellipse height (affects dome curvature)
  // Sun glow
  sunGlowIntensity: number;
  sunGlowSize: number;
  // Atmospheric haze
  hazeIntensity: number;
  hazeHeight: number;
  // Fine grain
  grainOpacity: number;
  grainSize: number;
  grainBlendMode: BlendMode;
  grainFrequency: number;
  grainBlur: number;
  grainAnimate: boolean;
  grainAnimSpeed: number;
  // Large grain
  largeGrainOpacity: number;
  largeGrainScale: number;
  largeGrainBlur: number;
  largeGrainFrequency: number;
}

const blendModes: BlendMode[] = ['normal', 'multiply', 'overlay', 'soft-light', 'hard-light', 'difference', 'exclusion', 'luminosity'];

const defaultSettings: SkySettings = {
  // Gradient shape
  horizonY: 120,
  gradientStretch: 150,
  gradientHeight: 100,
  // Sun glow
  sunGlowIntensity: 0.5,
  sunGlowSize: 80,
  // Atmospheric haze
  hazeIntensity: 0.15,
  hazeHeight: 40,
  // Fine grain
  grainOpacity: 0.20,
  grainSize: 500,
  grainBlendMode: 'hard-light',
  grainFrequency: 0.95,
  grainBlur: 0.5,
  grainAnimate: true,
  grainAnimSpeed: 12,
  // Large grain
  largeGrainOpacity: 0.10,
  largeGrainScale: 2.4,
  largeGrainBlur: 0.5,
  largeGrainFrequency: 1.00,
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

  const lastTouchX = useRef(0);
  const animFrameRef = useRef<number>(0);
  const scrollVelocity = useRef(0);

  // Drag-spin refs
  const clockRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastDragAngle = useRef(0);
  const hasDragged = useRef(false); // Track if significant drag occurred

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
    // Support both vertical (deltaY) and horizontal (deltaX) scroll
    const deltaY = e.deltaY / 6000;
    const deltaX = e.deltaX / 6000;
    // Use whichever has more movement, horizontal scrolls forward (like swipe right)
    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : deltaY;
    // Add to velocity for momentum effect (accumulates)
    scrollVelocity.current += delta;
    if (Math.abs(delta) > 0.0001) setHasScrolled(true);
  }, []);

  // Handle touch events for mobile - simple horizontal swipe
  const handleTouchStart = useCallback((e: TouchEvent) => {
    lastTouchX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const currentX = e.touches[0].clientX;
    // Swipe right = forward in time, swipe left = backward
    const delta = (currentX - lastTouchX.current) / 600;
    lastTouchX.current = currentX;
    scrollVelocity.current += delta;
    if (Math.abs(delta) > 0.0001) setHasScrolled(true);
  }, []);

  // Reset to real time
  const resetToRealTime = useCallback(() => {
    setTimeValue(getCurrentTimeAsFraction());
    setHasScrolled(false);
    scrollVelocity.current = 0;
  }, []);

  // Calculate angle from center of clock to a point
  const getAngleFromCenter = useCallback((clientX: number, clientY: number) => {
    if (!clockRef.current) return 0;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX);
  }, []);

  // Drag-spin handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    hasDragged.current = false;
    lastDragAngle.current = getAngleFromCenter(e.clientX, e.clientY);
    e.preventDefault();
  }, [getAngleFromCenter]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;

    const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
    let angleDelta = currentAngle - lastDragAngle.current;

    // Handle wrap-around at PI/-PI boundary
    if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
    if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

    // Convert angle delta to time velocity (negative because clockwise = forward)
    const timeDelta = -angleDelta / (2 * Math.PI) * 0.02;
    scrollVelocity.current += timeDelta;

    if (Math.abs(timeDelta) > 0.0001) {
      setHasScrolled(true);
      hasDragged.current = true;
    }
    lastDragAngle.current = currentAngle;
  }, [getAngleFromCenter]);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    // Check if device supports touch - if so, only use touch events (no wheel)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Only add wheel listener on non-touch devices to prevent conflicts
    if (!isTouchDevice) {
      window.addEventListener('wheel', handleWheel, { passive: false });
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);

    return () => {
      if (!isTouchDevice) {
        window.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleDragMove, handleDragEnd]);

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
  // Stars only visible in true darkness (not during sunset/sunrise)
  const isNight = exactHour < 5.5 || exactHour > 20;
  const isDusk = (exactHour >= 5 && exactHour < 5.5) || (exactHour > 19.5 && exactHour <= 20);

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

    return [...Array(1500)].map((_, i) => {
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
    <>
      {/* Stars overlay - TEMPORARILY HIDDEN */}

      <div
        className="fixed inset-0 overflow-hidden"
        data-ready={ready}
        style={{
          opacity: ready ? 1 : 0,
          transition: ready ? 'opacity 0.5s ease-out' : 'none',
          zIndex: 1,
        }}
      >
      {/* Base Sky Gradient - domed radial effect */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse ${settings.gradientStretch}% ${settings.gradientHeight}% at 50% ${settings.horizonY}%,
            ${interpolatedColors[4]} ${interpolatedStops[0]}%,
            ${interpolatedColors[3]} ${interpolatedStops[1]}%,
            ${interpolatedColors[2]} ${interpolatedStops[2]}%,
            ${interpolatedColors[1]} ${interpolatedStops[3]}%,
            ${interpolatedColors[0]} ${interpolatedStops[4]}%
          )`,
        }}
      />

      {/* Atmospheric haze layer - adds depth near horizon */}
      {settings.hazeIntensity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              to top,
              ${interpolatedColors[4]}${Math.round(settings.hazeIntensity * 255).toString(16).padStart(2, '0')} 0%,
              ${interpolatedColors[3]}${Math.round(settings.hazeIntensity * 0.5 * 255).toString(16).padStart(2, '0')} ${settings.hazeHeight}%,
              transparent ${settings.hazeHeight * 2}%
            )`,
          }}
        />
      )}

      {/* Sun glow - warm light that rises/sets with time */}
      {settings.sunGlowIntensity > 0 && ((exactHour >= 5 && exactHour <= 9) || (exactHour >= 16 && exactHour <= 20)) && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: (() => {
              const isMorning = exactHour < 12;

              // Sun position - lower during peak golden hour
              const peakProgress = isMorning
                ? 1 - Math.abs(exactHour - 6.5) / 1.5  // peaks at 6:30am
                : 1 - Math.abs(exactHour - 17.5) / 1.5; // peaks at 5:30pm
              const sunY = settings.horizonY - 20 + (1 - Math.max(0, peakProgress)) * 30;

              // Intensity based on how close to peak
              const intensity = Math.max(0, peakProgress) * settings.sunGlowIntensity;

              // Color - morning more yellow/pink, evening more orange/red
              const warmth = isMorning ? '#ffb060' : '#ff7040';
              const warmth2 = isMorning ? '#ffd090' : '#ff9050';

              return `radial-gradient(
                ellipse ${settings.sunGlowSize}% ${settings.sunGlowSize * 0.5}% at 50% ${sunY}%,
                ${warmth2}${Math.round(intensity * 200).toString(16).padStart(2, '0')} 0%,
                ${warmth}${Math.round(intensity * 150).toString(16).padStart(2, '0')} 30%,
                ${warmth}${Math.round(intensity * 50).toString(16).padStart(2, '0')} 60%,
                transparent 100%
              )`;
            })(),
          }}
        />
      )}

      {/* Secondary atmospheric glow - adds warmth to whole sky during golden hour */}
      {((exactHour >= 5.5 && exactHour <= 8) || (exactHour >= 17 && exactHour <= 19.5)) && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: (() => {
              const isMorning = exactHour < 12;
              const peakProgress = isMorning
                ? 1 - Math.abs(exactHour - 6.5) / 1.5
                : 1 - Math.abs(exactHour - 18) / 1.5;
              const intensity = Math.max(0, peakProgress) * 0.15;
              const tint = isMorning ? '#ffcc80' : '#ff8866';
              return `linear-gradient(
                to top,
                ${tint}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%,
                ${tint}${Math.round(intensity * 0.3 * 255).toString(16).padStart(2, '0')} 50%,
                transparent 100%
              )`;
            })(),
            mixBlendMode: 'soft-light',
          }}
        />
      )}

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

      {/* Large blurry grain layer */}
      <div
        className="absolute pointer-events-none transition-opacity duration-1000"
        style={{
          top: '-10%',
          left: '-10%',
          width: '120%',
          height: '120%',
          opacity: settings.largeGrainOpacity * (isNight ? 0.5 : isDusk ? 0.5 : 1),
          mixBlendMode: settings.grainBlendMode,
          filter: `blur(${settings.largeGrainBlur}px)`,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${settings.largeGrainFrequency}' numOctaves='3' stitchTiles='stitch' seed='${settings.grainAnimate ? Math.floor(animTime * settings.grainAnimSpeed * 0.3) % 100 : 0}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${settings.grainSize * settings.largeGrainScale}px ${settings.grainSize * settings.largeGrainScale}px`,
          transform: settings.grainAnimate
            ? `translate(${Math.sin(animTime * 0.1) * 3}%, ${Math.cos(animTime * 0.08) * 2}%)`
            : 'none',
        }}
      />

      {/* Fine grain overlay */}
      <div
        className="absolute pointer-events-none transition-opacity duration-1000"
        style={{
          top: '-5%',
          left: '-5%',
          width: '110%',
          height: '110%',
          opacity: settings.grainOpacity * (isNight ? 0.5 : isDusk ? 0.5 : 1),
          mixBlendMode: settings.grainBlendMode,
          filter: `blur(${settings.grainBlur}px)`,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${settings.grainFrequency}' numOctaves='4' stitchTiles='stitch' seed='${settings.grainAnimate ? Math.floor(animTime * settings.grainAnimSpeed) % 100 : 0}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${settings.grainSize}px ${settings.grainSize}px`,
          transform: settings.grainAnimate
            ? `translate(${Math.sin(animTime * 0.5) * 1}%, ${Math.cos(animTime * 0.4) * 0.8}%)`
            : 'none',
        }}
      />

      {/* Time display - center top of screen */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center flex items-center gap-3" style={{ zIndex: 10 }}>
        <div className="sky-time-display">{timeDisplay}</div>
        {/* Reset button - shows when scrolled */}
        <button
          onClick={resetToRealTime}
          className="sky-reset-btn"
          data-visible={hasScrolled}
          title="Reset to current time"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: 2 }}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Clock at bottom (or center when clicked) */}
      <div
        ref={clockRef}
        onMouseDown={handleDragStart}
        onClick={() => {
          // Only toggle centered if user didn't drag (click vs drag)
          if (!hasDragged.current) setClockCentered(!clockCentered);
        }}
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
              fill="rgba(255, 255, 255, 0.15)"
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
                  stroke="rgba(255, 255, 255, 0.85)"
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
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth={2}
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
                  fill="rgba(255, 255, 255, 0.85)"
                  fontSize="13"
                  fontWeight="500"
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
                    strokeWidth="5"
                    style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: '200px 200px' }}
                  />

                  {/* Minute hand */}
                  <line
                    x1="200"
                    y1="200"
                    x2="200"
                    y2="65"
                    stroke="rgba(255, 255, 255, 0.5)"
                    strokeWidth="4"
                    style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: '200px 200px' }}
                  />

                  {/* Second hand - hidden when scrolling */}
                  {!isScrolling && (
                    <line
                      x1="200"
                      y1="215"
                      x2="200"
                      y2="50"
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth="1.5"
                      style={{ transform: `rotate(${secondAngle}deg)`, transformOrigin: '200px 200px' }}
                    />
                  )}

                  {/* Center cap */}
                  <circle
                    cx="200"
                    cy="200"
                    r="5"
                    fill="rgba(255, 255, 255, 0.85)"
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

      {/* Settings toggle button */}
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

      {/* Settings Panel */}
      {showSettings && (
        <div
          className="fixed bottom-20 right-6 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 p-4 z-50 max-h-[70vh] overflow-y-auto"
          style={{ pointerEvents: 'auto', width: '280px' }}
        >
          <div className="text-white/70 text-xs uppercase tracking-wider mb-4">Sky Settings</div>

          {/* Gradient Shape */}
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Gradient Shape</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
              <span>Horizon Position</span>
              <span>{settings.horizonY}%</span>
            </div>
            <input
              type="range"
              min="80"
              max="150"
              step="1"
              value={settings.horizonY}
              onChange={(e) => updateSetting('horizonY', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
              <span>Dome Stretch</span>
              <span>{settings.gradientStretch}%</span>
            </div>
            <input
              type="range"
              min="100"
              max="250"
              step="5"
              value={settings.gradientStretch}
              onChange={(e) => updateSetting('gradientStretch', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
              <span>Dome Height</span>
              <span>{settings.gradientHeight}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={settings.gradientHeight}
              onChange={(e) => updateSetting('gradientHeight', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          {/* Sun & Atmosphere */}
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-2 mt-4">Sun & Atmosphere</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
              <span>Sun Glow</span>
              <span>{(settings.sunGlowIntensity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sunGlowIntensity}
              onChange={(e) => updateSetting('sunGlowIntensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
              <span>Glow Size</span>
              <span>{settings.sunGlowSize}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="150"
              step="5"
              value={settings.sunGlowSize}
              onChange={(e) => updateSetting('sunGlowSize', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
              <span>Haze</span>
              <span>{(settings.hazeIntensity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.02"
              value={settings.hazeIntensity}
              onChange={(e) => updateSetting('hazeIntensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
              <span>Haze Height</span>
              <span>{settings.hazeHeight}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              step="5"
              value={settings.hazeHeight}
              onChange={(e) => updateSetting('hazeHeight', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          {/* Fine Grain */}
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-2 mt-4">Fine Grain</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
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
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
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
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          {/* Large Grain */}
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-2 mt-4">Large Grain</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
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
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
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
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          {/* Shared Grain Settings */}
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-2 mt-4">Grain Effects</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-[10px] mb-1">
              <span>Blend Mode</span>
              <span>{settings.grainBlendMode}</span>
            </div>
            <select
              value={settings.grainBlendMode}
              onChange={(e) => setSettings(prev => ({ ...prev, grainBlendMode: e.target.value as BlendMode }))}
              className="w-full h-6 bg-white/10 rounded text-white/70 text-[10px] px-2 border border-white/10 cursor-pointer"
            >
              {blendModes.map(mode => (
                <option key={mode} value={mode} className="bg-gray-900">{mode}</option>
              ))}
            </select>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-white/50 text-[10px]">Animate Grain</span>
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

      {/* Color Editor Panel */}
      {showColorEditor && (
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
          z-index: 10;
        }
        [data-ready="true"] .sky-clock {
          transition: top 0.25s ease-out, transform 0.25s ease-out, width 0.25s ease-out, height 0.25s ease-out;
        }
        .sky-clock[data-centered="true"] {
          top: 50%;
          transform: translateX(-50%) translateY(-50%) scale(0.65);
        }
        /* Full width on mobile when not centered */
        @media (max-width: 768px) {
          .sky-clock:not([data-centered="true"]) {
            width: 100vw;
            height: 100vw;
            top: calc(100% - 50vw);
          }
        }

        /* Clock inner */
        .sky-clock-inner {
          position: relative;
          width: 100%;
          height: 100%;
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
          z-index: 10;
        }
        [data-ready="true"] .sky-scroll-text {
          transition: bottom 0.3s ease-out, opacity 0.3s ease-out;
        }
        .sky-scroll-text[data-hidden="true"] {
          bottom: calc(50% + min(5vw, 5vh));
          opacity: 0;
        }
        @media (max-width: 768px) {
          .sky-scroll-text {
            bottom: 47vw;
            width: 60vw;
            height: 12vw;
          }
        }

        /* Time display */
        .sky-time-display {
          font-size: min(4vw, 12px);
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
        @media (max-width: 768px) {
          .sky-scroll-text-content {
            font-size: 12px;
          }
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
    </>
  );
}
