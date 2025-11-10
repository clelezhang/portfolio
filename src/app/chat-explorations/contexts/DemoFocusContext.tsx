'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface DemoFocusContextType {
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
  toggleFocus: () => void;
}

const DemoFocusContext = createContext<DemoFocusContextType | undefined>(undefined);

export function DemoFocusProvider({ children }: { children: ReactNode }) {
  const [isFocused, setIsFocused] = useState(true);

  const toggleFocus = () => setIsFocused(prev => !prev);

  return (
    <DemoFocusContext.Provider value={{ isFocused, setIsFocused, toggleFocus }}>
      {children}
    </DemoFocusContext.Provider>
  );
}

export function useDemoFocus() {
  const context = useContext(DemoFocusContext);
  if (context === undefined) {
    throw new Error('useDemoFocus must be used within a DemoFocusProvider');
  }
  return context;
}
