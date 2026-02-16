'use client';

import { useState, useEffect, useRef } from 'react';
import '../draw.css';

// Wink Animation Tool
// Simple animation: Normal face → overshoot rotation + wink

// Face paths from g1 (normal) and WINK.svg
const NORMAL_FACE_PATH = "M11.5158 14.125C11.5158 13.9025 11.5818 13.685 11.7054 13.5C11.829 13.315 12.0047 13.1708 12.2103 13.0856C12.4159 13.0005 12.6421 12.9782 12.8603 13.0216C13.0785 13.065 13.279 13.1722 13.4363 13.3295C13.5936 13.4868 13.7008 13.6873 13.7442 13.9055C13.7876 14.1238 13.7653 14.35 13.6802 14.5555C13.595 14.7611 13.4508 14.9368 13.2658 15.0604C13.0808 15.184 12.8633 15.25 12.6408 15.25C12.3424 15.25 12.0563 15.1315 11.8453 14.9205C11.6343 14.7095 11.5158 14.4234 11.5158 14.125ZM20.5158 14.125C20.5158 14.3475 20.4498 14.565 20.3262 14.75C20.2026 14.935 20.0269 15.0792 19.8213 15.1644C19.6158 15.2495 19.3896 15.2718 19.1713 15.2284C18.9531 15.185 18.7527 15.0778 18.5953 14.9205C18.438 14.7632 18.3308 14.5627 18.2874 14.3445C18.244 14.1262 18.2663 13.9 18.3514 13.6945C18.4366 13.4889 18.5808 13.3132 18.7658 13.1896C18.9508 13.066 19.1683 13 19.3908 13C19.6892 13 19.9753 13.1185 20.1863 13.3295C20.3973 13.5405 20.5158 13.8266 20.5158 14.125ZM20.4155 18.625C19.4508 20.2928 17.8467 21.25 16.0158 21.25C14.1849 21.25 12.5818 20.2938 11.6171 18.625C11.5628 18.5396 11.5264 18.4442 11.5099 18.3444C11.4935 18.2446 11.4975 18.1425 11.5215 18.0442C11.5456 17.946 11.5893 17.8536 11.65 17.7727C11.7107 17.6918 11.7871 17.6239 11.8747 17.5733C11.9622 17.5227 12.0591 17.4903 12.1596 17.4781C12.26 17.4659 12.3618 17.4742 12.459 17.5023C12.5561 17.5305 12.6466 17.5781 12.7248 17.6421C12.8031 17.7062 12.8677 17.7854 12.9146 17.875C13.6149 19.0853 14.7155 19.75 16.0158 19.75C17.3161 19.75 18.4168 19.0844 19.1161 17.875C19.2156 17.7027 19.3794 17.577 19.5716 17.5254C19.7637 17.4739 19.9685 17.5009 20.1408 17.6003C20.3131 17.6998 20.4389 17.8636 20.4904 18.0558C20.5419 18.2479 20.515 18.4527 20.4155 18.625Z";

// Left eye (normal dot) - extracted from normal face
const LEFT_EYE_PATH = "M11.5158 14.125C11.5158 13.9025 11.5818 13.685 11.7054 13.5C11.829 13.315 12.0047 13.1708 12.2103 13.0856C12.4159 13.0005 12.6421 12.9782 12.8603 13.0216C13.0785 13.065 13.279 13.1722 13.4363 13.3295C13.5936 13.4868 13.7008 13.6873 13.7442 13.9055C13.7876 14.1238 13.7653 14.35 13.6802 14.5555C13.595 14.7611 13.4508 14.9368 13.2658 15.0604C13.0808 15.184 12.8633 15.25 12.6408 15.25C12.3424 15.25 12.0563 15.1315 11.8453 14.9205C11.6343 14.7095 11.5158 14.4234 11.5158 14.125Z";

// Right eye (normal dot) - extracted from normal face
const RIGHT_EYE_PATH = "M20.5158 14.125C20.5158 14.3475 20.4498 14.565 20.3262 14.75C20.2026 14.935 20.0269 15.0792 19.8213 15.1644C19.6158 15.2495 19.3896 15.2718 19.1713 15.2284C18.9531 15.185 18.7527 15.0778 18.5953 14.9205C18.438 14.7632 18.3308 14.5627 18.2874 14.3445C18.244 14.1262 18.2663 13.9 18.3514 13.6945C18.4366 13.4889 18.5808 13.3132 18.7658 13.1896C18.9508 13.066 19.1683 13 19.3908 13C19.6892 13 19.9753 13.1185 20.1863 13.3295C20.3973 13.5405 20.5158 13.8266 20.5158 14.125Z";

// Right eye winking - horizontal line at same position as normal right eye
// Normal right eye center is around (19.4, 14.125), so wink line spans that area
const WINK_LINE = { x1: 18.2, y: 14.125, x2: 20.6 }; // Horizontal line coordinates

// Smile path (same in both)
const SMILE_PATH = "M20.4155 18.625C19.4508 20.2928 17.8467 21.25 16.0158 21.25C14.1849 21.25 12.5818 20.2938 11.6171 18.625C11.5628 18.5396 11.5264 18.4442 11.5099 18.3444C11.4935 18.2446 11.4975 18.1425 11.5215 18.0442C11.5456 17.946 11.5893 17.8536 11.65 17.7727C11.7107 17.6918 11.7871 17.6239 11.8747 17.5733C11.9622 17.5227 12.0591 17.4903 12.1596 17.4781C12.26 17.4659 12.3618 17.4742 12.459 17.5023C12.5561 17.5305 12.6466 17.5781 12.7248 17.6421C12.8031 17.7062 12.8677 17.7854 12.9146 17.875C13.6149 19.0853 14.7155 19.75 16.0158 19.75C17.3161 19.75 18.4168 19.0844 19.1161 17.875C19.2156 17.7027 19.3794 17.577 19.5716 17.5254C19.7637 17.4739 19.9685 17.5009 20.1408 17.6003C20.3131 17.6998 20.4389 17.8636 20.4904 18.0558C20.5419 18.2479 20.515 18.4527 20.4155 18.625Z";

// Circle parameters
const CIRCLE_CENTER = 16;
const CIRCLE_RADIUS = 9.75;

export default function WinkAnimationTestPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 = normal, 1 = full wink
  const [duration, setDuration] = useState(0.5); // seconds for full animation
  const [overshootAmount, setOvershootAmount] = useState(40);
  const [frequency, setFrequency] = useState(1.5); // Higher = more oscillations (allows bounce back)
  const [damping, setDamping] = useState(1.5); // Lower = slower decay (bounce back visible)

  const animRef = useRef<number | undefined>(undefined);

  // Play animation - runs until rotation settles back to ~0
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const t = elapsed / duration; // Don't cap at 1 - let it run until settled

      setProgress(t);

      // Calculate current rotation to check if settled
      const currentDecay = Math.exp(-damping * t);
      const currentOscillation = Math.sin(frequency * Math.PI * t);
      const currentRotation = Math.abs(overshootAmount * currentDecay * currentOscillation);

      // Stop when rotation is nearly 0 AND we've completed at least one full oscillation (t > 0.8)
      // This ensures the bounce-back is visible before stopping
      if (t > 0.8 && currentRotation < 0.5) {
        setProgress(0); // Reset to 0 for clean end state
        setIsPlaying(false);
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, duration, damping, frequency, overshootAmount]);

  // Calculate rotation based on progress (damped oscillation)
  // Use sin so it STARTS at 0, peaks, then settles back to 0
  const decay = Math.exp(-damping * progress);
  const oscillation = Math.sin(frequency * Math.PI * progress);
  const rotationAngle = overshootAmount * decay * oscillation;

  // Wink only during positive rotation (not during bounce-back)
  const rotationThreshold = 10; // degrees - wink when rotation > this
  const isWinking = rotationAngle > rotationThreshold;

  return (
    <div className="min-h-screen bg-lightgray text-slate flex font-sans">
      {/* Left Preview */}
      <div className="w-64 border-r border-gray-100 p-6 sticky top-0 h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Large preview */}
          <div className="w-40 h-40 border border-gray-100 rounded-2xl flex items-center justify-center mb-6 bg-white/50">
            <svg
              width={96}
              height={96}
              viewBox="0 0 32 32"
              fill="none"
              style={{
                transform: `rotate(${rotationAngle}deg)`,
              }}
            >
              {/* Circle */}
              <circle
                cx={CIRCLE_CENTER}
                cy={CIRCLE_CENTER}
                r={CIRCLE_RADIUS}
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              {/* Left eye (always normal) */}
              <path d={LEFT_EYE_PATH} fill="currentColor" />
              {/* Right eye (normal or winking) */}
              {isWinking ? (
                <line
                  x1={WINK_LINE.x1}
                  y1={WINK_LINE.y}
                  x2={WINK_LINE.x2}
                  y2={WINK_LINE.y}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <path d={RIGHT_EYE_PATH} fill="currentColor" />
              )}
              {/* Smile */}
              <path d={SMILE_PATH} fill="currentColor" />
            </svg>
          </div>

          {/* Play button */}
          <button
            onClick={() => {
              setProgress(0);
              setIsPlaying(true);
            }}
            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 mb-4 font-medium transition-colors"
          >
            {isPlaying ? 'Playing...' : '▶ Play Wink'}
          </button>

          {/* Progress scrubber */}
          <div className="w-full mb-6">
            <div className="text-[10px] text-gray-400 mb-1">Progress</div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.01"
              value={progress}
              onChange={(e) => {
                setIsPlaying(false);
                setProgress(parseFloat(e.target.value));
              }}
              className="w-full accent-slate"
            />
            <div className="text-[10px] text-gray-400 text-center">
              {progress.toFixed(2)}
            </div>
          </div>

          {/* Duration */}
          <div className="w-full mb-4">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Duration</span>
              <span>{duration.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.05"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="w-full accent-slate"
            />
          </div>
        </div>
      </div>

      {/* Main Content - Controls */}
      <div className="flex-1 p-8">
        <div className="max-w-md">
          <h1 className="text-lg font-medium mb-6 tracking-[-0.02em]">Wink Animation</h1>

          <div className="text-xs text-gray-400 mb-2">Normal → Overshoot + Wink → Settle</div>

          {/* Overshoot Amount */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Overshoot Amount</span>
              <span>{overshootAmount}°</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={overshootAmount}
              onChange={(e) => setOvershootAmount(parseFloat(e.target.value))}
              className="w-full accent-slate"
            />
          </div>

          {/* Frequency */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Oscillation Frequency</span>
              <span>{frequency}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.25"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="w-full accent-slate"
            />
          </div>

          {/* Damping */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Damping</span>
              <span>{damping}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.25"
              value={damping}
              onChange={(e) => setDamping(parseFloat(e.target.value))}
              className="w-full accent-slate"
            />
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-400 space-y-1">
              <div>Rotation: {rotationAngle.toFixed(1)}°</div>
              <div>Wink: {isWinking ? 'Yes' : 'No'} (threshold: {rotationThreshold}°)</div>
            </div>
          </div>

          {/* State previews */}
          <div className="mt-8 flex gap-4">
            <div className="text-center">
              <div className="w-16 h-16 border border-gray-100 rounded-xl flex items-center justify-center mb-1 bg-white/50">
                <svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                  <circle cx={CIRCLE_CENTER} cy={CIRCLE_CENTER} r={CIRCLE_RADIUS} stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d={LEFT_EYE_PATH} fill="currentColor" />
                  <path d={RIGHT_EYE_PATH} fill="currentColor" />
                  <path d={SMILE_PATH} fill="currentColor" />
                </svg>
              </div>
              <div className="text-[10px] text-gray-400">Normal</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 border border-gray-100 rounded-xl flex items-center justify-center mb-1 bg-white/50">
                <svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                  <circle cx={CIRCLE_CENTER} cy={CIRCLE_CENTER} r={CIRCLE_RADIUS} stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d={LEFT_EYE_PATH} fill="currentColor" />
                  <line x1={WINK_LINE.x1} y1={WINK_LINE.y} x2={WINK_LINE.x2} y2={WINK_LINE.y} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d={SMILE_PATH} fill="currentColor" />
                </svg>
              </div>
              <div className="text-[10px] text-gray-400">Wink</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
