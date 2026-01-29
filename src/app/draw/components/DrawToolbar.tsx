import { useState, useEffect } from 'react';
import { Tool } from '../types';
import { COLOR_PALETTES } from '../constants';

export type AnimationType = 'slide' | 'slot' | 'confetti';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  velocity: number;
  spin: number;
}

interface DrawToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  asciiStroke: boolean;
  setAsciiStroke: (value: boolean) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeSize: number;
  setStrokeSize: (size: number) => void;
  paletteIndex: number;
  setPaletteIndex: (index: number) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  isLoading: boolean;
  onYourTurn: () => void;
  onClear: () => void;
  onSave: () => void;
  animationType: AnimationType;
  // Slide animation tuning
  slideDuration?: number;
  slideStagger?: number;
  slideBounce?: boolean;
}

export function DrawToolbar({
  tool,
  setTool,
  asciiStroke,
  setAsciiStroke,
  strokeColor,
  setStrokeColor,
  strokeSize,
  setStrokeSize,
  paletteIndex,
  setPaletteIndex,
  showSettings,
  setShowSettings,
  isLoading,
  onYourTurn,
  onClear,
  onSave,
  animationType,
  slideDuration = 500,
  slideStagger = 30,
  slideBounce = true,
}: DrawToolbarProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [targetPaletteIndex, setTargetPaletteIndex] = useState<number | null>(null);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);

  // Clean up confetti after animation
  useEffect(() => {
    if (confettiParticles.length > 0) {
      const timer = setTimeout(() => setConfettiParticles([]), 800);
      return () => clearTimeout(timer);
    }
  }, [confettiParticles]);

  const handleDiceClick = () => {
    if (isRolling) return;

    const nextIndex = (paletteIndex + 1) % COLOR_PALETTES.length;
    setTargetPaletteIndex(nextIndex);
    setIsRolling(true);

    // Generate confetti particles for confetti animation
    if (animationType === 'confetti') {
      const newParticles: ConfettiParticle[] = [];
      const colors = COLOR_PALETTES[nextIndex];
      for (let i = 0; i < 20; i++) {
        newParticles.push({
          id: i,
          x: 0,
          y: 0,
          color: colors[Math.floor(Math.random() * colors.length)],
          angle: Math.random() * 360,
          velocity: 2 + Math.random() * 4,
          spin: Math.random() * 720 - 360,
        });
      }
      setConfettiParticles(newParticles);
    }

    // Timing varies by animation type
    const changeDelay = animationType === 'slot' ? 200 : 150;
    const resetDelay = animationType === 'slot' ? 800 : animationType === 'confetti' ? 600 : 500;

    setTimeout(() => {
      setPaletteIndex(nextIndex);
      setStrokeColor(COLOR_PALETTES[nextIndex][0]);
    }, changeDelay);

    setTimeout(() => {
      setIsRolling(false);
      setTargetPaletteIndex(null);
    }, resetDelay);
  };

  return (
    <div className="draw-toolbar">
      {/* Left section: profiles + social */}
      <div className="draw-toolbar-section">
        <div className="draw-icon-btn draw-icon-btn--no-hover">
          <img src="/draw/user.svg" alt="" className="w-6 h-6 draw-img-no-anim draw-user-icon" />
        </div>
        <button
          onClick={onYourTurn}
          disabled={isLoading}
          className="draw-icon-btn disabled:opacity-50"
          title="Claude's turn"
        >
          <img src="/draw/claude.svg" alt="" className="w-6 h-6" />
        </button>
        <div className="draw-divider" />
        <button
          onClick={() => setTool('comment')}
          className={`draw-icon-btn ${tool === 'comment' ? 'draw-icon-btn--active' : ''}`}
          title="Comment"
        >
          <img src="/draw/comment.svg" alt="" className="w-6 h-6" />
        </button>
        <button className="draw-icon-btn" title="React">
          <img src="/draw/react.svg" alt="" className="w-6 h-6" />
        </button>
      </div>

      {/* Center section: floating toolbar */}
      <div className="draw-toolbar-center">
        <div className="draw-tools-container">
          {/* Select tool */}
          <button
            onClick={() => setTool('select')}
            className="draw-tool-btn draw-tool-btn--select"
            title="Select & move"
          >
            <img
              src="/draw/select.svg"
              alt=""
              className={`draw-tool-icon draw-tool-icon--select ${tool === 'select' ? 'draw-tool-icon--selected' : ''}`}
              style={{ bottom: tool === 'select' ? '0px' : '-12px' }}
            />
          </button>
          {/* Pencil tool */}
          <button
            onClick={() => { setTool('draw'); setAsciiStroke(false); }}
            className="draw-tool-btn draw-tool-btn--pencil"
            title="Pencil (SVG/shapes)"
          >
            <svg
              width="27"
              height="51"
              viewBox="0 0 27 51"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`draw-tool-icon draw-tool-icon--pencil ${tool === 'draw' && !asciiStroke ? 'draw-tool-icon--selected' : ''}`}
              style={{ bottom: tool === 'draw' && !asciiStroke ? '0px' : '-12px' }}
            >
              {/* Pencil tip - dynamic color */}
              <path d="M12.1262 2.559C12.4469 1.68489 13.6831 1.68489 14.0038 2.55899L16.9737 10.6543H9.15625L12.1262 2.559Z" fill={strokeColor}/>
              <path d="M12.1262 2.559C12.4469 1.68489 13.6831 1.68489 14.0038 2.55899L16.9737 10.6543H9.15625L12.1262 2.559Z" fill="url(#paint0_radial_pencil)" fillOpacity="0.1"/>
              <path d="M12.5957 2.73145C12.756 2.29439 13.3738 2.2944 13.5342 2.73145L16.2578 10.1543H9.87207L12.5957 2.73145Z" stroke="#02061D" strokeOpacity="0.1"/>
              {/* Pencil body */}
              <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="#F3F0ED"/>
              <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint1_linear_pencil)"/>
              <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint2_linear_pencil)" fillOpacity="0.3"/>
              <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint3_linear_pencil)"/>
              <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint4_linear_pencil)" fillOpacity="0.2"/>
              <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint5_linear_pencil)" fillOpacity="0.2"/>
              <path d="M9.48047 9.39758H16.8018C17.0073 9.39769 17.1915 9.52367 17.2666 9.71497L24.7607 28.8331C25.6494 31.1004 26.1055 33.5142 26.1055 35.9493V50.1769H0.5V35.8204C0.500003 33.4668 0.926224 31.1326 1.75781 28.9308L9.0127 9.72083C9.08618 9.52631 9.27253 9.39763 9.48047 9.39758Z" stroke="#0F1931" strokeOpacity="0.1"/>
              <defs>
                <radialGradient id="paint0_radial_pencil" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12.9541 1.8003) rotate(89.8034) scale(13.3769 2.25405)">
                  <stop stopColor="white"/>
                  <stop offset="1"/>
                </radialGradient>
                <linearGradient id="paint1_linear_pencil" x1="13.5537" y1="30.612" x2="13.5537" y2="39.4077" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#E3F5FF" stopOpacity="0"/>
                  <stop offset="1" stopColor="#FBFBFB"/>
                </linearGradient>
                <linearGradient id="paint2_linear_pencil" x1="27.6094" y1="29.879" x2="-1.00398" y2="29.879" gradientUnits="userSpaceOnUse">
                  <stop/>
                  <stop offset="0.245082" stopColor="#666666" stopOpacity="0.75"/>
                  <stop offset="0.294077" stopColor="#666666" stopOpacity="0"/>
                  <stop offset="0.374934" stopColor="#666666" stopOpacity="0.25"/>
                  <stop offset="0.623271" stopColor="#666666" stopOpacity="0.1"/>
                  <stop offset="0.69" stopColor="#666666" stopOpacity="0"/>
                  <stop offset="0.748823" stopColor="#666666" stopOpacity="0.5"/>
                  <stop offset="1"/>
                </linearGradient>
                <linearGradient id="paint3_linear_pencil" x1="13.5537" y1="8.9892" x2="13.5537" y2="41.9731" gradientUnits="userSpaceOnUse">
                  <stop offset="0.01" stopColor="#F4EADE"/>
                  <stop offset="0.650404" stopColor="#F9F1E7" stopOpacity="0.85"/>
                  <stop offset="1" stopColor="white" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="paint4_linear_pencil" x1="10.5418" y1="31.7114" x2="0.516687" y2="28.2785" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B2753F" stopOpacity="0"/>
                  <stop offset="1" stopColor="#B2753F"/>
                </linearGradient>
                <linearGradient id="paint5_linear_pencil" x1="19.5776" y1="28.5963" x2="24.8717" y2="26.9482" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B2753F" stopOpacity="0"/>
                  <stop offset="1" stopColor="#B2753F"/>
                </linearGradient>
              </defs>
            </svg>
          </button>
          {/* ASCII tool */}
          <button
            onClick={() => { setTool('draw'); setAsciiStroke(true); }}
            className="draw-tool-btn draw-tool-btn--ascii"
            title="ASCII art"
          >
            <img
              src="/draw/cursor1.svg"
              alt=""
              className={`draw-tool-icon draw-tool-icon--ascii ${tool === 'draw' && asciiStroke ? 'draw-tool-icon--selected' : ''}`}
              style={{ bottom: tool === 'draw' && asciiStroke ? '6px' : '-8px' }}
            />
          </button>
          {/* Eraser tool */}
          <button
            onClick={() => setTool('erase')}
            className="draw-tool-btn draw-tool-btn--eraser"
            title="Eraser"
          >
            <img
              src="/draw/eraser1.svg"
              alt=""
              className={`draw-tool-icon draw-tool-icon--eraser ${tool === 'erase' ? 'draw-tool-icon--selected' : ''}`}
              style={{ bottom: tool === 'erase' ? '-6px' : '-20px' }}
            />
          </button>
        </div>

        {/* Colors and size section */}
        <div className="draw-colors-section">
          <div className={`draw-color-palette ${isRolling ? `draw-palette-${animationType}` : ''}`}>
            {COLOR_PALETTES[paletteIndex].map((color, index) => {
              // Generate reel colors from multiple palettes for slot/slide effect
              // Use targetPaletteIndex when rolling to keep colors stable during animation
              const targetIdx = targetPaletteIndex ?? paletteIndex;
              const targetColor = COLOR_PALETTES[targetIdx][index];
              // For slide: 3 colors - next, new, current (slides up to show new)
              // For slot: keep multiple colors for spinning effect
              const nextIdx = (targetIdx + 1) % COLOR_PALETTES.length;
              const nextColor = COLOR_PALETTES[nextIdx][index];
              const reelColors = isRolling && targetPaletteIndex !== null && animationType === 'slide'
                ? [nextColor, targetColor, color] // next on top, new in middle, current at bottom
                : isRolling && targetPaletteIndex !== null && animationType === 'slot'
                ? [
                    COLOR_PALETTES[(targetIdx + 3) % COLOR_PALETTES.length][index],
                    COLOR_PALETTES[(targetIdx + 2) % COLOR_PALETTES.length][index],
                    COLOR_PALETTES[(targetIdx + 1) % COLOR_PALETTES.length][index],
                    COLOR_PALETTES[targetIdx === 0 ? COLOR_PALETTES.length - 1 : targetIdx - 1][index],
                    targetColor,
                  ]
                : [color];

              return (
                <button
                  key={`${paletteIndex}-${index}`}
                  onClick={() => setStrokeColor(color)}
                  className={`draw-color-btn ${isRolling && animationType === 'confetti' ? 'draw-color-anim-confetti' : ''}`}
                  style={{ animationDelay: isRolling ? `${index * slideStagger}ms` : '0ms' }}
                  aria-label={`Color ${color}`}
                >
                  <div
                    className={`draw-color-reel ${isRolling && animationType === 'slide' ? (slideBounce ? 'draw-reel-slide-bounce' : 'draw-reel-slide') : ''} ${isRolling && animationType === 'slot' ? 'draw-reel-slot' : ''}`}
                    style={{
                      '--slide-duration': `${slideDuration}ms`,
                      animationDelay: isRolling ? `${index * slideStagger}ms` : '0ms',
                    } as React.CSSProperties}
                  >
                    {reelColors.map((reelColor, ri) => (
                      <div
                        key={ri}
                        className="draw-color-reel-item"
                        style={{ backgroundColor: reelColor }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
            <div className="relative">
              {/* Confetti particles */}
              {confettiParticles.map((particle) => (
                <div
                  key={particle.id}
                  className="draw-confetti-particle"
                  style={{
                    '--angle': `${particle.angle}deg`,
                    '--velocity': particle.velocity,
                    '--spin': `${particle.spin}deg`,
                    backgroundColor: particle.color,
                  } as React.CSSProperties}
                />
              ))}

              <button
                onClick={handleDiceClick}
                className="draw-icon-btn draw-icon-btn--sm"
                style={{ borderRadius: 0 }}
                title="Change palette"
              >
                <img
                  src={`/draw/dice${(paletteIndex % 6) + 1}.svg`}
                  alt=""
                  className={`w-6 h-6 draw-dice ${isRolling ? 'draw-dice-rolling' : ''}`}
                />
              </button>
            </div>
          </div>

          <button
            onClick={() => setStrokeSize(2)}
            className={`draw-icon-btn draw-icon-btn--sm ${strokeSize === 2 ? 'draw-icon-btn--active' : ''}`}
            title="Thin"
          >
            <img src="/draw/thin.svg" alt="" className="w-6 h-6 draw-stroke-icon" />
          </button>
          <button
            onClick={() => setStrokeSize(6)}
            className={`draw-icon-btn draw-icon-btn--sm ${strokeSize === 6 ? 'draw-icon-btn--active' : ''}`}
            title="Medium"
          >
            <img src="/draw/medium.svg" alt="" className="w-6 h-6 draw-stroke-icon" />
          </button>
          <button
            onClick={() => setStrokeSize(12)}
            className={`draw-icon-btn draw-icon-btn--sm ${strokeSize === 12 ? 'draw-icon-btn--active' : ''}`}
            title="Thick"
          >
            <img src="/draw/thick.svg" alt="" className="w-6 h-6 draw-stroke-icon" />
          </button>
        </div>
      </div>

      {/* Right section: actions */}
      <div className="draw-toolbar-section">
        <button onClick={onClear} className="draw-icon-btn" title="Clear canvas">
          <img src="/draw/clear.svg" alt="" className="w-6 h-6" />
        </button>
        <button onClick={onSave} className="draw-icon-btn" title="Save image">
          <img src="/draw/save.svg" alt="" className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`draw-icon-btn ${showSettings ? 'draw-icon-btn--active' : ''}`}
          title="Settings"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
