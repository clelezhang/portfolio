'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';

// Sky color palettes for different times of day
// colors: [zenith, upper-mid, lower-mid, horizon]
// stops: percentage positions for each color
// KEY INSIGHT:
// - Sunrise/sunset: stops spread WIDE (15, 40) - colors fill whole sky
// - Midday: stops COMPRESSED near horizon (70, 95) - uniform sky
// - Night: stops COMPRESSED (75, 95) - uniform darkness
const skyPalettes = [
  // 0:00 - Midnight (uniform dark - almost no banding)
  { colors: ['#0a0a1a', '#0c0c1e', '#0e0e22', '#101026'], stops: [0, 75, 95, 100], time: '12am' },
  // 1:00
  { colors: ['#0a0a1a', '#0c0c1e', '#0e0e22', '#101026'], stops: [0, 75, 95, 100], time: '1am' },
  // 2:00
  { colors: ['#0a0a1a', '#0c0c1e', '#0e0e22', '#101026'], stops: [0, 75, 95, 100], time: '2am' },
  // 3:00
  { colors: ['#0a0a1a', '#0c0c1e', '#0e0e22', '#101026'], stops: [0, 75, 95, 100], time: '3am' },
  // 4:00 - First hint of light (horizon only starts glowing)
  { colors: ['#0a0a1a', '#0e0e24', '#181830', '#282848'], stops: [0, 65, 90, 100], time: '4am' },
  // 5:00 - Pre-dawn (glow spreading up slightly)
  { colors: ['#0c0c20', '#1a1a3a', '#3a2850', '#604060'], stops: [0, 50, 80, 100], time: '5am' },
  // 6:00 - Dawn (DRAMATIC - colors spreading across sky)
  { colors: ['#1a2848', '#4a3868', '#b86850', '#ff9060'], stops: [0, 25, 55, 100], time: '6am' },
  // 7:00 - Sunrise (PEAK DRAMA - maximum spread)
  { colors: ['#3868a8', '#6878b0', '#e8a070', '#ffcc80'], stops: [0, 15, 45, 100], time: '7am' },
  // 8:00 - Early morning (colors starting to compress)
  { colors: ['#4888c8', '#68a0d8', '#a8c8e8', '#d8e8f8'], stops: [0, 30, 60, 100], time: '8am' },
  // 9:00 - Morning (flattening out)
  { colors: ['#4080c0', '#58a0d8', '#80c0e8', '#a8d8f8'], stops: [0, 45, 75, 100], time: '9am' },
  // 10:00 - Late morning (becoming uniform)
  { colors: ['#3878b8', '#4898d0', '#68b8e8', '#90d0f8'], stops: [0, 55, 85, 100], time: '10am' },
  // 11:00 - Near noon (very uniform)
  { colors: ['#3070b0', '#4090c8', '#60b0e0', '#80c8f0'], stops: [0, 65, 90, 100], time: '11am' },
  // 12:00 - Noon (MOST UNIFORM - minimal visible banding)
  { colors: ['#2868a8', '#3888c0', '#58a8d8', '#78c0e8'], stops: [0, 70, 95, 100], time: '12pm' },
  // 13:00 - Early afternoon (still uniform)
  { colors: ['#2868a8', '#3888c0', '#58a8d8', '#78c0e8'], stops: [0, 70, 95, 100], time: '1pm' },
  // 14:00 - Afternoon
  { colors: ['#3070b0', '#4090c8', '#60b0e0', '#80c8f0'], stops: [0, 65, 90, 100], time: '2pm' },
  // 15:00 - Mid afternoon (starting to expand)
  { colors: ['#3878b8', '#5098c8', '#78b8d8', '#a0d0e0'], stops: [0, 55, 85, 100], time: '3pm' },
  // 16:00 - Late afternoon (warming, expanding)
  { colors: ['#4070a0', '#6088b0', '#98a8c0', '#c8c8c8'], stops: [0, 45, 75, 100], time: '4pm' },
  // 17:00 - Golden hour (spreading out)
  { colors: ['#4878a0', '#7088a8', '#c8a080', '#f0c890'], stops: [0, 30, 60, 100], time: '5pm' },
  // 18:00 - Sunset (DRAMATIC - wide spread)
  { colors: ['#3858a0', '#7860a0', '#d87850', '#ff8848'], stops: [0, 20, 50, 100], time: '6pm' },
  // 19:00 - Dusk (PEAK DRAMA - maximum spread)
  { colors: ['#202850', '#483868', '#a85858', '#f07048'], stops: [0, 15, 45, 100], time: '7pm' },
  // 20:00 - Twilight (collapsing)
  { colors: ['#181838', '#303050', '#504058', '#704860'], stops: [0, 35, 65, 100], time: '8pm' },
  // 21:00 - Late twilight (compressing)
  { colors: ['#101028', '#1c1c3c', '#2c2840', '#3c3048'], stops: [0, 55, 85, 100], time: '9pm' },
  // 22:00 - Night (becoming uniform)
  { colors: ['#0c0c1c', '#101028', '#181830', '#202038'], stops: [0, 65, 90, 100], time: '10pm' },
  // 23:00 - Near midnight (very uniform)
  { colors: ['#0a0a1a', '#0c0c1e', '#101024', '#14142c'], stops: [0, 70, 95, 100], time: '11pm' },
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
  // Grain
  grainOpacity: number;
  grainSize: number;
  grainBlendMode: BlendMode;
  grainFrequency: number;
  grainAnimate: boolean;
  // Gradient shape
  ellipseWidth: number;
  ellipseHeight: number;
  horizonY: number;
  // Color stop adjustments (offset from palette values)
  stop1Offset: number;
  stop2Offset: number;
  stop3Offset: number;
}

const blendModes: BlendMode[] = ['normal', 'multiply', 'overlay', 'soft-light', 'hard-light', 'difference', 'exclusion', 'luminosity'];

const defaultSettings: SkySettings = {
  grainOpacity: 0.15,
  grainSize: 200,
  grainBlendMode: 'overlay',
  grainFrequency: 0.7,
  grainAnimate: true,
  ellipseWidth: 150,
  ellipseHeight: 100,
  horizonY: 120,
  stop1Offset: 0,
  stop2Offset: 0,
  stop3Offset: 0,
};

export default function SkyClockPage() {
  // Use cumulative time value instead of scroll progress (0-1)
  const [timeValue, setTimeValue] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<SkySettings>(defaultSettings);

  const lastTouchY = useRef(0);

  // Handle wheel events for infinite scrolling
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    // Normalize delta and convert to time change
    // One full scroll through should be about 24 hours
    const delta = e.deltaY / 5000;
    setTimeValue(prev => prev + delta);
  }, []);

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: TouchEvent) => {
    lastTouchY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const currentY = e.touches[0].clientY;
    const delta = (lastTouchY.current - currentY) / 2000;
    lastTouchY.current = currentY;
    setTimeValue(prev => prev + delta);
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
  const currentHourIndex = Math.floor(exactHour) % 24;
  const nextHourIndex = (currentHourIndex + 1) % 24;
  const hourProgress = exactHour - Math.floor(exactHour);

  const currentPalette = skyPalettes[currentHourIndex];
  const nextPalette = skyPalettes[nextHourIndex];

  const interpolatedColors = useMemo(() =>
    interpolatePalette(currentPalette.colors, nextPalette.colors, hourProgress),
    [currentPalette.colors, nextPalette.colors, hourProgress]
  );

  const interpolatedStops = useMemo(() =>
    interpolateStops(currentPalette.stops, nextPalette.stops, hourProgress),
    [currentPalette.stops, nextPalette.stops, hourProgress]
  );

  // Rotation: continuous based on time value
  const rotation = timeValue * 360;

  // Current time display
  const hours = Math.floor(exactHour) % 12 || 12;
  const minutes = Math.floor((exactHour % 1) * 60);
  const ampm = exactHour >= 12 ? 'pm' : 'am';
  const timeDisplay = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

  // Determine if it's night time for stars
  const isNight = exactHour < 6 || exactHour > 19;
  const isDusk = (exactHour >= 5 && exactHour < 6) || (exactHour > 18 && exactHour <= 19);

  // Stars with deterministic positions
  const stars = useMemo(() =>
    [...Array(150)].map((_, i) => ({
      width: ((i * 7) % 20) / 10 + 0.5,
      left: (i * 17 + 7) % 100,
      top: (i * 23 + 11) % 100,
      opacity: ((i * 13) % 70) / 100 + 0.3,
      duration: 2 + ((i * 11) % 30) / 10,
      delay: ((i * 19) % 20) / 10,
    })),
    []
  );

  const updateSetting = (key: keyof SkySettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Apply stop offsets
  const adjustedStops = [
    interpolatedStops[0],
    Math.max(0, Math.min(100, interpolatedStops[1] + settings.stop1Offset)),
    Math.max(0, Math.min(100, interpolatedStops[2] + settings.stop2Offset)),
    Math.max(0, Math.min(100, interpolatedStops[3] + settings.stop3Offset)),
  ];

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Radial Gradient Sky Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse ${settings.ellipseWidth}% ${settings.ellipseHeight}% at 50% ${settings.horizonY}%,
            ${interpolatedColors[3]} ${adjustedStops[0]}%,
            ${interpolatedColors[2]} ${adjustedStops[1]}%,
            ${interpolatedColors[1]} ${adjustedStops[2]}%,
            ${interpolatedColors[0]} ${adjustedStops[3]}%
          )`,
        }}
      />

      {/* Grain overlay - seed changes on scroll for shimmer effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: settings.grainOpacity,
          mixBlendMode: settings.grainBlendMode,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${settings.grainFrequency}' numOctaves='4' stitchTiles='stitch' seed='${settings.grainAnimate ? Math.floor(Math.abs(timeValue) * 50) % 100 : 0}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${settings.grainSize}px ${settings.grainSize}px`,
        }}
      />

      {/* Stars overlay - visible at night */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          opacity: isNight ? 0.9 : isDusk ? 0.3 : 0,
        }}
      >
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: star.width,
              height: star.width,
              left: `${star.left}%`,
              top: `${star.top}%`,
              opacity: star.opacity,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Fixed clock knob in center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="relative"
          style={{
            width: 'min(80vw, 80vh)',
            height: 'min(80vw, 80vh)',
          }}
        >
          {/* Clock face with dashes */}
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {/* Hour marks and labels */}
            {[...Array(24)].map((_, i) => {
              const angle = (i / 24) * 360 - 90;
              const radian = (angle * Math.PI) / 180;
              const isMainHour = i % 6 === 0;
              const isQuarterHour = i % 3 === 0;

              const outerRadius = 190;
              const innerRadius = isMainHour ? 145 : isQuarterHour ? 158 : 172;
              const labelRadius = 125;

              // Round to 2 decimal places to avoid hydration mismatch
              const x1 = Math.round((200 + Math.cos(radian) * innerRadius) * 100) / 100;
              const y1 = Math.round((200 + Math.sin(radian) * innerRadius) * 100) / 100;
              const x2 = Math.round((200 + Math.cos(radian) * outerRadius) * 100) / 100;
              const y2 = Math.round((200 + Math.sin(radian) * outerRadius) * 100) / 100;

              const labelX = Math.round((200 + Math.cos(radian) * labelRadius) * 100) / 100;
              const labelY = Math.round((200 + Math.sin(radian) * labelRadius) * 100) / 100;

              const hourLabel = i === 0 ? '12am' : i === 6 ? '6am' : i === 12 ? '12pm' : i === 18 ? '6pm' : '';

              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeWidth={isMainHour ? 2.5 : isQuarterHour ? 1.5 : 0.75}
                    strokeLinecap="round"
                  />
                  {hourLabel && (
                    <text
                      x={labelX}
                      y={labelY}
                      fill="rgba(255, 255, 255, 0.6)"
                      fontSize="11"
                      fontWeight="300"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        transform: `rotate(${-rotation}deg)`,
                        transformOrigin: `${labelX}px ${labelY}px`,
                        fontFamily: 'var(--font-untitled-sans), system-ui, sans-serif',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {hourLabel}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Minor tick marks */}
            {[...Array(72)].map((_, i) => {
              // Skip positions where hour marks are
              if (i % 3 === 0) return null;

              const angle = (i / 72) * 360 - 90;
              const radian = (angle * Math.PI) / 180;

              const outerRadius = 190;
              const innerRadius = 180;

              // Round to 2 decimal places to avoid hydration mismatch
              const x1 = Math.round((200 + Math.cos(radian) * innerRadius) * 100) / 100;
              const y1 = Math.round((200 + Math.sin(radian) * innerRadius) * 100) / 100;
              const x2 = Math.round((200 + Math.cos(radian) * outerRadius) * 100) / 100;
              const y2 = Math.round((200 + Math.sin(radian) * outerRadius) * 100) / 100;

              return (
                <line
                  key={`m-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth={0.5}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Center dot */}
            <circle
              cx="200"
              cy="200"
              r="3"
              fill="rgba(255, 255, 255, 0.5)"
            />

            {/* Outer ring */}
            <circle
              cx="200"
              cy="200"
              r="195"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="0.75"
            />

            {/* Inner ring */}
            <circle
              cx="200"
              cy="200"
              r="110"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="0.5"
            />
          </svg>

          {/* Fixed time indicator (doesn't rotate) */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ pointerEvents: 'auto' }}
          >
            <div
              className="text-white/80 font-light tracking-widest"
              style={{
                fontSize: 'min(7vw, 56px)',
                fontFamily: 'var(--font-untitled-sans), system-ui, sans-serif',
                textShadow: '0 2px 20px rgba(0,0,0,0.3)',
              }}
            >
              {timeDisplay}
            </div>
            <div
              className="text-white/40 text-xs mt-3 tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-untitled-sans), system-ui, sans-serif' }}
            >
              scroll to change time
            </div>
          </div>
        </div>
      </div>

      {/* Position indicator line at top */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-px bg-white/30"
        style={{
          top: 'calc((100vh - min(80vw, 80vh)) / 2 - 24px)',
          height: '24px',
        }}
      />

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
          className="fixed bottom-20 right-6 w-72 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 z-50 max-h-[70vh] overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="text-white/80 text-sm font-medium mb-4 tracking-wide">Sky Settings</div>

          {/* Grain Section */}
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Grain</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Opacity</span>
              <span>{(settings.grainOpacity * 100).toFixed(1)}%</span>
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

          <div className="mb-4 flex items-center justify-between">
            <span className="text-white/50 text-xs">Animate on scroll</span>
            <button
              onClick={() => setSettings(prev => ({ ...prev, grainAnimate: !prev.grainAnimate }))}
              className={`w-10 h-5 rounded-full transition-colors ${settings.grainAnimate ? 'bg-white/30' : 'bg-white/10'}`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.grainAnimate ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {/* Gradient Section */}
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2 mt-4">Gradient Shape</div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Ellipse Width</span>
              <span>{settings.ellipseWidth}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="300"
              step="5"
              value={settings.ellipseWidth}
              onChange={(e) => updateSetting('ellipseWidth', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Ellipse Height</span>
              <span>{settings.ellipseHeight}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              value={settings.ellipseHeight}
              onChange={(e) => updateSetting('ellipseHeight', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-white/50 text-xs mb-1.5">
              <span>Horizon Position</span>
              <span>{settings.horizonY}%</span>
            </div>
            <input
              type="range"
              min="80"
              max="200"
              step="5"
              value={settings.horizonY}
              onChange={(e) => updateSetting('horizonY', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          {/* Current Palette Section */}
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2 mt-4">Current Palette</div>

          {/* Color swatches with stop positions */}
          <div className="mb-3 space-y-2">
            {[
              { label: 'Zenith', color: interpolatedColors[0], stop: adjustedStops[3], baseStop: interpolatedStops[3] },
              { label: 'Upper Mid', color: interpolatedColors[1], stop: adjustedStops[2], baseStop: interpolatedStops[2], offsetKey: 'stop2Offset' as const },
              { label: 'Lower Mid', color: interpolatedColors[2], stop: adjustedStops[1], baseStop: interpolatedStops[1], offsetKey: 'stop1Offset' as const },
              { label: 'Horizon', color: interpolatedColors[3], stop: adjustedStops[0], baseStop: interpolatedStops[0] },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-white/50 text-xs">
                    <span>{item.label}</span>
                    <span className="font-mono">{item.stop}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Color Stop Adjustments */}
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2 mt-4">Stop Adjustments</div>

          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-3 h-3 rounded-sm border border-white/20 flex-shrink-0"
                style={{ backgroundColor: interpolatedColors[1] }}
              />
              <div className="flex justify-between flex-1 text-white/50 text-xs">
                <span>Upper Mid</span>
                <span className="font-mono">{interpolatedStops[2]}{settings.stop2Offset !== 0 ? ` → ${adjustedStops[2]}` : ''}%</span>
              </div>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={settings.stop2Offset}
              onChange={(e) => updateSetting('stop2Offset', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-3 h-3 rounded-sm border border-white/20 flex-shrink-0"
                style={{ backgroundColor: interpolatedColors[2] }}
              />
              <div className="flex justify-between flex-1 text-white/50 text-xs">
                <span>Lower Mid</span>
                <span className="font-mono">{interpolatedStops[1]}{settings.stop1Offset !== 0 ? ` → ${adjustedStops[1]}` : ''}%</span>
              </div>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={settings.stop1Offset}
              onChange={(e) => updateSetting('stop1Offset', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-3 h-3 rounded-sm border border-white/20 flex-shrink-0"
                style={{ backgroundColor: interpolatedColors[3] }}
              />
              <div className="flex justify-between flex-1 text-white/50 text-xs">
                <span>Horizon</span>
                <span className="font-mono">{interpolatedStops[3]}{settings.stop3Offset !== 0 ? ` → ${adjustedStops[3]}` : ''}%</span>
              </div>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={settings.stop3Offset}
              onChange={(e) => updateSetting('stop3Offset', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
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

      {/* Slider styles */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
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
