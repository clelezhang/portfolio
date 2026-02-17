import { useState, useEffect, useRef, ReactElement } from 'react';
import { StatefulTooltip, PLACEMENT } from 'baseui/tooltip';
import { Tool } from '../types';
import { COLOR_PALETTES, TOOLTIP_OVERRIDES } from '../constants';
import { DrawIconButton } from './DrawIconButton';
import { ToolbarDiceCube } from './ToolbarDiceCube';
import { ToolbarPencilIcon } from './icons/ToolbarPencilIcon';

// Toggle to disable tooltips globally (set to false to disable)
const TOOLTIPS_ENABLED = false;

// Wrapper that conditionally renders tooltip
function MaybeTooltip({ content, placement, popperOptions, children }: {
  content: string;
  placement: typeof PLACEMENT.top | typeof PLACEMENT.bottom;
  popperOptions: object;
  children: ReactElement;
}) {
  if (!TOOLTIPS_ENABLED) return children;
  return (
    <StatefulTooltip
      content={content}
      placement={placement}
      showArrow
      onMouseEnterDelay={400}
      overrides={TOOLTIP_OVERRIDES}
      popperOptions={popperOptions}
    >
      {children}
    </StatefulTooltip>
  );
}

// Popper options for tooltip positioning
const toolsPopperOptions = {
  modifiers: [{ name: 'offset', options: { offset: [0, 9] } }],
};

const defaultPopperOptions = {
  modifiers: [{ name: 'offset', options: { offset: [0, 21] } }],
};

const STROKE_SIZES = [
  { size: 2, label: 'Thin', icon: 'TSM' },
  { size: 6, label: 'Medium', icon: 'TMD' },
  { size: 12, label: 'Thick', icon: 'TLG' },
] as const;

export type AnimationType = 'slide' | 'slot' | 'confetti' | 'spring';

// Pencil tip color spin CSS hook - cycles through first color of each palette
function usePencilColorSpinCSS(id: string, paletteIndex: number) {
  useEffect(() => {
    const numPalettes = COLOR_PALETTES.length;
    const stops: string[] = [];
    for (let i = 0; i <= numPalettes; i++) {
      const idx = (paletteIndex + i) % numPalettes;
      const color = COLOR_PALETTES[idx][0];
      const pct = Math.round((i / numPalettes) * 100);
      stops.push(`${pct}% { fill: ${color}; }`);
    }
    const css = `
      @keyframes pencilTipSpin-${id} {
        ${stops.join('\n        ')}
      }
    `;
    let styleEl = document.getElementById(`pencil-tip-spin-${id}`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `pencil-tip-spin-${id}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, [id, paletteIndex]);

  return `pencilTipSpin-${id}`;
}

// Dynamic Spring CSS hook - generates keyframes based on parameters
function useDynamicSpringAccumCSS(
  id: string,
  stiffness: number,
  damping: number,
  mass: number,
  velocity: number,
  clickCount: number,
  energyMultiplier: number,
  windUpAmount: number,
  bounceIntensity: number
) {
  useEffect(() => {
    const energyLevel = clickCount * energyMultiplier;
    const amp = (stiffness / 100) * energyLevel * bounceIntensity;
    const windUp = windUpAmount * energyLevel;

    const b1 = 18 * amp;
    const b2 = 12 * amp * 0.7;
    const b3 = 8 * amp * 0.5;
    const b4 = 5 * amp * 0.3;
    const b5 = 3 * amp * 0.15;

    const extraBounces = energyLevel > 2 ? `
        78% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b4}px)); }
        88% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${b5}px)); }
    ` : '';

    const css = `
      @keyframes reelSpringAccum-${id} {
        0% { transform: translateY(0); }
        ${energyLevel > 1 ? `8% { transform: translateY(${windUp}px); }` : ''}
        35% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b1}px)); }
        50% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${b2}px)); }
        65% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b3}px)); }
        ${extraBounces}
        100% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)))); }
      }
    `;

    let styleEl = document.getElementById(`dynamic-spring-accum-${id}`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `dynamic-spring-accum-${id}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, [id, stiffness, damping, mass, velocity, clickCount, energyMultiplier, windUpAmount, bounceIntensity]);

  return `reelSpringAccum-${id}`;
}

// Calculate click brightness based on color luminance
// Three tiers: dark colors get strong darkening, medium moderate, light subtle
function getClickBrightness(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  // Relative luminance (perceptual)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // Three-tier brightness with smooth transitions
  // Dark (0-0.25): 0.75-0.84 (stronger darkening for visibility)
  // Medium (0.25-0.55): 0.84-0.94 (subtle darkening)
  // Light (0.55-1.0): 0.94-0.98 (very subtle, already visible)
  if (luminance < 0.25) {
    // Dark: 0.75 to 0.84 (25-16% darkening)
    return 0.75 + (luminance / 0.25) * 0.09;
  } else if (luminance < 0.55) {
    // Medium: 0.84 to 0.94 (16-6% darkening)
    return 0.84 + ((luminance - 0.25) / 0.30) * 0.10;
  } else {
    // Light: 0.94 to 0.98 (6-2% darkening)
    return 0.94 + ((luminance - 0.55) / 0.45) * 0.04;
  }
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
  showSettings?: boolean;
  setShowSettings?: (value: boolean) => void;
  isLoading: boolean;
  onYourTurn: () => void;
  onClear?: () => void;
  onSave?: () => void;
  animationType: AnimationType;
  slideDuration?: number;
  slideStagger?: number;
  slideBounce?: boolean;
  showSelectTool?: boolean;
  showReactButton?: boolean;
  showDownloadButton?: boolean;
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
  showSettings: _showSettings,
  setShowSettings: _setShowSettings,
  isLoading,
  onYourTurn,
  onClear: _onClear,
  onSave: _onSave,
  animationType,
  slideDuration = 500,
  slideStagger = 30,
  slideBounce: _slideBounce,
  showSelectTool: _showSelectTool,
  showReactButton: _showReactButton,
  showDownloadButton: _showDownloadButton,
}: DrawToolbarProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [targetPaletteIndex, setTargetPaletteIndex] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState(1);
  const [poppingColorIndex, setPoppingColorIndex] = useState<number | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPaletteRef = useRef<number>(paletteIndex);

  // Rapid-click detection for Spring animation
  const lastClickTimeRef = useRef<number>(0);
  const [isRapidClicking, setIsRapidClicking] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Generate unique ID for this toolbar instance
  const instanceId = useRef(`toolbar-${Math.random().toString(36).slice(2, 8)}`).current;

  // Pencil tip color spin animation
  const pencilSpinAnimName = usePencilColorSpinCSS(instanceId, paletteIndex);

  // Dynamic CSS for Spring animation (hardcoded optimal values)
  const springAnimName = useDynamicSpringAccumCSS(
    instanceId,
    100,   // stiffness
    27,    // damping
    1.25,  // mass
    -50,   // velocity
    clickCount,
    1.0,   // energyMultiplier
    14,    // windUp
    1.2    // bounceIntensity
  );

  // Keep pendingPaletteRef in sync when paletteIndex changes externally
  useEffect(() => {
    if (!isRolling) {
      pendingPaletteRef.current = paletteIndex;
    }
  }, [paletteIndex, isRolling]);

  const handleDiceClick = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    // Detect rapid clicking (< 400ms between clicks)
    const isRapid = timeSinceLastClick < 400 && timeSinceLastClick > 0;

    // If already rolling, add to click count for faster spinning
    if (isRolling) {
      setClickCount(prev => Math.min(prev + 1, 5)); // Cap at 5x

      // Advance to next palette for each click
      pendingPaletteRef.current = (pendingPaletteRef.current + 1) % COLOR_PALETTES.length;
      setTargetPaletteIndex(pendingPaletteRef.current);
      setIsRapidClicking(true);
      setAnimationKey(prev => prev + 1); // Force animation restart

      // Clear existing reset timeout and set a new one
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }

      const rapidDuration = animationType === 'spring' ? Math.max(slideDuration * 0.6, 300) : 500;
      resetTimeoutRef.current = setTimeout(() => {
        setPaletteIndex(pendingPaletteRef.current);
        setStrokeColor(COLOR_PALETTES[pendingPaletteRef.current][0]);
        setIsRolling(false);
        setTargetPaletteIndex(null);
        setClickCount(1);
        setIsRapidClicking(false);
      }, rapidDuration);
      return;
    }

    // First click - start rolling
    const nextIndex = (paletteIndex + 1) % COLOR_PALETTES.length;
    pendingPaletteRef.current = nextIndex;
    setTargetPaletteIndex(nextIndex);
    setIsRolling(true);
    setClickCount(1);
    setIsRapidClicking(isRapid);
    setAnimationKey(prev => prev + 1);

    // Change palette early in the animation
    setTimeout(() => {
      setPaletteIndex(pendingPaletteRef.current);
      setStrokeColor(COLOR_PALETTES[pendingPaletteRef.current][0]);
    }, animationType === 'spring' ? slideDuration * 0.3 : 150);

    // Reset after animation completes
    resetTimeoutRef.current = setTimeout(() => {
      setIsRolling(false);
      setTargetPaletteIndex(null);
      setClickCount(1);
      setIsRapidClicking(false);
    }, slideDuration + 50);
  };

  return (
    <div className="draw-toolbar">
      {/* Comment button - separate from main toolbar */}
      <div className="draw-toolbar-comment">
        <MaybeTooltip content="Comment" placement={PLACEMENT.top} popperOptions={defaultPopperOptions}>
          <button
            onClick={() => setTool('comment')}
            className={`draw-comment-btn ${tool === 'comment' ? 'draw-comment-btn--active' : ''}`}
          >
            <img src="/draw/TCOMMENT.svg" alt="" draggable={false} />
          </button>
        </MaybeTooltip>
      </div>

      {/* Main tools toolbar */}
      <div className="draw-toolbar-center">

        {/* Drawing tools */}
        <div className="draw-tools-container">
          {/* Pencil - uses dynamic color */}
          <MaybeTooltip content="Pencil" placement={PLACEMENT.top} popperOptions={toolsPopperOptions}>
            <button onClick={() => { setTool('draw'); setAsciiStroke(false); }} className="draw-tool-btn">
              <ToolbarPencilIcon
                color={strokeColor}
                className={`draw-tool-icon ${tool === 'draw' && !asciiStroke ? 'draw-tool-icon--selected' : ''}`}
                style={{ bottom: tool === 'draw' && !asciiStroke ? '-2px' : '-20px' }}
                tipAnimation={isRolling ? `${pencilSpinAnimName} ${slideDuration}ms linear forwards` : undefined}
              />
            </button>
          </MaybeTooltip>
          {/* ASCII and Eraser */}
          {[
            { id: 'ascii', label: 'ASCII art', icon: 'TASCII', isSelected: tool === 'draw' && asciiStroke, onClick: () => { setTool('draw'); setAsciiStroke(true); } },
            { id: 'eraser', label: 'Eraser', icon: 'TERASER', isSelected: tool === 'erase', onClick: () => setTool('erase') },
          ].map(({ id, label, icon, isSelected, onClick }) => (
            <MaybeTooltip key={id} content={label} placement={PLACEMENT.top} popperOptions={toolsPopperOptions}>
              <button onClick={onClick} className="draw-tool-btn">
                <img
                  src={`/draw/${icon}.svg`}
                  alt=""
                  draggable={false}
                  className={`draw-tool-icon ${isSelected ? 'draw-tool-icon--selected' : ''}`}
                  style={{ bottom: isSelected ? '-2px' : '-20px' }}
                />
              </button>
            </MaybeTooltip>
          ))}
        </div>

        {/* Colors and stroke sizes section */}
        <div className="draw-colors-section">
          {/* Color palette */}
          <div className={`draw-color-palette ${isRolling && animationType !== 'spring' ? `draw-palette-${animationType}` : ''}`}>
            {COLOR_PALETTES[paletteIndex].map((color, index) => {
              const targetIdx = targetPaletteIndex ?? paletteIndex;
              const targetColor = COLOR_PALETTES[targetIdx][index];
              const nextIdx = (targetIdx + 1) % COLOR_PALETTES.length;
              const nextColor = COLOR_PALETTES[nextIdx][index];
              const numPalettes = COLOR_PALETTES.length;

              // Build reel colors based on animation type
              let reelColors: string[];
              let reelClass = '';

              if (!isRolling || targetPaletteIndex === null) {
                reelColors = [color];
              } else if (animationType === 'spring') {
                // Spring: show palettes cycling to target with buffer for overshoot
                reelColors = [];
                for (let p = 0; p < numPalettes; p++) {
                  reelColors.push(COLOR_PALETTES[(paletteIndex + p) % numPalettes][index]);
                }
                reelColors.push(targetColor);
                // Add buffer colors for overshoot visibility
                const nextPalette1 = (targetIdx + 1) % numPalettes;
                const nextPalette2 = (targetIdx + 2) % numPalettes;
                reelColors.push(COLOR_PALETTES[nextPalette1][index]);
                reelColors.push(COLOR_PALETTES[nextPalette2][index]);
                reelClass = 'draw-reel-spring';
              } else if (animationType === 'slide') {
                reelColors = [nextColor, targetColor, color];
                reelClass = 'draw-reel-slide-bounce';
              } else {
                reelColors = [color];
              }

              return (
                <button
                  key={`${paletteIndex}-${index}`}
                  onClick={() => {
                    setStrokeColor(color);
                    setPoppingColorIndex(index);
                    setTimeout(() => setPoppingColorIndex(null), 250);
                  }}
                  className={`draw-color-btn ${strokeColor === color ? 'draw-color-btn--selected' : ''} ${poppingColorIndex === index ? 'draw-color-btn--pop' : ''}`}
                  style={{ animationDelay: isRolling ? `${index * slideStagger}ms` : '0ms' }}
                  aria-label={`Color ${color}`}
                >
                  <div
                    key={`reel-${index}-${animationKey}`}
                    className={`draw-color-reel ${isRolling ? reelClass : ''}`}
                    style={{
                      '--slide-duration': `${slideDuration}ms`,
                      '--reel-items': reelColors.length,
                      '--reel-duration': `${slideDuration}ms`,
                      '--click-brightness': getClickBrightness(color),
                      // Spring animation styles
                      ...(isRolling && animationType === 'spring' ? {
                        animationName: springAnimName,
                        animationDuration: isRapidClicking ? `${Math.max(slideDuration * 0.6, 300)}ms` : `${slideDuration}ms`,
                        animationTimingFunction: 'cubic-bezier(0.2, 0, 0.2, 1)',
                        animationFillMode: 'forwards',
                      } : {}),
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

            {/* Dice button inside palette */}
            <MaybeTooltip content="Change palette" placement={PLACEMENT.top} popperOptions={defaultPopperOptions}>
              <button
                onClick={handleDiceClick}
                className="draw-color-btn draw-color-btn--dice"
              >
                <ToolbarDiceCube
                  isAnimating={isRolling}
                  finalFace={(targetPaletteIndex ?? paletteIndex) % 6}
                  clickCount={clickCount}
                />
              </button>
            </MaybeTooltip>
          </div>

          {/* Stroke sizes */}
          {STROKE_SIZES.map(({ size, label, icon }) => (
            <DrawIconButton
              key={size}
              icon={icon}
              onClick={() => setStrokeSize(size)}
              tooltip={label}
              isActive={strokeSize === size}
              size="sm"
            />
          ))}
        </div>
      </div>

      {/* Hidden Claude turn button - triggered programmatically or by keyboard */}
      <button
        onClick={onYourTurn}
        disabled={isLoading}
        className="sr-only"
        aria-label="Claude's turn"
      />
    </div>
  );
}
