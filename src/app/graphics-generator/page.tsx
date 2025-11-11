'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { LayerList } from './components/LayerList';
import { LayerControls } from './components/LayerControls';
import { Toolbar } from './components/Toolbar';
import { LayerTypeToggle } from './components/LayerTypeToggle';
import { useStore } from './store';
import { exportToPNG, exportToSVG } from './utils/export';

// Dynamically import Canvas to avoid SSR issues with Konva
const Canvas = dynamic(() => import('./components/Canvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f0f0',
      }}
    >
      Loading canvas...
    </div>
  ),
});

export default function GraphicsGeneratorPage() {
  const { canvas, layers, randomizeAll } = useStore();
  const stageRef = useRef<any>(null);
  const hasInitialized = useRef(false);
  
  // Randomize all layers on first load
  useEffect(() => {
    if (!hasInitialized.current && layers.length > 0) {
      hasInitialized.current = true;
      randomizeAll();
    }
  }, [layers.length, randomizeAll]);
  
  useEffect(() => {
    // Listen for export events
    const handleExportPNG = () => {
      exportToPNG();
    };
    
    const handleExportSVG = () => {
      exportToSVG();
    };
    
    window.addEventListener('export-png', handleExportPNG);
    window.addEventListener('export-svg', handleExportSVG);
    
    return () => {
      window.removeEventListener('export-png', handleExportPNG);
      window.removeEventListener('export-svg', handleExportSVG);
    };
  }, [layers, canvas]);
  
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Graphics Generator</h1>
            <p style={styles.subtitle}>
              Layer-based canvas app with ASCII, Gradient, and Grid layers
            </p>
          </div>
          <LayerTypeToggle />
        </div>
      </header>
      
      <div style={styles.main}>
        <LayerList />
        
        <div style={styles.canvasContainer}>
          <Canvas />
        </div>
        
        <LayerControls />
      </div>
      
      <Toolbar />
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#fff',
  },
  header: {
    padding: '1rem 2rem',
    borderBottom: '1px solid #e0e0e0',
    background: '#fff',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#333',
  },
  subtitle: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.9rem',
    color: '#666',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
};

