'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import ShinesIcon from './icons/ShinesIcon';

interface SpinningCDProps {
  artwork?: string;
  className?: string;
  isPlaying?: boolean;
}

const SpinningCD = memo(function SpinningCD({
  artwork = "/cd.png",
  className = "",
  isPlaying = true
}: SpinningCDProps) {
  const controls = useAnimationControls();
  const rotationRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [isStopped, setIsStopped] = useState(!isPlaying);

  // Speed in degrees per second when playing
  const SPIN_SPEED = 45; // 360/8 = 45 deg/s (matches original 8s per rotation)

  useEffect(() => {
    if (isPlaying) {
      setIsStopped(false);
      lastTimeRef.current = null;

      // Cancel any deceleration in progress
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      // Start continuous spin
      const spin = (time: number) => {
        if (lastTimeRef.current === null) lastTimeRef.current = time;
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;
        rotationRef.current = (rotationRef.current + SPIN_SPEED * dt) % 360;
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

      let velocity = SPIN_SPEED;
      let lastTime: number | null = null;

      const decelerate = (time: number) => {
        if (lastTime === null) lastTime = time;
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        // Exponential decay — feels like friction
        velocity *= Math.pow(0.04, dt); // drops to ~4% per second
        rotationRef.current = (rotationRef.current + velocity * dt) % 360;
        controls.set({ rotate: rotationRef.current });

        if (velocity > 0.5) {
          animFrameRef.current = requestAnimationFrame(decelerate);
        } else {
          animFrameRef.current = null;
          setIsStopped(true);
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
  }, [isPlaying, controls]);

  return (
    <div className={`relative w-8 h-8 group ${className}`}>
      {/* Static Shadow */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-300 shadow-hover cd-shadow-container"
      />

      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden bg-gray-300 cd-spinning-disc"
        animate={controls}
        whileHover={{ scale: 1.05 }}
      >
      {/* Album Artwork with Center Hole Cutout */}
      <div
        className="absolute inset-0 rounded-full bg-cover bg-center border border-gray-300 cd-artwork-mask"
        style={{
          backgroundImage: `url(${artwork})`
        }}
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

      {/* Shines overlay - doesn't spin */}
      <div className="absolute inset-0 pointer-events-none">
        <ShinesIcon className="w-full h-full opacity-60" />
      </div>
    </div>
  );
});

export default SpinningCD;
