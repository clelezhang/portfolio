// Convert SVG strokes to ASCII grid representation
// This gives Claude a visual understanding of what the human drew

interface Point {
  x: number;
  y: number;
}

interface HumanStroke {
  d: string;
  color: string;
  strokeWidth: number;
}

interface Shape {
  type: string;
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: number[][];
}

// Parse SVG path to points
function pathToPoints(d: string): Point[] {
  const points: Point[] = [];
  const commands = d.match(/[ML]\s*[\d.]+\s+[\d.]+/g) || [];

  for (const cmd of commands) {
    const match = cmd.match(/[ML]\s*([\d.]+)\s+([\d.]+)/);
    if (match) {
      points.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
    }
  }

  return points;
}

// Interpolate points along a path for better coverage
function interpolatePath(points: Point[], step: number = 5): Point[] {
  if (points.length < 2) return points;

  const interpolated: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / step);

    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      interpolated.push({
        x: prev.x + dx * t,
        y: prev.y + dy * t,
      });
    }
  }

  return interpolated;
}

// Get points for a shape
function shapeToPoints(shape: Shape): Point[] {
  const points: Point[] = [];

  if (shape.type === 'path' && shape.d) {
    return pathToPoints(shape.d);
  } else if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
    // Sample points around the circle
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      points.push({
        x: shape.cx + shape.r * Math.cos(angle),
        y: shape.cy + shape.r * Math.sin(angle),
      });
    }
  } else if (shape.type === 'ellipse' && shape.cx !== undefined && shape.cy !== undefined) {
    const rx = shape.rx || 10;
    const ry = shape.ry || 10;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      points.push({
        x: shape.cx + rx * Math.cos(angle),
        y: shape.cy + ry * Math.sin(angle),
      });
    }
  } else if (shape.type === 'rect' && shape.x !== undefined && shape.y !== undefined) {
    const w = shape.width || 0;
    const h = shape.height || 0;
    // Rectangle corners and edges
    points.push({ x: shape.x, y: shape.y });
    points.push({ x: shape.x + w, y: shape.y });
    points.push({ x: shape.x + w, y: shape.y + h });
    points.push({ x: shape.x, y: shape.y + h });
    points.push({ x: shape.x, y: shape.y }); // Close
  } else if (shape.type === 'line' && shape.x1 !== undefined) {
    points.push({ x: shape.x1, y: shape.y1! });
    points.push({ x: shape.x2!, y: shape.y2! });
  } else if (shape.type === 'polygon' && shape.points) {
    for (const p of shape.points) {
      points.push({ x: p[0], y: p[1] });
    }
    if (shape.points.length > 0) {
      points.push({ x: shape.points[0][0], y: shape.points[0][1] }); // Close
    }
  }

  return points;
}

// Color to character mapping
function colorToChar(color: string): string {
  const lowerColor = color.toLowerCase();
  if (lowerColor.includes('red') || lowerColor === '#ef4444' || lowerColor === '#ff0000') return 'R';
  if (lowerColor.includes('blue') || lowerColor === '#3b82f6' || lowerColor === '#0000ff') return 'B';
  if (lowerColor.includes('green') || lowerColor === '#22c55e' || lowerColor === '#00ff00') return 'G';
  if (lowerColor.includes('yellow') || lowerColor === '#eab308') return 'Y';
  if (lowerColor.includes('orange') || lowerColor === '#f97316') return 'O';
  if (lowerColor.includes('purple') || lowerColor === '#8b5cf6') return 'P';
  if (lowerColor === '#ffffff' || lowerColor === 'white') return '.'; // Eraser
  return '#'; // Default mark
}

export interface AsciiGridOptions {
  cellSize?: number;  // Pixels per character (default 20)
  width?: number;     // Grid width in characters
  height?: number;    // Grid height in characters
}

export interface AsciiGridResult {
  grid: string;
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
  legend: string;
}

// Convert strokes and shapes to ASCII grid
export function strokesToAsciiGrid(
  strokes: HumanStroke[],
  shapes: Shape[],
  canvasWidth: number,
  canvasHeight: number,
  options: AsciiGridOptions = {}
): AsciiGridResult {
  // Default to ~40 chars wide, proportional height
  const cellSize = options.cellSize || 20;
  const gridWidth = options.width || Math.ceil(canvasWidth / cellSize);
  const gridHeight = options.height || Math.ceil(canvasHeight / cellSize);

  // Initialize empty grid
  const grid: string[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill('.'));

  // Track colors used
  const colorsUsed = new Set<string>();

  // Plot a point on the grid
  const plotPoint = (x: number, y: number, char: string) => {
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);
    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
      grid[gridY][gridX] = char;
    }
  };

  // Process human strokes
  strokes.forEach((stroke) => {
    const points = pathToPoints(stroke.d);
    const interpolated = interpolatePath(points, cellSize / 2);
    const char = colorToChar(stroke.color);
    colorsUsed.add(stroke.color);

    interpolated.forEach((p) => plotPoint(p.x, p.y, char));
  });

  // Process Claude's shapes
  shapes.forEach((shape) => {
    const points = shapeToPoints(shape);
    const interpolated = interpolatePath(points, cellSize / 2);
    const color = (shape as { color?: string }).color || '#3b82f6';
    const char = colorToChar(color).toLowerCase(); // Lowercase for Claude's drawings
    colorsUsed.add(color);

    interpolated.forEach((p) => plotPoint(p.x, p.y, char));
  });

  // Build grid string with row numbers
  const lines: string[] = [];
  lines.push(`     ${'0'.padStart(3)}${''.padStart(gridWidth - 6)}${(gridWidth - 1).toString()}`);
  lines.push(`     ${'|'.padStart(3)}${''.padStart(gridWidth - 6)}${'|'}`);

  grid.forEach((row, i) => {
    const rowNum = (i * cellSize).toString().padStart(3);
    lines.push(`${rowNum}: ${row.join('')}`);
  });

  // Build legend
  const legendParts: string[] = [];
  legendParts.push('Legend: . = empty');
  if (colorsUsed.size > 0) {
    legendParts.push('Human strokes: # (black), R (red), B (blue), G (green), Y (yellow), O (orange), P (purple)');
    legendParts.push("Claude's shapes: lowercase letters (r, b, g, etc.)");
  }

  return {
    grid: lines.join('\n'),
    cellSize,
    gridWidth,
    gridHeight,
    legend: legendParts.join('\n'),
  };
}
