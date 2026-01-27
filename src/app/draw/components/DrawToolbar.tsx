import { useState, useEffect } from 'react';
import { Tool } from '../types';
import { COLOR_PALETTES } from '../constants';
import { PencilToolIcon } from './icons/PencilToolIcon';

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
          {/* Pencil tool */}
          <button
            onClick={() => { setTool('draw'); setAsciiStroke(false); }}
            className="draw-tool-btn draw-tool-btn--pencil"
            title="Pencil (SVG/shapes)"
          >
            <PencilToolIcon
              color={strokeColor}
              isSelected={tool === 'draw' && !asciiStroke}
            />
          </button>
          {/* ASCII tool */}
          <button
            onClick={() => { setTool('draw'); setAsciiStroke(true); }}
            className="draw-tool-btn draw-tool-btn--ascii"
            title="ASCII art"
          >
            <img
              src="/draw/cursor.svg"
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
              src="/draw/eraser.svg"
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
