import { Point, Shape } from '../types';

const CURVE_STEPS = 16;

function quadraticBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

export function parsePathToPoints(d: string): Point[] {
  const points: Point[] = [];
  const regex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let match;
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  while ((match = regex.exec(d)) !== null) {
    const command = match[1];
    const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);

    switch (command) {
      case 'M':
        currentX = args[0]; currentY = args[1];
        startX = currentX; startY = currentY;
        points.push({ x: currentX, y: currentY });
        break;
      case 'm':
        currentX += args[0]; currentY += args[1];
        startX = currentX; startY = currentY;
        points.push({ x: currentX, y: currentY });
        break;
      case 'L':
        currentX = args[0]; currentY = args[1];
        points.push({ x: currentX, y: currentY });
        break;
      case 'l':
        currentX += args[0]; currentY += args[1];
        points.push({ x: currentX, y: currentY });
        break;
      case 'H':
        currentX = args[0];
        points.push({ x: currentX, y: currentY });
        break;
      case 'h':
        currentX += args[0];
        points.push({ x: currentX, y: currentY });
        break;
      case 'V':
        currentY = args[0];
        points.push({ x: currentX, y: currentY });
        break;
      case 'v':
        currentY += args[0];
        points.push({ x: currentX, y: currentY });
        break;
      case 'Q': {
        const p0 = { x: currentX, y: currentY };
        const p1 = { x: args[0], y: args[1] };
        const p2 = { x: args[2], y: args[3] };
        for (let i = 1; i <= CURVE_STEPS; i++) points.push(quadraticBezier(p0, p1, p2, i / CURVE_STEPS));
        currentX = args[2]; currentY = args[3];
        break;
      }
      case 'C': {
        const p0 = { x: currentX, y: currentY };
        const p1 = { x: args[0], y: args[1] };
        const p2 = { x: args[2], y: args[3] };
        const p3 = { x: args[4], y: args[5] };
        for (let i = 1; i <= CURVE_STEPS; i++) points.push(cubicBezier(p0, p1, p2, p3, i / CURVE_STEPS));
        currentX = args[4]; currentY = args[5];
        break;
      }
      case 'Z':
      case 'z':
        if (currentX !== startX || currentY !== startY) {
          points.push({ x: startX, y: startY });
          currentX = startX; currentY = startY;
        }
        break;
      default:
        for (let i = 0; i < args.length - 1; i += 2) {
          if (!isNaN(args[i]) && !isNaN(args[i + 1])) {
            points.push({ x: args[i], y: args[i + 1] });
          }
        }
    }
  }
  return points;
}

export function getShapePoints(shape: Shape): Point[] {
  switch (shape.type) {
    case 'path':
    case 'erase':
      if (shape.d) return parsePathToPoints(shape.d);
      break;
    case 'line':
      if (shape.x1 !== undefined && shape.y1 !== undefined &&
          shape.x2 !== undefined && shape.y2 !== undefined) {
        return [{ x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }];
      }
      break;
    case 'circle':
      if (shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
        const steps = 32;
        return Array.from({ length: steps + 1 }, (_, i) => {
          const angle = (i / steps) * Math.PI * 2;
          return { x: shape.cx! + Math.cos(angle) * shape.r!, y: shape.cy! + Math.sin(angle) * shape.r! };
        });
      }
      break;
    case 'rect':
      if (shape.x !== undefined && shape.y !== undefined &&
          shape.width !== undefined && shape.height !== undefined) {
        return [
          { x: shape.x, y: shape.y },
          { x: shape.x + shape.width, y: shape.y },
          { x: shape.x + shape.width, y: shape.y + shape.height },
          { x: shape.x, y: shape.y + shape.height },
          { x: shape.x, y: shape.y },
        ];
      }
      break;
    case 'curve':
      if (shape.points && shape.points.length >= 2) {
        return shape.points.map(p => ({ x: p[0], y: p[1] }));
      }
      break;
  }
  return [];
}
