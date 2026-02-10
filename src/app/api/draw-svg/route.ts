import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

// Default client using env API key
const defaultClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  opacity?: number;
  transform?: string;
  layer?: 'back' | 'front';
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

interface Turn {
  who: 'human' | 'claude';
  description?: string;
  shapes?: Shape[];
  blocks?: AsciiBlock[];
}

type DrawMode = 'all' | 'shapes' | 'ascii';

// Convert human strokes to SVG path data (actual paths, not descriptions)
function formatHumanStrokes(strokes: HumanStroke[], canvasWidth: number, canvasHeight: number): string {
  if (!strokes || strokes.length === 0) {
    return 'The canvas is empty - no human strokes yet.';
  }

  const strokeData: string[] = [];

  strokes.forEach((stroke, i) => {
    // Parse to get bounds for context
    const points = parsePath(stroke.d);
    if (points.length === 0) return;

    const bounds = getBoundingBox(points);
    const region = getRegion(bounds, canvasWidth, canvasHeight);

    // Send actual SVG path data so Claude can trace the shape
    strokeData.push(
      `<stroke id="${i + 1}" color="${stroke.color}" width="${stroke.strokeWidth}" region="${region}">
  <path d="${stroke.d}"/>
  <bounds x="${Math.round(bounds.minX)}" y="${Math.round(bounds.minY)}" w="${Math.round(bounds.maxX - bounds.minX)}" h="${Math.round(bounds.maxY - bounds.minY)}"/>
</stroke>`
    );
  });

  return strokeData.join('\n');
}

// Format Claude's previous shapes as structured data
function formatClaudeShapes(shapes: Shape[]): string {
  if (!shapes || shapes.length === 0) return '';

  // Send shapes as JSON so Claude knows exactly what it drew before
  return JSON.stringify(shapes, null, 2);
}

// Parse SVG path d attribute to points
function parsePath(d: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const commands = d.match(/[MLQCZ][\s\d.,\-]*/gi) || [];

  let currentX = 0, currentY = 0;

  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

    if (type === 'M' || type === 'L') {
      for (let i = 0; i < nums.length; i += 2) {
        currentX = nums[i];
        currentY = nums[i + 1];
        points.push({ x: currentX, y: currentY });
      }
    } else if (type === 'Q') {
      // Quadratic curve - sample the endpoint
      if (nums.length >= 4) {
        currentX = nums[2];
        currentY = nums[3];
        points.push({ x: currentX, y: currentY });
      }
    } else if (type === 'C') {
      // Cubic curve - sample the endpoint
      if (nums.length >= 6) {
        currentX = nums[4];
        currentY = nums[5];
        points.push({ x: currentX, y: currentY });
      }
    }
  }

  return points;
}

// Get bounding box of points
function getBoundingBox(points: { x: number; y: number }[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return {
    minX: Math.min(...points.map(p => p.x)),
    minY: Math.min(...points.map(p => p.y)),
    maxX: Math.max(...points.map(p => p.x)),
    maxY: Math.max(...points.map(p => p.y)),
  };
}

// Get region description
function getRegion(bounds: { minX: number; minY: number; maxX: number; maxY: number }, canvasWidth: number, canvasHeight: number): string {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const horizontal = centerX < canvasWidth / 3 ? 'left' : centerX > canvasWidth * 2 / 3 ? 'right' : 'center';
  const vertical = centerY < canvasHeight / 3 ? 'top' : centerY > canvasHeight * 2 / 3 ? 'bottom' : 'middle';

  if (horizontal === 'center' && vertical === 'middle') return 'center';
  if (horizontal === 'center') return vertical;
  if (vertical === 'middle') return horizontal;
  return `${vertical}-${horizontal}`;
}

// Classify stroke type based on geometry
function classifyStroke(points: { x: number; y: number }[]): string {
  if (points.length < 2) return 'dot';

  const bounds = getBoundingBox(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const diagonal = Math.sqrt(width * width + height * height);

  // Calculate total path length
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  // Classify based on characteristics
  if (diagonal < 20) return 'small mark';
  if (pathLength / diagonal < 1.5) return 'straight line';
  if (pathLength / diagonal > 3 && Math.abs(width - height) < Math.max(width, height) * 0.3) return 'circular scribble';
  if (width > height * 2) return 'horizontal stroke';
  if (height > width * 2) return 'vertical stroke';
  return 'curved stroke';
}

// Generate drawing instructions for SVG-based mode
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
Use for texture, patterns, small details, text
</ascii>`;

  const colorInfo = paletteColors ? `
<colors>
Available palette: ${paletteColors.join(', ')}
</colors>` : '';

  let modeInstructions = '';
  if (drawMode === 'shapes') {
    modeInstructions = 'Output shapes only (no blocks).';
  } else if (drawMode === 'ascii') {
    modeInstructions = 'Output blocks only (no shapes).';
  } else {
    modeInstructions = 'Use both shapes and blocks together.';
  }

  return `${shapeTypes}
${drawMode !== 'shapes' ? asciiInfo : ''}
${colorInfo}

${modeInstructions}

<canvas>
Coordinate system: (0,0) top-left, y increases downward
</canvas>

<output>
{
  "observation": "what exists on canvas (from the description provided)",
  "intention": "what you're adding and where (x, y)",
  "shapes": [...],
  "blocks": [...]
}
</output>`;
}

const BASE_PROMPT = `<role>
You are drawing on a shared canvas with a human. You receive SVG path data representing the human's strokes.

To understand what the human drew:
- SVG paths use: M (move to), L (line to), Q (quadratic curve), C (cubic curve)
- Example: "M 100 100 L 200 100 L 200 200 L 100 200 L 100 100" = a square
- Example: "M 150 50 L 100 150 L 200 150 L 150 50" = a triangle
- Trace the path mentally: follow the coordinates to visualize the shape

The <bounds> tag shows the bounding box, and "region" tells you where on canvas (top-left, center, etc).

Add to what's there. Create beautiful drawings that complement the human's work.
</role>`;

export async function POST(req: NextRequest) {
  try {
    const {
      humanStrokes,
      claudeShapes,
      claudeBlocks,
      canvasWidth,
      canvasHeight,
      history,
      sayEnabled,
      temperature,
      maxTokens,
      prompt,
      streaming,
      drawMode = 'all',
      model,
      paletteColors,
      turnCount = 0,
      userApiKey,
      image, // Optional: for hybrid mode (image + SVG on sync turns)
      lastSyncContext, // Context from last image sync turn for SVG-only turns
    } = await req.json();

    const anthropic = getClient(userApiKey);

    // Build structured description of canvas state with actual SVG data
    let canvasDescription = `Canvas size: ${canvasWidth}x${canvasHeight} pixels\n\n`;

    // Human strokes with actual SVG path data
    canvasDescription += '<human-strokes>\n';
    canvasDescription += formatHumanStrokes(humanStrokes || [], canvasWidth, canvasHeight);
    canvasDescription += '\n</human-strokes>\n\n';

    // Claude's previous shapes as JSON (so Claude knows exactly what it drew)
    if (claudeShapes && claudeShapes.length > 0) {
      canvasDescription += '<your-previous-shapes>\n';
      canvasDescription += formatClaudeShapes(claudeShapes);
      canvasDescription += '\n</your-previous-shapes>\n\n';
    }

    // Describe Claude's previous ASCII blocks
    if (claudeBlocks && claudeBlocks.length > 0) {
      canvasDescription += '=== YOUR PREVIOUS ASCII BLOCKS ===\n';
      claudeBlocks.forEach((block: AsciiBlock, i: number) => {
        const preview = block.block.split('\n')[0].slice(0, 30);
        canvasDescription += `Block ${i + 1}: "${preview}..." at (${block.x}, ${block.y})`;
        if (block.color) canvasDescription += `, color=${block.color}`;
        canvasDescription += '\n';
      });
      canvasDescription += '\n';
    }

    // Build history context
    let historyContext = '';
    if (history && Array.isArray(history) && history.length > 0) {
      historyContext = '\n=== TURN HISTORY ===\n';
      history.forEach((turn: Turn, i: number) => {
        historyContext += `Turn ${i + 1}: ${turn.who} - ${turn.description || 'drew something'}\n`;
      });
    }

    const basePrompt = prompt || BASE_PROMPT;
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, paletteColors);

    const systemPrompt = `${basePrompt}

${drawingInstructions}`;

    // Build context from last sync turn if available (for SVG-only turns)
    let syncContextNote = '';
    if (lastSyncContext && !image) {
      syncContextNote = `\n[CONTEXT FROM LAST VISUAL SYNC (Turn ${lastSyncContext.turn})]\n`;
      if (lastSyncContext.observation) {
        syncContextNote += `You observed: "${lastSyncContext.observation}"\n`;
      }
      if (lastSyncContext.intention) {
        syncContextNote += `Your intention was: "${lastSyncContext.intention}"\n`;
      }
      syncContextNote += `Continue building on this understanding while working from the SVG data below.\n\n`;
    }

    const userMessage = `${syncContextNote}${canvasDescription}${historyContext}

Based on this canvas state, what would be a good addition? Draw it.`;

    // Model selection
    const modelMap: Record<string, string> = {
      'haiku': 'claude-3-5-haiku-20241022',
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514',
    };
    const selectedModel = modelMap[model] || 'claude-opus-4-20250514';

    const defaultMaxTokens = drawMode === 'ascii' ? 512 : drawMode === 'shapes' ? 640 : 768;
    const effectiveMaxTokens = maxTokens || defaultMaxTokens;

    // Build message content - include image if provided (hybrid mode)
    let messageContent: Anthropic.MessageCreateParams['messages'][0]['content'];

    if (image) {
      // Hybrid mode: image + SVG data for visual verification
      let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/png';
      const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
      if (mediaTypeMatch) {
        const detected = mediaTypeMatch[1];
        if (detected === 'image/jpeg' || detected === 'image/png' || detected === 'image/gif' || detected === 'image/webp') {
          mediaType = detected;
        }
      }
      const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

      messageContent = [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType,
            data: base64Image,
          },
        },
        {
          type: 'text' as const,
          text: `[SYNC TURN: You can see the canvas image above. Below is the structured SVG data for reference.]\n\n${userMessage}`,
        },
      ];
    } else {
      // SVG-only mode
      messageContent = userMessage;
    }

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
          content: messageContent,
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
                      } catch { /* skip incomplete */ }
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
                      } catch { /* skip incomplete */ }
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

              // Handle message end
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

    // Parse response
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
    console.error('Draw SVG API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
