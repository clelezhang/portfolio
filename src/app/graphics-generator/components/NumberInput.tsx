'use client';

import React from 'react';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
};

export const NumberInput: React.FC<Props> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(Math.min(Math.max(newValue, min), max));
    }
  };
  
  return (
    <div style={styles.container}>
      <label style={styles.label}>{label}</label>
      <div style={styles.inputGroup}>
        <input
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          style={styles.input}
        />
        {unit && <span style={styles.unit}>{unit}</span>}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    marginBottom: '0.75rem',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#666',
    textTransform: 'lowercase' as const,
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.5rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'Overpass Mono', monospace",
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  unit: {
    fontSize: '12px',
    color: '#999',
    minWidth: '30px',
  },
};

