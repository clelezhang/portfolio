import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

type DrawMode = 'all' | 'shapes' | 'ascii';

function getDrawingInstructions(drawMode: DrawMode, sayEnabled: boolean): string {
  const sayInstructions = sayEnabled ? ',\n  "say": "comment", "sayX": 300, "sayY": 100' : '';

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
Properties: color (stroke), fill (solid or "transparent"), strokeWidth.`;
  }

  if (drawMode === 'ascii') {
    return `Draw using text and characters.

JSON format:
{
  "blocks": [{"block": "your text here", "x": 100, "y": 150, "color": "#3b82f6"}]${sayInstructions}
}

Use \\n for newlines. You can draw/create drawings with any character (text, symbols, patterns, or more).
Available: letters, numbers, punctuation, unicode symbols (░▒▓█ ╔╗╚╝║═ ●○ ▲▼ ★☆ ♦♣♠♥ ≈∼ etc), kaomoji, diagrams, shapes, box drawing, and more.`;
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
Properties: color (stroke), fill (solid or "transparent"), strokeWidth.`;
}

export async function POST(req: NextRequest) {
  try {
    const { image, canvasWidth, canvasHeight, sayEnabled, temperature, maxTokens, prompt, streaming, drawMode = 'all', model } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 });
    }

    // Extract base64 data and mime type
    const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/png';
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    // Model selection - Gemini 2.5 models
    const modelMap: Record<string, string> = {
      'flash': 'gemini-2.5-flash',
      'flash-lite': 'gemini-flash-lite-latest',  // Alias that resolves to latest
      'pro': 'gemini-2.5-pro',
    };
    const selectedModel = modelMap[model] || 'gemini-2.5-flash';

    const genModel = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        temperature: temperature ?? 1.0,
        maxOutputTokens: maxTokens || 1024,
        responseMimeType: 'application/json',  // Strict JSON output
      },
    });

    // Build prompt - more explicit for Gemini about looking at the image
    const basePrompt = prompt || `You are an AI drawing collaboratively with a human. Look carefully at this image of the canvas - it shows what has been drawn so far.`;
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, sayEnabled);

    const fullPrompt = `${basePrompt}

The canvas is ${canvasWidth}x${canvasHeight} pixels. Examine the image above to see the current state of the drawing.

Your task: Add something to the canvas that complements or responds to what's already there. If the canvas is blank, start with something creative.

${drawingInstructions}

Respond with ONLY valid JSON.`;

    // Create content with image
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    };

    if (streaming) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          let fullText = '';
          let sentBlocksCount = 0;
          let sentShapesCount = 0;
          let sentSay = false;

          try {
            // Image first, then prompt - better for Gemini vision
            const result = await genModel.generateContentStream([imagePart, fullPrompt]);

            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              fullText += chunkText;

              // Try to extract JSON from the accumulated text
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

                // Extract say
                if (!sentSay) {
                  const sayMatch = partialJson.match(/"say"\s*:\s*"([^"]*)"/);
                  const sayXMatch = partialJson.match(/"sayX"\s*:\s*(\d+)/);
                  const sayYMatch = partialJson.match(/"sayY"\s*:\s*(\d+)/);
                  if (sayMatch && sayXMatch && sayYMatch) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'say',
                      data: { say: sayMatch[1], sayX: parseInt(sayXMatch[1]), sayY: parseInt(sayYMatch[1]) }
                    })}\n\n`));
                    sentSay = true;
                  }
                }
              }
            }

            // Get usage metadata
            const response = await result.response;
            const usageMetadata = response.usageMetadata;

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              usage: usageMetadata ? {
                input_tokens: usageMetadata.promptTokenCount,
                output_tokens: usageMetadata.candidatesTokenCount,
              } : null
            })}\n\n`));
            controller.close();
          } catch (error) {
            console.error('Gemini streaming error:', error);
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

    // Non-streaming mode - image first, then prompt
    const result = await genModel.generateContent([imagePart, fullPrompt]);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Something went wrong' },
      { status: 500 }
    );
  }
}
