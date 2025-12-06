'use client';

import React, { useState, useRef, useEffect } from 'react';
import { COLORS, getColorByHex } from '../constants';

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export const ColorPicker: React.FC<Props> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const selectedColor = getColorByHex(value);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  return (
    <div ref={pickerRef} style={styles.container}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={styles.selectedColor}
      >
        <div style={{ ...styles.colorSwatch, background: value }} />
        <span style={styles.colorName}>{selectedColor?.name || 'custom'}</span>
      </button>
      
      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.list}>
            {COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => {
                  onChange(color.hex);
                  setIsOpen(false);
                }}
                style={{
                  ...styles.colorOption,
                  ...(color.hex === value ? styles.colorOptionActive : {}),
                }}
              >
                <div style={{ ...styles.colorSwatchSmall, background: color.hex }} />
                <span style={styles.colorName}>{color.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    width: '100%',
  },
  selectedColor: {
    width: '100%',
    padding: '0.5rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: '0.25rem',
    background: '#fff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    padding: '0.25rem',
    zIndex: 1000,
    width: '100%',
    minWidth: '180px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },
  colorOption: {
    padding: '0.5rem',
    borderWidth: '0',
    borderStyle: 'none',
    borderColor: 'transparent',
    borderRadius: '4px',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textAlign: 'left' as const,
    fontSize: '13px',
  },
  colorOptionActive: {
    background: '#f5f5f5',
  },
  colorSwatch: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  colorSwatchSmall: {
    width: '20px',
    height: '20px',
    borderRadius: '3px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  colorName: {
    fontSize: '13px',
    textTransform: 'lowercase' as const,
    fontWeight: 400,
  },
};

