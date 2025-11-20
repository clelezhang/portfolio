'use client';

import React, { useState } from 'react';
import { useStore, createAsciiLayer, createGradientLayer, createGridLayer } from '../store';

export const LayerTypeToggle: React.FC = () => {
  const { addLayer } = useStore();
  const [layerType, setLayerType] = useState<'ascii' | 'gradient' | 'grid'>('ascii');
  
  const handleAddLayer = () => {
    switch (layerType) {
      case 'ascii':
        addLayer(createAsciiLayer());
        break;
      case 'gradient':
        addLayer(createGradientLayer());
        break;
      case 'grid':
        addLayer(createGridLayer());
        break;
    }
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.layerTypeToggle}>
        <button
          onClick={() => setLayerType('ascii')}
          style={{
            ...styles.toggleButton,
            ...(layerType === 'ascii' ? styles.toggleButtonActive : {}),
          }}
        >
          ASCII
        </button>
        <button
          onClick={() => setLayerType('gradient')}
          style={{
            ...styles.toggleButton,
            ...(layerType === 'gradient' ? styles.toggleButtonActive : {}),
          }}
        >
          Gradient
        </button>
        <button
          onClick={() => setLayerType('grid')}
          style={{
            ...styles.toggleButton,
            ...(layerType === 'grid' ? styles.toggleButtonActive : {}),
          }}
        >
          Grid
        </button>
      </div>
      
      <button onClick={handleAddLayer} style={styles.addButton}>
        + Add {layerType.charAt(0).toUpperCase() + layerType.slice(1)}
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  layerTypeToggle: {
    display: 'flex',
    background: '#f5f5f5',
    borderRadius: '6px',
    padding: '2px',
    gap: '2px',
  },
  toggleButton: {
    padding: '0.4rem 0.75rem',
    borderWidth: '0',
    borderStyle: 'none',
    borderColor: 'transparent',
    borderRadius: '4px',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '0.85rem',
    transition: 'all 0.2s',
    color: '#666',
  },
  toggleButtonActive: {
    background: '#fff',
    color: '#333',
    fontWeight: 600,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  addButton: {
    padding: '0.5rem 1rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#333',
    borderRadius: '6px',
    background: '#333',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
};

