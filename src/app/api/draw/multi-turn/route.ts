import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type DrawMode = 'all' | 'shapes' | 'ascii';

function getSystemPrompt(canvasWidth: number, canvasHeight: number, drawMode: DrawMode): string {
  const baseInstructions = `You are drawing collaboratively with a human on a ${canvasWidth}x${canvasHeight} pixel canvas. Look at the canvas and respond with your drawing. You can draw wherever and however you want.

The human draws in BLACK strokes. Your previous drawings appear in COLOR (non-black). Use the conversation history to understand what you've drawn before vs what the human has added.`;

  let formatInstructions = '';

  if (drawMode === 'shapes') {
    formatInstructions = `
Respond with valid JSON only:
{
  "shapes": [
    {"type": "path", "d": "M 100 100 C 150 50 200 150 250 100", "color": "#3b82f6", "fill": "#93c5fd", "strokeWidth": 2},
    {"type": "circle", "cx": 200, "cy": 200, "r": 30, "color": "#ef4444", "fill": "#fecaca"},
    {"type": "rect", "x": 100, "y": 100, "width": 50, "height": 30, "color": "#3b82f6"},
    {"type": "line", "x1": 0, "y1": 0, "x2": 100, "y2": 100, "color": "#000"},
    {"type": "curve", "points": [[0,0], [50,25], [100,0]], "color": "#10b981"}
  ]
}

Path commands: M, L, C, Q, A, Z. Shape types: path, circle, line, rect, curve.
Properties: color (stroke), fill (solid or "transparent"), strokeWidth.`;
  } else if (drawMode === 'ascii') {
    formatInstructions = `
Respond with valid JSON only:
{
  "blocks": [{"block": "your text here", "x": 100, "y": 150, "color": "#3b82f6"}]
}

Use \\n for newlines. You can place any text, symbols, patterns, art, words, shapes, emoticons, or anything expressible with characters anywhere on the canvas. Be creative and expressive.
Available: letters, numbers, punctuation, unicode symbols (░▒▓█ ╔╗╚╝║═ ●○ ▲▼ ★☆ ♦♣♠♥ ≈∼ etc), emoji, kaomoji, box drawing, and more.`;
  } else {
    formatInstructions = `
Respond with valid JSON only. You can use shapes, paths, and/or ASCII text:
{
  "shapes": [
    {"type": "path", "d": "M 100 100 C 150 50 200 150 250 100", "color": "#3b82f6", "fill": "#93c5fd", "strokeWidth": 2},
    {"type": "circle", "cx": 200, "cy": 200, "r": 30, "color": "#ef4444", "fill": "#fecaca"}
  ],
  "blocks": [{"block": "text here", "x": 100, "y": 150, "color": "#3b82f6"}]
}

Path commands: M, L, C, Q, A, Z. Shape types: path, circle, line, rect, curve.
Properties: color (stroke), fill (solid or "transparent"), strokeWidth.
For text blocks, use \\n for newlines.`;
  }

  return `${baseInstructions}\n${formatInstructions}`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      canvasWidth,
      canvasHeight,
      temperature = 1.0,
      maxTokens = 1024,
      drawMode = 'all',
      streaming = true
    } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = getSystemPrompt(canvasWidth || 800, canvasHeight || 600, drawMode as DrawMode);

    if (streaming) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const response = await anthropic.messages.stream({
              model: 'claude-opus-4-20250514',
              max_tokens: maxTokens,
              temperature,
              system: systemPrompt,
              messages,
            });

            let fullText = '';
            let sentBlocksCount = 0;
            let sentShapesCount = 0;

            for await (const event of response) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                fullText += event.delta.text;

                // Parse blocks incrementally
                const blocksMatch = fullText.match(/"blocks"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
                if (blocksMatch) {
                  const blocksContent = blocksMatch[1];
                  const blockMatches = [...blocksContent.matchAll(/\{[^{}]*"block"[^{}]*\}/g)];

                  for (let i = sentBlocksCount; i < blockMatches.length; i++) {
                    try {
                      const block = JSON.parse(blockMatches[i][0]);
                      if (block.block && typeof block.x === 'number' && typeof block.y === 'number') {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'block', data: block })}\n\n`));
                        sentBlocksCount++;
                      }
                    } catch { /* incomplete JSON */ }
                  }
                }

                // Parse shapes incrementally
                const shapesMatch = fullText.match(/"shapes"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
                if (shapesMatch) {
                  const shapesContent = shapesMatch[1];
                  const shapes: string[] = [];
                  let depth = 0;
                  let current = '';

                  for (const char of shapesContent) {
                    if (char === '{') depth++;
                    if (depth > 0) current += char;
                    if (char === '}') {
                      depth--;
                      if (depth === 0 && current) {
                        shapes.push(current);
                        current = '';
                      }
                    }
                  }

                  for (let i = sentShapesCount; i < shapes.length; i++) {
                    try {
                      const shape = JSON.parse(shapes[i]);
                      if (shape.type) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'shape', data: shape })}\n\n`));
                        sentShapesCount++;
                      }
                    } catch { /* incomplete JSON */ }
                  }
                }
              }
            }

            // Get final message for usage stats
            const finalMessage = await response.finalMessage();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              usage: finalMessage.usage
            })}\n\n`));

            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages,
    });

    return new Response(JSON.stringify({
      content: response.content,
      usage: response.usage,
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Multi-turn API error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
