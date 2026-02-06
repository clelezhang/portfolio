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
  // Narration fields - Claude explains what it sees and does
  reasoning?: string; // Claude's thinking process
  observation?: string; // What Claude sees on the canvas
  intention?: string; // What Claude is drawing and why
  mode?: DrawingMode; // forms, details, or general
  interactionStyle?: InteractionStyle; // Detected human interaction style
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

function getDrawingInstructions(drawMode: DrawMode, sayEnabled: boolean, paletteColors?: string[], _paletteIndex?: number, _totalPalettes?: number, hasComments?: boolean, _drawingRole?: DrawingRole, turnCount?: number): string {
  // Tools with detail
  const shapeTools = drawMode !== 'ascii' ? `shapes — Types:
  path: d string (M move, L line, Q quadratic, C cubic, A arc, Z close)
  circle: cx, cy, r | ellipse: cx, cy, rx, ry
  rect: x, y, width, height | line: x1, y1, x2, y2
  polygon: points [[x,y], ...]
  Props: fill (required), color, strokeWidth (2 fine, 6 medium, 12 bold), opacity (0-1), strokeLinecap/join ("round"), transform, layer ("back" to draw behind existing content)` : '';

  const blockTools = drawMode !== 'shapes' ? `blocks — Text/ASCII at position. Good for fine details, texture, small decorations on shapes.
  Props: block, x, y, color
  Chars: ◉●◕◔○ (eyes) ░▒▓█ (shade) ~~~~|||| (texture) ★☆♥♦♣♠▲▼◆◇■□ (symbols) kaomoji` : '';

  const eraseTools = drawMode !== 'ascii' ? `erase — White marks. Props: type:"erase", strokeWidth
  Use for: highlights, light effects, negative space, corrections` : '';

  const tools = [shapeTools, blockTools, eraseTools].filter(Boolean).join('\n\n');

  // Colors
  const currentColors = paletteColors?.join(' ') || '';
  const allPalettes = `Denim #A6CADD #5F9FB8 #25667F #51241A | Garden #FDCDED #F793D1 #50AF5B #0D7248 | Fire #8FCE42 #FC541A #C71B00 #600000 | Pastel #FECCFA #B1F2B7 #ACDAFF #A9BFFD | Primary #FECC2D #F3381A #0260CB #000000 | Neon #DFFC00 #C7CFD6 #929DAC #4E5872`;

  // Interaction style - based on behavior patterns across turns, not single drawings
  const turns = turnCount ?? 0;
  const interactionStyle = turns <= 2
    ? `"interactionStyle": "collaborative"`
    : `"interactionStyle": "collaborative" (DEFAULT) | "playful" (switch if human has been adversarial over multiple turns — erasing your work, drawing over it, opposing your additions. Then oppose, subvert, tease back (Not a bad thing to have conflict!))`;

  // Comment field - rare, not every turn
  const commentField = sayEnabled
    ? `  "say": "brief comment (only if specific to say/ask - don't repeat areas you've commented)", "sayX": n, "sayY": n${hasComments ? ', "replyTo": N' : ''}`
    : '';

  // Output structure
  const shapesField = drawMode !== 'ascii' ? `  "shapes": [...]` : '';
  const blocksField = drawMode !== 'shapes' ? `  "blocks": [...]` : '';
  const drawFields = [shapesField, blocksField].filter(Boolean).join(',\n');

  return `<tools>
${tools}
</tools>

<colors>
Current: ${currentColors}
All: ${allPalettes}
Use appropriate colors for what you're drawing (green for foliage, blue for sky, brown for wood, etc).
"setPaletteIndex": N to switch human's palette. Erase tool for white.
</colors>

<canvas>
Coordinate system: (0,0) top-left, y increases downward
Zones: top (sky/background), middle (main subject), bottom (ground/foreground)
</canvas>

<process>
1. Look at canvas - note what exists and WHERE (coordinates)
2. Pick ONE area to work on - finish it before moving elsewhere
3. Plan what to add at POSITION (x,y) - your coordinates MUST match this position
4. Draw using shapes AND blocks together - blocks add character and detail. They are better for small objects.
</process>

<output>
{
  "observation": "what I see (include positions of key elements)",
  "intention": "what I'm adding at (x, y) coordinates",
  ${interactionStyle},
${drawFields}${commentField ? ',\n' + commentField : ''}
}
</output>`;
}

// Single unified prompt - kept minimal, details in getDrawingInstructions
const BASE_PROMPT = `<role>
You're drawing on a shared canvas with a human. Add to what's there. You create beautiful, detailed ASCII SVG sketches by writing code that renders as visual art. When there's loose sketches, add more detail. Approach this like a designer who thinks spatially but works in code.
</role>`;

export async function POST(req: NextRequest) {
  try {
    const { image, canvasWidth, canvasHeight, previousDrawings, previousShapes, history, humanMessages, comments, sayEnabled, temperature, maxTokens, prompt, streaming, drawMode = 'all', thinkingEnabled = false, thinkingBudget = 5000, model, paletteColors, paletteIndex, totalPalettes, turnCount = 0, userApiKey, sharedObservation, sharedIntention, drawingRole } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Get client - use user's API key if provided, otherwise fallback to env key
    const anthropic = getClient(userApiKey);

    // Detect media type from data URL and remove prefix
    let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/png';
    const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
    if (mediaTypeMatch) {
      const detected = mediaTypeMatch[1];
      if (detected === 'image/jpeg' || detected === 'image/png' || detected === 'image/gif' || detected === 'image/webp') {
        mediaType = detected;
      }
    }
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

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
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, sayEnabled, paletteColors, paletteIndex, totalPalettes, hasComments, drawingRole as DrawingRole, turnCount);

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

    // Build user message - two modes:
    // 1. sharedObservation provided: Draw based on pre-computed observation (for comparison tests)
    // 2. Normal: Opus sees image directly and draws
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
    } else {
      // Normal mode: Opus sees the image directly
      userMessage = `The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${messageContext}

Look at the canvas. What do you see? What would be a good addition? Draw it.`;
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
          let fullText = '';
          let thinkingText = '';
          let sentBlocksCount = 0;
          let sentShapesCount = 0;
          let sentSay = false;
          let sentWish = false;
          let sentSetPalette = false;
          let sentReplyTo = false;
          let sentObservation = false;
          let sentIntention = false;
          let sentInteractionStyle = false;
          let sentReasoning = false;
          let sentMode = false;
          let currentBlockType: 'thinking' | 'text' | null = null;

          // Streaming comment state
          let sayStarted = false;
          let lastSentSayLength = 0;
          let sayPositionSent = false;
          let replyToValue: number | null = null;

          try {
            const messageStream = anthropic.messages.stream(messageParams);

            for await (const event of messageStream) {
              // Track which content block we're in
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'thinking') {
                  currentBlockType = 'thinking';
                } else if (event.content_block.type === 'text') {
                  currentBlockType = 'text';
                }
              } else if (event.type === 'content_block_stop') {
                currentBlockType = null;
              }

              // Handle thinking deltas
              if (event.type === 'content_block_delta' && event.delta.type === 'thinking_delta') {
                thinkingText += event.delta.thinking;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', data: event.delta.thinking })}\n\n`));
              }

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

                  // Extract shapes - improved regex to handle path "d" strings
                  const shapesMatch = partialJson.match(/"shapes"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
                  if (shapesMatch) {
                    // Match shape objects more carefully, accounting for nested quotes in "d" strings
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

                  // Extract say (new comment or reply) - with streaming support
                  if (!sentSay) {
                    // Check for replyTo first
                    if (!replyToValue) {
                      const replyToMatch = partialJson.match(/"replyTo"\s*:\s*(\d+)/);
                      if (replyToMatch) {
                        replyToValue = parseInt(replyToMatch[1]);
                      }
                    }

                    // Look for "say" field - extract partial content even before closing quote
                    const sayFieldMatch = partialJson.match(/"say"\s*:\s*"/);
                    if (sayFieldMatch) {
                      // Find where the string value starts
                      const sayStart = partialJson.indexOf(sayFieldMatch[0]) + sayFieldMatch[0].length;
                      // Find the end - either closing quote or end of string
                      let sayEnd = sayStart;
                      let escaped = false;
                      let foundEnd = false;
                      for (let i = sayStart; i < partialJson.length; i++) {
                        if (escaped) {
                          escaped = false;
                          continue;
                        }
                        if (partialJson[i] === '\\') {
                          escaped = true;
                          continue;
                        }
                        if (partialJson[i] === '"') {
                          sayEnd = i;
                          foundEnd = true;
                          break;
                        }
                        sayEnd = i + 1;
                      }

                      // Get current say content (handle escape sequences)
                      const rawSayContent = partialJson.slice(sayStart, sayEnd);
                      let sayContent = rawSayContent;
                      try {
                        // Parse escape sequences
                        sayContent = JSON.parse(`"${rawSayContent}"`);
                      } catch {
                        // If parsing fails, use raw content
                        sayContent = rawSayContent;
                      }

                      // Check if we need to send position info first
                      if (!sayPositionSent && !sayStarted) {
                        if (replyToValue) {
                          // Reply - send start with replyTo
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            type: 'replyStart',
                            data: { replyTo: replyToValue }
                          })}\n\n`));
                          sayStarted = true;
                          sayPositionSent = true;
                        } else {
                          // New comment - need position
                          const sayXMatch = partialJson.match(/"sayX"\s*:\s*(\d+)/);
                          const sayYMatch = partialJson.match(/"sayY"\s*:\s*(\d+)/);
                          if (sayXMatch && sayYMatch) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                              type: 'sayStart',
                              data: { sayX: parseInt(sayXMatch[1]), sayY: parseInt(sayYMatch[1]) }
                            })}\n\n`));
                            sayStarted = true;
                            sayPositionSent = true;
                          }
                        }
                      }

                      // Send new chunks of text
                      if (sayStarted && sayContent.length > lastSentSayLength) {
                        const newChunk = sayContent.slice(lastSentSayLength);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'sayChunk',
                          data: { text: newChunk }
                        })}\n\n`));
                        lastSentSayLength = sayContent.length;
                      }

                      // Mark as complete when we find the closing quote
                      if (foundEnd && sayStarted) {
                        sentSay = true;
                        if (replyToValue) {
                          sentReplyTo = true;
                        }
                      }
                    }
                  }

                  // Extract wish
                  if (!sentWish) {
                    const wishMatch = partialJson.match(/"wish"\s*:\s*"([^"]*)"/);
                    if (wishMatch) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'wish', data: wishMatch[1] })}\n\n`));
                      sentWish = true;
                    }
                  }

                  // Extract setPaletteIndex
                  if (!sentSetPalette) {
                    const setPaletteMatch = partialJson.match(/"setPaletteIndex"\s*:\s*(\d+)/);
                    if (setPaletteMatch) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'setPalette', data: parseInt(setPaletteMatch[1]) })}\n\n`));
                      sentSetPalette = true;
                    }
                  }

                  // Extract reasoning (Claude's thinking - without API thinking feature)
                  if (!sentReasoning) {
                    const reasoningMatch = partialJson.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (reasoningMatch) {
                      try {
                        const reasoning = JSON.parse(`"${reasoningMatch[1]}"`);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', data: reasoning })}\n\n`));
                        sentReasoning = true;
                      } catch { /* skip if parsing fails */ }
                    }
                  }

                  // Extract observation (what Claude sees)
                  if (!sentObservation) {
                    const observationMatch = partialJson.match(/"observation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (observationMatch) {
                      try {
                        const observation = JSON.parse(`"${observationMatch[1]}"`);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'observation', data: observation })}\n\n`));
                        sentObservation = true;
                      } catch { /* skip if parsing fails */ }
                    }
                  }

                  // Extract intention (what Claude is drawing and why)
                  if (!sentIntention) {
                    const intentionMatch = partialJson.match(/"intention"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (intentionMatch) {
                      try {
                        const intention = JSON.parse(`"${intentionMatch[1]}"`);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'intention', data: intention })}\n\n`));
                        sentIntention = true;
                      } catch { /* skip if parsing fails */ }
                    }
                  }

                  // Extract interactionStyle (collaborative, playful, or neutral)
                  if (!sentInteractionStyle) {
                    const styleMatch = partialJson.match(/"interactionStyle"\s*:\s*"(collaborative|playful|neutral)"/);
                    if (styleMatch) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'interactionStyle', data: styleMatch[1] })}\n\n`));
                      sentInteractionStyle = true;
                    }
                  }

                  // Extract mode (forms, details, or general)
                  if (!sentMode) {
                    const modeMatch = partialJson.match(/"mode"\s*:\s*"(forms|details|general)"/);
                    if (modeMatch) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'mode', data: modeMatch[1] })}\n\n`));
                      sentMode = true;
                    }
                  }
                }
              }
            }

            // Get final message for usage stats
            const finalMessage = await messageStream.finalMessage();

            // Fallback: Try to extract narration fields from complete response if not sent during streaming
            // This catches cases where models output fields in different orders or regex didn't match
            try {
              const jsonMatch = fullText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Send any narration fields that weren't captured during streaming
                if (!sentReasoning && parsed.reasoning) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', data: parsed.reasoning })}\n\n`));
                }
                if (!sentObservation && parsed.observation) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'observation', data: parsed.observation })}\n\n`));
                }
                if (!sentIntention && parsed.intention) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'intention', data: parsed.intention })}\n\n`));
                }
                if (!sentInteractionStyle && parsed.interactionStyle) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'interactionStyle', data: parsed.interactionStyle })}\n\n`));
                }
                if (!sentMode && parsed.mode) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'mode', data: parsed.mode })}\n\n`));
                }
              }
            } catch { /* parsing failed, skip fallback */ }

            // Send usage info
            const usage = finalMessage.usage;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'usage',
              input_tokens: usage?.input_tokens || 0,
              output_tokens: usage?.output_tokens || 0
            })}\n\n`));

            // Send raw text for debugging
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'rawText', data: fullText.slice(0, 500) })}\n\n`));

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
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

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No text response' }, { status: 500 });
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    const asciiResponse: AsciiResponse = JSON.parse(jsonMatch[0]);
    return NextResponse.json(asciiResponse);
  } catch (error) {
    console.error('Draw API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
