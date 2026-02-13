import { useState, useEffect, useRef, ReactElement } from 'react';
import { StatefulTooltip, PLACEMENT } from 'baseui/tooltip';
import { Tool } from '../types';
import { COLOR_PALETTES, TOOLTIP_OVERRIDES } from '../constants';
import { DrawIconButton } from './DrawIconButton';
import { ToolbarDiceCube } from './ToolbarDiceCube';
import { ToolbarPencilIcon } from './icons/ToolbarPencilIcon';

// Toggle to disable tooltips globally (set to false to disable)
const TOOLTIPS_ENABLED = true;

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

export type AnimationType = 'slide' | 'slot' | 'confetti';

// Calculate click brightness based on color luminance
// Light colors get subtle darkening (0.98), dark colors get more noticeable darkening (0.9)
function getClickBrightness(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  // Relative luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  // Dark (luminance=0): 0.9, Light (luminance=1): 0.99
  return 0.9 + luminance * 0.09;
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

  // Keep pendingPaletteRef in sync when paletteIndex changes externally
  useEffect(() => {
    if (!isRolling) {
      pendingPaletteRef.current = paletteIndex;
    }
  }, [paletteIndex, isRolling]);

  const handleDiceClick = () => {
    // If already rolling, add to click count for faster spinning
    if (isRolling) {
      setClickCount(prev => Math.min(prev + 1, 5)); // Cap at 5x

      // Advance to next palette for each click
      pendingPaletteRef.current = (pendingPaletteRef.current + 1) % COLOR_PALETTES.length;
      setTargetPaletteIndex(pendingPaletteRef.current);

      // Clear existing reset timeout and set a new one
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        setPaletteIndex(pendingPaletteRef.current);
        setStrokeColor(COLOR_PALETTES[pendingPaletteRef.current][0]);
        setIsRolling(false);
        setTargetPaletteIndex(null);
        setClickCount(1);
      }, 500);
      return;
    }

    // First click - start rolling
    const nextIndex = (paletteIndex + 1) % COLOR_PALETTES.length;
    pendingPaletteRef.current = nextIndex;
    setTargetPaletteIndex(nextIndex);
    setIsRolling(true);
    setClickCount(1);

    // 3D cube animation timing: 450ms duration, bouncy easing
    // Change palette early in the animation while cube is mid-tumble
    setTimeout(() => {
      setPaletteIndex(pendingPaletteRef.current);
      setStrokeColor(COLOR_PALETTES[pendingPaletteRef.current][0]);
    }, 150);

    // Reset after animation completes (450ms + small buffer)
    resetTimeoutRef.current = setTimeout(() => {
      setIsRolling(false);
      setTargetPaletteIndex(null);
      setClickCount(1);
    }, 500);
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
          <div className={`draw-color-palette ${isRolling ? `draw-palette-${animationType}` : ''}`}>
            {COLOR_PALETTES[paletteIndex].map((color, index) => {
              const targetIdx = targetPaletteIndex ?? paletteIndex;
              const targetColor = COLOR_PALETTES[targetIdx][index];
              const nextIdx = (targetIdx + 1) % COLOR_PALETTES.length;
              const nextColor = COLOR_PALETTES[nextIdx][index];
              const reelColors = isRolling && targetPaletteIndex !== null && animationType === 'slide'
                ? [nextColor, targetColor, color]
                : [color];

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
                    className={`draw-color-reel ${isRolling && animationType === 'slide' ? 'draw-reel-slide-bounce' : ''}`}
                    style={{
                      '--slide-duration': `${slideDuration}ms`,
                      '--click-brightness': getClickBrightness(color),
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
