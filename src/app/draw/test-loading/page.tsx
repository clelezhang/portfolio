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
  { id: 'circle-to-rays', name: 'Circle → Rays', startProgress: 0, endProgress: 1, duration: 0.8, easing: 'ease-out' },
  { id: 'cardinals-grow', name: 'Cardinals Grow', startProgress: 1, endProgress: 2, duration: 0.5, easing: 'ease-in-out' },
  { id: 'diagonals-catch-up', name: 'Diagonals Catch Up', startProgress: 2, endProgress: 3, duration: 0.5, easing: 'ease-in-out' },
  { id: 'rays-grow', name: 'Rays Grow + Face Gone', startProgress: 3, endProgress: 4, duration: 0.4, easing: 'ease-out' },
  { id: 'spinning', name: 'Spinning', startProgress: 4, endProgress: 5, duration: 1.0, easing: 'linear' },
];

const ANIMATION_STATES = [
  { id: 'circle', name: 'Circle', progress: 0, description: 'Actual circle with face', phaseId: 'circle-to-rays' },
  { id: 'circle-to-rays', name: 'Circle → Rays (mid)', progress: 0.5, description: 'Circle breaking into curved arcs', phaseId: 'circle-to-rays' },
  { id: 'rays-8', name: '8 Short Rays', progress: 1, description: 'All 8 rays visible, short length (g2)', phaseId: 'cardinals-grow' },
  { id: 'rays-transition', name: '8→7 Rays (mid)', progress: 1.5, description: 'TopRight gone, cardinals growing', phaseId: 'cardinals-grow' },
  { id: 'rays-7-cardinals', name: '7 Rays (cardinals grown)', progress: 2, description: 'Cardinals longer (g3)', phaseId: 'diagonals-catch-up' },
  { id: 'diagonals-growing', name: 'Diagonals Growing', progress: 2.5, description: 'Diagonal rays catching up', phaseId: 'diagonals-catch-up' },
  { id: 'rays-7-even', name: '7 Rays (g4)', progress: 3, description: 'All 7 rays even, face disappears + rays grow', phaseId: 'rays-grow' },
  { id: 'rays-growing', name: 'Rays Growing (g5)', progress: 3.5, description: 'Rays growing to max length', phaseId: 'rays-grow' },
  { id: 'spinning', name: 'Spinning', progress: 4, description: 'Spinner rotating at g5 length', phaseId: 'spinning' },
];

export default function LoadingAnimationsTestPage() {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [comments, setComments] = useState<StateComment[]>([]);
  const [currentComment, setCurrentComment] = useState('');
  const [jsonCopied, setJsonCopied] = useState(false);

  // Animation playback
  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1);
  const animRef = useRef<number>();

  // Animation editor state
  const [phases, setPhases] = useState<AnimationPhase[]>(DEFAULT_PHASES);
  const [spinSpeed, setSpinSpeed] = useState(1); // rotations per second

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
    const config = { phases, spinSpeed, totalDuration };
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

    return Math.min(progress, 5);
  };

  // Full animation playback
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isAnimating) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTimeRef.current) / 1000;
      const progress = timeToProgress(elapsed);

      setAnimProgress(progress);

      // Loop after total duration + some spin time
      if (elapsed * animSpeed > totalDuration + 1) {
        startTimeRef.current = time;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isAnimating, animSpeed, phases, totalDuration]);

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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Animation Annotation Tool</h1>
        <p className="text-gray-400 mb-6">Scrub through states, adjust animation for each phase</p>

        {/* Top: Full Animation Player (Compact) */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-6">
            {/* Preview */}
            <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
              <GAnimationPreview
                progress={isAnimating ? animProgress : currentState.progress}
                isPlaying={isAnimating && animProgress >= 4}
                size={64}
                spinSpeed={spinSpeed}
              />
            </div>

            {/* Controls */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => {
                    if (isAnimating) {
                      setIsAnimating(false);
                    } else {
                      setAnimProgress(0);
                      setIsAnimating(true);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 text-sm font-semibold"
                >
                  {isAnimating ? '⏸ Pause' : '▶ Play All'}
                </button>

                {isAnimating && (
                  <button
                    onClick={() => { setIsAnimating(false); setAnimProgress(0); }}
                    className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"
                  >
                    ⏹
                  </button>
                )}

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-500">Speed:</span>
                  <input
                    type="number"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={animSpeed}
                    onChange={(e) => setAnimSpeed(parseFloat(e.target.value) || 1)}
                    className="w-12 px-1 py-0.5 bg-gray-700 rounded text-center"
                  />
                  <span className="text-gray-400">x</span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button onClick={exportConfig} className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs">Export</button>
                  <button onClick={() => setPhases(DEFAULT_PHASES)} className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">Reset All</button>
                </div>
              </div>

              {/* Timeline with clickable phases */}
              <div className="h-8 bg-gray-900 rounded flex overflow-hidden">
                {phases.map((phase, index) => {
                  const widthPercent = (phase.duration / totalDuration) * 100;
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-purple-500'];
                  const isCurrentPhase = phase.id === currentState.phaseId;
                  return (
                    <div
                      key={phase.id}
                      className={`${colors[index % colors.length]} ${isCurrentPhase ? 'ring-2 ring-white ring-inset' : ''} flex items-center justify-center text-[10px] font-medium border-r border-gray-700 last:border-r-0 cursor-pointer hover:brightness-110`}
                      style={{ width: `${widthPercent}%` }}
                      title={`${phase.name}: ${phase.duration}s`}
                      onClick={() => {
                        const stateForPhase = ANIMATION_STATES.findIndex(s => s.phaseId === phase.id);
                        if (stateForPhase >= 0) setCurrentStateIndex(stateForPhase);
                      }}
                    >
                      {widthPercent > 15 && <span className="truncate px-1">{phase.name.split(' ')[0]}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Total: {totalDuration.toFixed(1)}s • {isAnimating ? `Progress: ${animProgress.toFixed(2)}` : 'Click phase to jump'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: Scrub States + Per-State Phase Editor */}
        <div className="flex gap-6 mb-8">
          {/* Left: State Scrubber */}
          <div className="bg-gray-800 rounded-xl p-5 w-72 flex-shrink-0">
            <h2 className="text-sm font-semibold mb-3">Scrub States</h2>

            <div className="flex items-center justify-center mb-4">
              <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center">
                <GAnimationPreview progress={currentState.progress} isPlaying={isSpinning && currentState.id === 'spinning'} />
              </div>
            </div>

            {/* State Info */}
            <div className="text-center mb-4">
              <div className="text-lg font-semibold">{currentState.name}</div>
              <div className="text-sm text-gray-400">{currentState.description}</div>
              <div className="text-xs text-gray-500 mt-1">Progress: {currentState.progress}</div>
            </div>

            {/* State Navigation */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setCurrentStateIndex(Math.max(0, currentStateIndex - 1))}
                disabled={currentStateIndex === 0}
                className="px-3 py-2 bg-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-600"
              >
                ← Prev
              </button>

              <div className="flex-1 text-center text-sm text-gray-400">
                {currentStateIndex + 1} / {ANIMATION_STATES.length}
              </div>

              <button
                onClick={() => setCurrentStateIndex(Math.min(ANIMATION_STATES.length - 1, currentStateIndex + 1))}
                disabled={currentStateIndex === ANIMATION_STATES.length - 1}
                className="px-3 py-2 bg-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-600"
              >
                Next →
              </button>
            </div>

            {/* State Scrubber */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={ANIMATION_STATES.length - 1}
                value={currentStateIndex}
                onChange={(e) => setCurrentStateIndex(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                {ANIMATION_STATES.map((s, i) => (
                  <div
                    key={s.id}
                    className={`w-2 h-2 rounded-full cursor-pointer ${i === currentStateIndex ? 'bg-blue-500' : 'bg-gray-600'}`}
                    onClick={() => setCurrentStateIndex(i)}
                  />
                ))}
              </div>
            </div>

            {/* Play/Pause for spinning state */}
            {currentState.id === 'spinning' && (
              <button
                onClick={() => setIsSpinning(!isSpinning)}
                className="w-full px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 text-sm"
              >
                {isSpinning ? '⏸ Pause Spin' : '▶ Play Spin'}
              </button>
            )}
          </div>

          {/* Right: Per-State Phase Editor */}
          <div className="flex-1 bg-gray-800 rounded-xl p-5">
            {currentPhase && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold">Phase: {currentPhase.name}</h2>
                    <p className="text-xs text-gray-500">Progress {currentPhase.startProgress} → {currentPhase.endProgress}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
                      {currentPhaseIndex + 1}
                    </span>
                  </div>
                </div>

                {/* Duration Control */}
                <div className="mb-5">
                  <label className="text-xs text-gray-400 block mb-2">Duration</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.05"
                      value={currentPhase.duration}
                      onChange={(e) => updatePhase(currentPhase.id, 'duration', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0.05"
                      max="10"
                      step="0.05"
                      value={currentPhase.duration}
                      onChange={(e) => updatePhase(currentPhase.id, 'duration', parseFloat(e.target.value) || 0.1)}
                      className="w-20 px-2 py-1.5 bg-gray-700 rounded text-sm text-center"
                    />
                    <span className="text-sm text-gray-500">seconds</span>
                  </div>
                </div>

                {/* Easing Control */}
                <div className="mb-5">
                  <label className="text-xs text-gray-400 block mb-2">Easing</label>
                  <div className="grid grid-cols-3 gap-2">
                    {EASING_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updatePhase(currentPhase.id, 'easing', opt.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          currentPhase.easing === opt.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Easing Curve Preview */}
                <div className="mb-5">
                  <label className="text-xs text-gray-400 block mb-2">Easing Curve</label>
                  <div className="h-16 bg-gray-900 rounded-lg overflow-hidden p-2">
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path
                        d={`M 0 40 ${Array.from({ length: 101 }, (_, i) => {
                          const t = i / 100;
                          const y = 40 - applyEasing(t, currentPhase.easing) * 36;
                          return `L ${i} ${y}`;
                        }).join(' ')}`}
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="2"
                      />
                      <line x1="0" y1="40" x2="100" y2="40" stroke="#374151" strokeWidth="0.5" />
                      <line x1="0" y1="4" x2="100" y2="4" stroke="#374151" strokeWidth="0.5" strokeDasharray="2,2" />
                    </svg>
                  </div>
                </div>

                {/* Spin Speed (only for spinning phase) */}
                {currentPhase.id === 'spinning' && (
                  <div className="mb-5">
                    <label className="text-xs text-gray-400 block mb-2">Spin Speed</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.25"
                        max="5"
                        step="0.25"
                        value={spinSpeed}
                        onChange={(e) => setSpinSpeed(parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={spinSpeed}
                        onChange={(e) => setSpinSpeed(parseFloat(e.target.value) || 1)}
                        className="w-20 px-2 py-1.5 bg-gray-700 rounded text-sm text-center"
                      />
                      <span className="text-sm text-gray-500">rot/s</span>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2 mt-6 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      const defaultPhase = DEFAULT_PHASES.find(p => p.id === currentPhase.id);
                      if (defaultPhase) {
                        updatePhase(currentPhase.id, 'duration', defaultPhase.duration);
                        updatePhase(currentPhase.id, 'easing', defaultPhase.easing);
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                  >
                    Reset Phase
                  </button>
                  <button
                    onClick={() => updatePhase(currentPhase.id, 'duration', currentPhase.duration * 2)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                  >
                    2x Slower
                  </button>
                  <button
                    onClick={() => updatePhase(currentPhase.id, 'duration', Math.max(0.1, currentPhase.duration / 2))}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                  >
                    2x Faster
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Comments Section (collapsed) */}
        <details className="bg-gray-800 rounded-xl mb-8">
          <summary className="p-4 cursor-pointer text-sm font-medium hover:bg-gray-700/50 rounded-xl">
            Comments ({comments.length})
          </summary>
          <div className="p-4 pt-0">
            <div className="flex gap-4">
              <textarea
                value={currentComment}
                onChange={(e) => setCurrentComment(e.target.value)}
                placeholder={`Comment on "${currentState.name}"...`}
                className="flex-1 h-16 bg-gray-700 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addComment}
                disabled={!currentComment.trim()}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm h-fit"
              >
                Add
              </button>
            </div>
            {stateComments.length > 0 && (
              <div className="mt-3">
                {stateComments.map((c, i) => (
                  <div key={i} className="bg-gray-700 rounded-lg p-2 mb-1 text-xs">{c.comment}</div>
                ))}
              </div>
            )}
            {comments.length > 0 && (
              <button onClick={copyJson} className="mt-3 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs">
                {jsonCopied ? '✓ Copied!' : '📋 Copy JSON'}
              </button>
            )}
          </div>
        </details>

        {/* Quick State Overview */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">All States</h2>
          <div className="grid grid-cols-5 gap-4">
            {ANIMATION_STATES.map((state, i) => (
              <button
                key={state.id}
                onClick={() => setCurrentStateIndex(i)}
                className={`p-3 rounded-lg text-center transition-colors ${
                  i === currentStateIndex
                    ? 'bg-blue-600'
                    : comments.some(c => c.state === state.id)
                    ? 'bg-gray-700 ring-2 ring-green-500'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="w-12 h-12 mx-auto mb-2 bg-white rounded-lg flex items-center justify-center">
                  <GAnimationPreview progress={state.progress} isPlaying={false} size={32} />
                </div>
                <div className="text-xs truncate">{state.name}</div>
                {comments.some(c => c.state === state.id) && (
                  <div className="text-[10px] text-green-400 mt-1">
                    {comments.filter(c => c.state === state.id).length} comment(s)
                  </div>
                )}
              </button>
            ))}
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

function GAnimationPreview({ progress, isPlaying, size = 64, spinSpeed = 1 }: { progress: number; isPlaying: boolean; size?: number; spinSpeed?: number }) {
  const [spinAngle, setSpinAngle] = useState(0);
  const animationRef = useRef<number>();

  // Spin animation when playing
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    let lastTime = performance.now();
    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setSpinAngle(a => (a + delta * 360 * spinSpeed) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, spinSpeed]);

  // Get state based on progress:
  // 0: Actual circle with face
  // 0-1: Circle breaks into 8 curved arcs, arcs morph to rays (g2)
  // 1-2: topRight flashes out, cardinals grow (g2→g3)
  // 2-3: Diagonals catch up (g3→g4)
  // 3-4: Face disappears, rays grow to g5
  // 4+: Spinning at g5

  const p = progress;

  // Show actual circle only at p=0
  const showCircle = p < 0.01;

  // topRight visibility: visible until progress reaches 1, then instantly disappears
  const showTopRight = p < 1;

  // Face visibility: disappears at progress 3 (same time rays start growing to g5)
  const showFace = p < 3;

  // For p < 1: morphing from arcs to rays
  // For p >= 1: just rays (use line elements)
  const isArcPhase = p < 1;

  const rayKeys = ['top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottomLeft', 'left', 'topLeft'] as const;

  // Calculate ray coordinates for p >= 1
  const getRays = () => {
    if (p < 2) {
      // Progress 1-2: g2 → g3 (cardinals grow, diagonals stay short)
      const t = p - 1;

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
    } else if (p < 3) {
      // Progress 2-3: g3 → g4 (diagonals catch up)
      const t = p - 2;

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
    } else if (p < 4) {
      // Progress 3-4: g4 → g5 (all rays grow to max, face gone)
      const t = p - 3;

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
      // Progress 4+: g5 state (spinning)
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

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{
        transform: isPlaying ? `rotate(${spinAngle}deg)` : 'none',
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

      {/* Face - visible until progress 3, then instantly disappears */}
      {showFace && (
        <path d={G_FACE_PATH} fill="black" />
      )}

      {/* Arc phase (0 < p < 1): 8 curved arcs morphing into rays */}
      {isArcPhase && !showCircle && rayKeys.map(key => {
        const arc = ARC_SEGMENTS[key];
        const ray = G2_RAYS[key];
        const t = p; // 0 to 1

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

      {/* Ray phase (p >= 1): straight line segments */}
      {!isArcPhase && rays && rayKeys.map(key => {
        if (key === 'topRight' && !showTopRight) return null;

        const line = rays[key];
        const dx = line[2] - line[0];
        const dy = line[3] - line[1];
        if (Math.sqrt(dx * dx + dy * dy) < 0.3) return null;

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
          />
        );
      })}
    </svg>
  );
}
