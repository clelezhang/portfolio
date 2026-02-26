'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import ShinesIcon from './icons/ShinesIcon';

interface SpinningCDProps {
  artwork?: string;
  className?: string;
  isPaused?: boolean;
  isLoading?: boolean;
}

const SpinningCD = memo(function SpinningCD({
  artwork = "/cd.png",
  className = "",
  isPaused = false,
  isLoading = false
}: SpinningCDProps) {
  const controls = useAnimationControls();
  const rotationRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Crossfade: track previous artwork, new one fades in on top via CSS animation
  const [prevArtwork, setPrevArtwork] = useState<string | null>(null);
  const prevArtworkRef = useRef<string | null>(null);
  const artworkKeyRef = useRef(0);

  if (artwork !== prevArtworkRef.current) {
    setPrevArtwork(prevArtworkRef.current);
    prevArtworkRef.current = artwork;
    artworkKeyRef.current += 1;
  }

  // Clear prev artwork after animation completes
  useEffect(() => {
    if (prevArtwork) {
      const timer = setTimeout(() => setPrevArtwork(null), 100);
      return () => clearTimeout(timer);
    }
  }, [prevArtwork]);

  const targetSpeedRef = useRef(isLoading ? 200 : 45);
  targetSpeedRef.current = isLoading ? 200 : 45;
  const currentSpeedRef = useRef(targetSpeedRef.current);

  useEffect(() => {
    if (!isPaused) {
      lastTimeRef.current = null;

      // Cancel any deceleration in progress
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      // Start continuous spin with smooth speed transitions
      const spin = (time: number) => {
        if (lastTimeRef.current === null) lastTimeRef.current = time;
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;
        // Lerp current speed toward target (~3x per second decay)
        const lerpFactor = 1 - Math.pow(0.05, dt);
        currentSpeedRef.current += (targetSpeedRef.current - currentSpeedRef.current) * lerpFactor;
        rotationRef.current = (rotationRef.current + currentSpeedRef.current * dt) % 360;
        controls.set({ rotate: rotationRef.current });
        animFrameRef.current = requestAnimationFrame(spin);
      };
      animFrameRef.current = requestAnimationFrame(spin);
    } else {
      // Decelerate with momentum
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      let velocity = currentSpeedRef.current;
      let lastTime: number | null = null;

      const decelerate = (time: number) => {
        if (lastTime === null) lastTime = time;
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        // Exponential decay — feels like friction
        velocity *= Math.pow(0.005, dt); // fast friction
        rotationRef.current = (rotationRef.current + velocity * dt) % 360;
        controls.set({ rotate: rotationRef.current });

        if (velocity > 0.5) {
          animFrameRef.current = requestAnimationFrame(decelerate);
        } else {
          animFrameRef.current = null;
        }
      };
      animFrameRef.current = requestAnimationFrame(decelerate);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPaused, isLoading, controls]);

  return (
    <div className={`relative w-8 h-8 group ${className}`}>
      {/* Static Shadow */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-300 shadow-hover cd-shadow-container"
      />

      {/* Scale wrapper - hover detected on parent .group, scale applied here */}
      <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-200">
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden bg-gray-300 cd-spinning-disc"
          animate={controls}
        >
          {/* Album Artwork with crossfade */}
          {prevArtwork && (
            <div
              className="absolute inset-0 rounded-full bg-cover bg-center border border-gray-300 cd-artwork-mask"
              style={{ backgroundImage: `url(${prevArtwork})` }}
            />
          )}
          <div
            key={artworkKeyRef.current}
            className="absolute inset-0 rounded-full bg-cover bg-center border border-gray-300 cd-artwork-mask cd-artwork-fadein"
            style={{ backgroundImage: `url(${artwork})` }}
          />

          {/* CD Data Rings */}
          <div className="absolute inset-0 rounded-full">
            {/* Center rings */}
            <div
              className="absolute top-1/2 left-1/2 w-6 h-6 rounded-full border border-gray-100 transform -translate-x-1/2 -translate-y-1/2 cd-ring-center"
            />
            <div
              className="absolute top-1/2 left-1/2 w-5 h-5 rounded-full border border-gray-100 transform -translate-x-1/2 -translate-y-1/2 cd-ring-center"
            />
            <div
              className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full border border-gray-100 transform -translate-x-1/2 -translate-y-1/2 cd-ring-center"
            />
          </div>

          {/* Center Hole Ring */}
          <div
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full border border-gray-300 transform -translate-x-1/2 -translate-y-1/2"
            style={{ willChange: 'transform' }}
          />
        </motion.div>
      </div>

      {/* Shines overlay - doesn't spin */}
      <div className="absolute inset-0 pointer-events-none">
        <ShinesIcon className="w-full h-full opacity-60" />
      </div>
    </div>
  );
});

export default SpinningCD;
