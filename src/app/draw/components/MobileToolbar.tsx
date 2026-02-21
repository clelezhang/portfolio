import { useState, useCallback } from 'react';
import { Tool } from '../types';
import { COLOR_PALETTES } from '../constants';
import { ToolbarPencilIcon } from './icons/toolbar-pencil-icon';
import { ToolbarDiceCube } from './ToolbarDiceCube';

const STROKE_SIZES = [
  { size: 2, label: 'Thin', icon: 'tool-sm' },
  { size: 6, label: 'Medium', icon: 'tool-md' },
  { size: 12, label: 'Thick', icon: 'tool-lg' },
] as const;

export type MobileToolbarMode = 'tools' | 'options';

interface MobileToolbarProps {
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
  mode: MobileToolbarMode;
  setMode: (mode: MobileToolbarMode) => void;
  onCommentOpen: () => void;
}

export function MobileToolbar({
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
  mode,
  setMode,
  onCommentOpen,
}: MobileToolbarProps) {
  const currentPalette = COLOR_PALETTES[paletteIndex];

  // Dice animation state
  const [isRolling, setIsRolling] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [targetPaletteIndex, setTargetPaletteIndex] = useState(paletteIndex);

  const handleToolTap = (targetTool: Tool, isAscii: boolean) => {
    const isAlreadySelected =
      (targetTool === 'draw' && tool === 'draw' && asciiStroke === isAscii) ||
      (targetTool === 'erase' && tool === 'erase');

    if (isAlreadySelected) {
      setMode(mode === 'options' ? 'tools' : 'options');
    } else {
      setTool(targetTool);
      if (targetTool === 'draw') setAsciiStroke(isAscii);
    }
  };

  const handleDiceClick = useCallback(() => {
    const nextIndex = (paletteIndex + 1) % COLOR_PALETTES.length;
    setTargetPaletteIndex(nextIndex);
    setClickCount(prev => Math.min(prev + 1, 5));
    setIsRolling(true);
    setPaletteIndex(nextIndex);
    setStrokeColor(COLOR_PALETTES[nextIndex][0]);

    setTimeout(() => {
      setIsRolling(false);
      setClickCount(0);
    }, 500);
  }, [paletteIndex, setPaletteIndex, setStrokeColor]);

  const isPencilSelected = tool === 'draw' && !asciiStroke;
  const isAsciiSelected = tool === 'draw' && asciiStroke;
  const isEraserSelected = tool === 'erase';

  return (
    <>
      {/* ========== TOOLS MODE ========== */}
      {mode === 'tools' && (
        <div className="mobile-toolbar">
          {/* Left: Comment button — no bg/border, just blur */}
          <button
            className="mobile-toolbar-comment"
            onClick={onCommentOpen}
            aria-label="Comments"
          >
            <img src="/draw/mobile-comment.svg" alt="" draggable={false} width={40} height={40} />
          </button>

          {/* Center: Tool pill — clips bottom, allows top protrusion */}
          <div className="mobile-toolbar-center">
            <div className="mobile-toolbar-tray">
              {/* Pencil — 40×72 SVG */}
              <button
                className="mobile-tool-btn"
                onClick={() => handleToolTap('draw', false)}
              >
                <ToolbarPencilIcon
                  color={strokeColor}
                  className={`mobile-tool-icon ${isPencilSelected ? 'mobile-tool-icon--selected' : ''}`}
                  style={{ bottom: isPencilSelected ? '-2px' : '-20px' }}
                  isRolling={false}
                  slideDuration={0}
                  tipColors={[strokeColor]}
                />
              </button>
              {/* ASCII — 40×72 SVG */}
              <button
                className="mobile-tool-btn"
                onClick={() => handleToolTap('draw', true)}
              >
                <img
                  src="/draw/tool-ascii.svg"
                  alt=""
                  width={40}
                  height={72}
                  draggable={false}
                  className={`mobile-tool-icon ${isAsciiSelected ? 'mobile-tool-icon--selected' : ''}`}
                  style={{ bottom: isAsciiSelected ? '-2px' : '-20px' }}
                />
              </button>
              {/* Eraser — 40×72 SVG */}
              <button
                className="mobile-tool-btn"
                onClick={() => handleToolTap('erase', false)}
              >
                <img
                  src="/draw/tool-eraser.svg"
                  alt=""
                  width={40}
                  height={72}
                  draggable={false}
                  className={`mobile-tool-icon ${isEraserSelected ? 'mobile-tool-icon--selected' : ''}`}
                  style={{ bottom: isEraserSelected ? '-2px' : '-20px' }}
                />
              </button>
            </div>
          </div>

          {/* Right: Style button — blur bg + inset color */}
          <button
            className="mobile-toolbar-style"
            onClick={() => setMode('options')}
            aria-label="Pen style options"
          >
            <span
              className="mobile-toolbar-style-color"
              style={{ backgroundColor: strokeColor }}
            />
          </button>
        </div>
      )}

      {/* ========== OPTIONS MODE ========== */}
      {mode === 'options' && (
        <div className="mobile-options-panel">
          {/* Dice button — separate, same 3D animation as desktop */}
          <button
            className="mobile-dice-btn"
            onClick={handleDiceClick}
            aria-label="Change palette"
          >
            <ToolbarDiceCube
              isAnimating={isRolling}
              finalFace={targetPaletteIndex % 6}
              clickCount={clickCount}
            />
          </button>

          {/* Color strip — floating, rounded */}
          <div className="mobile-color-strip">
            {currentPalette.map((color, index) => (
              <button
                key={`${paletteIndex}-${index}`}
                className={`mobile-color-swatch ${strokeColor === color ? 'mobile-color-swatch--selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setStrokeColor(color)}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>

          {/* Pen sizes + close — extends from X button */}
          <div className="mobile-options-bar">
            {STROKE_SIZES.map(({ size, icon }) => (
              <button
                key={size}
                className={`mobile-options-size ${strokeSize === size ? 'mobile-options-size--active' : ''}`}
                onClick={() => setStrokeSize(size)}
              >
                <img src={`/draw/${icon}.svg`} alt="" width={28} height={28} draggable={false} />
              </button>
            ))}
            <button
              className="mobile-options-close"
              onClick={() => setMode('tools')}
              aria-label="Close options"
            >
              <img src="/draw/mobile-x.svg" alt="" draggable={false} width={40} height={40} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
