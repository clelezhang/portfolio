'use client';

import { useState, useRef, useEffect } from 'react';
import '../draw.css';

// ============================================
// DYNAMIC CSS FOR CONTROLS THAT CAN'T USE CSS VARS
// (keyframe percentages, direction, etc.)
// ============================================

function useDynamicThreePhaseCSS(
  id: string,
  accelPortion: number,
  constantPortion: number,
  maxSpeed: number
) {
  useEffect(() => {
    const accelEnd = Math.round(accelPortion * 100);
    const constantEnd = Math.round((accelPortion + constantPortion) * 100);
    const bounceAmp = 8 * (maxSpeed / 2);

    const css = `
      @keyframes reelThreePhase-${id} {
        0% {
          transform: translateY(0);
          animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
        }
        ${accelEnd}% {
          transform: translateY(calc(-25% * ${maxSpeed}));
          animation-timing-function: linear;
        }
        ${constantEnd}% {
          transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${12 * maxSpeed}px));
          animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
        }
        ${Math.min(constantEnd + 12, 92)}% {
          transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${bounceAmp}px));
        }
        ${Math.min(constantEnd + 20, 96)}% {
          transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${bounceAmp * 0.4}px));
        }
        100% {
          transform: translateY(calc(-100% + (3 * 100% / var(--reel-items))));
        }
      }
    `;

    let styleEl = document.getElementById(`dynamic-threephase-${id}`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `dynamic-threephase-${id}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, [id, accelPortion, constantPortion, maxSpeed]);

  return `reelThreePhase-${id}`;
}

function useDynamicModuloCSS(
  id: string,
  speed: number,
  direction: number,
  stopDelay: number
) {
  useEffect(() => {
    const spinPercent = Math.round(stopDelay * 100);
    const bounceAmp = 5 + (speed * 2);
    const dir = direction < 0 ? '' : '-'; // flip sign for down direction

    const css = `
      @keyframes reelModulo-${id} {
        0% { transform: translateY(0); }
        ${spinPercent}% {
          transform: translateY(calc(${dir}(-100% + (3 * 100% / var(--reel-items))) + ${20 * speed}px));
          animation-timing-function: cubic-bezier(0.2, 0, 0.2, 1);
        }
        ${Math.min(spinPercent + 10, 88)}% {
          transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${bounceAmp}px));
        }
        ${Math.min(spinPercent + 16, 94)}% {
          transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${bounceAmp * 0.5}px));
        }
        100% {
          transform: translateY(calc(-100% + (3 * 100% / var(--reel-items))));
        }
      }
    `;

    let styleEl = document.getElementById(`dynamic-modulo-${id}`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `dynamic-modulo-${id}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, [id, speed, direction, stopDelay]);

  return `reelModulo-${id}`;
}

function useDynamicSpringCSS(
  id: string,
  stiffness: number,
  damping: number,
  mass: number,
  velocity: number,
  clickCount: number = 1
) {
  useEffect(() => {
    // Stiffness affects bounce amplitude (100-600 → smaller to larger bounces)
    const amp = stiffness / 100;
    // Damping affects decay rate (5-50 → slower to faster decay)
    const decay = 1 - (damping / 60);
    // Mass affects timing - heavier = slower approach
    const massScale = 1 / Math.max(0.5, mass);
    // Velocity adds initial momentum - negative = starts with upward motion
    const velBoost = Math.abs(velocity) / 100;

    // Click count multiplier - more clicks = more chaotic/intense
    const clickMultiplier = 1 + (clickCount - 1) * 0.3;

    // Calculate bounce amplitudes
    const b1 = (14 * amp / 3 + velBoost * 5) * clickMultiplier;
    const b2 = 10 * amp / 3 * Math.max(0.2, decay) * clickMultiplier;
    const b3 = 7 * amp / 3 * Math.max(0.1, decay * decay) * clickMultiplier;
    const b4 = 4 * amp / 3 * Math.max(0.05, decay * decay * decay);
    const b5 = 2 * amp / 3 * Math.max(0.02, decay * decay * decay * decay);

    // Timing keyframes - mass affects when we hit the first bounce
    const t1 = Math.round(45 * massScale);
    const t2 = Math.round(58 * massScale);
    const t3 = Math.round(70 * massScale);
    const t4 = Math.round(82 * massScale);
    const t5 = Math.round(92 * massScale);

    // For fast clicks, add a "wind up" at the start
    const windUp = clickCount > 1 ? `
        5% { transform: translateY(${velocity < 0 ? 8 * clickCount : -8 * clickCount}px); }
    ` : '';

    const css = `
      @keyframes reelSpring-${id} {
        0% { transform: translateY(0); }
        ${windUp}
        ${Math.min(t1, 50)}% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b1}px)); }
        ${Math.min(t2, 62)}% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${b2}px)); }
        ${Math.min(t3, 75)}% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b3}px)); }
        ${Math.min(t4, 86)}% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${b4}px)); }
        ${Math.min(t5, 94)}% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b5}px)); }
        100% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)))); }
      }
    `;

    let styleEl = document.getElementById(`dynamic-spring-${id}`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `dynamic-spring-${id}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, [id, stiffness, damping, mass, velocity, clickCount]);

  return `reelSpring-${id}`;
}

// Fast-click variant: Instant Snap - No delay, violent spring after snap
function useDynamicSpringSnapCSS(
  id: string,
  stiffness: number,
  damping: number,
  mass: number,
  velocity: number,
  clickCount: number = 1
) {
  useEffect(() => {
    // Snap is faster and more violent with each click
    const snapMultiplier = 1 + (clickCount - 1) * 0.5;
    const amp = (stiffness / 80) * snapMultiplier;
    const decay = Math.max(0.3, 1 - (damping / 40));

    // Larger, more violent bounces
    const b1 = 20 * amp * decay;
    const b2 = 14 * amp * decay * decay;
    const b3 = 8 * amp * decay * decay * decay;
    const b4 = 4 * amp * decay * decay * decay * decay;

    const css = `
      @keyframes reelSpringSnap-${id} {
        0% { transform: translateY(0); }
        15% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)))); }
        30% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b1}px)); }
        48% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${b2}px)); }
        66% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b3}px)); }
        82% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${b4}px)); }
        100% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)))); }
      }
    `;

    let styleEl = document.getElementById(`dynamic-spring-snap-${id}`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `dynamic-spring-snap-${id}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, [id, stiffness, damping, mass, velocity, clickCount]);

  return `reelSpringSnap-${id}`;
}

// Fast-click variant: Rubber Band - Stretches further back before snapping forward
function useDynamicSpringRubberCSS(
  id: string,
  stiffness: number,
  damping: number,
  mass: number,
  velocity: number,
  clickCount: number = 1
) {
  useEffect(() => {
    // More stretch with each rapid click
    const stretchMultiplier = 1 + (clickCount - 1) * 0.4;
    const pullBack = 25 * stretchMultiplier; // Initial pull back in wrong direction
    const overshoot = (stiffness / 100) * 15 * stretchMultiplier;
    const bounce1 = overshoot * 0.6;
    const bounce2 = overshoot * 0.3;

    const css = `
      @keyframes reelSpringRubber-${id} {
        0% { transform: translateY(0); }
        8% { transform: translateY(${pullBack}px); animation-timing-function: cubic-bezier(0.2, 0, 0.2, 1); }
        35% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${overshoot}px)); }
        55% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${bounce1}px)); }
        75% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${bounce2}px)); }
        90% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${bounce2 * 0.4}px)); }
        100% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)))); }
      }
    `;

    let styleEl = document.getElementById(`dynamic-spring-rubber-${id}`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `dynamic-spring-rubber-${id}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, [id, stiffness, damping, mass, velocity, clickCount]);

  return `reelSpringRubber-${id}`;
}

// Fast-click variant: Chaos - Random jitter during rapid clicks
function useDynamicSpringChaosCSS(
  id: string,
  stiffness: number,
  damping: number,
  mass: number,
  velocity: number,
  clickCount: number = 1
) {
  useEffect(() => {
    // More chaos with rapid clicks
    const chaosLevel = Math.min(clickCount, 5);
    const jitter1 = (Math.random() - 0.5) * 20 * chaosLevel;
    const jitter2 = (Math.random() - 0.5) * 16 * chaosLevel;
    const jitter3 = (Math.random() - 0.5) * 12 * chaosLevel;
    const rotateAmount = (Math.random() - 0.5) * 8 * chaosLevel;

    const amp = stiffness / 100;
    const b1 = 12 * amp + Math.abs(jitter1);
    const b2 = 8 * amp + Math.abs(jitter2);

    const css = `
      @keyframes reelSpringChaos-${id} {
        0% { transform: translateY(0) rotate(0deg); }
        15% { transform: translateY(${jitter1}px) rotate(${rotateAmount}deg); }
        30% { transform: translateY(calc(-50% + ${jitter2}px)) rotate(${-rotateAmount * 0.5}deg); }
        50% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b1}px + ${jitter3}px)) rotate(${rotateAmount * 0.3}deg); }
        70% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) + ${b2}px)) rotate(${-rotateAmount * 0.2}deg); }
        85% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)) - ${b2 * 0.4}px)) rotate(0deg); }
        100% { transform: translateY(calc(-100% + (3 * 100% / var(--reel-items)))); }
      }
    `;

    let styleEl = document.getElementById(`dynamic-spring-chaos-${id}`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `dynamic-spring-chaos-${id}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, [id, stiffness, damping, mass, velocity, clickCount]);

  return `reelSpringChaos-${id}`;
}

// Fast-click variant: Accumulating Energy - Builds up with each click, bigger finale
function useDynamicSpringAccumCSS(
  id: string,
  stiffness: number,
  damping: number,
  mass: number,
  velocity: number,
  clickCount: number = 1
) {
  useEffect(() => {
    // Energy accumulates with each click
    const energyLevel = clickCount;
    const amp = (stiffness / 100) * energyLevel;
    const windUp = 10 * energyLevel; // Wind up before release

    const b1 = 18 * amp;
    const b2 = 12 * amp * 0.7;
    const b3 = 8 * amp * 0.5;
    const b4 = 5 * amp * 0.3;
    const b5 = 3 * amp * 0.15;

    // More bounces with more energy
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
  }, [id, stiffness, damping, mass, velocity, clickCount]);

  return `reelSpringAccum-${id}`;
}

import { COLOR_PALETTES, TOOLTIP_OVERRIDES } from '../constants';
import { ToolbarDiceCube } from '../components/ToolbarDiceCube';
import { DrawIconButton } from '../components/DrawIconButton';
import { BaseUIProvider } from '../../components/StyletronProvider';
import { StatefulTooltip, PLACEMENT } from 'baseui/tooltip';
import { Tool } from '../types';

type AnimationType = 'slide' | 'chaos' | 'glitch' | 'tumble' | 'scatter' | 'spin' | 'bounce' | 'slot' | 'modulo' | 'threephase' | 'spring' | 'random' | 'stepped' | 'blur';

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

// Tooltip helper for control explanations
const tipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: '#e0e0e0',
  color: '#666',
  fontSize: 9,
  fontWeight: 600,
  cursor: 'help',
  marginLeft: 2,
  flexShrink: 0,
};

const tipPopperOptions = {
  modifiers: [{ name: 'offset', options: { offset: [0, 4] } }],
};

function Tip({ text }: { text: string }) {
  return (
    <StatefulTooltip
      content={<span style={{ fontSize: 11, maxWidth: 200, display: 'block' }}>{text}</span>}
      placement={PLACEMENT.top}
      showArrow
      popperOptions={tipPopperOptions}
    >
      <span style={tipStyle}>?</span>
    </StatefulTooltip>
  );
}


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

  // Rapid click detection
  const lastClickTimeRef = useRef<number>(0);
  const [rapidClickVariant, setRapidClickVariant] = useState<'snap' | 'rubber' | 'chaos' | 'accum'>('snap');
  const [isRapidClicking, setIsRapidClicking] = useState(false);
  const [animationKey, setAnimationKey] = useState(0); // Key to force animation restart

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

  // Modulo Loop controls - infinite seamless reel
  const [moduloSpeed, setModuloSpeed] = useState(1.5); // Cycles per second
  const [moduloDirection, setModuloDirection] = useState<'up' | 'down'>('up');
  const [moduloStopDelay, setModuloStopDelay] = useState(0.8); // When to start stopping (0-1)

  // Three-Phase controls - accel → constant → decel
  const [phaseAccelDuration, setPhaseAccelDuration] = useState(0.2); // 0-1 portion for accel
  const [phaseConstantDuration, setPhaseConstantDuration] = useState(0.5); // 0-1 portion for constant
  const [phaseDecelEasing, setPhaseDecelEasing] = useState('cubic-bezier(0.22, 1, 0.36, 1)');
  const [phaseMaxSpeed, setPhaseMaxSpeed] = useState(2.0); // Max scroll speed multiplier

  // Spring Physics controls
  const [springStiffness, setSpringStiffness] = useState(100); // Spring stiffness (k)
  const [springDamping, setSpringDamping] = useState(27); // Damping coefficient
  const [springMass, setSpringMass] = useState(1.25); // Mass of the element
  const [springVelocity, setSpringVelocity] = useState(-50); // Initial velocity

  // Random Variance controls
  const [randomMinDuration, setRandomMinDuration] = useState(300); // Min duration per swatch
  const [randomMaxDuration, setRandomMaxDuration] = useState(800); // Max duration per swatch
  const [randomEasingVariance, setRandomEasingVariance] = useState(true); // Randomize easing too

  // Stepped Motion controls (Apple-style)
  const [steppedFrameRate, setSteppedFrameRate] = useState(12); // Frames per second
  const [steppedHoldFrames, setSteppedHoldFrames] = useState(2); // Frames to hold at end
  const [steppedEaseOut, setSteppedEaseOut] = useState(true); // Ease out at end

  // Motion Blur controls
  const [blurAmount, setBlurAmount] = useState(4); // Max blur in px
  const [blurFadeSpeed, setBlurFadeSpeed] = useState(0.3); // How fast blur fades (0-1)
  const [blurOpacityMin, setBlurOpacityMin] = useState(0.6); // Min opacity during blur

  // Generate unique ID for this toolbar instance (for dynamic CSS)
  const instanceId = useRef(`tb-${Math.random().toString(36).slice(2, 8)}`).current;

  // Dynamic CSS for animations that need keyframe % values to change
  const threePhaseAnimName = useDynamicThreePhaseCSS(
    instanceId, phaseAccelDuration, phaseConstantDuration, phaseMaxSpeed
  );
  const moduloAnimName = useDynamicModuloCSS(
    instanceId, moduloSpeed, moduloDirection === 'up' ? -1 : 1, moduloStopDelay
  );
  const springAnimName = useDynamicSpringCSS(
    instanceId, springStiffness, springDamping, springMass, springVelocity, clickCount
  );
  const springSnapAnimName = useDynamicSpringSnapCSS(
    instanceId, springStiffness, springDamping, springMass, springVelocity, clickCount
  );
  const springRubberAnimName = useDynamicSpringRubberCSS(
    instanceId, springStiffness, springDamping, springMass, springVelocity, clickCount
  );
  const springChaosAnimName = useDynamicSpringChaosCSS(
    instanceId, springStiffness, springDamping, springMass, springVelocity, clickCount
  );
  const springAccumAnimName = useDynamicSpringAccumCSS(
    instanceId, springStiffness, springDamping, springMass, springVelocity, clickCount
  );

  const handleDiceClick = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    // Detect rapid clicking (< 400ms between clicks)
    const isRapid = timeSinceLastClick < 400 && timeSinceLastClick > 0;

    if (isRolling) {
      // Rapid click during animation - restart with fast variant
      setClickCount(prev => Math.min(prev + 1, 5));
      pendingPaletteRef.current = (pendingPaletteRef.current + 1) % COLOR_PALETTES.length;
      setTargetPaletteIndex(pendingPaletteRef.current);
      setIsRapidClicking(true);

      // Force animation restart by changing key
      setAnimationKey(prev => prev + 1);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Use shorter duration for rapid clicks
      const rapidDuration = Math.max(duration * 0.6, 300);
      timeoutRef.current = setTimeout(() => {
        setPaletteIndex(pendingPaletteRef.current);
        setStrokeColor(COLOR_PALETTES[pendingPaletteRef.current][0]);
        setIsRolling(false);
        setTargetPaletteIndex(null);
        setClickCount(1);
        setIsRapidClicking(false);
      }, rapidDuration);
      return;
    }

    const nextIndex = (paletteIndex + 1) % COLOR_PALETTES.length;
    pendingPaletteRef.current = nextIndex;
    setTargetPaletteIndex(nextIndex);
    setIsRolling(true);
    setClickCount(1);
    setIsRapidClicking(isRapid);
    setAnimationKey(prev => prev + 1);

    // Update palette immediately for visual feedback
    setTimeout(() => {
      setPaletteIndex(pendingPaletteRef.current);
      setStrokeColor(COLOR_PALETTES[pendingPaletteRef.current][0]);
    }, duration * 0.3);

    timeoutRef.current = setTimeout(() => {
      setIsRolling(false);
      setTargetPaletteIndex(null);
      setClickCount(1);
      setIsRapidClicking(false);
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
  const showModuloControls = animationType === 'modulo';
  const showThreePhaseControls = animationType === 'threephase';
  const showSpringControls = animationType === 'spring';
  const showRandomControls = animationType === 'random';
  const showSteppedControls = animationType === 'stepped';
  const showBlurControls = animationType === 'blur';

  return (
    <div style={{ marginBottom: 48 }}>
      {/* Row 1: Basic controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500, minWidth: 100, color: 'var(--slate, #2F3557)' }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Type:</span>
            <select
              value={animationType}
              onChange={(e) => setAnimationType(e.target.value as AnimationType)}
              style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))', fontSize: 11, background: 'white', color: 'var(--slate, #2F3557)' }}
            >
              <option value="slide">Slide</option>
              <option value="chaos">Chaos</option>
              <option value="glitch">Glitch</option>
              <option value="tumble">Tumble</option>
              <option value="scatter">Scatter</option>
              <option value="spin">Spin</option>
              <option value="bounce">Bounce</option>
              <option value="slot">Slot</option>
              <option value="modulo">Modulo Loop</option>
              <option value="threephase">Three-Phase</option>
              <option value="spring">Spring</option>
              <option value="random">Random</option>
              <option value="stepped">Stepped</option>
              <option value="blur">Motion Blur</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Duration:<Tip text="Total animation time. Longer = more dramatic, shorter = snappier." /></span>
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
            <span>Stagger:<Tip text="Delay between each swatch starting. Creates wave effect. 0 = all move together." /></span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: 'var(--gray-50, rgba(47, 53, 87, 0.05))', padding: '8px 12px', borderRadius: 6, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))' }}>
          <span style={{ fontWeight: 500, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))' }}>Bounce:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Intensity:<Tip text="How far the element overshoots past its target. Higher = more dramatic bounce." /></span>
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
            <span>Count:<Tip text="Number of bounces before settling. 0 = no bounce, just ease." /></span>
            <input
              type="range"
              min={0}
              max={6}
              step={1}
              value={bounceCount}
              onChange={(e) => setBounceCount(Number(e.target.value))}
              style={{ width: 50 }}
            />
            <span style={{ width: 15 }}>{bounceCount}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Decay:<Tip text="How quickly each bounce loses energy. Lower = faster decay, more realistic." /></span>
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
            <span>Easing:<Tip text="The timing curve for the overall animation. Try 'Bouncy' or 'Elastic' for extra spring." /></span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: 'var(--gray-50, rgba(47, 53, 87, 0.05))', padding: '8px 12px', borderRadius: 6, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))' }}>
          <span style={{ fontWeight: 500, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))' }}>Slot:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Cycles:<Tip text="How many times the reel spins through all palettes before stopping. More = longer spin." /></span>
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
            <span>Overshoot:<Tip text="How far past the target the reel goes before snapping back. Creates anticipation." /></span>
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
            <span>Settle:<Tip text="Number of small bounces when landing on final position. 0 = hard stop." /></span>
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
            <span>Accel:<Tip text="Initial spin speed multiplier. Higher = faster start, more dramatic slowdown." /></span>
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
            <span>Easing:<Tip text="Timing curve for the spin. 'Linear' = constant speed, others add character." /></span>
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

      {/* Modulo Loop controls */}
      {showModuloControls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: '#f0fff4', padding: '8px 12px', borderRadius: 6 }}>
          <span style={{ fontWeight: 500, color: '#666' }}>Modulo:<Tip text="Infinite loop technique: content is duplicated and wraps seamlessly using modulo math." /></span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Speed:<Tip text="Scroll speed multiplier. Higher = faster spinning through colors." /></span>
            <input type="range" min={0.5} max={4} step={0.1} value={moduloSpeed} onChange={(e) => setModuloSpeed(Number(e.target.value))} style={{ width: 60 }} />
            <span style={{ width: 35 }}>{moduloSpeed.toFixed(1)}x</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Direction:<Tip text="Which way the reel scrolls. Up = colors move upward, Down = colors fall." /></span>
            <select value={moduloDirection} onChange={(e) => setModuloDirection(e.target.value as 'up' | 'down')} style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #ddd', fontSize: 10 }}>
              <option value="up">Up</option>
              <option value="down">Down</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Stop@:<Tip text="When to start decelerating (% of animation). Lower = longer coasting." /></span>
            <input type="range" min={0.5} max={0.95} step={0.05} value={moduloStopDelay} onChange={(e) => setModuloStopDelay(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 30 }}>{(moduloStopDelay * 100).toFixed(0)}%</span>
          </label>
        </div>
      )}

      {/* Three-Phase controls */}
      {showThreePhaseControls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: '#fff0f5', padding: '8px 12px', borderRadius: 6 }}>
          <span style={{ fontWeight: 500, color: '#666' }}>Phases:<Tip text="Real slot machine timing: 3 distinct phases (accelerate → constant speed → decelerate)." /></span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Accel:<Tip text="% of animation spent accelerating from zero to max speed." /></span>
            <input type="range" min={0.1} max={0.4} step={0.05} value={phaseAccelDuration} onChange={(e) => setPhaseAccelDuration(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 30 }}>{(phaseAccelDuration * 100).toFixed(0)}%</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Const:<Tip text="% of animation at constant max speed. The 'spinning' phase." /></span>
            <input type="range" min={0.2} max={0.6} step={0.05} value={phaseConstantDuration} onChange={(e) => setPhaseConstantDuration(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 30 }}>{(phaseConstantDuration * 100).toFixed(0)}%</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>MaxSpd:<Tip text="Peak scroll speed during constant phase. Higher = more blur effect." /></span>
            <input type="range" min={1} max={4} step={0.25} value={phaseMaxSpeed} onChange={(e) => setPhaseMaxSpeed(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 25 }}>{phaseMaxSpeed.toFixed(1)}x</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Decel:<Tip text="Easing curve for deceleration phase. 'Smooth Out' for gradual, 'Snap' for sudden." /></span>
            <select value={phaseDecelEasing} onChange={(e) => setPhaseDecelEasing(e.target.value)} style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #ddd', fontSize: 10 }}>
              {EASING_OPTIONS.map(({ value, label }) => (<option key={value} value={value}>{label}</option>))}
            </select>
          </label>
        </div>
      )}

      {/* Spring Physics controls */}
      {showSpringControls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: '#f5f0ff', padding: '8px 12px', borderRadius: 6 }}>
          <span style={{ fontWeight: 500, color: '#666' }}>Spring:<Tip text="Physics-based spring animation. Simulates real mass-spring-damper system." /></span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Stiff:<Tip text="Spring stiffness (k). Higher = snappier, faster oscillation. Lower = lazy, slow." /></span>
            <input type="range" min={100} max={600} step={25} value={springStiffness} onChange={(e) => setSpringStiffness(Number(e.target.value))} style={{ width: 60 }} />
            <span style={{ width: 30 }}>{springStiffness}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Damp:<Tip text="Damping coefficient. Higher = less bouncy, settles faster. Lower = more oscillation." /></span>
            <input type="range" min={5} max={50} step={1} value={springDamping} onChange={(e) => setSpringDamping(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 20 }}>{springDamping}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Mass:<Tip text="Element mass. Higher = more momentum, slower response. Lower = light and responsive." /></span>
            <input type="range" min={0.5} max={3} step={0.25} value={springMass} onChange={(e) => setSpringMass(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 25 }}>{springMass.toFixed(2)}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Vel:<Tip text="Initial velocity. Positive = start moving toward target. Negative = start moving away." /></span>
            <input type="range" min={-500} max={500} step={50} value={springVelocity} onChange={(e) => setSpringVelocity(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 35 }}>{springVelocity}</span>
          </label>
          <span style={{ borderLeft: '1px solid #ccc', height: 20, margin: '0 4px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Fast-click:<Tip text="Animation style when clicking rapidly. Try clicking the dice button multiple times quickly!" /></span>
            <select
              value={rapidClickVariant}
              onChange={(e) => setRapidClickVariant(e.target.value as 'snap' | 'rubber' | 'chaos' | 'accum')}
              style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #ddd', fontSize: 10, background: '#fff' }}
            >
              <option value="snap">⚡ Snap</option>
              <option value="rubber">🪢 Rubber</option>
              <option value="chaos">🌀 Chaos</option>
              <option value="accum">📈 Accum</option>
            </select>
          </label>
        </div>
      )}

      {/* Random Variance controls */}
      {showRandomControls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: '#fffbf0', padding: '8px 12px', borderRadius: 6 }}>
          <span style={{ fontWeight: 500, color: '#666' }}>Random:<Tip text="Each swatch gets a random duration for organic, less mechanical feel." /></span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Min:<Tip text="Shortest possible animation duration for any swatch." /></span>
            <input type="range" min={100} max={500} step={50} value={randomMinDuration} onChange={(e) => setRandomMinDuration(Number(e.target.value))} style={{ width: 60 }} />
            <span style={{ width: 40 }}>{randomMinDuration}ms</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Max:<Tip text="Longest possible animation duration. Wider range = more variation." /></span>
            <input type="range" min={400} max={1500} step={50} value={randomMaxDuration} onChange={(e) => setRandomMaxDuration(Number(e.target.value))} style={{ width: 60 }} />
            <span style={{ width: 45 }}>{randomMaxDuration}ms</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={randomEasingVariance} onChange={(e) => setRandomEasingVariance(e.target.checked)} />
            <span>Random Easing<Tip text="Also randomize easing curves, not just duration. More chaotic." /></span>
          </label>
        </div>
      )}

      {/* Stepped Motion controls */}
      {showSteppedControls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: '#f0f8ff', padding: '8px 12px', borderRadius: 6 }}>
          <span style={{ fontWeight: 500, color: '#666' }}>Stepped:<Tip text="Apple-style discrete frame animation. Like old flip clocks or train station displays." /></span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>FPS:<Tip text="Frames per second. Lower = more mechanical look. 12 = classic animation. 24+ = smooth." /></span>
            <input type="range" min={4} max={30} step={2} value={steppedFrameRate} onChange={(e) => setSteppedFrameRate(Number(e.target.value))} style={{ width: 60 }} />
            <span style={{ width: 25 }}>{steppedFrameRate}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Hold:<Tip text="Extra frames to hold at end position. Creates dramatic pause before settling." /></span>
            <input type="range" min={0} max={6} step={1} value={steppedHoldFrames} onChange={(e) => setSteppedHoldFrames(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 15 }}>{steppedHoldFrames}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={steppedEaseOut} onChange={(e) => setSteppedEaseOut(e.target.checked)} />
            <span>Ease Out<Tip text="Slow down at end even within stepped motion. Softer landing." /></span>
          </label>
        </div>
      )}

      {/* Motion Blur controls */}
      {showBlurControls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginLeft: 116, fontSize: 11, background: '#f8f8f8', padding: '8px 12px', borderRadius: 6 }}>
          <span style={{ fontWeight: 500, color: '#666' }}>Blur:<Tip text="CSS blur filter applied during fast motion to simulate speed." /></span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Amount:<Tip text="Max blur radius in pixels during peak speed. Higher = more speed illusion." /></span>
            <input type="range" min={1} max={10} step={0.5} value={blurAmount} onChange={(e) => setBlurAmount(Number(e.target.value))} style={{ width: 60 }} />
            <span style={{ width: 30 }}>{blurAmount}px</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Fade:<Tip text="How quickly blur clears when slowing down. Higher = faster clearing." /></span>
            <input type="range" min={0.1} max={0.8} step={0.05} value={blurFadeSpeed} onChange={(e) => setBlurFadeSpeed(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 30 }}>{blurFadeSpeed.toFixed(2)}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>MinOp:<Tip text="Minimum opacity during blur. Lower = more ghostly/transparent at high speed." /></span>
            <input type="range" min={0.3} max={0.9} step={0.05} value={blurOpacityMin} onChange={(e) => setBlurOpacityMin(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ width: 30 }}>{blurOpacityMin.toFixed(2)}</span>
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
                  } else if (animationType === 'modulo') {
                    // Modulo Loop: duplicate content for seamless infinite scroll
                    reelColors = [];
                    // Create 3x duplicate for seamless looping
                    for (let rep = 0; rep < 3; rep++) {
                      for (let p = 0; p < numPalettes; p++) {
                        reelColors.push(COLOR_PALETTES[p][index]);
                      }
                    }
                    reelColors.push(targetColor);
                    // Add buffer colors AFTER target for overshoot visibility
                    const moduloNextPalette1 = (targetIdx + 1) % numPalettes;
                    const moduloNextPalette2 = (targetIdx + 2) % numPalettes;
                    reelColors.push(COLOR_PALETTES[moduloNextPalette1][index]);
                    reelColors.push(COLOR_PALETTES[moduloNextPalette2][index]);
                    reelClass = 'draw-reel-modulo';
                  } else if (animationType === 'threephase') {
                    // Three-Phase: accel → constant → decel
                    reelColors = [];
                    for (let cycle = 0; cycle < 2; cycle++) {
                      for (let p = 0; p < numPalettes; p++) {
                        reelColors.push(COLOR_PALETTES[p][index]);
                      }
                    }
                    reelColors.push(targetColor);
                    // Add buffer colors AFTER target for overshoot visibility
                    const nextPalette1 = (targetIdx + 1) % numPalettes;
                    const nextPalette2 = (targetIdx + 2) % numPalettes;
                    reelColors.push(COLOR_PALETTES[nextPalette1][index]);
                    reelColors.push(COLOR_PALETTES[nextPalette2][index]);
                    reelClass = 'draw-reel-threephase';
                  } else if (animationType === 'spring') {
                    // Spring Physics: bouncy spring-based motion
                    reelColors = [];
                    for (let p = 0; p < numPalettes; p++) {
                      reelColors.push(COLOR_PALETTES[(paletteIndex + p) % numPalettes][index]);
                    }
                    reelColors.push(targetColor);
                    // Add buffer colors AFTER target for overshoot visibility
                    const springNextPalette1 = (targetIdx + 1) % numPalettes;
                    const springNextPalette2 = (targetIdx + 2) % numPalettes;
                    reelColors.push(COLOR_PALETTES[springNextPalette1][index]);
                    reelColors.push(COLOR_PALETTES[springNextPalette2][index]);
                    reelClass = 'draw-reel-spring';
                  } else if (animationType === 'random') {
                    // Random Variance: each swatch has different timing
                    reelColors = [];
                    for (let p = 0; p < numPalettes; p++) {
                      reelColors.push(COLOR_PALETTES[(paletteIndex + p) % numPalettes][index]);
                    }
                    reelColors.push(targetColor);
                    reelClass = 'draw-reel-random';
                  } else if (animationType === 'stepped') {
                    // Stepped: discrete frame-by-frame Apple-style
                    reelColors = [];
                    for (let p = 0; p < numPalettes; p++) {
                      reelColors.push(COLOR_PALETTES[(paletteIndex + p) % numPalettes][index]);
                    }
                    reelColors.push(targetColor);
                    reelClass = 'draw-reel-stepped';
                  } else if (animationType === 'blur') {
                    // Motion Blur: blur effect during fast motion
                    reelColors = [];
                    for (let cycle = 0; cycle < 2; cycle++) {
                      for (let p = 0; p < numPalettes; p++) {
                        reelColors.push(COLOR_PALETTES[p][index]);
                      }
                    }
                    reelColors.push(targetColor);
                    reelClass = 'draw-reel-blur';
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
                        key={`reel-${index}-${animationKey}`}
                        className={`draw-color-reel ${isRolling ? reelClass : ''}`}
                        data-bounce-count={bounceCount}
                        data-slot-settle={slotSettleBounces}
                        style={{
                          '--slide-duration': `${duration}ms`,
                          '--reel-items': reelColors.length,
                          '--reel-duration': `${duration}ms`,
                          // Dynamic animation names for animations with configurable keyframes
                          ...(isRolling && animationType === 'spring' ? {
                            animationName: isRapidClicking
                              ? (rapidClickVariant === 'snap' ? springSnapAnimName
                                : rapidClickVariant === 'rubber' ? springRubberAnimName
                                : rapidClickVariant === 'chaos' ? springChaosAnimName
                                : springAccumAnimName)
                              : springAnimName,
                            animationDuration: isRapidClicking ? `${Math.max(duration * 0.6, 300)}ms` : `${duration}ms`,
                            animationTimingFunction: 'cubic-bezier(0.2, 0, 0.2, 1)',
                            animationFillMode: 'forwards',
                          } : {}),
                          ...(isRolling && animationType === 'threephase' ? {
                            animationName: threePhaseAnimName,
                            animationDuration: `${duration}ms`,
                            animationTimingFunction: 'linear',
                            animationFillMode: 'forwards',
                          } : {}),
                          ...(isRolling && animationType === 'modulo' ? {
                            animationName: moduloAnimName,
                            animationDuration: `${duration}ms`,
                            animationTimingFunction: 'cubic-bezier(0.2, 0, 0.2, 1)',
                            animationFillMode: 'forwards',
                          } : {}),
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
                          // Modulo params
                          '--modulo-speed': moduloSpeed,
                          '--modulo-direction': moduloDirection === 'up' ? -1 : 1,
                          '--modulo-stop-delay': moduloStopDelay,
                          // Three-phase params
                          '--phase-accel': phaseAccelDuration,
                          '--phase-constant': phaseConstantDuration,
                          '--phase-decel-easing': phaseDecelEasing,
                          '--phase-max-speed': phaseMaxSpeed,
                          // Spring params
                          '--spring-stiffness': springStiffness,
                          '--spring-damping': springDamping,
                          '--spring-mass': springMass,
                          '--spring-velocity': springVelocity,
                          // Random params (per-swatch random duration)
                          '--random-duration': `${randomMinDuration + Math.random() * (randomMaxDuration - randomMinDuration)}ms`,
                          '--random-easing-variance': randomEasingVariance ? 1 : 0,
                          // Stepped params
                          '--stepped-fps': steppedFrameRate,
                          '--stepped-hold': steppedHoldFrames,
                          '--stepped-ease-out': steppedEaseOut ? 1 : 0,
                          // Blur params
                          '--blur-amount': `${blurAmount}px`,
                          '--blur-fade': blurFadeSpeed,
                          '--blur-opacity-min': blurOpacityMin,
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
      <div style={{ padding: '32px 48px', minHeight: '100vh', background: 'var(--lightgray, #FBFBFC)', fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 500, color: 'var(--slate, #2F3557)', letterSpacing: '-0.02em' }}>Toolbar Animation Test</h1>
        <p style={{ margin: '0 0 16px', color: 'var(--gray-500, rgba(47, 53, 87, 0.55))', fontSize: 13 }}>
          Click dice to trigger animations. Spam click for faster/crazier rolls.
        </p>

        {/* BOUNCE & SLOT - Featured at top with fine-tuning controls */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(240, 244, 255, 0.6) 0%, rgba(255, 245, 240, 0.6) 100%)',
          padding: '24px',
          borderRadius: 12,
          marginBottom: 32,
          border: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))'
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 500, color: 'var(--slate, #2F3557)' }}>Fine-Tuning Controls</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--gray-500, rgba(47, 53, 87, 0.55))', fontSize: 12 }}>
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

        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 500, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))' }}>Other Animations</h2>

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

        {/* NEW ANIMATIONS */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(232, 255, 240, 0.5) 0%, rgba(240, 248, 255, 0.5) 100%)',
          padding: '24px',
          borderRadius: 12,
          marginTop: 32,
          marginBottom: 32,
          border: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))'
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 500, color: 'var(--slate, #2F3557)' }}>New Slot Machine Techniques</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--gray-500, rgba(47, 53, 87, 0.55))', fontSize: 12 }}>
            Research-based animation techniques: modulo looping, three-phase timing, spring physics, random variance, stepped motion, and motion blur.
          </p>

          <FullToolbarTest
            title="Modulo Loop"
            defaultAnimationType="modulo"
            defaultDuration={1000}
            defaultStagger={40}
          />

          <FullToolbarTest
            title="Three-Phase"
            defaultAnimationType="threephase"
            defaultDuration={900}
            defaultStagger={60}
          />

          <FullToolbarTest
            title="Spring"
            defaultAnimationType="spring"
            defaultDuration={700}
            defaultStagger={30}
          />

          <FullToolbarTest
            title="Random"
            defaultAnimationType="random"
            defaultDuration={600}
            defaultStagger={0}
          />

          <FullToolbarTest
            title="Stepped"
            defaultAnimationType="stepped"
            defaultDuration={800}
            defaultStagger={50}
          />

          <FullToolbarTest
            title="Motion Blur"
            defaultAnimationType="blur"
            defaultDuration={700}
            defaultStagger={25}
          />
        </div>
      </div>
    </BaseUIProvider>
  );
}
