// Ramer-Douglas-Peucker algorithm for path simplification
// Reduces the number of points in a path while preserving its shape

interface Point {
  x: number;
  y: number;
}

// Calculate perpendicular distance from point to line segment
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // If line is a point, return distance to that point
  const lineLengthSquared = dx * dx + dy * dy;
  if (lineLengthSquared === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }

  // Calculate perpendicular distance
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSquared;
  const nearestX = lineStart.x + t * dx;
  const nearestY = lineStart.y + t * dy;

  return Math.sqrt((point.x - nearestX) ** 2 + (point.y - nearestY) ** 2);
}

// Ramer-Douglas-Peucker simplification
function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;

  // Find the point with the maximum distance from the line between start and end
  let maxDistance = 0;
  let maxIndex = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIndex + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIndex), epsilon);

    // Combine results (remove duplicate point at junction)
    return [...left.slice(0, -1), ...right];
  }

  // All points are within epsilon, return just start and end
  return [start, end];
}

// Parse SVG path d attribute to points
export function pathToPoints(d: string): Point[] {
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

// Convert points back to SVG path d attribute
export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';

  const commands = points.map((p, i) => {
    const cmd = i === 0 ? 'M' : 'L';
    // Round to 1 decimal place to save characters
    return `${cmd} ${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`;
  });

  return commands.join(' ');
}

// Simplify an SVG path string
// epsilon: tolerance in pixels (higher = more simplification)
// Recommended: 2-3 for good balance of quality vs compression
export function simplifyPath(d: string, epsilon: number = 2): string {
  const points = pathToPoints(d);
  if (points.length < 3) return d;

  const simplified = rdpSimplify(points, epsilon);
  return pointsToPath(simplified);
}

// Get stats about path simplification
export function getPathStats(original: string, simplified: string): {
  originalPoints: number;
  simplifiedPoints: number;
  reduction: number;
  originalChars: number;
  simplifiedChars: number;
  charReduction: number;
} {
  const originalPoints = pathToPoints(original).length;
  const simplifiedPoints = pathToPoints(simplified).length;

  return {
    originalPoints,
    simplifiedPoints,
    reduction: Math.round((1 - simplifiedPoints / originalPoints) * 100),
    originalChars: original.length,
    simplifiedChars: simplified.length,
    charReduction: Math.round((1 - simplified.length / original.length) * 100),
  };
}
