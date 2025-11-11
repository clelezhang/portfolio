'use client';

import React from 'react';

type Option = {
  value: string | number;
  label: string;
};

type Props = {
  label?: string;
  options: Option[];
  value: string | number;
  onChange: (value: any) => void;
};

export const SegmentedControl: React.FC<Props> = ({ label, options, value, onChange }) => {
  return (
    <div style={styles.container}>
      {label && <label style={styles.label}>{label}</label>}
      <div style={styles.buttonGroup}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              ...styles.button,
              ...(value === option.value ? styles.buttonActive : {}),
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
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
  buttonGroup: {
    display: 'flex',
    gap: '0.25rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    borderRadius: '4px',
    padding: '0.25rem',
    backgroundColor: '#f5f5f5',
  },
  button: {
    flex: 1,
    padding: '0.4rem 0.75rem',
    borderWidth: '0',
    borderStyle: 'none',
    borderRadius: '3px',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    color: '#666',
    textTransform: 'lowercase' as const,
    transition: 'all 0.15s',
    fontFamily: "'Overpass Mono', monospace",
  },
  buttonActive: {
    background: '#fff',
    color: '#000',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
};

