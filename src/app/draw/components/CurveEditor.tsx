import { useState, useRef, useCallback, useEffect } from 'react';

interface CurveEditorProps {
  onCurveChange?: (curve: { duration: number; bezier: string; springBounce: number }) => void;
}

export function CurveEditor({ onCurveChange }: CurveEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Spring physics parameters
  const [stiffness, setStiffness] = useState(100);
  const [damping, setDamping] = useState(14);
  const [mass, setMass] = useState(1);
  const [duration, setDuration] = useState(300);

  // Calculate bounce from spring parameters
  const zeta = damping / (2 * Math.sqrt(stiffness * mass)); // damping ratio
  // Convert spring params to cubic-bezier overshoot (lower damping = more bounce)
  const springBounce = Math.max(0, Math.min(2, (1 - zeta) * 2));

  // Notify parent of curve changes
  useEffect(() => {
    if (onCurveChange) {
      const bezier = `cubic-bezier(0.34, ${(1 + springBounce * 0.56).toFixed(2)}, 0.64, 1)`;
      onCurveChange({ duration, bezier, springBounce });
    }
  }, [duration, springBounce, onCurveChange]);

  // Handle drag on the control point
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // Map y position to damping (lower y = less damping = more bounce)
    // y=20 is max overshoot (low damping ~1), y=80 is no overshoot (high damping ~30)
    const normalizedY = Math.max(20, Math.min(80, y));
    const newDamping = Math.round(1 + ((normalizedY - 20) / 60) * 29);
    setDamping(newDamping);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse events for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCopy = () => {
    const css = `cubic-bezier(0.34, ${(1 + springBounce * 0.56).toFixed(2)}, 0.64, 1)`;
    navigator.clipboard.writeText(css);
  };

  return (
    <div className="draw-curve-editor">
      {/* Duration header */}
      <div className="draw-curve-header">
        <div className="draw-curve-duration-row">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M6 3v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="range"
            min="100"
            max="1500"
            step="50"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="draw-curve-duration-slider"
          />
          <span className="draw-curve-duration-value">{duration}ms</span>
        </div>
        <button
          onClick={handleCopy}
          className="draw-curve-copy-btn"
          title="Copy cubic-bezier"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 4V2.5A1.5 1.5 0 006.5 1H2.5A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 8H4" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>

      {/* Curve visualization */}
      <div className="draw-curve-canvas">
        <svg ref={svgRef} width="180" height="100" viewBox="0 0 180 100">
          {/* Baseline */}
          <line x1="10" y1="80" x2="170" y2="80" stroke="#e5e5e5" strokeWidth="1" />

          {/* Spring curve path */}
          <path
            d={(() => {
              const points: string[] = [];
              const omega = Math.sqrt(stiffness / mass);
              const zetaCalc = damping / (2 * Math.sqrt(stiffness * mass));
              for (let i = 0; i <= 50; i++) {
                const t = i / 50;
                let y: number;
                if (zetaCalc < 1) {
                  // Underdamped - oscillates
                  const omegaD = omega * Math.sqrt(1 - zetaCalc * zetaCalc);
                  y = 1 - Math.exp(-zetaCalc * omega * t * 3) * Math.cos(omegaD * t * 3);
                } else {
                  // Overdamped or critically damped
                  y = 1 - Math.exp(-omega * t * 3);
                }
                const screenY = 80 - y * 60;
                points.push(`${i === 0 ? 'M' : 'L'} ${10 + i * 3.2} ${Math.max(5, Math.min(95, screenY))}`);
              }
              return points.join(' ');
            })()}
            fill="none"
            stroke="#0f1931"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Start point */}
          <circle cx="10" cy="80" r="4" fill="#0f1931" />

          {/* End point */}
          <circle cx="170" cy="20" r="4" fill="#0f1931" />

          {/* Draggable control point */}
          <circle
            cx={90}
            cy={Math.max(5, Math.min(95, 80 - 60 * (1 + (stiffness - 100) / 200)))}
            r="6"
            fill="#0f1931"
            /* native cursor hidden globally; custom cursor handles modes */
            onMouseDown={handleMouseDown}
          />
        </svg>
      </div>

      {/* Spring parameters */}
      <div className="draw-curve-sliders">
        <div className="draw-curve-slider-row">
          <label>Stiffness</label>
          <input
            type="range"
            min="10"
            max="300"
            value={stiffness}
            onChange={(e) => setStiffness(parseInt(e.target.value))}
            className="draw-curve-slider"
          />
          <span className="draw-curve-slider-value">{stiffness}</span>
        </div>
        <div className="draw-curve-slider-row">
          <label>Damping</label>
          <input
            type="range"
            min="1"
            max="40"
            value={damping}
            onChange={(e) => setDamping(parseInt(e.target.value))}
            className="draw-curve-slider"
          />
          <span className="draw-curve-slider-value">{damping}</span>
        </div>
        <div className="draw-curve-slider-row">
          <label>Mass</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={mass}
            onChange={(e) => setMass(parseFloat(e.target.value))}
            className="draw-curve-slider"
          />
          <span className="draw-curve-slider-value">{mass.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
