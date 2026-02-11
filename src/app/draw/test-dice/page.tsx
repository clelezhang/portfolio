'use client';

import { useState } from 'react';
import '../draw.css';

// Animation configs for showcase
const ANIMATIONS = [
  {
    name: 'Bounce Roll',
    description: 'Spin with elastic bounce',
    className: 'dice-bounce-roll',
    duration: 600,
    is3D: false,
  },
  {
    name: 'Wobble Roll',
    description: 'Wobbly rolling motion',
    className: 'dice-wobble',
    duration: 600,
    is3D: false,
  },
  {
    name: '3D Cube Roll',
    description: 'Actual cube tumbling',
    className: 'dice-cube-roll',
    duration: 1000,
    is3D: true,
  },
];

// 3D Dice Cube component
function DiceCube({ isAnimating, finalFace, duration, spins, easing }: {
  isAnimating: boolean;
  finalFace: number;
  duration: number;
  spins: number;
  easing: string;
}) {
  // Map final face to rotation that shows that face
  // Face 1 = front, 2 = back, 3 = right, 4 = left, 5 = top, 6 = bottom
  const faceRotations: Record<number, string> = {
    0: 'rotateX(0deg) rotateY(0deg)', // face 1 (front)
    1: 'rotateX(0deg) rotateY(180deg)', // face 2 (back)
    2: 'rotateX(0deg) rotateY(-90deg)', // face 3 (right)
    3: 'rotateX(0deg) rotateY(90deg)', // face 4 (left)
    4: 'rotateX(-90deg) rotateY(0deg)', // face 5 (top)
    5: 'rotateX(90deg) rotateY(0deg)', // face 6 (bottom)
  };

  const spinMultiplier = spins * 360;

  return (
    <div className="dice-cube-container">
      <div className={`dice-cube ${isAnimating ? 'dice-cube-rolling' : ''}`}
        style={{
          '--final-rotation': faceRotations[finalFace],
          '--cube-duration': `${duration}ms`,
          '--cube-easing': easing,
          '--spin-x': `${spinMultiplier}deg`,
          '--spin-y': `${spinMultiplier * 0.7}deg`,
        } as React.CSSProperties}>
        <div className="dice-cube-face dice-cube-front">
          <img src="/draw/dice1.svg" alt="1" />
        </div>
        <div className="dice-cube-face dice-cube-back">
          <img src="/draw/dice2.svg" alt="2" />
        </div>
        <div className="dice-cube-face dice-cube-right">
          <img src="/draw/dice3.svg" alt="3" />
        </div>
        <div className="dice-cube-face dice-cube-left">
          <img src="/draw/dice4.svg" alt="4" />
        </div>
        <div className="dice-cube-face dice-cube-top">
          <img src="/draw/dice5.svg" alt="5" />
        </div>
        <div className="dice-cube-face dice-cube-bottom">
          <img src="/draw/dice6.svg" alt="6" />
        </div>
      </div>
    </div>
  );
}

export default function TestDicePage() {
  const [animatingIds, setAnimatingIds] = useState<Set<number>>(new Set());
  const [diceStates, setDiceStates] = useState<number[]>(
    [...ANIMATIONS.map(() => 0), 0] // +1 for random mix dice
  );
  const [currentAnimClass, setCurrentAnimClass] = useState<string | null>(null);

  // 3D Cube tuning parameters
  const [cubeDuration, setCubeDuration] = useState(1000);
  const [cubeSpins, setCubeSpins] = useState(2);
  const [cubeEasing, setCubeEasing] = useState('ease-out');

  // For random mix - which animations are enabled
  const [enabledAnimations, setEnabledAnimations] = useState<Set<number>>(
    new Set([0, 1, 2]) // all enabled by default
  );

  const handleDiceClick = (index: number) => {
    if (animatingIds.has(index)) return;

    setAnimatingIds((prev) => new Set(prev).add(index));

    const anim = ANIMATIONS[index];

    // Change dice face to random value midway through animation
    setTimeout(() => {
      setDiceStates((prev) => {
        const next = [...prev];
        let newFace;
        do {
          newFace = Math.floor(Math.random() * 6);
        } while (newFace === prev[index]);
        next[index] = newFace;
        return next;
      });
    }, anim.duration / 2);

    // End animation
    setTimeout(() => {
      setAnimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, anim.duration);
  };

  const handleRandomMixClick = () => {
    const RANDOM_INDEX = ANIMATIONS.length; // index for random mix dice
    if (animatingIds.has(RANDOM_INDEX)) return;

    // Get enabled animation indices
    const enabledIndices = Array.from(enabledAnimations);
    if (enabledIndices.length === 0) return;

    // Pick random animation from enabled ones
    const randomAnimIndex = enabledIndices[Math.floor(Math.random() * enabledIndices.length)];
    const anim = ANIMATIONS[randomAnimIndex];

    setAnimatingIds((prev) => new Set(prev).add(RANDOM_INDEX));
    setCurrentAnimClass(anim.className);

    // Change dice face midway
    setTimeout(() => {
      setDiceStates((prev) => {
        const next = [...prev];
        let newFace;
        do {
          newFace = Math.floor(Math.random() * 6);
        } while (newFace === prev[RANDOM_INDEX]);
        next[RANDOM_INDEX] = newFace;
        return next;
      });
    }, anim.duration / 2);

    // End animation
    setTimeout(() => {
      setAnimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(RANDOM_INDEX);
        return next;
      });
      setCurrentAnimClass(null);
    }, anim.duration);
  };

  const toggleAnimation = (index: number) => {
    setEnabledAnimations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const rollAll = () => {
    ANIMATIONS.forEach((_, i) => {
      setTimeout(() => handleDiceClick(i), i * 100);
    });
    setTimeout(() => handleRandomMixClick(), ANIMATIONS.length * 100);
  };

  const RANDOM_INDEX = ANIMATIONS.length;

  return (
    <div className="dice-test-page">
      <style jsx global>{`
        .dice-test-page {
          min-height: 100vh;
          background: #fff;
          padding: 40px 20px;
          font-family: system-ui, sans-serif;
        }

        .dice-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .dice-title {
          font-size: 48px;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .dice-subtitle {
          color: #666;
          font-size: 18px;
        }

        .dice-roll-all {
          display: block;
          margin: 0 auto 40px;
          padding: 12px 32px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          background: #1a1a1a;
          border: none;
          border-radius: 24px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .dice-roll-all:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .dice-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          max-width: 900px;
          margin: 0 auto;
        }

        .dice-card {
          background: #fafafa;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .dice-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
        }

        .dice-card--random {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-color: rgba(251, 191, 36, 0.3);
        }

        .dice-container {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          perspective: 200px;
          overflow: hidden;
          border-radius: 6px;
        }

        .dice-img {
          width: 100px;
          height: 100px;
          min-width: 100px;
          min-height: 100px;
          flex-shrink: 0;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
        }

        .dice-info {
          text-align: center;
        }

        .dice-name {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 4px;
        }

        .dice-desc {
          font-size: 13px;
          color: #888;
        }

        .dice-checkboxes {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-top: 4px;
        }

        .dice-checkbox-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #666;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.6);
          transition: background 0.2s;
        }

        .dice-checkbox-label:hover {
          background: rgba(255, 255, 255, 0.9);
        }

        .dice-checkbox-label input {
          width: 14px;
          height: 14px;
          accent-color: #1a1a1a;
        }

        /* ============================================
           DICE ANIMATIONS
           ============================================ */

        /* Bounce Roll */
        @keyframes diceBounceRoll {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(180deg) scale(0.8); }
          50% { transform: rotate(360deg) scale(1.1); }
          75% { transform: rotate(540deg) scale(0.95); }
          100% { transform: rotate(720deg) scale(1); }
        }
        .dice-bounce-roll {
          animation: diceBounceRoll 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Slot Machine - reel spins up fast, drops back, settles */
        @keyframes diceSlot {
          0% { transform: translateY(0); }
          20% { transform: translateY(-60px); opacity: 0; }
          21% { transform: translateY(60px); opacity: 0; }
          40% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-40px); opacity: 0; }
          51% { transform: translateY(40px); opacity: 0; }
          65% { transform: translateY(0); opacity: 1; }
          75% { transform: translateY(-20px); opacity: 0; }
          76% { transform: translateY(20px); opacity: 0; }
          88% { transform: translateY(-3px); opacity: 1; }
          94% { transform: translateY(2px); }
          100% { transform: translateY(0); }
        }
        .dice-slot {
          animation: diceSlot 1200ms ease-out;
        }

        /* Wobble Roll */
        @keyframes diceWobble {
          0% { transform: rotate(0deg) translateX(0); }
          15% { transform: rotate(-15deg) translateX(-8px); }
          30% { transform: rotate(10deg) translateX(6px); }
          45% { transform: rotate(-8deg) translateX(-4px); }
          60% { transform: rotate(360deg) translateX(3px); }
          75% { transform: rotate(355deg) translateX(-2px); }
          100% { transform: rotate(360deg) translateX(0); }
        }
        .dice-wobble {
          animation: diceWobble 600ms ease-out;
        }

        /* ============================================
           CUBE TUNING CONTROLS
           ============================================ */
        .cube-tuning {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
          padding: 12px;
          background: #f0f0f0;
          border-radius: 8px;
          font-size: 11px;
        }

        .cube-tuning label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cube-tuning label > span:first-child {
          width: 50px;
          color: #666;
        }

        .cube-tuning input[type="range"] {
          flex: 1;
          height: 4px;
          accent-color: #1a1a1a;
        }

        .cube-tuning select {
          flex: 1;
          padding: 4px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 11px;
        }

        .cube-tuning .tune-value {
          width: 50px;
          text-align: right;
          color: #888;
          font-size: 10px;
        }

        /* ============================================
           3D CUBE STYLES
           ============================================ */
        .dice-cube-container {
          width: 60px;
          height: 60px;
          perspective: 300px;
          cursor: pointer;
          overflow: hidden;
        }

        .dice-cube {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transform: var(--final-rotation, rotateX(0deg) rotateY(0deg));
          transition: transform 0.3s ease-out;
        }

        .dice-cube-face {
           position: absolute;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          backface-visibility: visible;
          background: white;
          border-radius: 8px;
        }

        .dice-cube-face img {
          min-width: 64px;
          min-height: 64px;
        }

        .dice-cube-front  { transform: translateZ(30px); }
        .dice-cube-back   { transform: rotateY(180deg) translateZ(30px); }
        .dice-cube-right  { transform: rotateY(90deg) translateZ(30px); }
        .dice-cube-left   { transform: rotateY(-90deg) translateZ(30px); }
        .dice-cube-top    { transform: rotateX(90deg) translateZ(30px); }
        .dice-cube-bottom { transform: rotateX(-90deg) translateZ(30px); }

        .dice-cube-rolling {
          animation: diceCubeRoll var(--cube-duration, 1000ms) var(--cube-easing, ease-out);
        }

        @keyframes diceCubeRoll {
          0% {
            transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          20% {
            transform: rotateX(calc(var(--spin-x, 720deg) * 0.15)) rotateY(calc(var(--spin-y, 504deg) * 0.12)) rotateZ(30deg);
          }
          40% {
            transform: rotateX(calc(var(--spin-x, 720deg) * 0.35)) rotateY(calc(var(--spin-y, 504deg) * 0.35)) rotateZ(-20deg);
          }
          60% {
            transform: rotateX(calc(var(--spin-x, 720deg) * 0.6)) rotateY(calc(var(--spin-y, 504deg) * 0.6)) rotateZ(40deg);
          }
          80% {
            transform: rotateX(calc(var(--spin-x, 720deg) * 0.85)) rotateY(calc(var(--spin-y, 504deg) * 0.8)) rotateZ(-10deg);
          }
          100% {
            transform: var(--final-rotation, rotateX(0deg) rotateY(0deg));
          }
        }
      `}</style>

      <header className="dice-header">
        <h1 className="dice-title">Dice Animations</h1>
        <p className="dice-subtitle">Click any dice to see its animation</p>
      </header>

      <button className="dice-roll-all" onClick={rollAll}>
        Roll All Dice
      </button>

      <div className="dice-grid">
        {ANIMATIONS.map((anim, index) => (
          <div key={anim.name} className="dice-card">
            {anim.is3D ? (
              <div>
                <div onClick={() => handleDiceClick(index)}>
                  <DiceCube
                    isAnimating={animatingIds.has(index)}
                    finalFace={diceStates[index]}
                    duration={cubeDuration}
                    spins={cubeSpins}
                    easing={cubeEasing}
                  />
                </div>
                <div className="cube-tuning">
                  <label>
                    <span>Duration</span>
                    <input
                      type="range"
                      min="300"
                      max="2000"
                      value={cubeDuration}
                      onChange={(e) => setCubeDuration(Number(e.target.value))}
                    />
                    <span className="tune-value">{cubeDuration}ms</span>
                  </label>
                  <label>
                    <span>Spins</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={cubeSpins}
                      onChange={(e) => setCubeSpins(Number(e.target.value))}
                    />
                    <span className="tune-value">{cubeSpins}x</span>
                  </label>
                  <label>
                    <span>Easing</span>
                    <select value={cubeEasing} onChange={(e) => setCubeEasing(e.target.value)}>
                      <option value="ease-out">Ease Out</option>
                      <option value="ease-in-out">Ease In-Out</option>
                      <option value="cubic-bezier(0.34, 1.56, 0.64, 1)">Bouncy</option>
                      <option value="linear">Linear</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className="dice-container" onClick={() => handleDiceClick(index)}>
                <img
                  src={`/draw/dice${diceStates[index] + 1}.svg`}
                  alt={`Dice ${diceStates[index] + 1}`}
                  className={`dice-img ${animatingIds.has(index) ? anim.className : ''}`}
                />
              </div>
            )}
            <div className="dice-info">
              <div className="dice-name">{anim.name}</div>
              <div className="dice-desc">{anim.description}</div>
            </div>
          </div>
        ))}

        {/* Random Mix Card */}
        <div className="dice-card dice-card--random">
          <div className="dice-container" onClick={handleRandomMixClick}>
            <img
              src={`/draw/dice${diceStates[RANDOM_INDEX] + 1}.svg`}
              alt={`Dice ${diceStates[RANDOM_INDEX] + 1}`}
              className={`dice-img ${animatingIds.has(RANDOM_INDEX) && currentAnimClass ? currentAnimClass : ''}`}
            />
          </div>
          <div className="dice-info">
            <div className="dice-name">Random Mix</div>
            <div className="dice-desc">Picks from selected animations</div>
            <div className="dice-checkboxes">
              {ANIMATIONS.map((anim, i) => (
                <label key={i} className="dice-checkbox-label">
                  <input
                    type="checkbox"
                    checked={enabledAnimations.has(i)}
                    onChange={() => toggleAnimation(i)}
                  />
                  {anim.name.split(' ')[0]}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
