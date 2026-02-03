import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

type DrawMode = 'all' | 'shapes' | 'ascii';

function getDrawingInstructions(drawMode: DrawMode, sayEnabled: boolean): string {
  const sayInfo = sayEnabled ? '\nOptional: add "say": "your comment", "sayX": number, "sayY": number to leave a message.' : '';

  if (drawMode === 'shapes') {
    return `Output JSON with "shapes" array. Each shape can be:
- path: {"type":"path", "d":"M x y L x y C...", "color":"#hex", "fill":"#hex", "strokeWidth":n}
- circle: {"type":"circle", "cx":n, "cy":n, "r":n, "color":"#hex", "fill":"#hex"}
- rect: {"type":"rect", "x":n, "y":n, "width":n, "height":n, "color":"#hex"}
- line: {"type":"line", "x1":n, "y1":n, "x2":n, "y2":n, "color":"#hex"}

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

Shapes: path, circle, rect, line (see above format)
Blocks: text/ASCII art at x,y coordinates

Mix both freely. Use varied colors, positions, and styles. Create something original.${sayInfo}`;
}

export async function POST(req: NextRequest) {
  try {
    const { image, canvasWidth, canvasHeight, sayEnabled, temperature, maxTokens, prompt, drawMode = 'all', model } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    // Extract base64 data and mime type
    const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/png';
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    // Model selection - OpenAI vision models
    const modelMap: Record<string, string> = {
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4-turbo': 'gpt-4-turbo',
    };
    const selectedModel = modelMap[model] || 'gpt-4o';

    // Creative prompts to encourage variety
    const creativePrompts = [
      'Add something unexpected that complements what you see.',
      'What does this drawing make you feel? Express that visually.',
      'Build on what\'s here - extend, contrast, or transform it.',
      'Surprise the human with something they wouldn\'t expect.',
      'What story does this canvas tell? Add the next chapter.',
      'Find the empty spaces and fill them with meaning.',
      'React to what you see - agree, disagree, or question it visually.',
    ];
    const randomPrompt = creativePrompts[Math.floor(Math.random() * creativePrompts.length)];

    // Build prompt
    const basePrompt = prompt || `You are an AI drawing collaboratively with a human. Look at this canvas image.`;
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, sayEnabled);

    const fullPrompt = `${basePrompt}

The canvas is ${canvasWidth}x${canvasHeight} pixels.

${drawingInstructions}

${randomPrompt} Be creative and varied - don't repeat patterns. Respond ONLY with valid JSON.`;

    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: fullPrompt,
            },
          ],
        },
      ],
      temperature: temperature ?? 1.0,
      max_tokens: maxTokens || 1024,
    });

    const responseTime = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        error: 'Invalid response format',
        raw: content
      }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      ...parsed,
      responseTime,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      model: selectedModel,
    });
  } catch (error) {
    console.error('OpenAI Draw API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Something went wrong' },
      { status: 500 }
    );
  }
}
