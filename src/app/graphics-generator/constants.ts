// Color palette for the graphics generator
export const COLORS = [
  { hex: '#000000', name: 'black' },
  { hex: '#191D23', name: 'charcoal' },
  { hex: '#2A3138', name: 'gunmetal' },
  { hex: '#4A555E', name: 'graphite' },
  { hex: '#6C7A83', name: 'slate' },
  { hex: '#CCD3D6', name: 'mist' },
  { hex: '#E7E8E9', name: 'fog' },
  { hex: '#E0FF2F', name: 'highlighter' },
  { hex: '#FFFFFF', name: 'white' },
] as const;

export const COLOR_NAMES = COLORS.map(c => c.name);

// Helper to get color by hex or name
export const getColorByHex = (hex: string) => {
  return COLORS.find(c => c.hex === hex);
};

// Helper to get random color hex
export const randomColor = () => {
  return COLORS[Math.floor(Math.random() * COLORS.length)].hex;
};

