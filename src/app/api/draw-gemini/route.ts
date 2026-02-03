import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

type DrawMode = 'all' | 'shapes' | 'ascii';

function getDrawingInstructions(drawMode: DrawMode, sayEnabled: boolean): string {
  const sayInfo = sayEnabled ? '\nOptional: add "say": "your comment", "sayX": number, "sayY": number to leave a message.' : '';

  if (drawMode === 'shapes') {
    return `Output JSON with "shapes" array. Each shape can be:
- path: {"type":"path", "d":"M x y L x y C...", "color":"#hex", "fill":"#hex", "strokeWidth":n}
- circle: {"type":"circle", "cx":n, "cy":n, "r":n, "color":"#hex", "fill":"#hex"}
- rect: {"type":"rect", "x":n, "y":n, "width":n, "height":n, "color":"#hex"}
- line: {"type":"line", "x1":n, "y1":n, "x2":n, "y2":n, "color":"#hex"}
- curve: {"type":"curve", "points":[[x,y],[x,y]...], "color":"#hex"}

Path commands: M(move), L(line), C(cubic bezier), Q(quadratic), A(arc), Z(close).
Use any colors. Create original compositions - don't copy examples.${sayInfo}`;
  }

  if (drawMode === 'ascii') {
    return `Output JSON with "blocks" array: [{"block": "text\\nwith\\nnewlines", "x": n, "y": n, "color": "#hex"}]

Use any characters: letters, symbols, unicode (░▒▓█ ●○ ★☆ ♥♦♣♠ ▲▼), kaomoji, box drawing, etc.
Create original text art - don't copy examples.${sayInfo}`;
  }

  // 'all' mode
  return `Output JSON with "shapes" and/or "blocks" arrays.

Shapes: path, circle, rect, line, curve (see above format)
Blocks: text/ASCII art at x,y coordinates

Mix both freely. Use varied colors, positions, and styles. Create something original.${sayInfo}`;
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

    // Creative prompts to encourage variety
    const creativePrompts = [
      'Add something unexpected that complements what you see.',
      'What does this drawing make you feel? Express that visually.',
      'Build on what\'s here - extend, contrast, or transform it.',
      'Surprise the human with something they wouldn\'t expect.',
      'What story does this canvas tell? Add the next chapter.',
      'Find the empty spaces and fill them with meaning.',
      'React to what you see - agree, disagree, or question it visually.',
      'Create something that would make the human smile.',
      'Add depth, dimension, or a new perspective to the scene.',
    ];
    const randomPrompt = creativePrompts[Math.floor(Math.random() * creativePrompts.length)];

    const genModel = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        temperature: temperature ?? 1.0,
        maxOutputTokens: maxTokens || 1024,
        responseMimeType: 'application/json',  // Strict JSON output
      },
    });

    // Build prompt
    const basePrompt = prompt || `You are an AI drawing collaboratively with a human. Look at this canvas image.`;
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, sayEnabled);

    const fullPrompt = `${basePrompt}

The canvas is ${canvasWidth}x${canvasHeight} pixels.

${drawingInstructions}

${randomPrompt} Be creative and varied - don't repeat patterns. Respond ONLY with valid JSON.`;

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
