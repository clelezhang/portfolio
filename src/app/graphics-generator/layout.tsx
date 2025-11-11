import type { Metadata } from 'next';
import './fonts.css';

export const metadata: Metadata = {
  title: 'Graphics Generator | Lele Zhang',
  description: 'A layer-based canvas app for creating generative graphics with ASCII art, gradients, and grids.',
};

export default function GraphicsGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={{ fontFamily: "'Overpass Mono', monospace", fontWeight: 400 }}>{children}</div>;
}

