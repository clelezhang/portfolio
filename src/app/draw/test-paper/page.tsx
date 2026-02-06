'use client';

import { useState } from 'react';
import '../draw.css';

export default function PaperTextureTestPage() {
  const [showDots, setShowDots] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [gridColor, setGridColor] = useState('#d4d4d4');
  const [gridDistortion, setGridDistortion] = useState(0);
  const [gridSize, setGridSize] = useState(20);
  const [opacity, setOpacity] = useState(0.4);

  // SVG noise parameters
  const [baseFrequency, setBaseFrequency] = useState(0.04);
  const [numOctaves, setNumOctaves] = useState(5);
  const [surfaceScale, setSurfaceScale] = useState(2);
  const [azimuth, setAzimuth] = useState(45);
  const [elevation, setElevation] = useState(60);
  const [noiseType, setNoiseType] = useState<'fractalNoise' | 'turbulence'>('fractalNoise');

  // Colors
  const [bgColor, setBgColor] = useState('#ffffff');
  const [lightColor, setLightColor] = useState('#ffffff');

  // Color presets
  const colorPresets = [
    { name: 'White', bg: '#ffffff', light: '#ffffff' },
    { name: 'Cream', bg: '#f5f0e6', light: '#fffef8' },
    { name: 'Warm', bg: '#f8f4ed', light: '#fff8e8' },
    { name: 'Cool', bg: '#f4f6f8', light: '#f0f4ff' },
    { name: 'Kraft', bg: '#d4c4a8', light: '#e8dcc4' },
    { name: 'Gray', bg: '#e8e8e8', light: '#f5f5f5' },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ backgroundColor: bgColor }}>
      {/* SVG Filter Definition */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="paperTexture">
            <feTurbulence
              type={noiseType}
              baseFrequency={baseFrequency}
              numOctaves={numOctaves}
              result="noise"
            />
            <feDiffuseLighting
              in="noise"
              lightingColor={lightColor}
              surfaceScale={surfaceScale}
            >
              <feDistantLight azimuth={azimuth} elevation={elevation} />
            </feDiffuseLighting>
          </filter>
        </defs>
      </svg>

      {/* Full screen texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          filter: 'url(#paperTexture)',
          opacity: opacity,
          mixBlendMode: 'multiply',
        }}
      />

      {/* Grid distortion filter */}
      {gridDistortion > 0 && (
        <svg className="absolute w-0 h-0" aria-hidden="true">
          <defs>
            <filter id="gridDistortion">
              <feTurbulence
                type="turbulence"
                baseFrequency={0.01}
                numOctaves={2}
                result="turbulence"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="turbulence"
                scale={gridDistortion}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/* Dot grid overlay */}
      {showDots && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${gridColor} 1.5px, transparent 1.5px)`,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            filter: gridDistortion > 0 ? 'url(#gridDistortion)' : 'none',
          }}
        />
      )}

      {/* Line grid overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${gridColor} 1px, transparent 1px),
              linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            filter: gridDistortion > 0 ? 'url(#gridDistortion)' : 'none',
          }}
        />
      )}

      {/* Settings panel - right side, full height */}
      <div className="absolute top-4 right-4 bottom-4 bg-black/80 backdrop-blur-xl rounded-xl p-3 text-sm z-10 w-64 border border-white/10 flex flex-col">
        <div className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">Paper Texture</div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto pr-1">
        {/* Color Presets */}
        <div className="mb-4">
          <div className="text-white/40 text-xs mb-2">Paper Color</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {colorPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => { setBgColor(preset.bg); setLightColor(preset.light); }}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-sm border border-white/20"
                  style={{ backgroundColor: preset.bg }}
                />
                {preset.name}
              </button>
            ))}
          </div>
          {/* Custom color inputs */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-white/30 text-xs mb-1 block">Background</label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-6 h-6 rounded border border-white/10 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white/70"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-white/30 text-xs mb-1 block">Light</label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="w-6 h-6 rounded border border-white/10 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white/70"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Noise Type */}
        <div className="mb-4">
          <div className="text-white/40 text-xs mb-2">Noise Type</div>
          <div className="flex text-xs bg-white/5 rounded-lg p-1">
            {(['fractalNoise', 'turbulence'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setNoiseType(type)}
                className={`flex-1 py-1 rounded-md transition-all ${
                  noiseType === type
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {type === 'fractalNoise' ? 'Fractal' : 'Turbulence'}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          {/* Opacity */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Opacity</span>
              <span className="text-white/60">{opacity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.0"
              step="0.01"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full draw-settings-slider"
            />
          </div>

          {/* Base Frequency */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Base Frequency</span>
              <span className="text-white/60">{baseFrequency.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.2"
              step="0.005"
              value={baseFrequency}
              onChange={(e) => setBaseFrequency(parseFloat(e.target.value))}
              className="w-full draw-settings-slider"
            />
            <p className="text-xs text-white/30 mt-0.5">Lower = larger grain</p>
          </div>

          {/* Num Octaves */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Octaves</span>
              <span className="text-white/60">{numOctaves}</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={numOctaves}
              onChange={(e) => setNumOctaves(parseInt(e.target.value))}
              className="w-full draw-settings-slider"
            />
            <p className="text-xs text-white/30 mt-0.5">More = finer detail</p>
          </div>

          {/* Surface Scale */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Surface Scale</span>
              <span className="text-white/60">{surfaceScale.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={surfaceScale}
              onChange={(e) => setSurfaceScale(parseFloat(e.target.value))}
              className="w-full draw-settings-slider"
            />
            <p className="text-xs text-white/30 mt-0.5">Depth of relief</p>
          </div>

          {/* Azimuth */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Light Azimuth</span>
              <span className="text-white/60">{azimuth}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="15"
              value={azimuth}
              onChange={(e) => setAzimuth(parseInt(e.target.value))}
              className="w-full draw-settings-slider"
            />
          </div>

          {/* Elevation */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Light Elevation</span>
              <span className="text-white/60">{elevation}°</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={elevation}
              onChange={(e) => setElevation(parseInt(e.target.value))}
              className="w-full draw-settings-slider"
            />
          </div>
        </div>

        {/* Grid Settings */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-white/40 text-xs mb-2">Grid</div>

          {/* Grid toggles */}
          <div className="space-y-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDots}
                onChange={(e) => setShowDots(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span className="text-white/60 text-xs">Dot grid</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="draw-settings-checkbox"
              />
              <span className="text-white/60 text-xs">Line grid</span>
            </label>
          </div>

          {/* Grid Color */}
          <div className="mb-3">
            <label className="text-white/30 text-xs mb-1 block">Grid Color</label>
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={gridColor}
                onChange={(e) => setGridColor(e.target.value)}
                className="w-6 h-6 rounded border border-white/10 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={gridColor}
                onChange={(e) => setGridColor(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white/70"
              />
            </div>
          </div>

          {/* Grid Size */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Grid Size</span>
              <span className="text-white/60">{gridSize}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full draw-settings-slider"
            />
          </div>

          {/* Grid Distortion */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Grid Distortion</span>
              <span className="text-white/60">{gridDistortion}</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="2"
              value={gridDistortion}
              onChange={(e) => setGridDistortion(parseInt(e.target.value))}
              className="w-full draw-settings-slider"
            />
            <p className="text-xs text-white/30 mt-0.5">Wobbly/organic effect</p>
          </div>
        </div>
        </div>

        {/* Copy SVG Button - at bottom */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <button
            onClick={() => {
              const svgCode = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="paperTexture">
      <feTurbulence type="${noiseType}" baseFrequency="${baseFrequency}" numOctaves="${numOctaves}" result="noise" />
      <feDiffuseLighting in="noise" lighting-color="${lightColor}" surfaceScale="${surfaceScale}">
        <feDistantLight azimuth="${azimuth}" elevation="${elevation}" />
      </feDiffuseLighting>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${bgColor}" />
  <rect width="100%" height="100%" filter="url(#paperTexture)" opacity="${opacity}" style="mix-blend-mode: multiply" />
</svg>`;
              navigator.clipboard.writeText(svgCode);
            }}
            className="w-full px-3 py-2 text-xs bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy SVG Code
          </button>
        </div>
      </div>
    </div>
  );
}
