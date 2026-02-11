'use client';

import { Provider as StyletronProvider } from 'styletron-react';
import { Client as Styletron } from 'styletron-engine-monolithic';
import { BaseProvider, LightTheme } from 'baseui';
import { ReactNode, useState, useEffect } from 'react';

// Singleton engine instance
let engineInstance: Styletron | null = null;
const getEngine = () => {
  if (typeof window === 'undefined') return null;
  if (!engineInstance) {
    engineInstance = new Styletron();
  }
  return engineInstance;
};

export function BaseUIProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [engine] = useState(() => getEngine());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || !engine) {
    return <>{children}</>;
  }

  return (
    <StyletronProvider value={engine}>
      <BaseProvider theme={LightTheme}>
        {children}
      </BaseProvider>
    </StyletronProvider>
  );
}
