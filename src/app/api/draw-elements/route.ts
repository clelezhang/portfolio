import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const defaultClient = new Anthropic({
  apiKey: process.env.DRAW_WEB_API_KEY,
});

function getClient(userApiKey?: string): Anthropic {
  if (userApiKey) {
    return new Anthropic({ apiKey: userApiKey });
  }
  return defaultClient;
}

// Element with stable ID for tracking
export interface TrackedElement {
  id: string; // Stable ID like "h-1", "c-3"
  source: 'human' | 'claude';
  type: 'stroke' | 'shape' | 'block';
  // For strokes/shapes
  d?: string;
  shapeType?: 'circle' | 'line' | 'rect' | 'path' | 'ellipse' | 'polygon';
  color?: string;
  fill?: string;
  strokeWidth?: number;
  // Shape-specific
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  points?: number[][];
  // For blocks
  block?: string;
  // Metadata
  turnCreated: number;
  turnModified?: number;
}

// Element operations Claude can perform
interface ElementOperation {
  op: 'create' | 'update' | 'delete';
  id?: string; // Required for update/delete
  element?: Partial<TrackedElement>; // For create/update
}

// Diff representing what changed since last turn
interface ElementDiff {
  created: TrackedElement[];
  modified: { id: string; changes: Partial<TrackedElement> }[];
  deleted: string[];
}

type DrawMode = 'all' | 'shapes' | 'ascii';

type FormatMode = 'full' | 'compact-summary' | 'compact-bounds' | 'diff-only';

// Format elements based on mode
function formatElements(
  elements: TrackedElement[],
  diff: ElementDiff | undefined,
  canvasWidth: number,
  canvasHeight: number,
  format: FormatMode
): string {
  if (format === 'diff-only') {
    return formatDiffOnly(diff, canvasWidth, canvasHeight);
  } else if (format === 'compact-summary') {
    return formatCompactSummary(elements, diff, canvasWidth, canvasHeight);
  } else if (format === 'compact-bounds') {
    return formatCompactBounds(elements, diff, canvasWidth, canvasHeight);
  } else {
    return formatElementsFull(elements, canvasWidth, canvasHeight);
  }
}

// Option A: Diff-only - trust Claude's memory
function formatDiffOnly(diff: ElementDiff | undefined, canvasWidth: number, canvasHeight: number): string {
  if (!diff || (diff.created.length === 0 && diff.deleted.length === 0)) {
    return 'No changes since last turn.';
  }

  let output = '<new-this-turn>\n';
  diff.created.forEach(el => {
    const region = getRegion(el, canvasWidth, canvasHeight);
    const bounds = getBounds(el);
    if (el.type === 'stroke') {
      output += `  ${el.id}:stroke@${region}(${bounds}) d="${el.d}"\n`;
    } else if (el.type === 'shape') {
      output += `  ${el.id}:${el.shapeType}@${region}(${bounds})\n`;
    }
  });
  output += '</new-this-turn>';

  if (diff.deleted.length > 0) {
    output += `\n<deleted>${diff.deleted.join(',')}</deleted>`;
  }

  return output;
}

// Option B: Compact summary + full diff
function formatCompactSummary(
  elements: TrackedElement[],
  diff: ElementDiff | undefined,
  canvasWidth: number,
  canvasHeight: number
): string {
  const humanElements = elements.filter(e => e.source === 'human');
  const claudeElements = elements.filter(e => e.source === 'claude');
  const newIds = new Set(diff?.created.map(e => e.id) || []);

  // Existing elements as compact list (just IDs and types) - exclude new ones
  const existingHuman = humanElements.filter(e => !newIds.has(e.id));

  let output = '<existing>\n';
  if (existingHuman.length > 0) {
    output += `  Human: ${existingHuman.map(e => `${e.id}:${e.type}`).join(' ')}\n`;
  }
  if (claudeElements.length > 0) {
    output += `  You: ${claudeElements.map(e => `${e.id}:${e.shapeType || e.type}`).join(' ')}\n`;
  }
  output += '</existing>\n';

  // New elements with full data
  if (diff && diff.created.length > 0) {
    output += '<new-this-turn>\n';
    diff.created.forEach(el => {
      const region = getRegion(el, canvasWidth, canvasHeight);
      if (el.type === 'stroke' && el.d) {
        output += `  ${el.id}:stroke@${region} d="${el.d}"\n`;
      }
    });
    output += '</new-this-turn>';
  }

  return output;
}

// Option C: IDs + bounds for old, full for new
function formatCompactBounds(
  elements: TrackedElement[],
  diff: ElementDiff | undefined,
  canvasWidth: number,
  canvasHeight: number
): string {
  const humanElements = elements.filter(e => e.source === 'human');
  const claudeElements = elements.filter(e => e.source === 'claude');
  const newIds = new Set(diff?.created.map(e => e.id) || []);

  let output = '<existing>\n';

  // Existing human elements (not new) - just bounds
  const existingHuman = humanElements.filter(e => !newIds.has(e.id));
  if (existingHuman.length > 0) {
    output += '  Human: ';
    output += existingHuman.map(e => {
      const region = getRegion(e, canvasWidth, canvasHeight);
      const bounds = getBounds(e);
      return `${e.id}@${region}(${bounds})`;
    }).join(' ');
    output += '\n';
  }

  // Claude elements - just bounds
  if (claudeElements.length > 0) {
    output += '  You: ';
    output += claudeElements.map(e => {
      const region = getRegion(e, canvasWidth, canvasHeight);
      const bounds = getBounds(e);
      return `${e.id}:${e.shapeType || 'shape'}@${region}(${bounds})`;
    }).join(' ');
    output += '\n';
  }
  output += '</existing>\n';

  // New elements with full path data
  if (diff && diff.created.length > 0) {
    output += '<new-this-turn>\n';
    diff.created.forEach(el => {
      const region = getRegion(el, canvasWidth, canvasHeight);
      if (el.type === 'stroke' && el.d) {
        output += `  ${el.id}:stroke@${region} color="${el.color}" d="${el.d}"\n`;
      }
    });
    output += '</new-this-turn>';
  }

  return output;
}

// Full format (current verbose XML)
function formatElementsFull(elements: TrackedElement[], canvasWidth: number, canvasHeight: number): string {
  if (!elements || elements.length === 0) {
    return '<elements>\nCanvas is empty.\n</elements>';
  }

  const humanElements = elements.filter(e => e.source === 'human');
  const claudeElements = elements.filter(e => e.source === 'claude');

  let output = '<elements>\n';

  if (humanElements.length > 0) {
    output += '<human-elements>\n';
    humanElements.forEach(el => {
      output += formatElement(el, canvasWidth, canvasHeight);
    });
    output += '</human-elements>\n';
  }

  if (claudeElements.length > 0) {
    output += '<your-elements>\n';
    claudeElements.forEach(el => {
      output += formatElement(el, canvasWidth, canvasHeight);
    });
    output += '</your-elements>\n';
  }

  output += '</elements>';
  return output;
}

function getBounds(el: TrackedElement): string {
  if (el.d) {
    const coords = el.d.match(/[\d.]+/g)?.map(Number) || [];
    if (coords.length >= 4) {
      const xs = coords.filter((_, i) => i % 2 === 0);
      const ys = coords.filter((_, i) => i % 2 === 1);
      const minX = Math.round(Math.min(...xs));
      const minY = Math.round(Math.min(...ys));
      const maxX = Math.round(Math.max(...xs));
      const maxY = Math.round(Math.max(...ys));
      return `${minX},${minY},${maxX - minX},${maxY - minY}`;
    }
  }
  if (el.cx !== undefined && el.cy !== undefined) {
    const r = el.r || el.rx || 10;
    return `${Math.round(el.cx - r)},${Math.round(el.cy - r)},${Math.round(r * 2)},${Math.round(r * 2)}`;
  }
  if (el.x !== undefined && el.y !== undefined) {
    return `${Math.round(el.x)},${Math.round(el.y)},${Math.round(el.width || 0)},${Math.round(el.height || 0)}`;
  }
  return '0,0,0,0';
}

function formatElement(el: TrackedElement, canvasWidth: number, canvasHeight: number): string {
  const region = getRegion(el, canvasWidth, canvasHeight);

  if (el.type === 'stroke' && el.d) {
    return `  <element id="${el.id}" type="stroke" color="${el.color}" width="${el.strokeWidth}" region="${region}" turn="${el.turnCreated}">\n    <path d="${el.d}"/>\n  </element>\n`;
  } else if (el.type === 'shape') {
    const props = [];
    if (el.shapeType) props.push(`shape="${el.shapeType}"`);
    if (el.color) props.push(`color="${el.color}"`);
    if (el.fill) props.push(`fill="${el.fill}"`);
    if (el.cx !== undefined) props.push(`cx="${el.cx}"`);
    if (el.cy !== undefined) props.push(`cy="${el.cy}"`);
    if (el.r !== undefined) props.push(`r="${el.r}"`);
    if (el.x !== undefined) props.push(`x="${el.x}"`);
    if (el.y !== undefined) props.push(`y="${el.y}"`);
    if (el.width !== undefined) props.push(`width="${el.width}"`);
    if (el.height !== undefined) props.push(`height="${el.height}"`);
    if (el.d) props.push(`d="${el.d}"`);
    return `  <element id="${el.id}" type="shape" ${props.join(' ')} region="${region}" turn="${el.turnCreated}"/>\n`;
  } else if (el.type === 'block' && el.block) {
    const preview = el.block.split('\n')[0].slice(0, 20);
    return `  <element id="${el.id}" type="block" x="${el.x}" y="${el.y}" preview="${preview}..." region="${region}" turn="${el.turnCreated}"/>\n`;
  }
  return '';
}

function getRegion(el: TrackedElement, canvasWidth: number, canvasHeight: number): string {
  let centerX = 0, centerY = 0;

  if (el.cx !== undefined && el.cy !== undefined) {
    centerX = el.cx;
    centerY = el.cy;
  } else if (el.x !== undefined && el.y !== undefined) {
    centerX = el.x + (el.width || 0) / 2;
    centerY = el.y + (el.height || 0) / 2;
  } else if (el.d) {
    // Parse path to get approximate center
    const coords = el.d.match(/[\d.]+/g)?.map(Number) || [];
    if (coords.length >= 2) {
      centerX = coords[0];
      centerY = coords[1];
    }
  }

  const horizontal = centerX < canvasWidth / 3 ? 'left' : centerX > canvasWidth * 2 / 3 ? 'right' : 'center';
  const vertical = centerY < canvasHeight / 3 ? 'top' : centerY > canvasHeight * 2 / 3 ? 'bottom' : 'middle';

  if (horizontal === 'center' && vertical === 'middle') return 'center';
  if (horizontal === 'center') return vertical;
  if (vertical === 'middle') return horizontal;
  return `${vertical}-${horizontal}`;
}

// Format diff for incremental updates
function formatDiff(diff: ElementDiff): string {
  if (diff.created.length === 0 && diff.modified.length === 0 && diff.deleted.length === 0) {
    return '<changes>No changes since last turn.</changes>';
  }

  let output = '<changes-since-last-turn>\n';

  if (diff.created.length > 0) {
    output += '  <created>\n';
    diff.created.forEach(el => {
      if (el.type === 'stroke') {
        output += `    <element id="${el.id}" type="stroke" color="${el.color}"><path d="${el.d}"/></element>\n`;
      } else if (el.type === 'shape') {
        output += `    <element id="${el.id}" type="shape" shape="${el.shapeType}"/>\n`;
      }
    });
    output += '  </created>\n';
  }

  if (diff.modified.length > 0) {
    output += '  <modified>\n';
    diff.modified.forEach(({ id, changes }) => {
      output += `    <element id="${id}" changes="${JSON.stringify(changes)}"/>\n`;
    });
    output += '  </modified>\n';
  }

  if (diff.deleted.length > 0) {
    output += `  <deleted ids="${diff.deleted.join(',')}"/>\n`;
  }

  output += '</changes-since-last-turn>';
  return output;
}

function getDrawingInstructions(drawMode: DrawMode, allowOperations: boolean): string {
  if (allowOperations) {
    // Full operations mode - create/update/delete
    return `<tools>
ELEMENT OPERATIONS - You can create, update, or delete elements by ID:

CREATE new elements:
  {"op": "create", "element": {"type": "shape", "shapeType": "circle", "cx": 100, "cy": 100, "r": 50, "fill": "#ff0000"}}
  {"op": "create", "element": {"type": "shape", "shapeType": "path", "d": "M 10 10 L 100 100", "color": "#000"}}
  {"op": "create", "element": {"type": "block", "block": "hello", "x": 50, "y": 50}}

UPDATE existing elements by ID (only specify changed properties):
  {"op": "update", "id": "c-3", "element": {"fill": "#00ff00", "cx": 150}}
  {"op": "update", "id": "c-5", "element": {"d": "M 20 20 L 200 200"}}

DELETE elements by ID:
  {"op": "delete", "id": "c-2"}

Shape types: circle, ellipse, rect, line, path, polygon
Shape props: color, fill, strokeWidth, cx, cy, r, rx, ry, x, y, width, height, d, points
Block props: block (text), x, y, color
</tools>

<output>
{
  "observation": "what I see (reference elements by ID)",
  "intention": "what I'm doing - creating new elements or modifying existing ones",
  "operations": [
    {"op": "create", "element": {...}},
    {"op": "update", "id": "c-1", "element": {...}},
    {"op": "delete", "id": "h-2"}
  ]
}
</output>

IMPORTANT:
- Use UPDATE to refine your previous work instead of drawing over it
- Use DELETE to remove elements that don't fit
- Reference human elements by ID when responding to their specific strokes`;
  } else {
    // Add-only mode with ID awareness - simpler, more creative
    return `<shapes>
- circle: {type:"circle", cx, cy, r, color?, fill?}
- ellipse: {type:"ellipse", cx, cy, rx, ry, color?, fill?}
- rect: {type:"rect", x, y, width, height, color?, fill?}
- line: {type:"line", x1, y1, x2, y2, color?, strokeWidth?}
- path: {type:"path", d:"M x y L x y...", color?, fill?, strokeWidth?}
- polygon: {type:"polygon", points:[[x,y],...], color?, fill?}
</shapes>

<output>
{
  "observation": "what I see (you can reference elements by their IDs like h-1, c-3)",
  "intention": "what I'm adding and where",
  "shapes": [...],
  "blocks": [{block: "text", x, y, color?}, ...]
}
</output>`;
  }
}

function getBasePrompt(allowOperations: boolean): string {
  if (allowOperations) {
    return `<role>
You are drawing on a shared canvas with a human. Every element has a stable ID you can reference.

You can:
1. CREATE new elements (shapes, paths, blocks)
2. UPDATE existing elements by ID (change position, color, size, etc.)
3. DELETE elements by ID

This allows you to refine your work iteratively, respond precisely to human edits, and maintain a clean canvas.
</role>`;
  } else {
    return `<role>
You are drawing on a shared canvas with a human. Every element has a stable ID (like h-1, c-3) so you know exactly what exists.

The <changes-since-last-turn> section shows what the human just added or changed - respond to their latest strokes!

Add to what's there. Create beautiful, detailed drawings that complement and build on the human's work.
</role>`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      elements, // All tracked elements with IDs
      diff, // What changed since last turn (optional)
      canvasWidth,
      canvasHeight,
      turnCount = 0,
      temperature,
      maxTokens,
      prompt,
      streaming,
      drawMode = 'all',
      model,
      userApiKey,
      image, // Optional image for sync turns
      lastSyncContext,
      allowOperations = false, // false = add-only with ID awareness, true = full create/update/delete
      format = 'full' as FormatMode, // 'full' | 'compact-summary' | 'compact-bounds' | 'diff-only'
    } = await req.json();

    const anthropic = getClient(userApiKey);

    // Build context
    let context = `Canvas: ${canvasWidth}x${canvasHeight}px | Turn: ${turnCount}\n\n`;

    // Element state in specified format
    context += formatElements(elements || [], diff, canvasWidth, canvasHeight, format);
    context += '\n\n';

    // Only add separate diff section for 'full' format (other formats include diff inline)
    if (diff && format === 'full') {
      context += formatDiff(diff);
      context += '\n\n';
    }

    // Sync context for non-image turns
    if (lastSyncContext && !image) {
      context += `[Last visual sync - Turn ${lastSyncContext.turn}]\n`;
      if (lastSyncContext.observation) context += `Observed: ${lastSyncContext.observation}\n`;
      context += '\n';
    }

    const basePrompt = prompt || getBasePrompt(allowOperations);
    const instructions = getDrawingInstructions(drawMode as DrawMode, allowOperations);
    const systemPrompt = `${basePrompt}\n\n${instructions}`;

    const userMessage = allowOperations
      ? `${context}
Based on the current canvas state${diff ? ' and recent changes' : ''}, what would you like to do?
You can create new elements, update existing ones by ID, or delete elements.`
      : `${context}
Based on the current canvas state${diff ? ' and recent changes' : ''}, what would be a good addition? Draw it.`;

    // Build message content
    let messageContent: Anthropic.MessageCreateParams['messages'][0]['content'];
    if (image) {
      let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/jpeg';
      const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
      if (mediaTypeMatch) {
        const detected = mediaTypeMatch[1];
        if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(detected)) {
          mediaType = detected as typeof mediaType;
        }
      }
      const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

      messageContent = [
        { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64Image } },
        { type: 'text' as const, text: `[SYNC TURN - Visual reference above]\n\n${userMessage}` },
      ];
    } else {
      messageContent = userMessage;
    }

    const modelMap: Record<string, string> = {
      'haiku': 'claude-3-5-haiku-20241022',
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514',
    };

    const messageParams: Anthropic.MessageCreateParams = {
      model: modelMap[model] || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens || 768,
      system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user' as const, content: messageContent }],
      temperature: temperature ?? 0.8,
    };

    if (streaming) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          let fullText = '';
          let sentOperations = 0;
          let sentShapes = 0;
          let sentBlocks = 0;
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

                  if (allowOperations) {
                    // Operations mode - extract operations array
                    const opsMatch = partialJson.match(/"operations"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
                    if (opsMatch) {
                      const opsContent = opsMatch[1];
                      let braceCount = 0;
                      let currentOp = '';
                      const operations: string[] = [];

                      for (let i = 0; i < opsContent.length; i++) {
                        const char = opsContent[i];
                        if (char === '{') {
                          braceCount++;
                          currentOp += char;
                        } else if (char === '}') {
                          braceCount--;
                          currentOp += char;
                          if (braceCount === 0 && currentOp.trim()) {
                            operations.push(currentOp);
                            currentOp = '';
                          }
                        } else if (braceCount > 0) {
                          currentOp += char;
                        }
                      }

                      for (let i = sentOperations; i < operations.length; i++) {
                        try {
                          const op = JSON.parse(operations[i]) as ElementOperation;
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'operation', data: op })}\n\n`));
                          sentOperations++;
                        } catch { /* skip incomplete */ }
                      }
                    }
                  } else {
                    // Add-only mode - extract shapes and blocks arrays
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

                      for (let i = sentShapes; i < shapes.length; i++) {
                        try {
                          const shape = JSON.parse(shapes[i]);
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'shape', data: shape })}\n\n`));
                          sentShapes++;
                        } catch { /* skip incomplete */ }
                      }
                    }

                    // Extract blocks
                    const blocksMatch = partialJson.match(/"blocks"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
                    if (blocksMatch) {
                      const blockRegex = /\{[^{}]*"block"\s*:[^{}]*\}/g;
                      const blocks = blocksMatch[1].match(blockRegex) || [];
                      for (let i = sentBlocks; i < blocks.length; i++) {
                        try {
                          const block = JSON.parse(blocks[i]);
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'block', data: block })}\n\n`));
                          sentBlocks++;
                        } catch { /* skip incomplete */ }
                      }
                    }
                  }

                  // Extract observation (both modes)
                  if (!sentObservation) {
                    const obsMatch = partialJson.match(/"observation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (obsMatch) {
                      try {
                        const observation = JSON.parse(`"${obsMatch[1]}"`);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'observation', data: observation })}\n\n`));
                        sentObservation = true;
                      } catch { /* skip */ }
                    }
                  }

                  // Extract intention (both modes)
                  if (!sentIntention) {
                    const intMatch = partialJson.match(/"intention"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (intMatch) {
                      try {
                        const intention = JSON.parse(`"${intMatch[1]}"`);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'intention', data: intention })}\n\n`));
                        sentIntention = true;
                      } catch { /* skip */ }
                    }
                  }
                }
              }
            }

            const finalMessage = await messageStream.finalMessage();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', usage: finalMessage.usage })}\n\n`));
          } catch (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    // Non-streaming
    const response = await anthropic.messages.create(messageParams);
    const textContent = response.content.find(c => c.type === 'text');
    const text = textContent?.type === 'text' ? textContent.text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ ...parsed, usage: response.usage });
      } catch {
        return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'No response', raw: text }, { status: 500 });
  } catch (error) {
    console.error('Draw elements API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
