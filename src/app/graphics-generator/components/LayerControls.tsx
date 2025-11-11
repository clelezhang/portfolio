'use client';

import React from 'react';
import { useStore } from '../store';
import { AsciiLayer, GradientLayer, GridLayer, BlendMode } from '../types';
import { COLORS, COLOR_NAMES } from '../constants';
import { ColorPicker } from './ColorPicker';
import { NumberInput } from './NumberInput';
import { SegmentedControl } from './SegmentedControl';

const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'difference',
  'color-burn',
  'color-dodge',
];

export const LayerControls: React.FC = () => {
  const { layers, selectedLayerIds, updateLayer } = useStore();
  
  // Show controls for single selection only
  if (selectedLayerIds.length === 0) {
    return (
      <div style={styles.panel}>
        <p style={styles.noSelection}>No layers</p>
      </div>
    );
  }
  
  if (selectedLayerIds.length > 1) {
    return (
      <div style={styles.panel}>
        <p style={styles.noSelection}>{selectedLayerIds.length} layers selected</p>
      </div>
    );
  }
  
  const selectedLayer = layers.find((l) => l.id === selectedLayerIds[0]);
  
  if (!selectedLayer) {
    return (
      <div style={styles.panel}>
        <p style={styles.noSelection}>Select a layer to edit</p>
      </div>
    );
  }
  
  const handleUpdate = (updates: any) => {
    updateLayer(selectedLayerIds[0], updates);
  };
  
  return (
    <div style={styles.panel}>
      <h3 style={styles.title}>{selectedLayer.name}</h3>
      
      {/* Common controls */}
      <div style={styles.section}>
        <label style={styles.label}>
          name
          <input
            type="text"
            value={selectedLayer.name}
            onChange={(e) => handleUpdate({ name: e.target.value })}
            style={styles.input}
          />
        </label>
        
        <label style={styles.label}>
          blend mode
          <select
            value={selectedLayer.blendMode}
            onChange={(e) => handleUpdate({ blendMode: e.target.value })}
            style={styles.select}
          >
            {BLEND_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
        
        <NumberInput
          label="opacity"
          value={selectedLayer.opacity * 100}
          onChange={(value) => handleUpdate({ opacity: value / 100 })}
          min={0}
          max={100}
          step={1}
          unit="%"
        />
      </div>
      
      {/* Layer-specific controls */}
      {selectedLayer.type === 'ascii' && (
        <AsciiControls layer={selectedLayer as AsciiLayer} onUpdate={handleUpdate} />
      )}
      {selectedLayer.type === 'gradient' && (
        <GradientControls layer={selectedLayer as GradientLayer} onUpdate={handleUpdate} />
      )}
      {selectedLayer.type === 'grid' && (
        <GridControls layer={selectedLayer as GridLayer} onUpdate={handleUpdate} />
      )}
    </div>
  );
};

const AsciiControls: React.FC<{ layer: AsciiLayer; onUpdate: (u: any) => void }> = ({
  layer,
  onUpdate,
}) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        onUpdate({ source: { img, brightness: 0, contrast: 0 } });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  
  return (
    <>
      <div style={styles.section}>
        <h4 style={styles.subtitle}>image source</h4>
        <button
          onClick={() => document.getElementById('ascii-image-upload')?.click()}
          style={styles.button}
        >
          upload image
        </button>
        <input
          id="ascii-image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </div>
      
      <div style={styles.section}>
        <SegmentedControl
          label="character set"
          options={[
            { value: 'numbers', label: 'numbers' },
            { value: 'normal', label: 'normal' },
            { value: 'custom', label: 'custom' },
          ]}
          value={layer.charSet}
          onChange={(value) => onUpdate({ charSet: value })}
        />
        
        {layer.charSet === 'custom' && (
          <input
            type="text"
            value={layer.customCharSet || ''}
            onChange={(e) => onUpdate({ customCharSet: e.target.value })}
            placeholder="enter custom characters"
            style={styles.input}
          />
        )}
      </div>
      
      <div style={styles.section}>
        <h4 style={styles.subtitle}>character mapping</h4>
        
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={layer.reverseCharacterMapping}
            onChange={(e) => onUpdate({ reverseCharacterMapping: e.target.checked })}
            style={{ marginRight: '0.5rem' }}
          />
          reverse (for dark backgrounds)
        </label>
        <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.25rem 0 0 0' }}>
          light pixels = dense characters (instead of dark = dense)
        </p>
      </div>
      
      <div style={styles.section}>
        <h4 style={styles.subtitle}>dithering</h4>
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={layer.showDitherOnly}
            onChange={(e) => onUpdate({ showDitherOnly: e.target.checked })}
            style={{ marginRight: '0.5rem' }}
          />
          show dither only (debug)
        </label>
        
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={layer.dithering.animate}
            onChange={(e) =>
              onUpdate({
                dithering: { ...layer.dithering, animate: e.target.checked },
              })
            }
            style={{ marginRight: '0.5rem' }}
          />
          animate dithering
        </label>
        
        {layer.dithering.animate && (
          <NumberInput
            label="animation speed"
            value={layer.dithering.animationSpeed}
            onChange={(value) =>
              onUpdate({
                dithering: { ...layer.dithering, animationSpeed: value },
              })
            }
            min={0.1}
            max={2.0}
            step={0.1}
          />
        )}
        
        <h4 style={{ ...styles.subtitle, marginTop: '1rem' }}>gradient effect</h4>
        
        <NumberInput
          label="blur"
          value={layer.dithering.blur}
          onChange={(value) =>
            onUpdate({
              dithering: { ...layer.dithering, blur: value },
            })
          }
          min={0}
          max={50}
          step={1}
          unit="px"
        />
        
        <NumberInput
          label="stretch x"
          value={layer.dithering.stretchX}
          onChange={(value) =>
            onUpdate({
              dithering: { ...layer.dithering, stretchX: value },
            })
          }
          min={1}
          max={5}
          step={0.1}
        />
        
        <NumberInput
          label="stretch y"
          value={layer.dithering.stretchY}
          onChange={(value) =>
            onUpdate({
              dithering: { ...layer.dithering, stretchY: value },
            })
          }
          min={1}
          max={5}
          step={0.1}
        />
        
        <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.25rem 0 0 0' }}>
          blur + stretch creates a gradient-like effect from the dithered image
        </p>
        
        <SegmentedControl
          label="dither type"
          options={[
            { value: 'random', label: 'random' },
            { value: '2x2', label: '2x2' },
            { value: '4x4', label: '4x4' },
            { value: '8x8', label: '8x8' },
          ]}
          value={layer.dithering.type}
          onChange={(value) =>
            onUpdate({
              dithering: { ...layer.dithering, type: value },
            })
          }
        />
        
        <NumberInput
          label="color steps"
          value={layer.dithering.colorSteps}
          onChange={(value) =>
            onUpdate({
              dithering: { ...layer.dithering, colorSteps: value },
            })
          }
          min={2}
          max={16}
          step={1}
        />
        
        <NumberInput
          label="pixel size"
          value={layer.dithering.pixelSize}
          onChange={(value) =>
            onUpdate({
              dithering: { ...layer.dithering, pixelSize: value },
            })
          }
          min={1}
          max={10}
          step={1}
          unit="px"
        />
        
        <SegmentedControl
          label="colors"
          options={[
            { value: 'true', label: 'original' },
            { value: 'false', label: 'custom' },
          ]}
          value={layer.dithering.originalColors ? 'true' : 'false'}
          onChange={(value) =>
            onUpdate({
              dithering: { ...layer.dithering, originalColors: value === 'true' },
            })
          }
        />
        
        {!layer.dithering.originalColors && (
          <>
            <label style={styles.label}>
              foreground
              <ColorPicker
                value={layer.dithering.colorFront}
                onChange={(color) =>
                  onUpdate({
                    dithering: { ...layer.dithering, colorFront: color },
                  })
                }
              />
            </label>
            
            <label style={styles.label}>
              background
              <ColorPicker
                value={layer.dithering.colorBack}
                onChange={(color) =>
                  onUpdate({
                    dithering: { ...layer.dithering, colorBack: color },
                  })
                }
              />
            </label>
            
            <label style={styles.label}>
              highlight
              <ColorPicker
                value={layer.dithering.colorHighlight}
                onChange={(color) =>
                  onUpdate({
                    dithering: { ...layer.dithering, colorHighlight: color },
                  })
                }
              />
            </label>
          </>
        )}
      </div>
      
      <div style={styles.section}>
        <h4 style={styles.subtitle}>offset</h4>
        <NumberInput
          label="x"
          value={layer.offset.x}
          onChange={(value) =>
            onUpdate({ offset: { ...layer.offset, x: value } })
          }
          min={-1000}
          max={1000}
          step={1}
          unit="px"
        />
        <NumberInput
          label="y"
          value={layer.offset.y}
          onChange={(value) =>
            onUpdate({ offset: { ...layer.offset, y: value } })
          }
          min={-1000}
          max={1000}
          step={1}
          unit="px"
        />
      </div>
    </>
  );
};

const GradientControls: React.FC<{ layer: GradientLayer; onUpdate: (u: any) => void }> = ({
  layer,
  onUpdate,
}) => {
  const updateColor = (index: number, color: string) => {
    const newColors = [...layer.colors];
    newColors[index] = color;
    onUpdate({ colors: newColors });
  };
  
  const addColor = () => {
    if (layer.colors.length >= 7) return; // GrainGradient supports up to 7
    const newColor = COLORS[Math.floor(Math.random() * COLORS.length)].hex;
    onUpdate({ colors: [...layer.colors, newColor] });
  };
  
  const removeColor = (index: number) => {
    if (layer.colors.length <= 2) return; // Minimum 2 colors
    onUpdate({ colors: layer.colors.filter((_, i) => i !== index) });
  };
  
  return (
    <>
      <div style={styles.section}>
        <h4 style={styles.subtitle}>colors</h4>
        {layer.colors.map((color, index) => (
          <div key={index} style={styles.stopRow}>
            <div style={{ flex: 1 }}>
              <ColorPicker
                value={color}
                onChange={(newColor) => updateColor(index, newColor)}
              />
            </div>
            <button
              onClick={() => removeColor(index)}
              disabled={layer.colors.length <= 2}
              style={styles.smallButton}
            >
              ×
            </button>
          </div>
        ))}
        {layer.colors.length < 7 && (
          <button onClick={addColor} style={styles.button}>
            add color
          </button>
        )}
        
        <label style={styles.label}>
          background color
          <ColorPicker
            value={layer.colorBack}
            onChange={(color) => onUpdate({ colorBack: color })}
          />
        </label>
      </div>
      
      <div style={styles.section}>
        <h4 style={styles.subtitle}>paper grain gradient</h4>
        
        <SegmentedControl
          label="shape"
          options={[
            { value: 'wave', label: 'wave' },
            { value: 'dots', label: 'dots' },
            { value: 'truchet', label: 'truchet' },
            { value: 'corners', label: 'corners' },
            { value: 'ripple', label: 'ripple' },
            { value: 'blob', label: 'blob' },
            { value: 'sphere', label: 'sphere' },
          ]}
          value={layer.shape}
          onChange={(value) => onUpdate({ shape: value })}
        />
        
        <NumberInput
          label="softness"
          value={layer.softness}
          onChange={(value) => onUpdate({ softness: value })}
          min={0}
          max={1}
          step={0.01}
        />
        
        <NumberInput
          label="speed"
          value={layer.speed}
          onChange={(value) => onUpdate({ speed: value })}
          min={0}
          max={2}
          step={0.1}
        />
        
        <NumberInput
          label="scale"
          value={layer.scale}
          onChange={(value) => onUpdate({ scale: value })}
          min={0.1}
          max={5}
          step={0.1}
        />
        
        <NumberInput
          label="rotation"
          value={layer.rotation}
          onChange={(value) => onUpdate({ rotation: value })}
          min={0}
          max={360}
          step={1}
          unit="°"
        />
        
        <NumberInput
          label="offset x"
          value={layer.offsetX}
          onChange={(value) => onUpdate({ offsetX: value })}
          min={-2}
          max={2}
          step={0.01}
        />
        
        <NumberInput
          label="offset y"
          value={layer.offsetY}
          onChange={(value) => onUpdate({ offsetY: value })}
          min={-2}
          max={2}
          step={0.01}
        />
        
        <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.5rem 0 0 0' }}>
          intensity: 0.08 (fixed) • noise: 0 (fixed)
        </p>
      </div>
    </>
  );
};

const GridControls: React.FC<{ layer: GridLayer; onUpdate: (u: any) => void }> = ({
  layer,
  onUpdate,
}) => {
  return (
    <>
      <div style={styles.section}>
        <NumberInput
          label="columns"
          value={layer.columns}
          onChange={(value) => onUpdate({ columns: value })}
          min={1}
          max={50}
          step={1}
        />
        
        <NumberInput
          label="rows"
          value={layer.rows}
          onChange={(value) => onUpdate({ rows: value })}
          min={1}
          max={50}
          step={1}
        />
        
        <NumberInput
          label="line width"
          value={layer.lineWidth}
          onChange={(value) => onUpdate({ lineWidth: value })}
          min={0.5}
          max={10}
          step={0.5}
          unit="px"
        />
        
        <label style={styles.label}>
          line color
          <ColorPicker
            value={layer.lineColor}
            onChange={(color) => onUpdate({ lineColor: color })}
          />
        </label>
      </div>
    </>
  );
};

const styles = {
  panel: {
    width: '300px',
    height: '100vh',
    background: '#ffffff',
    borderLeft: '1px solid #e0e0e0',
    overflowY: 'auto' as const,
    padding: '1rem',
  },
  noSelection: {
    color: '#999',
    textAlign: 'center' as const,
    marginTop: '2rem',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '1rem',
    color: '#333',
  },
  section: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #f0f0f0',
  },
  subtitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    marginBottom: '0.75rem',
    textTransform: 'lowercase' as const,
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    fontSize: '12px',
    fontWeight: 500,
    color: '#666',
    marginBottom: '0.75rem',
    textTransform: 'lowercase' as const,
  },
  input: {
    padding: '0.5rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'Overpass Mono', monospace",
    outline: 'none',
  },
  select: {
    padding: '0.5rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'Overpass Mono', monospace",
    backgroundColor: '#fff',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '0.5rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'lowercase' as const,
    transition: 'all 0.15s',
  },
  smallButton: {
    padding: '0.25rem 0.5rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
    minWidth: '32px',
  },
  stopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '13px',
    color: '#666',
    marginBottom: '0.75rem',
  },
  value: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '0.5rem',
  },
};
