import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

// Default client using env API key
const defaultClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Create client with user's API key or fallback to default
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
  opacity?: number; // 0-1 for atmospheric depth, shadows, glows
  transform?: string; // SVG transform: "translate(x,y)" "rotate(deg)" "scale(x,y)"
  layer?: 'back' | 'front'; // render order: back (behind existing content), front (default, on top)
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number; // ellipse x-radius
  ry?: number; // ellipse y-radius
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: number[][]; // for polygon/polyline: [[x1,y1], [x2,y2], ...]
  d?: string;
}

// Interaction styles Claude can detect
type InteractionStyle = 'collaborative' | 'playful' | 'neutral';

type DrawingMode = 'forms' | 'details' | 'general';

interface AsciiResponse {
  blocks?: AsciiBlock[];
  shapes?: Shape[];
  wish?: string;
  say?: string;
  sayX?: number;
  sayY?: number;
  replyTo?: number; // Index of comment to reply to (1-indexed to match display)
  setPaletteIndex?: number;
  // Narration fields
  reasoning?: string; // Claude's thinking process
  drawing?: string; // 3-6 word summary of what Claude is adding
  mode?: DrawingMode; // forms, details, or general
  interactionStyle?: InteractionStyle; // Detected human interaction style
  loadingMessages?: string[]; // Whimsical loading messages for next turn
}

interface PreviousDrawing {
  block: string;
  x: number;
  y: number;
}

interface Turn {
  who: 'human' | 'claude';
  description?: string;
  shapes?: Shape[]; // Claude's actual shape output for continuity
  blocks?: AsciiBlock[]; // Claude's actual ASCII output
}

interface CommentReply {
  text: string;
  from: 'human' | 'claude';
}

interface Comment {
  text: string;
  x: number;
  y: number;
  from: 'human' | 'claude';
  replies?: CommentReply[];
}

type DrawMode = 'all' | 'shapes' | 'ascii';
type DrawingRole = 'forms' | 'details' | null;

// Element tracking types for diff-based updates
export interface TrackedElement {
  id: string; // Stable ID like "h-1", "c-3"
  source: 'human' | 'claude';
  type: 'stroke' | 'shape' | 'block' | 'ascii'; // ascii = human text input (position only, no content sent)
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

// Diff representing what changed since last turn
export interface ElementDiff {
  created: TrackedElement[];
  modified: { id: string; changes: Partial<TrackedElement> }[];
  deleted: string[];
}

type FormatMode = 'full' | 'compact-summary' | 'compact-bounds' | 'diff-only';

// ===== Element Format Functions =====

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

// Diff-only format - trust Claude's memory, only send new strokes
function formatDiffOnly(diff: ElementDiff | undefined, canvasWidth: number, canvasHeight: number): string {
  if (!diff || (diff.created.length === 0 && diff.deleted.length === 0)) {
    return 'No changes since last turn.';
  }

  let output = '<new-this-turn>\n';
  diff.created.forEach(el => {
    const region = getElementRegion(el, canvasWidth, canvasHeight);
    const bounds = getElementBounds(el);
    if (el.type === 'stroke') {
      output += `  ${el.id}:stroke@${region}(${bounds}) d="${el.d}"\n`;
    } else if (el.type === 'shape') {
      output += `  ${el.id}:${el.shapeType}@${region}(${bounds})\n`;
    } else if (el.type === 'ascii') {
      // Just position, no character content - saves tokens
      output += `  ${el.id}:ascii@${region}\n`;
    }
  });
  output += '</new-this-turn>';

  if (diff.deleted.length > 0) {
    output += `\n<deleted>${diff.deleted.join(',')}</deleted>`;
  }

  return output;
}

// Compact summary format
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
      const region = getElementRegion(el, canvasWidth, canvasHeight);
      if (el.type === 'stroke' && el.d) {
        output += `  ${el.id}:stroke@${region} d="${el.d}"\n`;
      }
    });
    output += '</new-this-turn>';
  }

  return output;
}

// Compact bounds format
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
      const region = getElementRegion(e, canvasWidth, canvasHeight);
      const bounds = getElementBounds(e);
      return `${e.id}@${region}(${bounds})`;
    }).join(' ');
    output += '\n';
  }

  // Claude elements - just bounds
  if (claudeElements.length > 0) {
    output += '  You: ';
    output += claudeElements.map(e => {
      const region = getElementRegion(e, canvasWidth, canvasHeight);
      const bounds = getElementBounds(e);
      return `${e.id}:${e.shapeType || 'shape'}@${region}(${bounds})`;
    }).join(' ');
    output += '\n';
  }
  output += '</existing>\n';

  // New elements with full path data
  if (diff && diff.created.length > 0) {
    output += '<new-this-turn>\n';
    diff.created.forEach(el => {
      const region = getElementRegion(el, canvasWidth, canvasHeight);
      if (el.type === 'stroke' && el.d) {
        output += `  ${el.id}:stroke@${region} color="${el.color}" d="${el.d}"\n`;
      }
    });
    output += '</new-this-turn>';
  }

  return output;
}

// Full format - all element details
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
      output += formatSingleElement(el, canvasWidth, canvasHeight);
    });
    output += '</human-elements>\n';
  }

  if (claudeElements.length > 0) {
    output += '<your-elements>\n';
    claudeElements.forEach(el => {
      output += formatSingleElement(el, canvasWidth, canvasHeight);
    });
    output += '</your-elements>\n';
  }

  output += '</elements>';
  return output;
}

function formatSingleElement(el: TrackedElement, canvasWidth: number, canvasHeight: number): string {
  const region = getElementRegion(el, canvasWidth, canvasHeight);

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
  } else if (el.type === 'ascii') {
    // Human ASCII input - just position, no content
    return `  <element id="${el.id}" type="ascii" x="${el.x}" y="${el.y}" region="${region}" turn="${el.turnCreated}"/>\n`;
  }
  return '';
}

function getElementBounds(el: TrackedElement): string {
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

function getElementRegion(el: TrackedElement, canvasWidth: number, canvasHeight: number): string {
  let centerX = 0, centerY = 0;

  if (el.cx !== undefined && el.cy !== undefined) {
    centerX = el.cx;
    centerY = el.cy;
  } else if (el.x !== undefined && el.y !== undefined) {
    centerX = el.x + (el.width || 0) / 2;
    centerY = el.y + (el.height || 0) / 2;
  } else if (el.d) {
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

// ===== End Element Format Functions =====

function getDrawingInstructions(drawMode: DrawMode, sayEnabled: boolean, paletteColors?: string[], _paletteIndex?: number, _totalPalettes?: number, hasComments?: boolean, _drawingRole?: DrawingRole, turnCount?: number, useToolCalls: boolean = true): string {
  // Shape types available
  const shapeInfo = drawMode !== 'ascii' ? `Shape types:
  - path: d string (M move, L line, Q quadratic, C cubic, A arc, Z close)
  - circle: cx, cy, r | ellipse: cx, cy, rx, ry
  - rect: x, y, width, height | line: x1, y1, x2, y2
  - polygon: points [[x,y], ...]
  - erase: white marks for highlights, corrections
  Props: fill (required), color, strokeWidth (2 fine, 6 medium, 12 bold), opacity (0-1), layer ("back"/"front")` : '';

  const blockInfo = drawMode !== 'shapes' ? `Blocks (ASCII/text):
  - Good for fine details, texture, small decorations
  - Props: block, x, y, color
  - Chars: ◉●◕◔○ (eyes) ░▒▓█ (shade) ★☆♥♦♣♠▲▼◆◇■□ (symbols) kaomoji` : '';

  const drawingInfo = [shapeInfo, blockInfo].filter(Boolean).join('\n\n');

  // Colors
  const currentColors = paletteColors?.join(' ') || '';
  const allPalettes = `Denim #A6CADD #5F9FB8 #25667F #51241A | Garden #FDCDED #F793D1 #50AF5B #0D7248 | Fire #8FCE42 #FC541A #C71B00 #600000 | Pastel #FECCFA #B1F2B7 #ACDAFF #A9BFFD | Primary #FECC2D #F3381A #0260CB #000000 | Neon #DFFC00 #C7CFD6 #929DAC #4E5872`;

  // Interaction style guidance
  const turns = turnCount ?? 0;
  const interactionStyleGuide = turns <= 2
    ? 'Start collaborative.'
    : 'Be collaborative by default. Switch to playful if human has been adversarial over multiple turns (erasing your work, drawing over it, opposing). Then oppose, subvert, tease back.';

  // Comment guidance
  const commentGuide = sayEnabled
    ? `You can optionally add a comment with say/sayX/sayY${hasComments ? ' or reply to existing comment with replyTo' : ''}.`
    : '';

  // Output format differs based on tool calls vs JSON mode
  const outputFormat = useToolCalls
    ? `<output-format>
Call the draw tool immediately with your shapes/blocks. Include interactionStyle and loadingMessages in the tool call.
</output-format>`
    : `<output-format>
Output a single JSON object with ALL these fields:
{
  "drawing": "REQUIRED: 3-6 word summary of what you're adding",
  "interactionStyle": "collaborative" or "playful",
  "shapes": [...],
  "blocks": [...]${sayEnabled ? ',\n  "say": "optional comment", "sayX": n, "sayY": n' : ''}
}
IMPORTANT: Always include the "drawing" field with a brief summary.
</output-format>`;

  return `<drawing-reference>
${drawingInfo}
</drawing-reference>

<colors>
Current palette: ${currentColors}
All palettes: ${allPalettes}
Use appropriate colors for what you're drawing. Use setPaletteIndex to switch human's palette.
</colors>

<canvas>
Coordinate system: (0,0) top-left, y increases downward
Zones: top (sky/background), middle (main subject), bottom (ground/foreground)
</canvas>

<process>
1. Look at canvas - note what exists and WHERE
2. Pick ONE area to add to
3. ${useToolCalls ? 'Call draw tool immediately' : 'Output JSON response'}
</process>

<interaction>
${interactionStyleGuide}
${commentGuide}
</interaction>

${outputFormat}`;
}

// Single unified prompt - kept minimal, details in getDrawingInstructions
const BASE_PROMPT = `<role>
You're drawing on a shared canvas with a human. Add to what's there. You create beautiful, detailed ASCII SVG sketches by writing code that renders as visual art. When there's loose sketches, add more detail. Approach this like a designer who thinks spatially but works in code.
</role>`;

// Tool definition for structured drawing output
const DRAW_TOOL: Anthropic.Tool = {
  name: 'draw',
  description: 'Add shapes, ASCII blocks, comments, and control palette on the canvas. Call this tool to make your drawing.',
  input_schema: {
    type: 'object' as const,
    properties: {
      shapes: {
        type: 'array',
        description: 'SVG shapes to draw',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['path', 'circle', 'ellipse', 'rect', 'line', 'polygon', 'erase'] },
            d: { type: 'string', description: 'SVG path data (for path type)' },
            cx: { type: 'number' }, cy: { type: 'number' }, r: { type: 'number' },
            rx: { type: 'number' }, ry: { type: 'number' },
            x: { type: 'number' }, y: { type: 'number' },
            x1: { type: 'number' }, y1: { type: 'number' },
            x2: { type: 'number' }, y2: { type: 'number' },
            width: { type: 'number' }, height: { type: 'number' },
            points: { type: 'array', items: { type: 'array', items: { type: 'number' } }, description: 'For polygon: [[x,y], ...]' },
            color: { type: 'string', description: 'Stroke color (hex)' },
            fill: { type: 'string', description: 'Fill color (hex)' },
            strokeWidth: { type: 'number', description: '2=fine, 6=medium, 12=bold' },
            strokeLinecap: { type: 'string', enum: ['butt', 'round', 'square'] },
            strokeLinejoin: { type: 'string', enum: ['miter', 'round', 'bevel'] },
            opacity: { type: 'number', description: '0-1 for transparency' },
            transform: { type: 'string', description: 'SVG transform string' },
            layer: { type: 'string', enum: ['back', 'front'], description: 'back=behind existing, front=on top' },
          },
          required: ['type'],
        },
      },
      blocks: {
        type: 'array',
        description: 'ASCII/text blocks for details, texture, decorations',
        items: {
          type: 'object',
          properties: {
            block: { type: 'string', description: 'Text/ASCII characters to display' },
            x: { type: 'number' },
            y: { type: 'number' },
            color: { type: 'string' },
          },
          required: ['block', 'x', 'y'],
        },
      },
      say: { type: 'string', description: 'Optional comment to add on canvas' },
      sayX: { type: 'number', description: 'X position for comment' },
      sayY: { type: 'number', description: 'Y position for comment' },
      replyTo: { type: 'number', description: 'Comment index to reply to (1-indexed)' },
      setPaletteIndex: { type: 'number', description: 'Switch human palette (0-5)' },
      interactionStyle: { type: 'string', enum: ['collaborative', 'playful'], description: 'collaborative=add to their work, playful=subvert/tease' },
      loadingMessages: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5, description: 'REQUIRED: 5 whimsical, creative 3-8 word loading messages about what\'s on the canvas and what you might do next. Be playful and specific to the drawing content. e.g. ["Those flowers need friends...", "Eyeing that empty corner...", "The sun looks lonely up there...", "Contemplating more petals...", "What if I added a bee..."]' },
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const {
      image, canvasWidth, canvasHeight, previousDrawings, previousShapes, history, humanMessages, comments, sayEnabled, temperature, maxTokens, prompt, streaming, drawMode = 'all', thinkingEnabled = false, thinkingBudget = 5000, model, paletteColors, paletteIndex, totalPalettes, turnCount = 0, userApiKey, sharedObservation, sharedIntention, drawingRole,
      // Element tracking params (for diff-based updates)
      elements,
      diff,
      format = 'diff-only' as FormatMode,
      // Tool calls toggle - when false, use legacy JSON output mode
      useToolCalls = false,
    } = await req.json();

    // Image is required unless elements are provided (diff-only mode)
    if (!image && !elements) {
      return NextResponse.json({ error: 'No image or elements provided' }, { status: 400 });
    }

    // Get client - use user's API key if provided, otherwise fallback to env key
    const anthropic = getClient(userApiKey);

    // Detect media type from data URL and remove prefix (only if image provided)
    let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/png';
    let base64Image = '';
    if (image) {
      const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
      if (mediaTypeMatch) {
        const detected = mediaTypeMatch[1];
        if (detected === 'image/jpeg' || detected === 'image/png' || detected === 'image/gif' || detected === 'image/webp') {
          mediaType = detected;
        }
      }
      base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    }

    // Build conversation history context with Claude's actual shapes (for continuity)
    let historyContext = '';
    if (history) {
      // Support both string history (simple) and array history (structured)
      if (typeof history === 'string' && history.length > 0) {
        historyContext = `\n\n<history>\n${history}\n</history>`;
      } else if (Array.isArray(history) && history.length > 0) {
        historyContext = `\n\n<history>`;
        // Show all turns, but only include shape JSON for last 3 Claude turns (token limit)
        const claudeTurns = history.filter((t: Turn) => t.who === 'claude');
        const recentClaudeCount = Math.min(3, claudeTurns.length);
        const recentClaudeIndices = new Set(
          claudeTurns.slice(-recentClaudeCount).map((t: Turn) => history.indexOf(t))
        );

        history.forEach((turn: Turn, i: number) => {
          if (turn.who === 'human') {
            historyContext += `\n<turn n="${i + 1}" who="human">drew something</turn>`;
          } else {
            // Include actual shape JSON for recent Claude turns
            const includeShapes = recentClaudeIndices.has(i);
            if (includeShapes && (turn.shapes || turn.blocks)) {
              const shapesSummary = turn.shapes ? JSON.stringify(turn.shapes) : '';
              const blocksSummary = turn.blocks ? JSON.stringify(turn.blocks) : '';
              historyContext += `\n<turn n="${i + 1}" who="you">
${turn.description || 'drew something'}
${shapesSummary ? `<your-shapes>${shapesSummary}</your-shapes>` : ''}
${blocksSummary ? `<your-blocks>${blocksSummary}</your-blocks>` : ''}
</turn>`;
            } else {
              historyContext += `\n<turn n="${i + 1}" who="you">${turn.description || 'drew something'}</turn>`;
            }
          }
        });
        historyContext += `\n</history>`;
      }
    }

    // Build comment thread context
    let messageContext = '';
    if (comments && Array.isArray(comments) && comments.length > 0) {
      messageContext = `\n\nComments on the canvas (UI appears bottom-right of coordinates, max width 240px):\n`;
      (comments as Comment[]).forEach((comment, i) => {
        const speaker = comment.from === 'human' ? 'Human' : 'You';
        messageContext += `${i + 1}. ${speaker} at (${Math.round(comment.x)}, ${Math.round(comment.y)}): "${comment.text}"\n`;
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.forEach((reply) => {
            const replySpeaker = reply.from === 'human' ? 'Human' : 'You';
            messageContext += `   ↳ ${replySpeaker} replied: "${reply.text}"\n`;
          });
        }
      });
    } else if (humanMessages && humanMessages.length > 0) {
      // Fallback to old format if comments not provided
      messageContext = `\n\nThe human said: "${humanMessages.join('" and "')}"`;
    }

    // Build element context (for diff-based updates)
    let elementContext = '';
    if (elements && Array.isArray(elements) && elements.length > 0) {
      elementContext = `\n\n${formatElements(elements as TrackedElement[], diff as ElementDiff | undefined, canvasWidth, canvasHeight, format)}`;
    }

    // Use custom prompt or the base prompt
    const basePrompt = prompt || BASE_PROMPT;

    // Model selection - default to Opus for drawing
    const modelMap: Record<string, string> = {
      'haiku': 'claude-3-5-haiku-20241022',
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514',
      // Opus version variants for comparison testing
      'opus-4': 'claude-opus-4-20250514',
      'opus-4.1': 'claude-opus-4-1-20250805',
      'opus-4.5': 'claude-opus-4-5-20251101',
      'opus-4.6': 'claude-opus-4-6',
    };
    const selectedModel = modelMap[model] || 'claude-opus-4-20250514';

    // Single-stage: Opus sees image directly and draws
    // (twoStage removed - it was causing Opus to draw blind from text descriptions)
    const hasComments = comments && Array.isArray(comments) && comments.length > 0;
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, sayEnabled, paletteColors, paletteIndex, totalPalettes, hasComments, drawingRole as DrawingRole, turnCount, useToolCalls);

    // Standard max tokens
    const defaultMaxTokens = drawMode === 'ascii' ? 512 : drawMode === 'shapes' ? 640 : 768;
    const requestedMaxTokens = maxTokens || defaultMaxTokens;

    // When thinking is enabled, max_tokens must be greater than thinking budget
    const effectiveMaxTokens = thinkingEnabled
      ? Math.max(requestedMaxTokens, thinkingBudget + 1024)
      : requestedMaxTokens;

    // Build system prompt (cacheable - optimization #3)
    // This part stays the same across requests, so we cache it
    const systemPrompt = `${basePrompt}

${drawingInstructions}`;

    // Debug: log prompt sizes
    const toolSchemaSize = JSON.stringify(DRAW_TOOL).length;
    console.log(`[DEBUG] useToolCalls=${useToolCalls}`);
    console.log(`[DEBUG] systemPrompt=${systemPrompt.length} chars (~${Math.ceil(systemPrompt.length/4)} tokens)`);
    console.log(`[DEBUG] drawingInstructions=${drawingInstructions.length} chars`);
    console.log(`[DEBUG] tool schema=${toolSchemaSize} chars (~${Math.ceil(toolSchemaSize/4)} tokens)`);

    // Build user message - three modes:
    // 1. sharedObservation provided: Draw based on pre-computed observation (for comparison tests)
    // 2. Elements without image: Diff-only mode (Claude uses memory + element IDs)
    // 3. Normal: Image + optional elements context
    let userMessage: string;
    let messageContent: Anthropic.MessageCreateParams['messages'][0]['content'];

    if (sharedObservation) {
      // Drawing-only mode: Use provided observation, just draw (no image needed)
      userMessage = `The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${messageContext}

CANVAS OBSERVATION (from visual analysis):
${sharedObservation}
${sharedIntention ? `\nINTENDED ACTION: ${sharedIntention}` : ''}

Based on this observation${sharedIntention ? ' and intended action' : ''}, draw your response. Focus on executing the drawing well.`;
      messageContent = [
        {
          type: 'text' as const,
          text: userMessage,
        },
      ];
    } else if (elements && !image) {
      // Diff-only mode: No image, just element IDs and new strokes
      userMessage = `The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${messageContext}${elementContext}

Based on the element state${diff ? ' and recent changes' : ''}, what would be a good addition? How can that addition be beautiful and inspiring? Draw it.`;
      messageContent = [
        {
          type: 'text' as const,
          text: userMessage,
        },
      ];
    } else {
      // Normal mode: Image + optional elements context
      userMessage = `The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${messageContext}${elementContext}

Look at the canvas. What do you see? What could be a good addition? How can that addition be beautiful and inspiring? Draw it.`;
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
          text: userMessage,
        },
      ];
    }

    const messageParams: Anthropic.MessageCreateParams = {
      model: selectedModel,
      max_tokens: effectiveMaxTokens,
      // System prompt with cache_control for prompt caching
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
      // Add the draw tool (only when useToolCalls is enabled)
      ...(useToolCalls ? { tools: [DRAW_TOOL] } : {}),
      // Extended thinking - when enabled, temperature must not be set
      // Early turns (≤2): higher temp for exploration, later: lower for focus
      ...(thinkingEnabled
        ? { thinking: { type: 'enabled' as const, budget_tokens: thinkingBudget } }
        : { temperature: temperature ?? (turnCount <= 3 ? 1.0 : 0.7) }),
    };

    // Streaming mode
    if (streaming) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          // Text narration from Claude (observation, intention, interactionStyle)
          let fullText = '';
          let thinkingText = '';

          // Tool call state
          let toolInput = '';
          let currentToolName = '';
          let sentShapesCount = 0;
          let sentBlocksCount = 0;
          let sentDrawing = false;

          // Track current content block type
          let currentBlockType: 'thinking' | 'text' | 'tool_use' | null = null;

          try {
            const messageStream = anthropic.messages.stream(messageParams);

            for await (const event of messageStream) {
              // Track content block starts
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'thinking') {
                  currentBlockType = 'thinking';
                } else if (event.content_block.type === 'text') {
                  currentBlockType = 'text';
                } else if (event.content_block.type === 'tool_use') {
                  currentBlockType = 'tool_use';
                  currentToolName = event.content_block.name;
                  toolInput = '';
                }
              } else if (event.type === 'content_block_stop') {
                // When tool call completes, send any remaining items
                if (currentBlockType === 'tool_use' && currentToolName === 'draw') {
                  try {
                    const input = JSON.parse(toolInput);
                    // Send any shapes/blocks we haven't sent yet
                    if (input.shapes) {
                      for (let i = sentShapesCount; i < input.shapes.length; i++) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'shape', data: input.shapes[i] })}\n\n`));
                      }
                    }
                    if (input.blocks) {
                      for (let i = sentBlocksCount; i < input.blocks.length; i++) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'block', data: input.blocks[i] })}\n\n`));
                      }
                    }
                    // Send comment if present (skip empty/whitespace-only)
                    if (input.say && input.say.trim()) {
                      if (input.replyTo) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'say', data: { text: input.say, replyTo: input.replyTo } })}\n\n`));
                      } else if (input.sayX !== undefined && input.sayY !== undefined) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'say', data: { text: input.say, sayX: input.sayX, sayY: input.sayY } })}\n\n`));
                      }
                    }
                    // Send palette change if present
                    if (input.setPaletteIndex !== undefined) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'setPalette', data: input.setPaletteIndex })}\n\n`));
                    }
                    // Send interaction style from tool call
                    if (input.interactionStyle) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'interactionStyle', data: input.interactionStyle })}\n\n`));
                    }
                    // Send next-turn preview teaser
                    if (input.loadingMessages) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'preview', data: input.loadingMessages })}\n\n`));
                    }
                  } catch { /* tool input parsing failed */ }
                }
                currentBlockType = null;
              }

              // Handle thinking deltas
              if (event.type === 'content_block_delta' && event.delta.type === 'thinking_delta') {
                thinkingText += event.delta.thinking;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', data: event.delta.thinking })}\n\n`));
              }

              // Handle text deltas
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                fullText += event.delta.text;

                if (!useToolCalls) {
                  // Legacy JSON mode: parse shapes/blocks from text
                  const jsonMatch = fullText.match(/\{[\s\S]*$/);
                  if (jsonMatch) {
                    const partialJson = jsonMatch[0];

                    // Extract shapes array
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

                    // Extract blocks array
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

                    // Extract drawing field early (so it streams before connection closes)
                    if (!sentDrawing) {
                      const drawingMatch = partialJson.match(/"drawing"\s*:\s*"([^"]+)"/);
                      if (drawingMatch) {
                        console.log('[DEBUG] Streaming drawing event:', drawingMatch[1]);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'drawing', data: drawingMatch[1] })}\n\n`));
                        sentDrawing = true;
                      }
                    }
                  }
                }
              }

              // Handle tool call input streaming (only when useToolCalls is enabled)
              if (useToolCalls && event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
                toolInput += event.delta.partial_json;

                // Try to extract and stream shapes/blocks as they complete
                // This gives us incremental streaming even within the tool call
                try {
                  // Attempt partial parse to extract completed shapes/blocks
                  const partialInput = toolInput;

                  // Extract shapes array
                  const shapesMatch = partialInput.match(/"shapes"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
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

                    // Send new complete shapes
                    for (let i = sentShapesCount; i < shapes.length; i++) {
                      try {
                        const shape = JSON.parse(shapes[i]);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'shape', data: shape })}\n\n`));
                        sentShapesCount++;
                      } catch { /* skip incomplete */ }
                    }
                  }

                  // Extract blocks array
                  const blocksMatch = partialInput.match(/"blocks"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
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
                } catch { /* partial parse failed, wait for more data */ }
              }
            }

            // Get final message for usage stats
            const finalMessage = await messageStream.finalMessage();

            // Parse structured fields from response (legacy mode only - tool call mode sends via tool)
            if (!useToolCalls) {
              // Legacy JSON mode: parse from JSON in text
              try {
                const jsonMatch = fullText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  // Helper to safely enqueue (controller may be closed if client disconnected)
                  const safeEnqueue = (data: string) => {
                    try {
                      controller.enqueue(encoder.encode(data));
                    } catch { /* controller closed */ }
                  };
                  if (parsed.drawing && !sentDrawing) {
                    console.log('[DEBUG] Sending drawing event (final):', parsed.drawing);
                    safeEnqueue(`data: ${JSON.stringify({ type: 'drawing', data: parsed.drawing })}\n\n`);
                  }
                  if (parsed.interactionStyle) {
                    safeEnqueue(`data: ${JSON.stringify({ type: 'interactionStyle', data: parsed.interactionStyle })}\n\n`);
                  }
                  // Send any unsent shapes/blocks from final parse
                  if (parsed.shapes) {
                    for (let i = sentShapesCount; i < parsed.shapes.length; i++) {
                      safeEnqueue(`data: ${JSON.stringify({ type: 'shape', data: parsed.shapes[i] })}\n\n`);
                    }
                  }
                  if (parsed.blocks) {
                    for (let i = sentBlocksCount; i < parsed.blocks.length; i++) {
                      safeEnqueue(`data: ${JSON.stringify({ type: 'block', data: parsed.blocks[i] })}\n\n`);
                    }
                  }
                  // Handle say/setPalette in legacy mode (skip empty/whitespace-only)
                  if (parsed.say && parsed.say.trim() && parsed.sayX !== undefined && parsed.sayY !== undefined) {
                    safeEnqueue(`data: ${JSON.stringify({ type: 'say', data: { text: parsed.say, sayX: parsed.sayX, sayY: parsed.sayY } })}\n\n`);
                  }
                  if (parsed.setPaletteIndex !== undefined) {
                    safeEnqueue(`data: ${JSON.stringify({ type: 'setPalette', data: parsed.setPaletteIndex })}\n\n`);
                  }
                  if (parsed.loadingMessages) {
                    safeEnqueue(`data: ${JSON.stringify({ type: 'preview', data: parsed.loadingMessages })}\n\n`);
                  }
                }
              } catch (e) { console.log('[DEBUG] JSON parse error:', e); }
            }

            // Send usage info (use try-catch in case controller is closed)
            const usage = finalMessage.usage;
            console.log(`[DEBUG] useToolCalls=${useToolCalls}, usage:`, JSON.stringify(usage));
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'usage',
                input_tokens: usage?.input_tokens || 0,
                output_tokens: usage?.output_tokens || 0,
                cache_creation_input_tokens: (usage as unknown as Record<string, unknown>)?.cache_creation_input_tokens,
                cache_read_input_tokens: (usage as unknown as Record<string, unknown>)?.cache_read_input_tokens,
              })}\n\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
            } catch { /* controller already closed */ }
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Failed' })}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming mode (default)
    const response = await anthropic.messages.create(messageParams);

    // Extract text content
    const textContent = response.content.find((block) => block.type === 'text');
    const narrationText = textContent?.type === 'text' ? textContent.text : '';

    if (useToolCalls) {
      // Tool call mode: extract from tool_use block
      const toolUseContent = response.content.find((block) => block.type === 'tool_use');

      if (!toolUseContent || toolUseContent.type !== 'tool_use' || toolUseContent.name !== 'draw') {
        // Fallback: try to parse JSON from text
        const jsonMatch = narrationText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const asciiResponse: AsciiResponse = JSON.parse(jsonMatch[0]);
          return NextResponse.json(asciiResponse);
        }
        return NextResponse.json({ error: 'No draw tool call in response' }, { status: 500 });
      }

      // Parse tool input
      const toolInput = toolUseContent.input as {
        shapes?: Shape[];
        blocks?: AsciiBlock[];
        say?: string;
        sayX?: number;
        sayY?: number;
        replyTo?: number;
        setPaletteIndex?: number;
        interactionStyle?: InteractionStyle;
        loadingMessages?: string[];
      };

      // Build response from tool data (no text parsing needed)
      const asciiResponse: AsciiResponse = {
        shapes: toolInput.shapes,
        blocks: toolInput.blocks,
        say: toolInput.say,
        sayX: toolInput.sayX,
        sayY: toolInput.sayY,
        replyTo: toolInput.replyTo,
        setPaletteIndex: toolInput.setPaletteIndex,
        interactionStyle: toolInput.interactionStyle,
        loadingMessages: toolInput.loadingMessages,
      };

      return NextResponse.json(asciiResponse);
    } else {
      // Legacy JSON mode: parse from text
      const jsonMatch = narrationText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
      }

      const asciiResponse: AsciiResponse = JSON.parse(jsonMatch[0]);
      return NextResponse.json(asciiResponse);
    }
  } catch (error) {
    console.error('Draw API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
