'use client';

import { useState, useRef } from 'react';
import '../draw.css';
import { COLOR_PALETTES, TOOLTIP_OVERRIDES } from '../constants';
import { ToolbarDiceCube } from '../components/ToolbarDiceCube';
import { DrawIconButton } from '../components/DrawIconButton';
import { BaseUIProvider } from '../../components/StyletronProvider';
import { StatefulTooltip, PLACEMENT } from 'baseui/tooltip';
import { Tool } from '../types';

type AnimationType = 'slide' | 'chaos' | 'glitch' | 'tumble' | 'scatter' | 'spin' | 'bounce' | 'slot';

const STROKE_SIZES = [
  { size: 2, label: 'Thin', icon: 'TSM' },
  { size: 6, label: 'Medium', icon: 'TMD' },
  { size: 12, label: 'Thick', icon: 'TLG' },
] as const;

const toolsPopperOptions = {
  modifiers: [{ name: 'offset', options: { offset: [0, 9] } }],
};

const defaultPopperOptions = {
  modifiers: [{ name: 'offset', options: { offset: [0, 21] } }],
};

function FullToolbarTest({
  title,
  defaultAnimationType,
  defaultDuration,
  defaultStagger,
}: {
  title: string;
  defaultAnimationType: AnimationType;
  defaultDuration: number;
  defaultStagger: number;
}) {
  const [tool, setTool] = useState<Tool>('draw');
  const [asciiStroke, setAsciiStroke] = useState(false);
  const [strokeColor, setStrokeColor] = useState<string>(COLOR_PALETTES[0][0]);
  const [strokeSize, setStrokeSize] = useState(6);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [targetPaletteIndex, setTargetPaletteIndex] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState(1);
  const [duration, setDuration] = useState(defaultDuration);
  const [stagger, setStagger] = useState(defaultStagger);
  const [animationType, setAnimationType] = useState<AnimationType>(defaultAnimationType);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPaletteRef = useRef<number>(paletteIndex);

  const handleDiceClick = () => {
    if (isRolling) {
      setClickCount(prev => Math.min(prev + 1, 5));
      pendingPaletteRef.current = (pendingPaletteRef.current + 1) % COLOR_PALETTES.length;
      setTargetPaletteIndex(pendingPaletteRef.current);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setPaletteIndex(pendingPaletteRef.current);
        setStrokeColor(COLOR_PALETTES[pendingPaletteRef.current][0]);
        setIsRolling(false);
        setTargetPaletteIndex(null);
        setClickCount(1);
      }, duration);
      return;
    }

    const nextIndex = (paletteIndex + 1) % COLOR_PALETTES.length;
    pendingPaletteRef.current = nextIndex;
    setTargetPaletteIndex(nextIndex);
    setIsRolling(true);
    setClickCount(1);

    setTimeout(() => {
      setPaletteIndex(pendingPaletteRef.current);
      setStrokeColor(COLOR_PALETTES[pendingPaletteRef.current][0]);
    }, duration * 0.3);

    timeoutRef.current = setTimeout(() => {
      setIsRolling(false);
      setTargetPaletteIndex(null);
      setClickCount(1);
    }, duration + 50);
  };

  const getPaletteClass = () => {
    if (!isRolling) return '';
    switch (animationType) {
      // These use reel-based animations now, no palette class needed
      case 'slot':
      case 'slide':
      case 'chaos':
      case 'glitch':
      case 'tumble':
      case 'scatter':
      case 'bounce':
        return '';
      // Spin rotates the whole palette container
      case 'spin': return 'draw-palette-spin';
      default: return '';
    }
  };

  // All color animations are now handled by the reel scrolling through multiple palettes
  const getColorClass = () => '';

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, minWidth: 100 }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Type:</span>
            <select
              value={animationType}
              onChange={(e) => setAnimationType(e.target.value as AnimationType)}
              style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #ddd', fontSize: 11 }}
            >
              <option value="slide">Slide</option>
              <option value="chaos">Chaos</option>
              <option value="glitch">Glitch</option>
              <option value="tumble">Tumble</option>
              <option value="scatter">Scatter</option>
              <option value="spin">Spin</option>
              <option value="bounce">Bounce</option>
              <option value="slot">Slot</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Duration:</span>
            <input
              type="range"
              min={200}
              max={1200}
              step={50}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: 60 }}
            />
            <span style={{ width: 40 }}>{duration}ms</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Stagger:</span>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={stagger}
              onChange={(e) => setStagger(Number(e.target.value))}
              style={{ width: 50 }}
            />
            <span style={{ width: 30 }}>{stagger}ms</span>
          </label>
        </div>
      </div>

      {/* Full Toolbar */}
      <div style={{ position: 'relative', height: 80 }}>
        <div className="draw-toolbar">
          {/* Comment button */}
          <div className="draw-toolbar-comment">
            <StatefulTooltip
              content="Comment"
              placement={PLACEMENT.top}
              showArrow
              onMouseEnterDelay={400}
              overrides={TOOLTIP_OVERRIDES}
              popperOptions={defaultPopperOptions}
            >
              <button
                onClick={() => setTool('comment')}
                className={`draw-comment-btn ${tool === 'comment' ? 'draw-comment-btn--active' : ''}`}
              >
                <img src="/draw/TCOMMENT.svg" alt="" />
              </button>
            </StatefulTooltip>
          </div>

          {/* Main tools toolbar */}
          <div className="draw-toolbar-center">
            {/* Drawing tools */}
            <div className="draw-tools-container">
              {[
                { id: 'pencil', label: 'Pencil', icon: 'TPENCIL', isSelected: tool === 'draw' && !asciiStroke, onClick: () => { setTool('draw'); setAsciiStroke(false); } },
                { id: 'ascii', label: 'ASCII art', icon: 'TASCII', isSelected: tool === 'draw' && asciiStroke, onClick: () => { setTool('draw'); setAsciiStroke(true); } },
                { id: 'eraser', label: 'Eraser', icon: 'TERASER', isSelected: tool === 'erase', onClick: () => setTool('erase') },
              ].map(({ id, label, icon, isSelected, onClick }) => (
                <StatefulTooltip key={id} content={label} placement={PLACEMENT.top} showArrow onMouseEnterDelay={400} overrides={TOOLTIP_OVERRIDES} popperOptions={toolsPopperOptions}>
                  <button onClick={onClick} className="draw-tool-btn">
                    <img
                      src={`/draw/${icon}.svg`}
                      alt=""
                      className={`draw-tool-icon ${isSelected ? 'draw-tool-icon--selected' : ''}`}
                      style={{ bottom: isSelected ? '-2px' : '-20px' }}
                    />
                  </button>
                </StatefulTooltip>
              ))}
            </div>

            {/* Colors and stroke sizes section */}
            <div className="draw-colors-section">
              {/* Color palette */}
              <div
                className={`draw-color-palette ${getPaletteClass()}`}
                style={{
                  '--chaos-duration': `${duration}ms`,
                  '--glitch-duration': `${duration}ms`,
                  '--tumble-duration': `${duration}ms`,
                  '--scatter-duration': `${duration}ms`,
                  '--spin-duration': `${duration}ms`,
                  '--bounce-duration': `${duration}ms`,
                  '--slot-duration': `${duration}ms`,
                } as React.CSSProperties}
              >
                {COLOR_PALETTES[paletteIndex].map((color, index) => {
                  const targetIdx = targetPaletteIndex ?? paletteIndex;
                  const targetColor = COLOR_PALETTES[targetIdx][index];
                  const numPalettes = COLOR_PALETTES.length;

                  // Build reel colors based on animation type
                  let reelColors: string[];
                  let reelClass = '';

                  if (!isRolling || targetPaletteIndex === null) {
                    // Not rolling - just show current color
                    reelColors = [color];
                  } else if (animationType === 'slide') {
                    // Slide: show 3 colors (next, target, current)
                    const nextIdx = (targetIdx + 1) % numPalettes;
                    reelColors = [COLOR_PALETTES[nextIdx][index], targetColor, color];
                    reelClass = 'draw-reel-slide-bounce';
                  } else if (animationType === 'slot') {
                    // Slot machine: cycle through ALL palettes before landing
                    reelColors = [];
                    // Go through all palettes 2-3 times for spin effect, then land on target
                    for (let cycle = 0; cycle < 3; cycle++) {
                      for (let p = 0; p < numPalettes; p++) {
                        reelColors.push(COLOR_PALETTES[p][index]);
                      }
                    }
                    reelColors.push(targetColor);
                    reelClass = 'draw-reel-slot-spin';
                  } else if (animationType === 'chaos' || animationType === 'glitch') {
                    // Chaos/Glitch: scrambled palette order (deterministic to avoid hydration mismatch)
                    reelColors = [];
                    const scrambleOrder = [3, 0, 5, 2, 4, 1, 3, 5, 0, 4, 2, 1]; // pseudo-random but deterministic
                    for (let i = 0; i < scrambleOrder.length; i++) {
                      reelColors.push(COLOR_PALETTES[scrambleOrder[i] % numPalettes][index]);
                    }
                    reelColors.push(targetColor);
                    reelClass = animationType === 'chaos' ? 'draw-reel-chaos' : 'draw-reel-glitch';
                  } else {
                    // Other animations: show a few palettes cycling
                    reelColors = [];
                    for (let p = 0; p < numPalettes; p++) {
                      reelColors.push(COLOR_PALETTES[(paletteIndex + p) % numPalettes][index]);
                    }
                    reelColors.push(targetColor);
                    reelClass = `draw-reel-${animationType}`;
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => setStrokeColor(color)}
                      className={`draw-color-btn ${strokeColor === color ? 'draw-color-btn--selected' : ''} ${getColorClass()}`}
                      style={{
                        '--index': index,
                        animationDelay: isRolling ? `${index * stagger}ms` : '0ms',
                      } as React.CSSProperties}
                    >
                      <div
                        className={`draw-color-reel ${isRolling ? reelClass : ''}`}
                        style={{
                          '--slide-duration': `${duration}ms`,
                          '--reel-items': reelColors.length,
                          '--reel-duration': `${duration}ms`,
                          animationDelay: isRolling ? `${index * stagger}ms` : '0ms',
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

                {/* Dice button */}
                <StatefulTooltip content="Change palette" placement={PLACEMENT.top} showArrow onMouseEnterDelay={400} overrides={TOOLTIP_OVERRIDES} popperOptions={defaultPopperOptions}>
                  <button onClick={handleDiceClick} className="draw-color-btn draw-color-btn--dice">
                    <ToolbarDiceCube
                      isAnimating={isRolling}
                      finalFace={(targetPaletteIndex ?? paletteIndex) % 6}
                      clickCount={clickCount}
                    />
                  </button>
                </StatefulTooltip>
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
        </div>
      </div>
    </div>
  );
}

export default function TestToolbarPage() {
  return (
    <BaseUIProvider>
      <div style={{ padding: '32px 48px', minHeight: '100vh' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>Toolbar Animation Test</h1>
        <p style={{ margin: '0 0 32px', color: '#666', fontSize: 13 }}>
          Click dice to trigger animations. Spam click for faster/crazier rolls.
        </p>

        <FullToolbarTest
          title="Slide"
          defaultAnimationType="slide"
          defaultDuration={500}
          defaultStagger={30}
        />

        <FullToolbarTest
          title="Chaos"
          defaultAnimationType="chaos"
          defaultDuration={600}
          defaultStagger={30}
        />

        <FullToolbarTest
          title="Glitch"
          defaultAnimationType="glitch"
          defaultDuration={400}
          defaultStagger={20}
        />

        <FullToolbarTest
          title="Tumble"
          defaultAnimationType="tumble"
          defaultDuration={500}
          defaultStagger={40}
        />

        <FullToolbarTest
          title="Scatter"
          defaultAnimationType="scatter"
          defaultDuration={500}
          defaultStagger={0}
        />

        <FullToolbarTest
          title="Bounce"
          defaultAnimationType="bounce"
          defaultDuration={600}
          defaultStagger={50}
        />

        <FullToolbarTest
          title="Spin"
          defaultAnimationType="spin"
          defaultDuration={600}
          defaultStagger={0}
        />

        <FullToolbarTest
          title="Slot"
          defaultAnimationType="slot"
          defaultDuration={800}
          defaultStagger={80}
        />
      </div>
    </BaseUIProvider>
  );
}
