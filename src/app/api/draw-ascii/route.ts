import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

// Default client using env API key
const defaultClient = new Anthropic({
  apiKey: process.env.DRAW_WEB_API_KEY,
});

function getClient(userApiKey?: string): Anthropic {
  if (userApiKey) {
    return new Anthropic({ apiKey: userApiKey });
  }
  return defaultClient;
}

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

interface Shape {
  type: 'circle' | 'line' | 'rect' | 'curve' | 'erase' | 'path' | 'ellipse' | 'polygon';
  color?: string;
  fill?: string;
  strokeWidth?: number;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: number[][];
  d?: string;
}

interface HumanStroke {
  d: string;
  color: string;
  strokeWidth: number;
}

interface Point {
  x: number;
  y: number;
}

type DrawMode = 'all' | 'shapes' | 'ascii';

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

// Interpolate points along a path
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
    points.push({ x: shape.x, y: shape.y });
    points.push({ x: shape.x + w, y: shape.y });
    points.push({ x: shape.x + w, y: shape.y + h });
    points.push({ x: shape.x, y: shape.y + h });
    points.push({ x: shape.x, y: shape.y });
  } else if (shape.type === 'line' && shape.x1 !== undefined) {
    points.push({ x: shape.x1, y: shape.y1! });
    points.push({ x: shape.x2!, y: shape.y2! });
  } else if (shape.type === 'polygon' && shape.points) {
    for (const p of shape.points) {
      points.push({ x: p[0], y: p[1] });
    }
    if (shape.points.length > 0) {
      points.push({ x: shape.points[0][0], y: shape.points[0][1] });
    }
  }

  return points;
}

// Color to character mapping
function colorToChar(color: string, isHuman: boolean): string {
  const lowerColor = color.toLowerCase();
  let char = '#';

  if (lowerColor.includes('red') || lowerColor === '#ef4444' || lowerColor === '#ff0000') char = 'R';
  else if (lowerColor.includes('blue') || lowerColor === '#3b82f6' || lowerColor === '#0000ff') char = 'B';
  else if (lowerColor.includes('green') || lowerColor === '#22c55e' || lowerColor === '#00ff00') char = 'G';
  else if (lowerColor.includes('yellow') || lowerColor === '#eab308') char = 'Y';
  else if (lowerColor.includes('orange') || lowerColor === '#f97316') char = 'O';
  else if (lowerColor.includes('purple') || lowerColor === '#8b5cf6') char = 'P';
  else if (lowerColor === '#ffffff' || lowerColor === 'white') char = '.';
  else if (lowerColor === '#000000' || lowerColor === 'black') char = '#';

  // Lowercase for Claude's drawings to distinguish from human
  return isHuman ? char : char.toLowerCase();
}

// Convert strokes and shapes to ASCII grid
function createAsciiGrid(
  strokes: HumanStroke[],
  shapes: Shape[],
  canvasWidth: number,
  canvasHeight: number,
  cellSize: number = 20
): string {
  const gridWidth = Math.ceil(canvasWidth / cellSize);
  const gridHeight = Math.ceil(canvasHeight / cellSize);

  // Initialize empty grid
  const grid: string[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill('.'));

  // Plot a point on the grid
  const plotPoint = (x: number, y: number, char: string) => {
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);
    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
      // Don't overwrite with empty
      if (char !== '.') {
        grid[gridY][gridX] = char;
      }
    }
  };

  // Process human strokes
  strokes.forEach((stroke) => {
    const points = pathToPoints(stroke.d);
    const interpolated = interpolatePath(points, cellSize / 2);
    const char = colorToChar(stroke.color, true);
    interpolated.forEach((p) => plotPoint(p.x, p.y, char));
  });

  // Process Claude's shapes
  shapes.forEach((shape) => {
    const points = shapeToPoints(shape);
    const interpolated = interpolatePath(points, cellSize / 2);
    const color = shape.color || '#3b82f6';
    const char = colorToChar(color, false);
    interpolated.forEach((p) => plotPoint(p.x, p.y, char));
  });

  // Build grid string with coordinates
  const lines: string[] = [];

  // X-axis header (show every 10 columns)
  let xHeader = '    ';
  for (let x = 0; x < gridWidth; x += 10) {
    xHeader += (x * cellSize).toString().padEnd(10);
  }
  lines.push(xHeader);

  // Grid rows with Y coordinates
  grid.forEach((row, i) => {
    const yCoord = (i * cellSize).toString().padStart(3);
    lines.push(`${yCoord}|${row.join('')}|`);
  });

  return lines.join('\n');
}

// Generate drawing instructions
function getDrawingInstructions(drawMode: DrawMode, paletteColors?: string[]): string {
  const shapeTypes = `
<shapes>
- circle: {type:"circle", cx, cy, r, color?, fill?}
- ellipse: {type:"ellipse", cx, cy, rx, ry, color?, fill?}
- rect: {type:"rect", x, y, width, height, color?, fill?}
- line: {type:"line", x1, y1, x2, y2, color?, strokeWidth?}
- path: {type:"path", d:"M x y L x y...", color?, fill?, strokeWidth?}
- polygon: {type:"polygon", points:[[x,y],...], color?, fill?}
</shapes>`;

  const asciiInfo = `
<ascii>
blocks: [{block: "multi\\nline\\nASCII", x, y, color?}]
</ascii>`;

  const colorInfo = paletteColors ? `\nPalette: ${paletteColors.join(', ')}` : '';

  return `${shapeTypes}
${drawMode !== 'shapes' ? asciiInfo : ''}
${colorInfo}

Coordinate system: (0,0) top-left, y increases downward
Each cell in the grid = 20 pixels

<output>
{
  "observation": "what the human drew (interpret the ASCII pattern)",
  "intention": "what you're adding at (x, y) pixel coordinates",
  "shapes": [...],
  "blocks": [...]
}
</output>`;
}

const BASE_PROMPT = `<role>
You are drawing on a shared canvas with a human. You receive an ASCII grid representation of the canvas.

Reading the grid:
- Each character represents a 20x20 pixel area
- "." = empty space
- UPPERCASE letters (# R B G Y O P) = human's drawings
- lowercase letters = your previous drawings
- The Y coordinate is shown on the left, X coordinates at the top

Example: If you see "###" at row 100, columns 5-7, that's a horizontal line from (100, 100) to (140, 100).

Interpret the pattern to understand what the human drew (a house? a face? abstract shapes?), then add something that complements it.
</role>`;

export async function POST(req: NextRequest) {
  try {
    const {
      humanStrokes,
      claudeShapes,
      claudeBlocks,
      canvasWidth,
      canvasHeight,
      temperature,
      maxTokens,
      prompt,
      streaming,
      drawMode = 'all',
      model,
      paletteColors,
      turnCount = 0,
      userApiKey,
      cellSize = 20,
    } = await req.json();

    const anthropic = getClient(userApiKey);

    // Create ASCII grid representation
    const asciiGrid = createAsciiGrid(
      humanStrokes || [],
      claudeShapes || [],
      canvasWidth,
      canvasHeight,
      cellSize
    );

    // Build canvas description
    let canvasDescription = `Canvas: ${canvasWidth}x${canvasHeight} pixels (grid cell = ${cellSize}px)\n\n`;
    canvasDescription += '<canvas-grid>\n';
    canvasDescription += asciiGrid;
    canvasDescription += '\n</canvas-grid>\n\n';

    canvasDescription += `Legend:\n`;
    canvasDescription += `- . = empty\n`;
    canvasDescription += `- # = human's black stroke\n`;
    canvasDescription += `- R/G/B/Y/O/P = human's colored strokes (Red/Green/Blue/Yellow/Orange/Purple)\n`;
    canvasDescription += `- lowercase = your previous drawings\n`;

    const basePrompt = prompt || BASE_PROMPT;
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, paletteColors);

    const systemPrompt = `${basePrompt}\n\n${drawingInstructions}`;

    const userMessage = `${canvasDescription}\n\nWhat do you see in the grid? Add something that fits.`;

    // Model selection
    const modelMap: Record<string, string> = {
      'haiku': 'claude-3-5-haiku-20241022',
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514',
    };
    const selectedModel = modelMap[model] || 'claude-opus-4-20250514';

    const defaultMaxTokens = drawMode === 'ascii' ? 512 : drawMode === 'shapes' ? 640 : 768;
    const effectiveMaxTokens = maxTokens || defaultMaxTokens;

    const messageParams: Anthropic.MessageCreateParams = {
      model: selectedModel,
      max_tokens: effectiveMaxTokens,
      system: [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      messages: [
        {
          role: 'user' as const,
          content: userMessage,
        },
      ],
      temperature: temperature ?? (turnCount <= 3 ? 1.0 : 0.7),
    };

    // Streaming mode
    if (streaming) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          let fullText = '';
          let sentBlocksCount = 0;
          let sentShapesCount = 0;
          let sentObservation = false;
          let sentIntention = false;

          try {
            const messageStream = anthropic.messages.stream(messageParams);

            for await (const event of messageStream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                fullText += event.delta.text;

                const jsonMatch = fullText.match(/\{[\s\S]*$/);
                if (jsonMatch) {
                  const partialJson = jsonMatch[0];

                  // Extract blocks
                  const blocksMatch = partialJson.match(/"blocks"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
                  if (blocksMatch) {
                    const blockRegex = /\{[^{}]*"block"\s*:[^{}]*\}/g;
                    const blocks = blocksMatch[1].match(blockRegex) || [];
                    for (let i = sentBlocksCount; i < blocks.length; i++) {
                      try {
                        const block = JSON.parse(blocks[i]);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'block', data: block })}\n\n`));
                        sentBlocksCount++;
                      } catch { /* skip */ }
                    }
                  }

                  // Extract shapes
                  const shapesMatch = partialJson.match(/"shapes"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
                  if (shapesMatch) {
                    const shapesContent = shapesMatch[1];
                    let braceCount = 0;
                    let currentShape = '';
                    const shapes: string[] = [];

                    for (let i = 0; i < shapesContent.length; i++) {
                      const char = shapesContent[i];
                      if (char === '{') {
                        braceCount++;
                        currentShape += char;
                      } else if (char === '}') {
                        braceCount--;
                        currentShape += char;
                        if (braceCount === 0 && currentShape.trim()) {
                          shapes.push(currentShape);
                          currentShape = '';
                        }
                      } else if (braceCount > 0) {
                        currentShape += char;
                      }
                    }

                    for (let i = sentShapesCount; i < shapes.length; i++) {
                      try {
                        const shape = JSON.parse(shapes[i]);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'shape', data: shape })}\n\n`));
                        sentShapesCount++;
                      } catch { /* skip */ }
                    }
                  }

                  // Extract observation
                  if (!sentObservation) {
                    const obsMatch = partialJson.match(/"observation"\s*:\s*"([^"]+)"/);
                    if (obsMatch) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'observation', data: obsMatch[1] })}\n\n`));
                      sentObservation = true;
                    }
                  }

                  // Extract intention
                  if (!sentIntention) {
                    const intMatch = partialJson.match(/"intention"\s*:\s*"([^"]+)"/);
                    if (intMatch) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'intention', data: intMatch[1] })}\n\n`));
                      sentIntention = true;
                    }
                  }
                }
              }

              if (event.type === 'message_stop') {
                const finalMessage = await messageStream.finalMessage();
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'done',
                  usage: finalMessage.usage,
                })}\n\n`));
              }
            }
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming mode
    const response = await anthropic.messages.create(messageParams);
    const textContent = response.content.find(c => c.type === 'text');
    const text = textContent?.type === 'text' ? textContent.text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          ...parsed,
          usage: response.usage,
        });
      } catch {
        return NextResponse.json({ error: 'Failed to parse response', raw: text }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'No valid response', raw: text }, { status: 500 });
  } catch (error) {
    console.error('Draw ASCII API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
