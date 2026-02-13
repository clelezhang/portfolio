'use client';

import { useState, useEffect, useRef } from 'react';

// ============================================
// Face paths (32x32 viewBox)
// ============================================
const G_FACE_PATH = "M11.5158 14.125C11.5158 13.9025 11.5818 13.685 11.7054 13.5C11.829 13.315 12.0047 13.1708 12.2103 13.0856C12.4159 13.0005 12.6421 12.9782 12.8603 13.0216C13.0785 13.065 13.279 13.1722 13.4363 13.3295C13.5936 13.4868 13.7008 13.6873 13.7442 13.9055C13.7876 14.1238 13.7653 14.35 13.6802 14.5555C13.595 14.7611 13.4508 14.9368 13.2658 15.0604C13.0808 15.184 12.8633 15.25 12.6408 15.25C12.3424 15.25 12.0563 15.1315 11.8453 14.9205C11.6343 14.7095 11.5158 14.4234 11.5158 14.125ZM20.5158 14.125C20.5158 14.3475 20.4498 14.565 20.3262 14.75C20.2026 14.935 20.0269 15.0792 19.8213 15.1644C19.6158 15.2495 19.3896 15.2718 19.1713 15.2284C18.9531 15.185 18.7527 15.0778 18.5953 14.9205C18.438 14.7632 18.3308 14.5627 18.2874 14.3445C18.244 14.1262 18.2663 13.9 18.3514 13.6945C18.4366 13.4889 18.5808 13.3132 18.7658 13.1896C18.9508 13.066 19.1683 13 19.3908 13C19.6892 13 19.9753 13.1185 20.1863 13.3295C20.3973 13.5405 20.5158 13.8266 20.5158 14.125ZM20.4155 18.625C19.4508 20.2928 17.8467 21.25 16.0158 21.25C14.1849 21.25 12.5818 20.2938 11.6171 18.625C11.5628 18.5396 11.5264 18.4442 11.5099 18.3444C11.4935 18.2446 11.4975 18.1425 11.5215 18.0442C11.5456 17.946 11.5893 17.8536 11.65 17.7727C11.7107 17.6918 11.7871 17.6239 11.8747 17.5733C11.9622 17.5227 12.0591 17.4903 12.1596 17.4781C12.26 17.4659 12.3618 17.4742 12.459 17.5023C12.5561 17.5305 12.6466 17.5781 12.7248 17.6421C12.8031 17.7062 12.8677 17.7854 12.9146 17.875C13.6149 19.0853 14.7155 19.75 16.0158 19.75C17.3161 19.75 18.4168 19.0844 19.1161 17.875C19.2156 17.7027 19.3794 17.577 19.5716 17.5254C19.7637 17.4739 19.9685 17.5009 20.1408 17.6003C20.3131 17.6998 20.4389 17.8636 20.4904 18.0558C20.5419 18.2479 20.515 18.4527 20.4155 18.625Z";

const LEFT_EYE_PATH = "M11.5158 14.125C11.5158 13.9025 11.5818 13.685 11.7054 13.5C11.829 13.315 12.0047 13.1708 12.2103 13.0856C12.4159 13.0005 12.6421 12.9782 12.8603 13.0216C13.0785 13.065 13.279 13.1722 13.4363 13.3295C13.5936 13.4868 13.7008 13.6873 13.7442 13.9055C13.7876 14.1238 13.7653 14.35 13.6802 14.5555C13.595 14.7611 13.4508 14.9368 13.2658 15.0604C13.0808 15.184 12.8633 15.25 12.6408 15.25C12.3424 15.25 12.0563 15.1315 11.8453 14.9205C11.6343 14.7095 11.5158 14.4234 11.5158 14.125Z";

const SMILE_PATH = "M20.4155 18.625C19.4508 20.2928 17.8467 21.25 16.0158 21.25C14.1849 21.25 12.5818 20.2938 11.6171 18.625C11.5628 18.5396 11.5264 18.4442 11.5099 18.3444C11.4935 18.2446 11.4975 18.1425 11.5215 18.0442C11.5456 17.946 11.5893 17.8536 11.65 17.7727C11.7107 17.6918 11.7871 17.6239 11.8747 17.5733C11.9622 17.5227 12.0591 17.4903 12.1596 17.4781C12.26 17.4659 12.3618 17.4742 12.459 17.5023C12.5561 17.5305 12.6466 17.5781 12.7248 17.6421C12.8031 17.7062 12.8677 17.7854 12.9146 17.875C13.6149 19.0853 14.7155 19.75 16.0158 19.75C17.3161 19.75 18.4168 19.0844 19.1161 17.875C19.2156 17.7027 19.3794 17.577 19.5716 17.5254C19.7637 17.4739 19.9685 17.5009 20.1408 17.6003C20.3131 17.6998 20.4389 17.8636 20.4904 18.0558C20.5419 18.2479 20.515 18.4527 20.4155 18.625Z";

// Wink line coordinates
const WINK_LINE = { x1: 18.2, y: 14.125, x2: 20.6 };

// Circle parameters
const CIRCLE_CENTER = 16;
const CIRCLE_RADIUS = 9.75;

// ============================================
// G Series ray coordinates
// ============================================
type Line = [number, number, number, number];

const G2_RAYS = {
  top: [15.98, 5.98, 15.98, 6.98] as Line,
  right: [24.98, 15.98, 25.98, 15.98] as Line,
  bottom: [15.98, 24.98, 15.98, 25.98] as Line,
  left: [5.98, 15.98, 6.98, 15.98] as Line,
  topLeft: [9.44, 8.38, 10.15, 9.09] as Line,
  topRight: [22.52, 8.38, 21.82, 9.09] as Line,
  bottomRight: [21.82, 21.81, 22.52, 22.52] as Line,
  bottomLeft: [10.15, 21.81, 9.44, 22.52] as Line,
};

const G3_RAYS = {
  top: [15.98, 5.98, 15.98, 7.98] as Line,
  right: [23.98, 15.98, 25.98, 15.98] as Line,
  bottom: [15.98, 23.23, 15.98, 25.98] as Line,
  left: [5.98, 15.98, 7.98, 15.98] as Line,
  topLeft: [9.44, 8.38, 10.15, 9.09] as Line,
  topRight: null as unknown as Line,
  bottomRight: [21.82, 21.81, 22.52, 22.52] as Line,
  bottomLeft: [10.15, 21.81, 9.44, 22.52] as Line,
};

const G4_RAYS = {
  top: [15.98, 5.98, 15.98, 7.98] as Line,
  right: [23.98, 15.98, 25.98, 15.98] as Line,
  bottom: [15.98, 23.23, 15.98, 25.98] as Line,
  left: [5.98, 15.98, 7.98, 15.98] as Line,
  topLeft: [9.44, 8.38, 10.86, 9.79] as Line,
  topRight: null as unknown as Line,
  bottomRight: [21.11, 21.11, 22.52, 22.52] as Line,
  bottomLeft: [10.86, 21.11, 9.44, 22.52] as Line,
};

const G5_RAYS = {
  top: [15.98, 5.98, 15.98, 8.98] as Line,
  right: [22.98, 15.98, 25.98, 15.98] as Line,
  bottom: [15.98, 22.23, 15.98, 25.98] as Line,
  left: [5.98, 15.98, 8.98, 15.98] as Line,
  topLeft: [9.44, 8.38, 11.56, 10.50] as Line,
  topRight: null as unknown as Line,
  bottomRight: [20.40, 20.40, 22.52, 22.52] as Line,
  bottomLeft: [11.56, 20.40, 9.44, 22.52] as Line,
};

// Ray keys for iteration
const RAY_KEYS = ['top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottomLeft', 'left', 'topLeft'] as const;

// ============================================
// Helper functions
// ============================================
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpLine(a: Line, b: Line, t: number): Line {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

function getCirclePoint(angle: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [
    CIRCLE_CENTER + Math.cos(rad) * CIRCLE_RADIUS,
    CIRCLE_CENTER + Math.sin(rad) * CIRCLE_RADIUS,
  ];
}

function getArcControlPoint(startAngle: number, endAngle: number): [number, number] {
  const midAngle = (startAngle + endAngle) / 2;
  const rad = (midAngle * Math.PI) / 180;
  const controlRadius = CIRCLE_RADIUS * 1.1;
  return [
    CIRCLE_CENTER + Math.cos(rad) * controlRadius,
    CIRCLE_CENTER + Math.sin(rad) * controlRadius,
  ];
}

// Arc segments for circle-to-ray morphing
interface ArcSegment {
  start: [number, number];
  end: [number, number];
  control: [number, number];
}

const ARC_SEGMENTS: Record<string, ArcSegment> = {
  top: { start: getCirclePoint(-135), end: getCirclePoint(-90), control: getArcControlPoint(-135, -90) },
  topRight: { start: getCirclePoint(-90), end: getCirclePoint(-45), control: getArcControlPoint(-90, -45) },
  right: { start: getCirclePoint(-45), end: getCirclePoint(0), control: getArcControlPoint(-45, 0) },
  bottomRight: { start: getCirclePoint(0), end: getCirclePoint(45), control: getArcControlPoint(0, 45) },
  bottom: { start: getCirclePoint(45), end: getCirclePoint(90), control: getArcControlPoint(45, 90) },
  bottomLeft: { start: getCirclePoint(90), end: getCirclePoint(135), control: getArcControlPoint(90, 135) },
  left: { start: getCirclePoint(135), end: getCirclePoint(180), control: getArcControlPoint(135, 180) },
  topLeft: { start: getCirclePoint(180), end: getCirclePoint(-135), control: getArcControlPoint(180, 225) },
};

// ============================================
// Animation settings (matching test-loading)
// ============================================
const PHASES = [
  { id: 'circle-to-rays', duration: 0.3 },
  { id: 'cardinals-grow', duration: 0.2 },
  { id: 'diagonals-catch-up', duration: 0.2 },
  { id: 'rays-grow', duration: 0.3 },
  { id: 'spinning', duration: Infinity }, // Spins until loading ends
  { id: 'morph-to-circle', duration: 0.75 },
];

const SPIN_SPEED = 1.5;
const SPIN_UP_DURATION = 0.3;
const STROKE_PULSE_SPEED = 2;
const STROKE_MIN_VISIBLE = 0.4;
const STROKE_STAGGER = 0.3;
const GRAVITY_STRENGTH = 0.45;

// Face spin settings
const FACE_SPIN_TOTAL = 360;
const FACE_SPIN_START = 0;
const FACE_SPIN_END = 3;
const FACE_FADE_START = 1.5;
const FACE_FADE_END = 3.25;
const BOUNCE_FREQUENCY = 1.9;
const BOUNCE_DAMPING = 1.5;
const BOUNCE_OVERSHOOT = 0.55;

// Outer spin settings
const OUTER_SPIN_TOTAL = 360;
const OUTER_SPIN_START = 0;
const OUTER_SPIN_END = 4;

// Reverse fade settings
const REVERSE_FADE_START = 0;
const REVERSE_FADE_END = 0.45;

// ============================================
// ClaudeIcon Component
// ============================================
interface ClaudeIconProps {
  size?: number;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ClaudeIcon({ size = 24, isLoading = false, onClick, className = '', disabled = false }: ClaudeIconProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [winkProgress, setWinkProgress] = useState(0);

  // Loading animation state
  const [animProgress, setAnimProgress] = useState(0); // 0-10 scale like test-loading
  const [spinAngle, setSpinAngle] = useState(0);
  const [strokeDashOffset, setStrokeDashOffset] = useState(0);
  const [effectRamp, setEffectRamp] = useState(0);
  const [isReversing, setIsReversing] = useState(false);

  const winkAnimRef = useRef<number | undefined>(undefined);
  const loadingAnimRef = useRef<number | undefined>(undefined);
  const angleRef = useRef(0);
  const wasLoadingRef = useRef(false);

  // Wink animation on hover (only when not loading)
  useEffect(() => {
    if (!isHovered || isLoading) {
      if (winkAnimRef.current) cancelAnimationFrame(winkAnimRef.current);
      setWinkProgress(0);
      return;
    }

    const duration = 0.5;
    const frequency = 1.5;
    const damping = 1.5;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const t = elapsed / duration;
      setWinkProgress(t);

      const currentDecay = Math.exp(-damping * t);
      const currentOscillation = Math.sin(frequency * Math.PI * t);
      const currentRotation = Math.abs(40 * currentDecay * currentOscillation);

      if (t > 0.8 && currentRotation < 0.5) {
        setWinkProgress(0);
        return;
      }

      winkAnimRef.current = requestAnimationFrame(animate);
    };

    winkAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (winkAnimRef.current) cancelAnimationFrame(winkAnimRef.current);
    };
  }, [isHovered, isLoading]);

  // Loading animation
  useEffect(() => {
    if (loadingAnimRef.current) cancelAnimationFrame(loadingAnimRef.current);

    // Detect loading state change
    if (isLoading && !wasLoadingRef.current) {
      // Just started loading - animate forward
      setIsReversing(false);
      setAnimProgress(0);
      angleRef.current = 0;
    } else if (!isLoading && wasLoadingRef.current) {
      // Just stopped loading - animate reverse
      setIsReversing(true);
      setAnimProgress(5); // Start reverse from spinning state
    }
    wasLoadingRef.current = isLoading;

    if (!isLoading && !isReversing) {
      // Not loading and not reversing - reset
      setAnimProgress(0);
      setSpinAngle(0);
      setStrokeDashOffset(0);
      setEffectRamp(0);
      return;
    }

    const startTime = performance.now();
    let lastTime = startTime;
    let currentProgress = isReversing ? 5 : 0;

    // Calculate forward animation duration (phases 0-4)
    const forwardDuration = PHASES.slice(0, 4).reduce((sum, p) => sum + p.duration, 0);
    const reverseDuration = PHASES[5].duration;

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      const elapsed = (time - startTime) / 1000;
      lastTime = time;

      if (isReversing) {
        // Reverse animation: progress from 5 to 10
        const reverseProgress = Math.min(1, elapsed / reverseDuration);
        const newProgress = 5 + reverseProgress * 5;
        currentProgress = newProgress;
        setAnimProgress(newProgress);

        if (newProgress >= 10) {
          // Reverse complete
          setIsReversing(false);
          setAnimProgress(0);
          return;
        }
      } else if (isLoading) {
        // Forward animation - morphing phases (0-4)
        let accumulatedTime = 0;
        let newProgress = 0;

        for (let i = 0; i < 4; i++) {
          const phaseDuration = PHASES[i].duration;
          if (elapsed < accumulatedTime + phaseDuration) {
            const phaseProgress = (elapsed - accumulatedTime) / phaseDuration;
            newProgress = i + phaseProgress;
            break;
          }
          accumulatedTime += phaseDuration;
          newProgress = i + 1;
        }

        if (newProgress >= 4) {
          // Spinning phase (4-5)
          currentProgress = 4.5;
          setAnimProgress(4.5);

          // Spinning animation (gravity + stroke dash)
          const spinElapsed = elapsed - forwardDuration;
          const spinUpProgress = SPIN_UP_DURATION > 0 ? Math.min(1, spinElapsed / SPIN_UP_DURATION) : 1;
          const spinUpMultiplier = 1 - Math.pow(1 - spinUpProgress, 3);

          // Gravity effect
          const currentAngle = angleRef.current % 360;
          const radians = (currentAngle * Math.PI) / 180;
          const gravityMultiplier = 1 + GRAVITY_STRENGTH * Math.sin(radians);
          const effectiveSpeed = SPIN_SPEED * gravityMultiplier * spinUpMultiplier;
          const newAngle = (angleRef.current + delta * 360 * effectiveSpeed) % 360;

          angleRef.current = newAngle;
          setSpinAngle(newAngle);
          setStrokeDashOffset((spinElapsed * STROKE_PULSE_SPEED) % 1);
          setEffectRamp(spinUpMultiplier);
        } else {
          currentProgress = newProgress;
          setAnimProgress(newProgress);
        }
      }

      loadingAnimRef.current = requestAnimationFrame(animate);
    };

    loadingAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (loadingAnimRef.current) cancelAnimationFrame(loadingAnimRef.current);
    };
  }, [isLoading, isReversing]);

  // ============================================
  // Calculate render state from animProgress
  // ============================================
  const p = animProgress;
  const isReverse = p > 5;
  const morphP = isReverse ? 6 : p;
  const directMorphT = p > 5 ? (p - 5) / 5 : 0;

  const showCircle = p < 0.01 || directMorphT >= 0.99;
  const showTopRight = p < 1;
  const topRightOpacity = directMorphT > 0 ? directMorphT : 1;

  // Face spin calculation (bounce easing with ease-in base)
  // faceSpinT goes from 0→1 as p goes from FACE_SPIN_START→FACE_SPIN_END
  const faceSpinT = p < FACE_SPIN_START ? 0 : p >= FACE_SPIN_END ? 1 : (p - FACE_SPIN_START) / (FACE_SPIN_END - FACE_SPIN_START);
  // Ease-in: slow start, fast end (t² curve)
  const baseT = Math.pow(faceSpinT, 2);
  // Bounce adds overshoot that decays over time
  const decay = Math.exp(-BOUNCE_DAMPING * faceSpinT * 3);
  const bounce = BOUNCE_OVERSHOOT * decay * Math.sin(BOUNCE_FREQUENCY * Math.PI * faceSpinT);
  const faceSpinEased = Math.max(0, baseT + bounce);
  const faceSpinRotation = faceSpinEased * FACE_SPIN_TOTAL;

  // Face visibility with fade
  const faceVisibility = isReverse
    ? {
        show: directMorphT >= REVERSE_FADE_START,
        opacity: directMorphT < REVERSE_FADE_START ? 0
          : directMorphT >= REVERSE_FADE_END ? 1
          : (directMorphT - REVERSE_FADE_START) / (REVERSE_FADE_END - REVERSE_FADE_START),
        rotation: 0,
      }
    : {
        show: p <= FACE_FADE_END || p === 0,
        opacity: p <= FACE_FADE_START ? 1 : Math.max(0, 1 - (p - FACE_FADE_START) / (FACE_FADE_END - FACE_FADE_START)),
        rotation: faceSpinRotation,
      };

  // Outer spin calculation (ease-in)
  const outerSpinT = p < OUTER_SPIN_START ? 0 : p >= OUTER_SPIN_END ? 1 : (p - OUTER_SPIN_START) / (OUTER_SPIN_END - OUTER_SPIN_START);
  const outerSpinEased = outerSpinT * outerSpinT; // ease-in
  const outerSpinRotation = !isReverse ? outerSpinEased * OUTER_SPIN_TOTAL : 0;

  const isArcPhase = p < 1 && p > 0;
  const isDirectMorphArcPhase = directMorphT > 0 && directMorphT < 0.99;
  const isSpinning = p >= 4 && p <= 5;

  // Get ray coordinates
  const getRays = () => {
    const mp = morphP;
    if (mp < 2) {
      const t = Math.max(0, mp - 1);
      return {
        top: lerpLine(G2_RAYS.top, G3_RAYS.top, t),
        right: lerpLine(G2_RAYS.right, G3_RAYS.right, t),
        bottom: lerpLine(G2_RAYS.bottom, G3_RAYS.bottom, t),
        left: lerpLine(G2_RAYS.left, G3_RAYS.left, t),
        topLeft: G2_RAYS.topLeft,
        topRight: G2_RAYS.topRight,
        bottomRight: G2_RAYS.bottomRight,
        bottomLeft: G2_RAYS.bottomLeft,
      };
    } else if (mp < 3) {
      const t = mp - 2;
      return {
        top: G3_RAYS.top, right: G3_RAYS.right, bottom: G3_RAYS.bottom, left: G3_RAYS.left,
        topLeft: lerpLine(G3_RAYS.topLeft, G4_RAYS.topLeft, t),
        topRight: G2_RAYS.topRight,
        bottomRight: lerpLine(G3_RAYS.bottomRight, G4_RAYS.bottomRight, t),
        bottomLeft: lerpLine(G3_RAYS.bottomLeft, G4_RAYS.bottomLeft, t),
      };
    } else if (mp < 4) {
      const t = mp - 3;
      return {
        top: lerpLine(G4_RAYS.top, G5_RAYS.top, t),
        right: lerpLine(G4_RAYS.right, G5_RAYS.right, t),
        bottom: lerpLine(G4_RAYS.bottom, G5_RAYS.bottom, t),
        left: lerpLine(G4_RAYS.left, G5_RAYS.left, t),
        topLeft: lerpLine(G4_RAYS.topLeft, G5_RAYS.topLeft, t),
        topRight: G2_RAYS.topRight,
        bottomRight: lerpLine(G4_RAYS.bottomRight, G5_RAYS.bottomRight, t),
        bottomLeft: lerpLine(G4_RAYS.bottomLeft, G5_RAYS.bottomLeft, t),
      };
    } else {
      return {
        top: G5_RAYS.top, right: G5_RAYS.right, bottom: G5_RAYS.bottom, left: G5_RAYS.left,
        topLeft: G5_RAYS.topLeft, topRight: G2_RAYS.topRight,
        bottomRight: G5_RAYS.bottomRight, bottomLeft: G5_RAYS.bottomLeft,
      };
    }
  };

  const rays = (!isArcPhase && !showCircle) ? getRays() : null;

  // Rotation calculation (for whole SVG - spinner phase and wink)
  let rotationAngle = 0;

  if (isSpinning) {
    rotationAngle = spinAngle;
  } else if (isReverse && directMorphT >= REVERSE_FADE_START) {
    // Momentum wobble after face starts appearing
    const t = (directMorphT - REVERSE_FADE_START) / (1 - REVERSE_FADE_START);
    const overshootAmount = 40;
    const frequency = 1.4;
    const wobbleDamping = 1.5;
    const wobbleDecay = Math.exp(-wobbleDamping * t);
    const oscillation = Math.cos(frequency * Math.PI * t);
    rotationAngle = overshootAmount * wobbleDecay * oscillation;
  } else if (!isLoading && !isReversing && p === 0) {
    // Wink rotation when not loading
    const winkDecay = Math.exp(-1.5 * winkProgress);
    const winkOscillation = Math.sin(1.5 * Math.PI * winkProgress);
    rotationAngle = 40 * winkDecay * winkOscillation;
  }

  const isWinking = rotationAngle > 10 && !isLoading && !isReversing;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      className={`draw-header-icon-btn ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        style={{
          transformOrigin: 'center',
          transform: `rotate(${rotationAngle}deg)`,
        }}
      >
        {/* Outer shape group (circle/arcs/rays) - spins during morph */}
        <g style={{
          transformOrigin: '16px 16px',
          transform: `rotate(${outerSpinRotation}deg)`,
        }}>
          {/* Circle - shown at start or end */}
          {showCircle && (
            <circle
              cx={CIRCLE_CENTER}
              cy={CIRCLE_CENTER}
              r={CIRCLE_RADIUS}
              stroke="black"
              strokeWidth="1.5"
              fill="none"
            />
          )}

        {/* Arc phase (0-1): circle breaking into rays */}
        {isArcPhase && !showCircle && RAY_KEYS.map(key => {
          const arc = ARC_SEGMENTS[key];
          const ray = G2_RAYS[key];
          const t = p;

          const startX = lerp(arc.start[0], ray[0], t);
          const startY = lerp(arc.start[1], ray[1], t);
          const endX = lerp(arc.end[0], ray[2], t);
          const endY = lerp(arc.end[1], ray[3], t);
          const rayMidX = (ray[0] + ray[2]) / 2;
          const rayMidY = (ray[1] + ray[3]) / 2;
          const ctrlX = lerp(arc.control[0], rayMidX, t);
          const ctrlY = lerp(arc.control[1], rayMidY, t);

          return (
            <path
              key={key}
              d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          );
        })}

        {/* Reverse morph: rays morphing back to arcs */}
        {isDirectMorphArcPhase && !showCircle && RAY_KEYS.map(key => {
          const arc = ARC_SEGMENTS[key];
          const ray = G5_RAYS[key];
          const t = directMorphT;

          if (key === 'topRight' && !G5_RAYS.topRight) {
            const topRightRay = G2_RAYS.topRight;
            const startX = lerp(topRightRay[0], arc.start[0], t);
            const startY = lerp(topRightRay[1], arc.start[1], t);
            const endX = lerp(topRightRay[2], arc.end[0], t);
            const endY = lerp(topRightRay[3], arc.end[1], t);
            const rayMidX = (topRightRay[0] + topRightRay[2]) / 2;
            const rayMidY = (topRightRay[1] + topRightRay[3]) / 2;
            const ctrlX = lerp(rayMidX, arc.control[0], t);
            const ctrlY = lerp(rayMidY, arc.control[1], t);

            return (
              <path
                key={key}
                d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
                stroke="black"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                opacity={topRightOpacity}
              />
            );
          }

          const startX = lerp(ray[0], arc.start[0], t);
          const startY = lerp(ray[1], arc.start[1], t);
          const endX = lerp(ray[2], arc.end[0], t);
          const endY = lerp(ray[3], arc.end[1], t);
          const rayMidX = (ray[0] + ray[2]) / 2;
          const rayMidY = (ray[1] + ray[3]) / 2;
          const ctrlX = lerp(rayMidX, arc.control[0], t);
          const ctrlY = lerp(rayMidY, arc.control[1], t);

          return (
            <path
              key={key}
              d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          );
        })}

        {/* Ray phase: straight lines with optional stroke-dash effect */}
        {!showCircle && !isArcPhase && !isDirectMorphArcPhase && rays && RAY_KEYS.map((key, rayIndex) => {
          if (key === 'topRight' && !showTopRight) return null;

          const line = rays[key];
          const dx = line[2] - line[0];
          const dy = line[3] - line[1];
          const rayLength = Math.sqrt(dx * dx + dy * dy);
          if (rayLength < 0.3) return null;

          let strokeDasharray: string | undefined;
          if (isSpinning) {
            const staggerOffset = rayIndex * STROKE_STAGGER;
            const phase = (strokeDashOffset + staggerOffset) % 1;
            const baseVisibleRatio = STROKE_MIN_VISIBLE + (1 - STROKE_MIN_VISIBLE) * Math.abs(Math.sin(phase * Math.PI));
            const visibleRatio = 1 - effectRamp * (1 - baseVisibleRatio);
            const visibleLength = rayLength * visibleRatio;
            strokeDasharray = `${visibleLength} ${rayLength}`;
          }

          return (
            <line
              key={key}
              x1={line[0]}
              y1={line[1]}
              x2={line[2]}
              y2={line[3]}
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
            />
          );
        })}
        </g>

        {/* Face - with spin rotation during forward animation */}
        {faceVisibility.show && !isWinking && (
          <path
            d={G_FACE_PATH}
            fill="black"
            opacity={faceVisibility.opacity}
            style={{
              transformOrigin: '16px 16px',
              transform: faceVisibility.rotation ? `rotate(${faceVisibility.rotation}deg)` : 'none',
            }}
          />
        )}

        {/* Winking face (separate eyes + wink) */}
        {faceVisibility.show && isWinking && (
          <>
            <path d={LEFT_EYE_PATH} fill="black" />
            <line
              x1={WINK_LINE.x1}
              y1={WINK_LINE.y}
              x2={WINK_LINE.x2}
              y2={WINK_LINE.y}
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path d={SMILE_PATH} fill="black" />
          </>
        )}
      </svg>
    </button>
  );
}
