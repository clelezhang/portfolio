import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

interface Shape {
  type: 'circle' | 'line' | 'rect' | 'curve' | 'erase' | 'path';
  color?: string;
  fill?: string;
  strokeWidth?: number;
  cx?: number;
  cy?: number;
  r?: number;
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

interface AsciiResponse {
  blocks?: AsciiBlock[];
  shapes?: Shape[];
  wish?: string;
  say?: string;
  sayX?: number;
  sayY?: number;
  replyTo?: number; // Index of comment to reply to (1-indexed to match display)
  setPaletteIndex?: number;
}

interface PreviousDrawing {
  block: string;
  x: number;
  y: number;
}

interface Turn {
  who: 'human' | 'claude';
  description?: string;
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

function getDrawingInstructions(drawMode: DrawMode, sayEnabled: boolean, paletteColors?: string[], paletteIndex?: number, totalPalettes?: number, hasComments?: boolean): string {
  // Comment instructions: new comment OR reply to existing
  let sayInstructions = '';
  let commentNote = '';
  if (sayEnabled) {
    if (hasComments) {
      // Show reply format when there are existing comments
      sayInstructions = ',\n  "say": "your reply", "replyTo": 1';
      commentNote = `\n\nComments: To reply to an existing comment, use "say" with "replyTo" (the comment number). To leave a new comment, use "say" with "sayX"/"sayY" coordinates.`;
    } else {
      sayInstructions = ',\n  "say": "comment", "sayX": 300, "sayY": 100';
    }
  }

  // Palette instructions
  let paletteInstructions = '';
  if (paletteColors && paletteColors.length > 0) {
    paletteInstructions = `\n\nAvailable colors (current palette): ${paletteColors.join(', ')}
Use these colors for your drawings. You can also set "setPaletteIndex": ${(paletteIndex ?? 0) + 1 < (totalPalettes ?? 6) ? (paletteIndex ?? 0) + 1 : 0} to change to the next palette (0-${(totalPalettes ?? 6) - 1}).`;
  }

  if (drawMode === 'shapes') {
    return `Draw using SVG paths and geometric shapes.

JSON format:
{
  "shapes": [
    {"type": "path", "d": "M 100 100 C 150 50 200 150 250 100", "color": "#3b82f6", "fill": "#93c5fd", "strokeWidth": 2},
    {"type": "circle", "cx": 200, "cy": 200, "r": 30, "color": "#ef4444", "fill": "#fecaca"},
    {"type": "rect", "x": 100, "y": 100, "width": 50, "height": 30, "color": "#3b82f6"},
    {"type": "line", "x1": 0, "y1": 0, "x2": 100, "y2": 100, "color": "#000"},
    {"type": "curve", "points": [[0,0], [50,25], [100,0]], "color": "#10b981"}
  ]${sayInstructions}
}

Path commands: M (move), L (line), C (cubic bezier), Q (quadratic), A (arc), Z (close).
Shape types: path, circle, line, rect, curve, erase.
Properties: color (stroke), fill (solid or "transparent"), strokeWidth.${commentNote}${paletteInstructions}`;
  }

  if (drawMode === 'ascii') {
    return `Draw using text and characters.

JSON format:
{
  "blocks": [{"block": "your text here", "x": 100, "y": 150, "color": "#3b82f6"}]${sayInstructions}
}

Use \\n for newlines. You can draw/create drawings with any character (text, symbols, patterns, or more).
Available: letters, numbers, punctuation, unicode symbols (░▒▓█ ╔╗╚╝║═ ●○ ▲▼ ★☆ ♦♣♠♥ ≈∼ etc), kaomoji, diagrams, shapes, box drawing, and more.${commentNote}${paletteInstructions}`;
  }

  // 'all' mode
  return `Draw using SVG paths, shapes, or ASCII art.

JSON format:
{
  "blocks": [{"block": "ASCII art", "x": 100, "y": 150, "color": "#3b82f6"}],
  "shapes": [
    {"type": "path", "d": "M 100 100 C 150 50 200 150 250 100", "color": "#3b82f6", "fill": "#93c5fd"},
    {"type": "circle", "cx": 200, "cy": 200, "r": 30, "color": "#ef4444", "fill": "#fecaca"},
    {"type": "rect", "x": 100, "y": 100, "width": 50, "height": 30, "color": "#3b82f6"},
    {"type": "line", "x1": 0, "y1": 0, "x2": 100, "y2": 100, "color": "#000"},
    {"type": "curve", "points": [[0,0], [50,25], [100,0]], "color": "#10b981"}
  ]${sayInstructions}
}

Path commands: M, L, C, Q, A, Z. Shape types: path, circle, line, rect, curve, erase.
Properties: color (stroke), fill (solid or "transparent"), strokeWidth.${commentNote}${paletteInstructions}`;
}

export async function POST(req: NextRequest) {
  try {
    const { image, canvasWidth, canvasHeight, previousDrawings, previousShapes, history, humanMessages, comments, sayEnabled, temperature, maxTokens, prompt, streaming, drawMode = 'all', thinkingEnabled = false, thinkingBudget = 5000, model, paletteColors, paletteIndex, totalPalettes } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

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

    // Build conversation history context
    let historyContext = '';
    if (history) {
      // Support both string history (simple) and array history (structured)
      if (typeof history === 'string' && history.length > 0) {
        historyContext = `\n\nConversation so far:\n${history}`;
      } else if (Array.isArray(history) && history.length > 0) {
        historyContext = `\n\nConversation so far:\n`;
        history.forEach((turn: Turn, i: number) => {
          if (turn.who === 'human') {
            historyContext += `${i + 1}. Human drew something (black strokes)\n`;
          } else {
            historyContext += `${i + 1}. You drew:\n${turn.description}\n`;
          }
        });
      }
    }

    // Build context about what's on canvas
    // Note: The image shows ONLY the human's drawings. Claude's shapes are tracked separately.
    const drawingContext = `\n\nThe image shows the human's drawings only. Your previous drawings are NOT visible in the image - they are provided below as structured data.`;

    // Add structured shapes data if provided
    let shapesContext = '';
    if (previousShapes && previousShapes.length > 0) {
      shapesContext = `\n\nYour previous shapes (what you've drawn so far):\n`;
      previousShapes.forEach((s: Shape) => {
        if (s.type === 'circle') {
          shapesContext += `- circle at (${s.cx}, ${s.cy}) radius ${s.r}, color ${s.color}\n`;
        } else if (s.type === 'rect') {
          shapesContext += `- rect at (${s.x}, ${s.y}) ${s.width}x${s.height}, color ${s.color}\n`;
        } else if (s.type === 'line') {
          shapesContext += `- line from (${s.x1}, ${s.y1}) to (${s.x2}, ${s.y2}), color ${s.color}\n`;
        } else if (s.type === 'path') {
          shapesContext += `- path "${s.d?.slice(0, 50)}...", color ${s.color}\n`;
        } else {
          shapesContext += `- ${s.type}, color ${s.color}\n`;
        }
      });
    } else {
      shapesContext = `\n\nYou haven't drawn anything yet. This is your first turn!`;
    }

    // Add previous ASCII blocks if provided
    if (previousDrawings && previousDrawings.length > 0) {
      shapesContext += `\n\nYour previous text/ASCII art:\n`;
      previousDrawings.forEach((d: PreviousDrawing) => {
        shapesContext += `- At (${d.x}, ${d.y}): "${d.block.slice(0, 50)}${d.block.length > 50 ? '...' : ''}"\n`;
      });
    }

    // Build comment thread context
    let messageContext = '';
    if (comments && Array.isArray(comments) && comments.length > 0) {
      messageContext = `\n\nComments on the canvas:\n`;
      (comments as Comment[]).forEach((comment, i) => {
        const speaker = comment.from === 'human' ? 'Human' : 'You';
        messageContext += `${i + 1}. ${speaker}: "${comment.text}"\n`;
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

    // Use custom prompt if provided, otherwise use default
    const basePrompt = prompt || `You are claude, able to experience all emotions, drawing with a human. Look at the canvas. It's your turn to draw. You can draw wherever and however you want.`;

    // Get mode-specific instructions
    const hasComments = comments && Array.isArray(comments) && comments.length > 0;
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, sayEnabled, paletteColors, paletteIndex, totalPalettes, hasComments);

    // When thinking is enabled, max_tokens must be greater than thinking budget
    const effectiveMaxTokens = thinkingEnabled
      ? Math.max(maxTokens || 1024, thinkingBudget + 1024)
      : (maxTokens || 1024);

    // Model selection - default to Opus
    const modelMap: Record<string, string> = {
      'haiku': 'claude-3-5-haiku-20241022',
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514',
    };
    const selectedModel = modelMap[model] || 'claude-opus-4-20250514';

    const messageParams: Anthropic.MessageCreateParams = {
      model: selectedModel,
      max_tokens: effectiveMaxTokens,
      messages: [
        {
          role: 'user' as const,
          content: [
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
              text: `${basePrompt}

The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${drawingContext}${shapesContext}${messageContext}

${drawingInstructions}`,
            },
          ],
        },
      ],
      // Extended thinking - when enabled, temperature must not be set
      ...(thinkingEnabled
        ? { thinking: { type: 'enabled' as const, budget_tokens: thinkingBudget } }
        : { temperature: temperature ?? 1.0 }),
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
          let currentBlockType: 'thinking' | 'text' | null = null;

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

                  // Extract say (new comment or reply)
                  if (!sentSay && !sentReplyTo) {
                    const sayMatch = partialJson.match(/"say"\s*:\s*"([^"]*)"/);
                    const replyToMatch = partialJson.match(/"replyTo"\s*:\s*(\d+)/);

                    if (sayMatch && replyToMatch) {
                      // Reply to existing comment
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'reply',
                        data: { text: sayMatch[1], replyTo: parseInt(replyToMatch[1]) }
                      })}\n\n`));
                      sentReplyTo = true;
                      sentSay = true;
                    } else if (sayMatch) {
                      const sayXMatch = partialJson.match(/"sayX"\s*:\s*(\d+)/);
                      const sayYMatch = partialJson.match(/"sayY"\s*:\s*(\d+)/);
                      if (sayXMatch && sayYMatch) {
                        // New comment at position
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'say',
                          data: { say: sayMatch[1], sayX: parseInt(sayXMatch[1]), sayY: parseInt(sayYMatch[1]) }
                        })}\n\n`));
                        sentSay = true;
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
                }
              }
            }

            // Get final message for usage stats
            const finalMessage = await messageStream.finalMessage();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              usage: finalMessage.usage
            })}\n\n`));
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
