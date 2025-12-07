'use client';

import React, { useState } from 'react';
import { useStore } from '../store';
import { Download, Undo, Redo, Shuffle } from 'lucide-react';
import { ColorPicker } from './ColorPicker';

export const Toolbar: React.FC = () => {
  const {
    canvas,
    selectedLayerIds,
    undo,
    redo,
    canUndo,
    canRedo,
    randomizeSelected,
    randomizeAll,
    setCanvasSize,
    setCanvasBackground,
  } = useStore();
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCanvasSizeMenu, setShowCanvasSizeMenu] = useState(false);
  
  const handleExportPNG = async () => {
    const event = new CustomEvent('export-png');
    window.dispatchEvent(event);
    setShowExportMenu(false);
  };
  
  const handleExportSVG = () => {
    const event = new CustomEvent('export-svg');
    window.dispatchEvent(event);
    setShowExportMenu(false);
  };
  
  const handleRandomize = () => {
    if (selectedLayerIds.length > 0) {
      randomizeSelected();
    } else {
      randomizeAll();
    }
  };
  
  const canvasSizes = [
    { name: '800×600', width: 800, height: 600 },
    { name: '1024×768', width: 1024, height: 768 },
    { name: '1920×1080', width: 1920, height: 1080 },
    { name: 'Square 800', width: 800, height: 800 },
    { name: 'Square 1000', width: 1000, height: 1000 },
  ];
  
  return (
    <div style={styles.toolbar}>
      {/* Left side - Canvas controls */}
      <div style={styles.section}>
        <div style={styles.dropdown}>
          <button
            style={styles.button}
            onClick={() => setShowCanvasSizeMenu(!showCanvasSizeMenu)}
          >
            {canvas.width}×{canvas.height}
          </button>
          {showCanvasSizeMenu && (
            <div style={styles.dropdownContent}>
              {canvasSizes.map((size) => (
                <button
                  key={size.name}
                  onClick={() => {
                    setCanvasSize(size.width, size.height);
                    setShowCanvasSizeMenu(false);
                  }}
                  style={styles.dropdownItem}
                >
                  {size.name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ minWidth: '120px' }}>
          <ColorPicker
            value={canvas.background}
            onChange={(color) => setCanvasBackground(color)}
          />
        </div>
      </div>
      
      {/* Right side - Actions */}
      <div style={styles.section}>
        <button
          onClick={undo}
          disabled={!canUndo()}
          style={styles.iconButton}
          title="Undo"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          style={styles.iconButton}
          title="Redo"
        >
          <Redo size={16} />
        </button>
        
        <div style={styles.divider} />
        
        <button
          onClick={handleRandomize}
          style={styles.iconButton}
          title={selectedLayerIds.length > 0 ? `Randomize ${selectedLayerIds.length} layer${selectedLayerIds.length > 1 ? 's' : ''}` : 'Randomize All'}
        >
          <Shuffle size={16} />
        </button>
        
        <div style={styles.divider} />
        
        <div style={styles.dropdown}>
          <button
            style={styles.button}
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          {showExportMenu && (
            <div style={styles.dropdownContent}>
              <button onClick={handleExportPNG} style={styles.dropdownItem}>
                Export PNG
              </button>
              <button onClick={handleExportSVG} style={styles.dropdownItem}>
                Export SVG (ASCII only)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  toolbar: {
    height: '60px',
    background: '#fff',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1rem',
    gap: '1rem',
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  select: {
    padding: '0.5rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  divider: {
    width: '1px',
    height: '24px',
    background: '#e0e0e0',
  },
  dropdown: {
    position: 'relative' as const,
  },
  dropdownContent: {
    position: 'absolute' as const,
    bottom: '100%',
    left: 0,
    marginBottom: '0.5rem',
    background: '#fff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '180px',
    zIndex: 1000,
  },
  dropdownItem: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderWidth: '0',
    borderStyle: 'none',
    borderColor: 'transparent',
    background: 'transparent',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background 0.2s',
  },
};
