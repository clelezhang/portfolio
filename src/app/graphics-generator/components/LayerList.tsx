'use client';

import React, { useState } from 'react';
import { useStore } from '../store';
import { Eye, EyeOff, Copy, Trash2 } from 'lucide-react';

export const LayerList: React.FC = () => {
  const { layers, selectedLayerIds, setSelectedLayer, updateLayer, deleteLayer, duplicateLayer } = useStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Reverse to show top layers first
  const displayLayers = [...layers].reverse();
  
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Reorder layers
    const newLayers = [...layers];
    const draggedLayer = newLayers[layers.length - 1 - draggedIndex];
    newLayers.splice(layers.length - 1 - draggedIndex, 1);
    newLayers.splice(layers.length - 1 - index, 0, draggedLayer);
    
    // Update the store (we need to add a reorderLayers method)
    // For now, we'll handle this through individual moves
  };
  
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    
    // Get actual layer indices (reverse of display)
    const fromIndex = layers.length - 1 - draggedIndex;
    const toIndex = layers.length - 1 - targetIndex;
    
    // Call new reorder function
    const { reorderLayers } = useStore.getState();
    reorderLayers(fromIndex, toIndex);
    
    setDraggedIndex(null);
  };
  
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Layers</h3>
      <div style={styles.list}>
        {displayLayers.length === 0 ? (
          <p style={styles.empty}>No layers. Add one to get started!</p>
        ) : (
          displayLayers.map((layer, index) => (
            <div
              key={layer.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onClick={(e) => setSelectedLayer(layer.id, e.shiftKey)}
              style={{
                ...styles.layerItem,
                ...(selectedLayerIds.includes(layer.id) ? styles.layerItemActive : {}),
                ...(draggedIndex === index ? styles.layerItemDragging : {}),
                cursor: 'move',
              }}
            >
              <div style={styles.layerInfo}>
                <span style={styles.layerName}>{layer.name}</span>
              </div>
              <div style={styles.layerActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, { visible: !layer.visible });
                  }}
                  style={styles.actionButton}
                  title={layer.visible ? 'Hide' : 'Show'}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateLayer(layer.id);
                  }}
                  style={styles.actionButton}
                  title="Duplicate"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  style={styles.actionButton}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '280px',
    height: '100vh',
    background: '#fafafa',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  title: {
    padding: '1rem',
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 600,
    borderBottom: '1px solid #e0e0e0',
    color: '#333',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0.5rem',
  },
  empty: {
    padding: '2rem 1rem',
    textAlign: 'center' as const,
    color: '#999',
    fontSize: '0.9rem',
  },
  layerItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    background: '#fff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e0e0e0',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  layerItemActive: {
    background: '#333',
    color: '#fff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#333',
  },
  layerItemDragging: {
    opacity: 0.5,
  },
  layerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1,
  },
  layerName: {
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  layerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderWidth: '0',
    borderStyle: 'none',
    borderColor: 'transparent',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
};

