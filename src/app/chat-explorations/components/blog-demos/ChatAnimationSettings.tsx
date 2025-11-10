'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { DEFAULT_CHAT_ANIMATION_CONFIG, ChatAnimationConfig } from '@/app/lib/animationConfig';

interface ChatAnimationSettingsProps {
  onChange: (config: ChatAnimationConfig) => void;
  demoId?: string; // Unique ID for this demo instance to avoid conflicts
}

export default function ChatAnimationSettings({ onChange, demoId = 'default' }: ChatAnimationSettingsProps) {
  const [config, setConfig] = useState<ChatAnimationConfig>(DEFAULT_CHAT_ANIMATION_CONFIG);

  const updateConfig = (updates: Partial<ChatAnimationConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <>
      <style jsx>{`
        .settings-panel {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          z-index: 50;
        }

        .settings-checkbox {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          border-radius: 9999px;
          background-color: var(--color-olive-dark);
          color: var(--color-white);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
          user-select: none;
        }

        .toggle-btn:hover {
          transform: scale(1.1);
        }

        .panel-content {
          position: absolute;
          bottom: 4rem;
          right: 0;
          width: 24rem;
          max-height: 80vh;
          overflow-y: auto;
          background-color: var(--color-white);
          border: 1px solid var(--border-subtle);
          border-radius: 0.75rem;
          padding: 1.25rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          display: none;
        }

        .settings-checkbox:checked ~ .panel-content {
          display: block;
        }

        .section {
          margin-bottom: 1.25rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .section-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--color-black);
        }

        .number-input {
          width: 5rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          text-align: right;
          border: 1px solid var(--border-subtle);
          border-radius: 0.25rem;
          color: var(--color-black);
        }

        .slider {
          width: 100%;
          height: 0.375rem;
          border-radius: 0.5rem;
          appearance: none;
          cursor: pointer;
          background: linear-gradient(to right, var(--color-olive-dark) 0%, var(--color-olive-dark) 50%, var(--color-off-white) 50%, var(--color-off-white) 100%);
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          background: var(--color-olive-dark);
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          background: var(--color-olive-dark);
          cursor: pointer;
          border: none;
        }

        .range-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: var(--color-gray);
        }

        .reset-btn {
          width: 100%;
          padding: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          background-color: var(--color-light-green);
          color: var(--color-olive-dark);
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .reset-btn:hover {
          background-color: #CFDEAB;
        }

        .preset-btn {
          padding: 0.375rem 0.75rem;
          background-color: var(--color-white);
          border: 1px solid rgba(110, 143, 0, 0.3);
          color: var(--color-olive-dark);
          font-size: 0.75rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .preset-btn:hover {
          background-color: rgba(110, 143, 0, 0.1);
          border-color: var(--color-olive-dark);
        }
      `}</style>

      <div className="settings-panel">
        <input type="checkbox" id={`settings-toggle-${demoId}`} className="settings-checkbox" defaultChecked />
        
        <label htmlFor={`settings-toggle-${demoId}`} className="toggle-btn" title="Animation Settings">
          <Settings className="w-5 h-5" />
        </label>

        <div className="panel-content">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-black)' }}>
              Dot Animation Controls
            </h3>

            {/* Dot Duration */}
            <div className="section">
              <div className="section-label">
                <span>Dot Duration</span>
                <input type="number" value={config.dotDuration} onChange={(e) => updateConfig({ dotDuration: Number(e.target.value) })} className="number-input" min="1" max="2000" step="1" />
              </div>
              <input type="range" min="50" max="800" step="5" value={config.dotDuration} onChange={(e) => updateConfig({ dotDuration: Number(e.target.value) })} className="slider" />
              <div className="range-labels">
                <span>50ms</span>
                <span>800ms</span>
              </div>
              
              {/* Fine tune slider */}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray)', marginBottom: '0.25rem' }}>Fine Tune (±50ms)</div>
                <input 
                  type="range" 
                  min={Math.max(50, config.dotDuration - 50)} 
                  max={Math.min(800, config.dotDuration + 50)} 
                  step="1" 
                  value={config.dotDuration} 
                  onChange={(e) => updateConfig({ dotDuration: Number(e.target.value) })} 
                  className="slider" 
                  style={{ height: '0.25rem' }}
                />
              </div>
            </div>

            {/* Dot Spring */}
            <div className="section">
              <div className="section-label">
                <span>Dot Spring Bounce</span>
                <input type="number" value={config.dotSpring.toFixed(3)} onChange={(e) => updateConfig({ dotSpring: parseFloat(e.target.value) })} className="number-input" min="0.5" max="5" step="0.001" />
              </div>
              <input type="range" min="1.0" max="3.0" step="0.05" value={config.dotSpring} onChange={(e) => updateConfig({ dotSpring: Number(e.target.value) })} className="slider" />
              <div className="range-labels">
                <span>1.0 (Gentle)</span>
                <span>3.0 (Bouncy)</span>
              </div>
              
              {/* Fine tune slider */}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray)', marginBottom: '0.25rem' }}>Fine Tune (±0.2)</div>
                <input 
                  type="range" 
                  min={Math.max(1.0, config.dotSpring - 0.2)} 
                  max={Math.min(3.0, config.dotSpring + 0.2)} 
                  step="0.01" 
                  value={config.dotSpring} 
                  onChange={(e) => updateConfig({ dotSpring: Number(e.target.value) })} 
                  className="slider" 
                  style={{ height: '0.25rem' }}
                />
              </div>
            </div>

            {/* Sidebar Show Duration */}
            <div className="section">
              <div className="section-label">
                <span>Sidebar Show Duration</span>
                <input type="number" value={config.sidebarShowDuration} onChange={(e) => updateConfig({ sidebarShowDuration: Number(e.target.value) })} className="number-input" min="50" max="800" step="1" />
              </div>
              <input type="range" min="50" max="500" step="10" value={config.sidebarShowDuration} onChange={(e) => updateConfig({ sidebarShowDuration: Number(e.target.value) })} className="slider" />
              <div className="range-labels">
                <span>50ms (Fast)</span>
                <span>500ms (Slow)</span>
              </div>
              
              {/* Fine tune slider */}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray)', marginBottom: '0.25rem' }}>Fine Tune (±30ms)</div>
                <input 
                  type="range" 
                  min={Math.max(50, config.sidebarShowDuration - 30)} 
                  max={Math.min(500, config.sidebarShowDuration + 30)} 
                  step="1" 
                  value={config.sidebarShowDuration} 
                  onChange={(e) => updateConfig({ sidebarShowDuration: Number(e.target.value) })} 
                  className="slider" 
                  style={{ height: '0.25rem' }}
                />
              </div>
            </div>

            {/* Sidebar Hide Duration */}
            <div className="section">
              <div className="section-label">
                <span>Sidebar Hide Duration</span>
                <input type="number" value={config.sidebarHideDuration} onChange={(e) => updateConfig({ sidebarHideDuration: Number(e.target.value) })} className="number-input" min="50" max="800" step="1" />
              </div>
              <input type="range" min="50" max="500" step="10" value={config.sidebarHideDuration} onChange={(e) => updateConfig({ sidebarHideDuration: Number(e.target.value) })} className="slider" />
              <div className="range-labels">
                <span>50ms (Fast)</span>
                <span>500ms (Slow)</span>
              </div>
              
              {/* Fine tune slider */}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray)', marginBottom: '0.25rem' }}>Fine Tune (±30ms)</div>
                <input 
                  type="range" 
                  min={Math.max(50, config.sidebarHideDuration - 30)} 
                  max={Math.min(500, config.sidebarHideDuration + 30)} 
                  step="1" 
                  value={config.sidebarHideDuration} 
                  onChange={(e) => updateConfig({ sidebarHideDuration: Number(e.target.value) })} 
                  className="slider" 
                  style={{ height: '0.25rem' }}
                />
              </div>
            </div>

            {/* Presets */}
            <div className="section">
              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-black)' }}>
                Presets
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => updateConfig({ dotDuration: 150, dotSpring: 1.2, sidebarShowDuration: 80, sidebarHideDuration: 100 })} className="preset-btn">
                  Smooth
                </button>
                <button onClick={() => updateConfig({ dotDuration: 276, dotSpring: 1.1, sidebarShowDuration: 110, sidebarHideDuration: 150 })} className="preset-btn">
                  Default
                </button>
                <button onClick={() => updateConfig({ dotDuration: 350, dotSpring: 2.1, sidebarShowDuration: 150, sidebarHideDuration: 200 })} className="preset-btn">
                  Bouncy
                </button>
                <button onClick={() => updateConfig({ dotDuration: 450, dotSpring: 2.5, sidebarShowDuration: 200, sidebarHideDuration: 250 })} className="preset-btn">
                  Playful
                </button>
                <button onClick={() => updateConfig({ dotDuration: 100, dotSpring: 1.0, sidebarShowDuration: 60, sidebarHideDuration: 80 })} className="preset-btn">
                  Instant
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <button onClick={() => updateConfig({
                dotDuration: 276,
                dotSpring: 1.1,
                sidebarShowDuration: 110,
                sidebarHideDuration: 150,
              })} className="reset-btn">
              Reset to Defaults
            </button>
        </div>
      </div>
    </>
  );
}
