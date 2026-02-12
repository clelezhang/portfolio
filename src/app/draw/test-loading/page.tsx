'use client';

import { useState, useEffect, useRef } from 'react';
import '../draw.css';

// Animation Annotation Tool
// Scrub through animation states, leave comments, export JSON

interface StateComment {
  state: string;
  stateName: string;
  stateDescription: string;
  progress: number;
  comment: string;
  timestamp: string;
}

// Animation phase configuration
interface AnimationPhase {
  id: string;
  name: string;
  startProgress: number;
  endProgress: number;
  duration: number; // seconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic';
}

const EASING_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'elastic', label: 'Elastic' },
];

// Easing functions
function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'bounce':
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    case 'elastic':
      if (t === 0 || t === 1) return t;
      return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    default: // linear
      return t;
  }
}

const DEFAULT_PHASES: AnimationPhase[] = [
  // Forward phases (0-5)
  { id: 'circle-to-rays', name: 'Circle → Rays', startProgress: 0, endProgress: 1, duration: 0.125, easing: 'bounce' },
  { id: 'cardinals-grow', name: 'Cardinals Grow', startProgress: 1, endProgress: 2, duration: 0.2, easing: 'ease-in' },
  { id: 'diagonals-catch-up', name: 'Diagonals Catch Up', startProgress: 2, endProgress: 3, duration: 0.15, easing: 'ease-in' },
  { id: 'rays-grow', name: 'Rays Grow + Face Gone', startProgress: 3, endProgress: 4, duration: 0.3, easing: 'ease-in' },
  { id: 'spinning', name: 'Spinning', startProgress: 4, endProgress: 5, duration: 3, easing: 'linear' },
  // Reverse phase (5-10) - single smooth morph back to circle
  { id: 'morph-to-circle', name: 'Morph → Circle', startProgress: 5, endProgress: 10, duration: 1, easing: 'ease-out' },
];

const ANIMATION_STATES = [
  // Forward states
  { id: 'circle', name: 'Circle', progress: 0, description: 'Actual circle with face', phaseId: 'circle-to-rays' },
  { id: 'circle-to-rays', name: 'Circle → Rays (mid)', progress: 0.5, description: 'Circle breaking into curved arcs', phaseId: 'circle-to-rays' },
  { id: 'rays-8', name: '8 Short Rays', progress: 1, description: 'All 8 rays visible, short length (g2)', phaseId: 'cardinals-grow' },
  { id: 'rays-transition', name: '8→7 Rays (mid)', progress: 1.5, description: 'TopRight gone, cardinals growing', phaseId: 'cardinals-grow' },
  { id: 'rays-7-cardinals', name: '7 Rays (cardinals grown)', progress: 2, description: 'Cardinals longer (g3)', phaseId: 'diagonals-catch-up' },
  { id: 'diagonals-growing', name: 'Diagonals Growing', progress: 2.5, description: 'Diagonal rays catching up', phaseId: 'diagonals-catch-up' },
  { id: 'rays-7-even', name: '7 Rays (g4)', progress: 3, description: 'All 7 rays even, face disappears + rays grow', phaseId: 'rays-grow' },
  { id: 'rays-growing', name: 'Rays Growing (g5)', progress: 3.5, description: 'Rays growing to max length', phaseId: 'rays-grow' },
  { id: 'spinning', name: 'Spinning', progress: 4, description: 'Spinner rotating at g5 length', phaseId: 'spinning' },
  // Reverse states (direct morph)
  { id: 'morph-mid', name: 'Morphing Back', progress: 7.5, description: 'Rays curving into circle', phaseId: 'morph-to-circle' },
  { id: 'circle-end', name: 'Circle (End)', progress: 10, description: 'Back to circle with face', phaseId: 'morph-to-circle' },
];

export default function LoadingAnimationsTestPage() {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [comments, setComments] = useState<StateComment[]>([]);
  const [currentComment, setCurrentComment] = useState('');
  const [jsonCopied, setJsonCopied] = useState(false);

  // Animation playback
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1);
  const animRef = useRef<number | undefined>(undefined);
  const pauseTimeRef = useRef<number>(0); // Track time when paused

  // Animation editor state
  const [phases, setPhases] = useState<AnimationPhase[]>(DEFAULT_PHASES);
  const [spinSpeed, setSpinSpeed] = useState(1); // rotations per second
  const [circlePauseDuration, setCirclePauseDuration] = useState(0.5); // pause at circle before looping
  const [flipArcDirection, setFlipArcDirection] = useState(false); // flip arc curve direction on reverse
  // Spin effects
  const [spinStrokeDash, setSpinStrokeDash] = useState(true); // 1: Material Design stroke animation
  const [spinGravity, setSpinGravity] = useState(true); // 2: Asymmetric speed (gravity effect)
  const [spinElastic, setSpinElastic] = useState(false); // 3: Elastic overshoot at positions
  const [spinOpacityFade, setSpinOpacityFade] = useState(false); // 4: Apple-style opacity trail
  // Fine-tuning params
  const [strokePulseSpeed, setStrokePulseSpeed] = useState(2); // cycles per second
  const [strokeMinVisible, setStrokeMinVisible] = useState(0.5); // minimum visible ratio (0-1)
  const [strokeStagger, setStrokeStagger] = useState(0.3); // stagger offset per ray
  const [gravityStrength, setGravityStrength] = useState(0.45); // speed variation (0-1)
  const [spinUpDuration, setSpinUpDuration] = useState(0.3); // seconds to ramp up to full speed
  const [opacityFadeMin, setOpacityFadeMin] = useState(0.2); // minimum opacity for trail
  const [steppedSpeed, setSteppedSpeed] = useState(8); // steps per second for Apple-style

  const currentState = ANIMATION_STATES[currentStateIndex];

  // Update a phase setting
  const updatePhase = (phaseId: string, key: keyof AnimationPhase, value: number | string) => {
    setPhases(prev => prev.map(p =>
      p.id === phaseId ? { ...p, [key]: value } : p
    ));
  };

  // Calculate total animation duration
  const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);

  // Export animation config
  const exportConfig = () => {
    const config = { phases, spinSpeed, circlePauseDuration, totalDuration };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  };

  // Convert real time to animation progress using phase durations
  const timeToProgress = (elapsedTime: number): number => {
    let time = elapsedTime * animSpeed;
    let progress = 0;

    for (const phase of phases) {
      if (time <= 0) break;

      const phaseRange = phase.endProgress - phase.startProgress;
      if (time < phase.duration) {
        // We're in this phase - apply easing
        const t = time / phase.duration;
        const easedT = applyEasing(t, phase.easing);
        progress = phase.startProgress + easedT * phaseRange;
        break;
      } else {
        // Complete this phase
        progress = phase.endProgress;
        time -= phase.duration;
      }
    }

    return Math.min(progress, 10);
  };

  // Full animation playback
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0); // Track accumulated time for pause/resume

  useEffect(() => {
    if (!isAnimating || isPaused || isScrubbing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const delta = (time - startTimeRef.current) / 1000;
      startTimeRef.current = time;
      accumulatedTimeRef.current += delta * animSpeed;

      const scaledElapsed = accumulatedTimeRef.current;

      // Account for circle pause at the start of each loop
      let progress: number;
      if (scaledElapsed < circlePauseDuration) {
        // Hold at circle (progress 0) during pause
        progress = 0;
      } else {
        // After pause, run normal animation
        progress = timeToProgress((scaledElapsed - circlePauseDuration) / animSpeed);
      }

      setAnimProgress(progress);

      // Loop after full animation (forward + reverse)
      // Don't loop - just stop at the end
      if (progress >= 10) {
        setAnimProgress(10);
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isAnimating, isPaused, isScrubbing, animSpeed, phases, totalDuration, circlePauseDuration]);

  // Convert progress back to accumulated time (for scrubbing)
  const progressToTime = (progress: number): number => {
    // Inverse of timeToProgress - approximate
    let time = 0;
    for (const phase of phases) {
      if (progress <= phase.startProgress) break;
      if (progress < phase.endProgress) {
        const phaseRange = phase.endProgress - phase.startProgress;
        const t = (progress - phase.startProgress) / phaseRange;
        time += t * phase.duration;
        break;
      } else {
        time += phase.duration;
      }
    }
    return circlePauseDuration + time * animSpeed;
  };

  // Add comment for current state
  const addComment = () => {
    if (!currentComment.trim()) return;

    const newComment: StateComment = {
      state: currentState.id,
      stateName: currentState.name,
      stateDescription: currentState.description,
      progress: currentState.progress,
      comment: currentComment.trim(),
      timestamp: new Date().toISOString(),
    };

    setComments(prev => [...prev, newComment]);
    setCurrentComment('');
  };

  // Copy JSON to clipboard
  const copyJson = () => {
    const json = JSON.stringify(comments, null, 2);
    navigator.clipboard.writeText(json);
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  // Get comments for current state
  const stateComments = comments.filter(c => c.state === currentState.id);

  // Get the phase for the current state
  const currentPhase = phases.find(p => p.id === currentState.phaseId);
  const currentPhaseIndex = phases.findIndex(p => p.id === currentState.phaseId);

  return (
    <div className="min-h-screen bg-white text-black flex">
      {/* Sticky Left Preview */}
      <div className="w-48 border-r border-black/5 p-6 sticky top-0 h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-28 h-28 border border-black/10 rounded-2xl flex items-center justify-center mb-4">
            <GAnimationPreview
              progress={isAnimating ? animProgress : currentState.progress}
              isPlaying={((isAnimating && animProgress >= 4 && animProgress < 5) || isSpinning) && !isPaused && !isScrubbing}
              size={64}
              spinSpeed={spinSpeed * animSpeed}
              flipArcDirection={flipArcDirection}
              spinOptions={{
                strokeDash: spinStrokeDash,
                gravity: spinGravity,
                elastic: spinElastic,
                opacityFade: spinOpacityFade,
                strokePulseSpeed: strokePulseSpeed * animSpeed,
                strokeMinVisible,
                strokeStagger,
                gravityStrength,
                spinUpDuration,
                opacityFadeMin,
                steppedSpeed: steppedSpeed * animSpeed,
              }}
            />
          </div>
          <div className="text-xs text-black/40 text-center mb-4">{currentState.name}</div>

          {/* Play Controls */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => {
                if (isAnimating) {
                  setIsAnimating(false);
                  setIsPaused(false);
                  accumulatedTimeRef.current = 0;
                } else {
                  setAnimProgress(0);
                  accumulatedTimeRef.current = 0;
                  setIsAnimating(true);
                  setIsPaused(false);
                }
              }}
              className="px-2 py-1 text-xs border border-black/10 rounded hover:bg-black/5"
            >
              {isAnimating ? '■' : '▶'}
            </button>
            {isAnimating && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-2 py-1 text-xs border border-black/10 rounded hover:bg-black/5 ${isPaused ? 'bg-black/5' : ''}`}
              >
                {isPaused ? '▶' : '❚❚'}
              </button>
            )}
            {/* Step buttons */}
            <button
              onClick={() => {
                const step = 0.1;
                const newProgress = Math.max(0, animProgress - step);
                setAnimProgress(newProgress);
                accumulatedTimeRef.current = progressToTime(newProgress);
                if (!isAnimating) setIsAnimating(true);
                setIsPaused(true);
              }}
              className="px-2 py-1 text-xs border border-black/10 rounded hover:bg-black/5"
            >
              ←
            </button>
            <button
              onClick={() => {
                const step = 0.1;
                const newProgress = Math.min(10, animProgress + step);
                setAnimProgress(newProgress);
                accumulatedTimeRef.current = progressToTime(newProgress);
                if (!isAnimating) setIsAnimating(true);
                setIsPaused(true);
              }}
              className="px-2 py-1 text-xs border border-black/10 rounded hover:bg-black/5"
            >
              →
            </button>
          </div>

          {/* Scrubber */}
          <div className="w-full mb-3">
            <input
              type="range"
              min="0"
              max="10"
              step="0.01"
              value={animProgress}
              onChange={(e) => {
                const newProgress = parseFloat(e.target.value);
                setAnimProgress(newProgress);
                accumulatedTimeRef.current = progressToTime(newProgress);
              }}
              onMouseDown={() => {
                setIsScrubbing(true);
                if (!isAnimating) setIsAnimating(true);
                setIsPaused(true);
              }}
              onMouseUp={() => setIsScrubbing(false)}
              onTouchStart={() => {
                setIsScrubbing(true);
                if (!isAnimating) setIsAnimating(true);
                setIsPaused(true);
              }}
              onTouchEnd={() => setIsScrubbing(false)}
              className="w-full accent-black/30"
            />
            <div className="text-[10px] text-black/30 text-center">
              {animProgress.toFixed(2)} / 10.00
            </div>
          </div>

          {/* Speed Presets */}
          <div className="w-full mb-3">
            <div className="text-[10px] text-black/30 mb-1">Speed</div>
            <div className="flex gap-1">
              {[0.1, 0.25, 0.5, 1].map(speed => (
                <button
                  key={speed}
                  onClick={() => setAnimSpeed(speed)}
                  className={`flex-1 px-1 py-1 text-[10px] border border-black/10 rounded hover:bg-black/5 ${
                    animSpeed === speed ? 'bg-black text-white' : ''
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Flip arc direction toggle */}
          <button
            onClick={() => setFlipArcDirection(!flipArcDirection)}
            className={`w-full px-2 py-1.5 text-[10px] rounded mb-3 ${
              flipArcDirection ? 'bg-black/5 text-black/70' : 'text-black/40 hover:bg-black/[0.02]'
            }`}
          >
            {flipArcDirection ? '↺ Flip Arc' : '↻ Normal Arc'}
          </button>

          {/* Spin button */}
          {currentState.id === 'spinning' && (
            <button
              onClick={() => setIsSpinning(!isSpinning)}
              className="w-full px-3 py-1.5 text-xs border border-black/10 rounded hover:bg-black/5 mb-3"
            >
              {isSpinning ? 'Stop Spin' : 'Spin'}
            </button>
          )}

          {/* Circle Pause Duration */}
          <div className="w-full text-[10px] text-black/40">
            <div className="flex justify-between items-center">
              <span>Hold at start</span>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={circlePauseDuration}
                onChange={(e) => setCirclePauseDuration(parseFloat(e.target.value) || 0)}
                className="w-12 px-1 py-0.5 border border-black/10 rounded text-center text-black/60 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Export/Reset at bottom */}
        <div className="flex gap-2 text-[10px]">
          <button onClick={exportConfig} className="text-black/30 hover:text-black/60">Export</button>
          <button onClick={() => setPhases(DEFAULT_PHASES)} className="text-black/30 hover:text-black/60">Reset</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-3xl">
          {/* Timeline */}
          <div className="mb-10">
            <div className="h-2 bg-black/5 rounded-full overflow-hidden flex">
              {phases.map((phase, index) => {
                const widthPercent = (phase.duration / totalDuration) * 100;
                const colors = ['bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-orange-400', 'bg-purple-400'];
                const isCurrentPhase = phase.id === currentState.phaseId;
                return (
                  <div
                    key={phase.id}
                    className={`${colors[index % colors.length]} ${isCurrentPhase ? 'opacity-100' : 'opacity-40'} cursor-pointer hover:opacity-70 transition-opacity`}
                    style={{ width: `${widthPercent}%` }}
                    onClick={() => {
                      const stateForPhase = ANIMATION_STATES.findIndex(s => s.phaseId === phase.id);
                      if (stateForPhase >= 0) setCurrentStateIndex(stateForPhase);
                    }}
                  />
                );
              })}
            </div>
            <div className="text-[10px] text-black/30 mt-2">{totalDuration.toFixed(1)}s total</div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-[180px_1fr] gap-10">
            {/* States */}
            <div>
              <div className="text-[10px] text-black/30 uppercase tracking-widest mb-4">States</div>
              <div className="space-y-0.5">
                {ANIMATION_STATES.map((state, i) => (
                  <button
                    key={state.id}
                    onClick={() => setCurrentStateIndex(i)}
                    className={`w-full flex items-center gap-3 px-2 py-1.5 rounded text-left ${
                      i === currentStateIndex ? 'bg-black/5' : 'hover:bg-black/[0.02]'
                    }`}
                  >
                    <div className="w-5 h-5 border border-black/10 rounded flex items-center justify-center flex-shrink-0">
                      <GAnimationPreview progress={state.progress} isPlaying={false} size={12} />
                    </div>
                    <span className="text-xs text-black/50">{state.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Phase Editor */}
            <div>
            {currentPhase && (
              <>
                <div className="text-[10px] text-black/30 uppercase tracking-widest mb-6">
                  {currentPhase.name}
                </div>

                {/* Duration */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-black/40 mb-2">
                    <span>Duration</span>
                    <span>{currentPhase.duration.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.05"
                    value={currentPhase.duration}
                    onChange={(e) => updatePhase(currentPhase.id, 'duration', parseFloat(e.target.value))}
                    className="w-full accent-black/30"
                  />
                </div>

                {/* Easing */}
                <div className="mb-6">
                  <div className="text-xs text-black/40 mb-2">Easing</div>
                  <div className="flex flex-wrap gap-1">
                    {EASING_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updatePhase(currentPhase.id, 'easing', opt.value)}
                        className={`px-2 py-1 text-xs rounded ${
                          currentPhase.easing === opt.value
                            ? 'bg-black text-white'
                            : 'text-black/40 hover:text-black/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Easing Curve */}
                <div className="mb-6">
                  <div className="h-12 border border-black/10 rounded">
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path
                        d={`M 0 40 ${Array.from({ length: 101 }, (_, i) => {
                          const t = i / 100;
                          const y = 40 - applyEasing(t, currentPhase.easing) * 36;
                          return `L ${i} ${y}`;
                        }).join(' ')}`}
                        fill="none"
                        stroke="black"
                        strokeWidth="1"
                        strokeOpacity="0.3"
                      />
                    </svg>
                  </div>
                </div>

                {/* Spin Settings */}
                {currentPhase.id === 'spinning' && (
                  <>
                    <div className="h-px bg-black/10 my-6" />

                    {/* Spin Speed */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs text-black/40 mb-2">
                        <span>Spin Speed</span>
                        <span>{spinSpeed} rot/s</span>
                      </div>
                      <input
                        type="range"
                        min="0.25"
                        max="5"
                        step="0.25"
                        value={spinSpeed}
                        onChange={(e) => setSpinSpeed(parseFloat(e.target.value))}
                        className="w-full accent-black/30"
                      />
                    </div>

                    {/* Spin-up */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs text-black/40 mb-2">
                        <span>Spin-up</span>
                        <span>{spinUpDuration.toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={spinUpDuration}
                        onChange={(e) => setSpinUpDuration(parseFloat(e.target.value))}
                        className="w-full accent-black/30"
                      />
                    </div>

                    {/* Effects */}
                    <div className="mb-6">
                      <div className="text-xs text-black/40 mb-2">Effects</div>
                      <div className="space-y-1">
                        <button
                          onClick={() => setSpinStrokeDash(!spinStrokeDash)}
                          className={`block w-full text-left px-2 py-1.5 text-xs rounded ${
                            spinStrokeDash ? 'bg-black/5 text-black/70' : 'text-black/40 hover:bg-black/[0.02]'
                          }`}
                        >
                          {spinStrokeDash ? '✓ ' : ''}Stroke Dash
                        </button>
                        <button
                          onClick={() => { setSpinGravity(!spinGravity); if (!spinGravity) setSpinElastic(false); }}
                          className={`block w-full text-left px-2 py-1.5 text-xs rounded ${
                            spinGravity ? 'bg-black/5 text-black/70' : 'text-black/40 hover:bg-black/[0.02]'
                          }`}
                        >
                          {spinGravity ? '✓ ' : ''}Gravity
                        </button>
                        <button
                          onClick={() => { setSpinElastic(!spinElastic); if (!spinElastic) setSpinGravity(false); }}
                          className={`block w-full text-left px-2 py-1.5 text-xs rounded ${
                            spinElastic ? 'bg-black/5 text-black/70' : 'text-black/40 hover:bg-black/[0.02]'
                          }`}
                        >
                          {spinElastic ? '✓ ' : ''}Elastic
                        </button>
                        <button
                          onClick={() => setSpinOpacityFade(!spinOpacityFade)}
                          className={`block w-full text-left px-2 py-1.5 text-xs rounded ${
                            spinOpacityFade ? 'bg-black/5 text-black/70' : 'text-black/40 hover:bg-black/[0.02]'
                          }`}
                        >
                          {spinOpacityFade ? '✓ ' : ''}Opacity Trail
                        </button>
                      </div>
                    </div>

                    {/* Stroke Dash Settings */}
                    {spinStrokeDash && (
                      <div className="mb-6 pl-3 border-l border-black/10">
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-xs text-black/40 mb-1">
                              <span>Pulse Speed</span>
                              <span>{strokePulseSpeed.toFixed(1)}/s</span>
                            </div>
                            <input type="range" min="0.5" max="5" step="0.1" value={strokePulseSpeed}
                              onChange={(e) => setStrokePulseSpeed(parseFloat(e.target.value))} className="w-full accent-black/30" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-black/40 mb-1">
                              <span>Min Visible</span>
                              <span>{(strokeMinVisible * 100).toFixed(0)}%</span>
                            </div>
                            <input type="range" min="0" max="0.9" step="0.05" value={strokeMinVisible}
                              onChange={(e) => setStrokeMinVisible(parseFloat(e.target.value))} className="w-full accent-black/30" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-black/40 mb-1">
                              <span>Stagger</span>
                              <span>{strokeStagger.toFixed(2)}</span>
                            </div>
                            <input type="range" min="0" max="0.3" step="0.01" value={strokeStagger}
                              onChange={(e) => setStrokeStagger(parseFloat(e.target.value))} className="w-full accent-black/30" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gravity Settings */}
                    {spinGravity && (
                      <div className="mb-6 pl-3 border-l border-black/10">
                        <div className="flex justify-between text-xs text-black/40 mb-1">
                          <span>Strength</span>
                          <span>±{(gravityStrength * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0.1" max="1" step="0.05" value={gravityStrength}
                          onChange={(e) => setGravityStrength(parseFloat(e.target.value))} className="w-full accent-black/30" />
                      </div>
                    )}

                    {/* Opacity Trail Settings */}
                    {spinOpacityFade && (
                      <div className="mb-6 pl-3 border-l border-black/10">
                        <div className="flex justify-between text-xs text-black/40 mb-1">
                          <span>Step Speed</span>
                          <span>{steppedSpeed}/s</span>
                        </div>
                        <input type="range" min="2" max="20" step="1" value={steppedSpeed}
                          onChange={(e) => setSteppedSpeed(parseFloat(e.target.value))} className="w-full accent-black/30" />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

// ============================================
// G Series face path
// ============================================

const G_FACE_PATH = "M11.5158 14.125C11.5158 13.9025 11.5818 13.685 11.7054 13.5C11.829 13.315 12.0047 13.1708 12.2103 13.0856C12.4159 13.0005 12.6421 12.9782 12.8603 13.0216C13.0785 13.065 13.279 13.1722 13.4363 13.3295C13.5936 13.4868 13.7008 13.6873 13.7442 13.9055C13.7876 14.1238 13.7653 14.35 13.6802 14.5555C13.595 14.7611 13.4508 14.9368 13.2658 15.0604C13.0808 15.184 12.8633 15.25 12.6408 15.25C12.3424 15.25 12.0563 15.1315 11.8453 14.9205C11.6343 14.7095 11.5158 14.4234 11.5158 14.125ZM20.5158 14.125C20.5158 14.3475 20.4498 14.565 20.3262 14.75C20.2026 14.935 20.0269 15.0792 19.8213 15.1644C19.6158 15.2495 19.3896 15.2718 19.1713 15.2284C18.9531 15.185 18.7527 15.0778 18.5953 14.9205C18.438 14.7632 18.3308 14.5627 18.2874 14.3445C18.244 14.1262 18.2663 13.9 18.3514 13.6945C18.4366 13.4889 18.5808 13.3132 18.7658 13.1896C18.9508 13.066 19.1683 13 19.3908 13C19.6892 13 19.9753 13.1185 20.1863 13.3295C20.3973 13.5405 20.5158 13.8266 20.5158 14.125ZM20.4155 18.625C19.4508 20.2928 17.8467 21.25 16.0158 21.25C14.1849 21.25 12.5818 20.2938 11.6171 18.625C11.5628 18.5396 11.5264 18.4442 11.5099 18.3444C11.4935 18.2446 11.4975 18.1425 11.5215 18.0442C11.5456 17.946 11.5893 17.8536 11.65 17.7727C11.7107 17.6918 11.7871 17.6239 11.8747 17.5733C11.9622 17.5227 12.0591 17.4903 12.1596 17.4781C12.26 17.4659 12.3618 17.4742 12.459 17.5023C12.5561 17.5305 12.6466 17.5781 12.7248 17.6421C12.8031 17.7062 12.8677 17.7854 12.9146 17.875C13.6149 19.0853 14.7155 19.75 16.0158 19.75C17.3161 19.75 18.4168 19.0844 19.1161 17.875C19.2156 17.7027 19.3794 17.577 19.5716 17.5254C19.7637 17.4739 19.9685 17.5009 20.1408 17.6003C20.3131 17.6998 20.4389 17.8636 20.4904 18.0558C20.5419 18.2479 20.515 18.4527 20.4155 18.625Z";

// ============================================
// G Series: EXACT coordinates from actual SVGs
// g1 = circle with face
// g2 = 8 short rays with face (all rays same short length)
// g3 = 7 rays (no topRight), cardinals longer, diagonals short
// g4 = 7 rays, diagonals caught up to cardinals
// g5 = 7 rays all max length, no face
// ============================================

type Line = [number, number, number, number];

// From g2.svg - 8 SHORT rays (all same length ~1 unit)
// Cardinals use rounded rect paths, ~1 unit long
// All 8 rays visible including topRight
const G2_RAYS = {
  // Cardinals: 1 unit long (from 5.98 to 6.98)
  top: [15.98, 5.98, 15.98, 6.98] as Line,
  right: [24.98, 15.98, 25.98, 15.98] as Line,
  bottom: [15.98, 24.98, 15.98, 25.98] as Line,
  left: [5.98, 15.98, 6.98, 15.98] as Line,
  // Diagonals: short (~1 unit)
  topLeft: [9.44, 8.38, 10.15, 9.09] as Line,
  topRight: [22.52, 8.38, 21.82, 9.09] as Line,
  bottomRight: [21.82, 21.81, 22.52, 22.52] as Line,
  bottomLeft: [10.15, 21.81, 9.44, 22.52] as Line,
};

// From g3.svg - 7 rays: cardinals LONGER (2 units), diagonals SHORT, NO topRight
// Cardinals use rounded rect paths from y=5.98 to y=7.98 (2 units)
// Diagonals: topLeft from (9.44, 8.38) to (10.15, 9.09)
const G3_RAYS = {
  // Cardinals: 2 units long (from SVG paths)
  top: [15.98, 5.98, 15.98, 7.98] as Line,
  right: [23.98, 15.98, 25.98, 15.98] as Line,
  bottom: [15.98, 23.23, 15.98, 25.98] as Line,
  left: [5.98, 15.98, 7.98, 15.98] as Line,
  // Diagonals: same short length as g2 (topRight gone)
  topLeft: [9.44, 8.38, 10.15, 9.09] as Line,
  topRight: null as unknown as Line, // GONE - will use opacity
  bottomRight: [21.82, 21.81, 22.52, 22.52] as Line,
  bottomLeft: [10.15, 21.81, 9.44, 22.52] as Line,
};

// From g4.svg - 7 rays: diagonals CAUGHT UP (~2 units)
// Cardinals same as g3, diagonals grow to ~2 units
// topLeft: (9.44, 8.38) to (10.86, 9.79)
// bottomRight: (21.11, 21.11) to (22.52, 22.52)
// bottomLeft: (10.86, 21.11) to (9.44, 22.52)
const G4_RAYS = {
  // Cardinals: same as g3 (2 units)
  top: [15.98, 5.98, 15.98, 7.98] as Line,
  right: [23.98, 15.98, 25.98, 15.98] as Line,
  bottom: [15.98, 23.23, 15.98, 25.98] as Line,
  left: [5.98, 15.98, 7.98, 15.98] as Line,
  // Diagonals: now ~2 units (caught up)
  topLeft: [9.44, 8.38, 10.86, 9.79] as Line,
  topRight: null as unknown as Line,
  bottomRight: [21.11, 21.11, 22.52, 22.52] as Line,
  bottomLeft: [10.86, 21.11, 9.44, 22.52] as Line,
};

// G5 rays: slightly longer than g4 (~3 units instead of 4)
// Cardinals: 3 units (top: y from 5.98 to 8.98)
const G5_RAYS = {
  // Cardinals: 3 units long (between g4's 2 and original g5's 4)
  top: [15.98, 5.98, 15.98, 8.98] as Line,
  right: [22.98, 15.98, 25.98, 15.98] as Line,
  bottom: [15.98, 22.23, 15.98, 25.98] as Line,
  left: [5.98, 15.98, 8.98, 15.98] as Line,
  // Diagonals: medium length
  topLeft: [9.44, 8.38, 11.56, 10.50] as Line,
  topRight: null as unknown as Line,
  bottomRight: [20.40, 20.40, 22.52, 22.52] as Line,
  bottomLeft: [11.56, 20.40, 9.44, 22.52] as Line,
};

// Interpolate between two lines
function lerpLine(a: Line, b: Line, t: number): Line {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

// Circle parameters (matching g1.svg outer circle)
const CIRCLE_CENTER = 16;
const CIRCLE_RADIUS = 9.75; // From g1.svg: 25.75 - 16 = 9.75

// Get point on circle at given angle (degrees, 0 = right, -90 = top)
function getCirclePoint(angle: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [
    CIRCLE_CENTER + Math.cos(rad) * CIRCLE_RADIUS,
    CIRCLE_CENTER + Math.sin(rad) * CIRCLE_RADIUS,
  ];
}

// Get control point for a quadratic bezier that approximates a 45° arc
// The control point is pushed outward from the midpoint of the arc
function getArcControlPoint(startAngle: number, endAngle: number): [number, number] {
  const midAngle = (startAngle + endAngle) / 2;
  const rad = (midAngle * Math.PI) / 180;
  // For a 45° arc, control point needs to be at ~1.1x radius for good approximation
  const controlRadius = CIRCLE_RADIUS * 1.1;
  return [
    CIRCLE_CENTER + Math.cos(rad) * controlRadius,
    CIRCLE_CENTER + Math.sin(rad) * controlRadius,
  ];
}

// 8 arc segments that form the circle
// Each arc is defined by: start point, end point, control point (for quadratic bezier)
// Arc naming: each arc morphs into the ray at the arc's angular midpoint direction
interface ArcSegment {
  start: [number, number];
  end: [number, number];
  control: [number, number];
  startAngle: number;
  endAngle: number;
}

const ARC_SEGMENTS: Record<string, ArcSegment> = {
  // Arc in the "top" region (between topLeft and top angles) → becomes "top" ray
  top: {
    startAngle: -135,
    endAngle: -90,
    start: getCirclePoint(-135),
    end: getCirclePoint(-90),
    control: getArcControlPoint(-135, -90),
  },
  // Arc in the "topRight" region → becomes "topRight" ray
  topRight: {
    startAngle: -90,
    endAngle: -45,
    start: getCirclePoint(-90),
    end: getCirclePoint(-45),
    control: getArcControlPoint(-90, -45),
  },
  // Arc in the "right" region → becomes "right" ray
  right: {
    startAngle: -45,
    endAngle: 0,
    start: getCirclePoint(-45),
    end: getCirclePoint(0),
    control: getArcControlPoint(-45, 0),
  },
  // Arc in the "bottomRight" region → becomes "bottomRight" ray
  bottomRight: {
    startAngle: 0,
    endAngle: 45,
    start: getCirclePoint(0),
    end: getCirclePoint(45),
    control: getArcControlPoint(0, 45),
  },
  // Arc in the "bottom" region → becomes "bottom" ray
  bottom: {
    startAngle: 45,
    endAngle: 90,
    start: getCirclePoint(45),
    end: getCirclePoint(90),
    control: getArcControlPoint(45, 90),
  },
  // Arc in the "bottomLeft" region → becomes "bottomLeft" ray
  bottomLeft: {
    startAngle: 90,
    endAngle: 135,
    start: getCirclePoint(90),
    end: getCirclePoint(135),
    control: getArcControlPoint(90, 135),
  },
  // Arc in the "left" region → becomes "left" ray
  left: {
    startAngle: 135,
    endAngle: 180,
    start: getCirclePoint(135),
    end: getCirclePoint(180),
    control: getArcControlPoint(135, 180),
  },
  // Arc in the "topLeft" region → becomes "topLeft" ray
  topLeft: {
    startAngle: 180,
    endAngle: 225, // Same as -135
    start: getCirclePoint(180),
    end: getCirclePoint(-135),
    control: getArcControlPoint(180, 225),
  },
};

// Helper to interpolate a single value
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ============================================
// G Animation Preview - controlled by progress prop
// ============================================

interface SpinOptions {
  strokeDash?: boolean;  // 1: Material Design - stroke grows/shrinks as it rotates
  gravity?: boolean;     // 2: Asymmetric speed - faster at bottom, slower at top
  elastic?: boolean;     // 3: Elastic overshoot at key rotation positions
  opacityFade?: boolean; // 4: Apple-style opacity trail on spokes
  // Fine-tuning params
  strokePulseSpeed?: number; // cycles per second for stroke dash
  strokeMinVisible?: number; // minimum visible ratio (0-1)
  strokeStagger?: number;    // stagger offset per ray
  gravityStrength?: number;  // speed variation amount (0-1)
  spinUpDuration?: number;   // seconds to ramp up to full speed
  opacityFadeMin?: number;   // minimum opacity for trail (0-1)
  steppedSpeed?: number;     // steps per second for Apple-style rotation
}

function GAnimationPreview({
  progress,
  isPlaying,
  size = 64,
  spinSpeed = 1,
  spinOptions = {},
  flipArcDirection = false
}: {
  progress: number;
  isPlaying: boolean;
  size?: number;
  spinSpeed?: number;
  spinOptions?: SpinOptions;
  flipArcDirection?: boolean;
}) {
  const [spinAngle, setSpinAngle] = useState(0);
  const [strokeDashOffset, setStrokeDashOffset] = useState(0); // For material design effect
  const [effectRamp, setEffectRamp] = useState(0); // 0-1 ramp for stroke dash fade-in
  const animationRef = useRef<number | undefined>(undefined);
  const angleRef = useRef(0); // Track angle without causing re-renders


  // Spin animation when playing
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setSpinAngle(0); // Reset angle when not spinning
      setEffectRamp(0); // Reset effect ramp
      angleRef.current = 0;
      return;
    }

    const startTime = performance.now();
    let lastTime = startTime;
    angleRef.current = 0; // Reset on play

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      const elapsed = (time - startTime) / 1000;
      lastTime = time;

      // Gradual spin-up: ramp from 0 to full speed
      const spinUpDur = spinOptions.spinUpDuration ?? 0.3;
      const spinUpProgress = spinUpDur > 0 ? Math.min(1, elapsed / spinUpDur) : 1;
      // Ease-out curve for natural acceleration
      const spinUpMultiplier = 1 - Math.pow(1 - spinUpProgress, 3);

      let newAngle: number;

      if (spinOptions.opacityFade) {
        // Apple-style: stepped rotation (discrete 45° jumps)
        // Uses steppedSpeed (steps per second) instead of spinSpeed
        const stepsPerRotation = 8;
        const stepAngle = 360 / stepsPerRotation;
        const speed = spinOptions.steppedSpeed ?? 8;
        const effectiveSpeed = speed * spinUpMultiplier;
        const totalSteps = Math.floor(elapsed * effectiveSpeed);
        newAngle = (totalSteps * stepAngle) % 360;
      } else if (spinOptions.gravity) {
        // 2: Gravity effect - speed varies based on position
        // Faster when rays point down (like gravity pulling), slower at top
        const currentAngle = angleRef.current % 360;
        const radians = (currentAngle * Math.PI) / 180;
        const strength = spinOptions.gravityStrength ?? 0.5;
        // At 90° (bottom), sin=1 → fastest. At 270° (top), sin=-1 → slowest
        const gravityMultiplier = 1 + strength * Math.sin(radians);
        const effectiveSpeed = spinSpeed * gravityMultiplier * spinUpMultiplier;
        newAngle = (angleRef.current + delta * 360 * effectiveSpeed) % 360;
      } else if (spinOptions.elastic) {
        // 5: Elastic overshoot - overshoots and settles at 90° intervals
        // Creates a "notchy" feel like it wants to snap to positions
        const baseAngle = elapsed * 360 * spinSpeed * spinUpMultiplier;
        const notchInterval = 90; // degrees between "notches"
        const notchProgress = (baseAngle % notchInterval) / notchInterval;

        // Elastic easing with overshoot using spring physics
        let elasticT: number;
        const c4 = (2 * Math.PI) / 3;
        if (notchProgress < 0.7) {
          // Main movement with overshoot
          const t = notchProgress / 0.7;
          elasticT = 1 + Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) * 0.3;
        } else {
          // Settle phase
          elasticT = 1;
        }

        const notchBase = Math.floor(baseAngle / notchInterval) * notchInterval;
        newAngle = (notchBase + elasticT * notchInterval) % 360;
      } else {
        // Default linear rotation with spin-up
        const effectiveSpeed = spinSpeed * spinUpMultiplier;
        newAngle = (angleRef.current + delta * 360 * effectiveSpeed) % 360;
      }

      angleRef.current = newAngle;
      setSpinAngle(newAngle);

      // 1: Stroke dash animation (Material Design effect)
      if (spinOptions.strokeDash) {
        // Cycle the dash offset for growing/shrinking stroke effect
        const pulseSpeed = spinOptions.strokePulseSpeed ?? 2;
        setStrokeDashOffset((elapsed * pulseSpeed) % 1);
        // Track effect ramp (ease-out curve for smooth fade-in of dash effect)
        setEffectRamp(spinUpMultiplier);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, spinSpeed, spinOptions.gravity, spinOptions.elastic, spinOptions.strokeDash, spinOptions.opacityFade, spinOptions.gravityStrength, spinOptions.strokePulseSpeed, spinOptions.spinUpDuration, spinOptions.steppedSpeed]);

  // Get state based on progress:
  // FORWARD (0-5):
  // 0: Actual circle with face
  // 0-1: Circle breaks into 8 curved arcs, arcs morph to rays (g2)
  // 1-2: topRight flashes out, cardinals grow (g2→g3)
  // 2-3: Diagonals catch up (g3→g4)
  // 3-4: Face disappears, rays grow to g5
  // 4-5: Spinning at g5
  // REVERSE (5-10):
  // Depends on reverseStyle - generally mirrors forward

  const p = progress;

  // Determine if we're in the reverse phase (progress > 5)
  const isReverse = p > 5;

  // Map reverse progress - direct morph mode
  const morphP = isReverse ? 6 : p; // 6 = special marker for direct morph rendering

  // Direct morph: t value for g5→circle transition (0 at p=5, 1 at p=10)
  const directMorphT = p > 5 ? (p - 5) / 5 : 0;

  // Show actual circle at start (p~0) or end (p>=10)
  const showCircle = p < 0.01 || directMorphT >= 0.99;

  // topRight visibility: visible at start, fades in during reverse
  const showTopRight = p < 1;
  const topRightOpacity = directMorphT > 0 ? directMorphT : 1;

  // Face visibility: visible during forward (morphP <= 3), appears instantly at end of reverse
  const faceAppearThreshold = 0.25; // Face appears when morph is 85% complete
  const faceVisibility = isReverse
    ? { show: directMorphT >= faceAppearThreshold, opacity: 1 } // Instant appear, no fade
    : { show: p <= 3, opacity: 1 };

  // Arc phases: forward (0-1) or reverse direct morph (5-10)
  const isArcPhase = p < 1 && p >= 0;
  const isDirectMorphArcPhase = directMorphT > 0 && directMorphT < 0.99;

  const rayKeys = ['top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottomLeft', 'left', 'topLeft'] as const;

  // Calculate ray coordinates based on morphP (handles both forward and reverse)
  const getRays = () => {
    const mp = morphP; // Use morphP which handles reverse mapping

    if (mp < 2) {
      // Progress 1-2: g2 → g3 (cardinals grow, diagonals stay short)
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
      // Progress 2-3: g3 → g4 (diagonals catch up)
      const t = mp - 2;

      return {
        top: G3_RAYS.top,
        right: G3_RAYS.right,
        bottom: G3_RAYS.bottom,
        left: G3_RAYS.left,
        topLeft: lerpLine(G3_RAYS.topLeft, G4_RAYS.topLeft, t),
        topRight: G2_RAYS.topRight,
        bottomRight: lerpLine(G3_RAYS.bottomRight, G4_RAYS.bottomRight, t),
        bottomLeft: lerpLine(G3_RAYS.bottomLeft, G4_RAYS.bottomLeft, t),
      };
    } else if (mp < 4) {
      // Progress 3-4: g4 → g5 (all rays grow to max, face gone)
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
      // Progress 4+: g5 state (spinning or transitioning)
      return {
        top: G5_RAYS.top,
        right: G5_RAYS.right,
        bottom: G5_RAYS.bottom,
        left: G5_RAYS.left,
        topLeft: G5_RAYS.topLeft,
        topRight: G2_RAYS.topRight,
        bottomRight: G5_RAYS.bottomRight,
        bottomLeft: G5_RAYS.bottomLeft,
      };
    }
  };

  const rays = !isArcPhase ? getRays() : null;

  // Rotation angle: spinning, or momentum settle during reverse
  let rotationAngle = isPlaying ? spinAngle : 0;

  // Add momentum/overshoot rotation AFTER face appears (last 15% of reverse morph)
  if (isReverse && directMorphT >= faceAppearThreshold) {
    // Remap t from 0.85-1.0 to 0-1 for the wobble animation
    const t = (directMorphT - faceAppearThreshold) / (1 - faceAppearThreshold);
    const overshootAmount = 40; // degrees of initial forward roll
    const frequency = 1.5; // oscillations
    const damping = 1.5; // decay rate

    // Use cos so it STARTS at max rotation (momentum carrying forward)
    // then oscillates back and settles to 0
    const decay = Math.exp(-damping * t);
    const oscillation = Math.cos(frequency * Math.PI * t);
    rotationAngle = overshootAmount * decay * oscillation;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{
        transform: rotationAngle !== 0 ? `rotate(${rotationAngle}deg)` : 'none',
      }}
    >
      {/* Actual circle - shown at p=0 */}
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

      {/* Face - visible based on morphP and reverseStyle */}
      {faceVisibility.show && (
        <path d={G_FACE_PATH} fill="black" opacity={faceVisibility.opacity} />
      )}

      {/* Arc phase (0 < morphP < 1): 8 curved arcs morphing into/from rays */}
      {isArcPhase && !showCircle && rayKeys.map(key => {
        const arc = ARC_SEGMENTS[key];
        const ray = G2_RAYS[key];
        const t = morphP; // 0 to 1

        // Interpolate start point: arc.start → ray start
        const startX = lerp(arc.start[0], ray[0], t);
        const startY = lerp(arc.start[1], ray[1], t);

        // Interpolate end point: arc.end → ray end
        const endX = lerp(arc.end[0], ray[2], t);
        const endY = lerp(arc.end[1], ray[3], t);

        // Interpolate control point: arc.control → midpoint of ray (makes it straight)
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

      {/* Direct-morph arc phase: G5 rays morph directly into curved arcs */}
      {/* flipArcDirection: swap start/end so curve goes opposite way */}
      {isDirectMorphArcPhase && !showCircle && rayKeys.map(key => {
        const arc = ARC_SEGMENTS[key];
        const ray = G5_RAYS[key]; // Start from G5 rays
        const t = directMorphT; // 0 = rays, 1 = arcs

        // Arc endpoints - flip if toggled
        const arcStart = flipArcDirection ? arc.end : arc.start;
        const arcEnd = flipArcDirection ? arc.start : arc.end;

        // Skip topRight if it's null (it's gone in G5)
        if (key === 'topRight' && !G5_RAYS.topRight) {
          // TopRight needs to fade in as it morphs - interpolate from G2 position
          const topRightRay = G2_RAYS.topRight;
          const startX = lerp(topRightRay[0], arcStart[0], t);
          const startY = lerp(topRightRay[1], arcStart[1], t);
          const endX = lerp(topRightRay[2], arcEnd[0], t);
          const endY = lerp(topRightRay[3], arcEnd[1], t);
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

        // For other rays: interpolate from G5 position to arc position
        const startX = lerp(ray[0], arcStart[0], t);
        const startY = lerp(ray[1], arcStart[1], t);
        const endX = lerp(ray[2], arcEnd[0], t);
        const endY = lerp(ray[3], arcEnd[1], t);

        // Control point: from ray midpoint (straight) to arc control (curved)
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

      {/* Ray phase (p >= 1): straight line segments */}
      {!isArcPhase && !isDirectMorphArcPhase && rays && rayKeys.map((key, rayIndex) => {
        if (key === 'topRight' && !showTopRight) return null;

        const line = rays[key];
        const dx = line[2] - line[0];
        const dy = line[3] - line[1];
        const rayLength = Math.sqrt(dx * dx + dy * dy);
        if (rayLength < 0.3) return null;

        // Material Design stroke-dash effect: rays grow and shrink
        // Effect ramps up during spin-up period for smooth transition
        let strokeDasharray: string | undefined;
        let strokeDashoffset: number | undefined;
        if (spinOptions.strokeDash && isPlaying) {
          // Each ray pulses its visible length
          // Stagger the animation per ray for wave effect
          const stagger = spinOptions.strokeStagger ?? 0.1;
          const staggerOffset = rayIndex * stagger;
          const phase = (strokeDashOffset + staggerOffset) % 1;
          // Sine wave: min→1→min visible length
          const minVisible = spinOptions.strokeMinVisible ?? 0.3;
          const baseVisibleRatio = minVisible + (1 - minVisible) * Math.abs(Math.sin(phase * Math.PI));

          // Use effectRamp to fade in the dash effect during spin-up
          // Start fully visible (1.0), gradually transition to baseVisibleRatio
          const visibleRatio = 1 - effectRamp * (1 - baseVisibleRatio);

          const visibleLength = rayLength * visibleRatio;
          strokeDasharray = `${visibleLength} ${rayLength}`;
          strokeDashoffset = 0;
        }

        // Apple-style: each spoke has different opacity (trailing effect)
        let opacity = 1;
        if (spinOptions.opacityFade && isPlaying) {
          // Map ray index to opacity: first ray = brightest, later rays fade
          // rayKeys order: top, topRight, right, bottomRight, bottom, bottomLeft, left, topLeft
          const numSpokes = 7; // We have 7 visible spokes (topRight is hidden)
          const visibleIndex = key === 'topRight' ? -1 :
            rayKeys.filter(k => k !== 'topRight').indexOf(key);
          if (visibleIndex >= 0) {
            // Calculate which "step" we're on based on spin angle
            const stepAngle = 45;
            const currentStep = Math.floor(spinAngle / stepAngle) % 8;
            // Each spoke's position relative to the current "lit" position
            const spokeAngles: Record<string, number> = {
              top: 0, right: 2, bottom: 4, left: 6,
              topLeft: 7, bottomRight: 3, bottomLeft: 5
            };
            const spokePos = spokeAngles[key] ?? 0;
            // Distance from current lit position (0 = brightest)
            const distance = (spokePos - currentStep + 8) % 8;
            // Opacity fades based on distance
            const minOpacity = spinOptions.opacityFadeMin ?? 0.2;
            opacity = 1 - (distance / 7) * (1 - minOpacity);
          }
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
            strokeDashoffset={strokeDashoffset}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}
