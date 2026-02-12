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

// Easing function options
const EASING_OPTIONS = [
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
  { value: 'linear', label: 'Linear' },
  { value: 'cubic-bezier(0.25, 0.1, 0.25, 1)', label: 'Default' },
  { value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', label: 'Bouncy' },
  { value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', label: 'Elastic' },
  { value: 'cubic-bezier(0.87, 0, 0.13, 1)', label: 'Snap' },
  { value: 'cubic-bezier(0.22, 1, 0.36, 1)', label: 'Smooth Out' },
] as const;

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

  // Bounce-specific controls
  const [bounceIntensity, setBounceIntensity] = useState(1.0); // Multiplier for overshoot
  const [bounceCount, setBounceCount] = useState(3); // Number of bounces
  const [bounceDecay, setBounceDecay] = useState(0.6); // How much each bounce decreases
  const [bounceEasing, setBounceEasing] = useState('cubic-bezier(0.25, 0.1, 0.25, 1)');

  // Slot-specific controls
  const [slotCycles, setSlotCycles] = useState(3); // How many full cycles through palettes
  const [slotOvershoot, setSlotOvershoot] = useState(8); // Final overshoot in px
  const [slotSettleBounces, setSlotSettleBounces] = useState(2); // Bounces at end
  const [slotEasing, setSlotEasing] = useState('linear');
  const [slotAcceleration, setSlotAcceleration] = useState(1.0); // Initial speed multiplier

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

  const showBounceControls = animationType === 'bounce';
  const showSlotControls = animationType === 'slot';

  return (
    <div style={{ marginBottom: 48 }}>
      {/* Row 1: Basic controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
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
              max={2000}
              step={50}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <span style={{ width: 50 }}>{duration}ms</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Stagger:</span>
            <input
              type="range"
              min={0}
              max={150}
              step={5}
              value={stagger}
              onChange={(e) => setStagger(Number(e.target.value))}
              style={{ width: 60 }}
            />
            <span style={{ width: 35 }}>{stagger}ms</span>
          </label>
        </div>
      </div>

      {/* Row 2: Bounce-specific controls */}
      {showBounceControls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: '#f8f8f8', padding: '8px 12px', borderRadius: 6 }}>
          <span style={{ fontWeight: 500, color: '#666' }}>Bounce:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Intensity:</span>
            <input
              type="range"
              min={0.2}
              max={2.5}
              step={0.1}
              value={bounceIntensity}
              onChange={(e) => setBounceIntensity(Number(e.target.value))}
              style={{ width: 60 }}
            />
            <span style={{ width: 30 }}>{bounceIntensity.toFixed(1)}x</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Count:</span>
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={bounceCount}
              onChange={(e) => setBounceCount(Number(e.target.value))}
              style={{ width: 50 }}
            />
            <span style={{ width: 15 }}>{bounceCount}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Decay:</span>
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.05}
              value={bounceDecay}
              onChange={(e) => setBounceDecay(Number(e.target.value))}
              style={{ width: 50 }}
            />
            <span style={{ width: 30 }}>{bounceDecay.toFixed(2)}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Easing:</span>
            <select
              value={bounceEasing}
              onChange={(e) => setBounceEasing(e.target.value)}
              style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #ddd', fontSize: 10 }}
            >
              {EASING_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Row 2: Slot-specific controls */}
      {showSlotControls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: '#f8f8f8', padding: '8px 12px', borderRadius: 6 }}>
          <span style={{ fontWeight: 500, color: '#666' }}>Slot:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Cycles:</span>
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={slotCycles}
              onChange={(e) => setSlotCycles(Number(e.target.value))}
              style={{ width: 50 }}
            />
            <span style={{ width: 15 }}>{slotCycles}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Overshoot:</span>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={slotOvershoot}
              onChange={(e) => setSlotOvershoot(Number(e.target.value))}
              style={{ width: 50 }}
            />
            <span style={{ width: 25 }}>{slotOvershoot}px</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Settle:</span>
            <input
              type="range"
              min={0}
              max={4}
              step={1}
              value={slotSettleBounces}
              onChange={(e) => setSlotSettleBounces(Number(e.target.value))}
              style={{ width: 40 }}
            />
            <span style={{ width: 15 }}>{slotSettleBounces}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Accel:</span>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={slotAcceleration}
              onChange={(e) => setSlotAcceleration(Number(e.target.value))}
              style={{ width: 50 }}
            />
            <span style={{ width: 25 }}>{slotAcceleration.toFixed(1)}x</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Easing:</span>
            <select
              value={slotEasing}
              onChange={(e) => setSlotEasing(e.target.value)}
              style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #ddd', fontSize: 10 }}
            >
              {EASING_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      )}

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
                    // Go through all palettes N times for spin effect, then land on target
                    for (let cycle = 0; cycle < slotCycles; cycle++) {
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
                        data-bounce-count={bounceCount}
                        data-slot-settle={slotSettleBounces}
                        style={{
                          '--slide-duration': `${duration}ms`,
                          '--reel-items': reelColors.length,
                          '--reel-duration': `${duration}ms`,
                          // Bounce params
                          '--bounce-intensity': bounceIntensity,
                          '--bounce-count': bounceCount,
                          '--bounce-decay': bounceDecay,
                          '--bounce-easing': bounceEasing,
                          '--bounce-overshoot': `${4 * bounceIntensity}px`,
                          // Slot params
                          '--slot-overshoot': `${slotOvershoot}px`,
                          '--slot-settle-bounces': slotSettleBounces,
                          '--slot-acceleration': slotAcceleration,
                          '--slot-easing': slotEasing,
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
        <p style={{ margin: '0 0 16px', color: '#666', fontSize: 13 }}>
          Click dice to trigger animations. Spam click for faster/crazier rolls.
        </p>

        {/* BOUNCE & SLOT - Featured at top with fine-tuning controls */}
        <div style={{
          background: 'linear-gradient(135deg, #f0f4ff 0%, #fff5f0 100%)',
          padding: '24px',
          borderRadius: 12,
          marginBottom: 32,
          border: '1px solid #e0e4f0'
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Fine-Tuning Controls</h2>
          <p style={{ margin: '0 0 20px', color: '#666', fontSize: 12 }}>
            Bounce and Slot have expanded controls. Select them to see: intensity, count, decay, overshoot, settle bounces, acceleration, and easing.
          </p>

          <FullToolbarTest
            title="Bounce"
            defaultAnimationType="bounce"
            defaultDuration={600}
            defaultStagger={50}
          />

          <FullToolbarTest
            title="Slot"
            defaultAnimationType="slot"
            defaultDuration={800}
            defaultStagger={80}
          />
        </div>

        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#666' }}>Other Animations</h2>

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
          title="Spin"
          defaultAnimationType="spin"
          defaultDuration={600}
          defaultStagger={0}
        />
      </div>
    </BaseUIProvider>
  );
}
