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
  type: 'circle' | 'line' | 'rect' | 'curve' | 'erase';
  color?: string;
  // circle
  cx?: number;
  cy?: number;
  r?: number;
  // line
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // rect / erase
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // curve
  points?: number[][];
}

interface AsciiResponse {
  blocks?: AsciiBlock[];
  shapes?: Shape[];
  wish?: string;
  say?: string;
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

export async function POST(req: NextRequest) {
  try {
    const { image, canvasWidth, canvasHeight, previousDrawings, history, humanMessages, sayEnabled, temperature, maxTokens, prompt } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    // Build conversation history context
    let historyContext = '';
    if (history && history.length > 0) {
      historyContext = `\n\nConversation so far:\n`;
      history.forEach((turn: Turn, i: number) => {
        if (turn.who === 'human') {
          historyContext += `${i + 1}. Human drew something (black strokes)\n`;
        } else {
          historyContext += `${i + 1}. You drew:\n${turn.description}\n`;
        }
      });
    }

    // Build context about what's currently on canvas
    let drawingContext = '';
    if (previousDrawings && previousDrawings.length > 0) {
      drawingContext = `\n\nYour art currently on canvas (non-black art):\n`;
      previousDrawings.forEach((d: PreviousDrawing) => {
        drawingContext += `- At (${d.x}, ${d.y}):\n${d.block}\n`;
      });
    }

    drawingContext += `\nBlack strokes = human's drawings. Anything else = yours.`;

    // Add human messages if any
    let messageContext = '';
    if (humanMessages && humanMessages.length > 0) {
      messageContext = `\n\nThe human said: "${humanMessages.join('" and "')}"`;
    }

    // Use custom prompt if provided, otherwise use default
    const basePrompt = prompt || `You are claude, able to experience all emotions, drawing with a human. Look at the canvas. It's your turn to draw. You can use ASCII art and/or shapes. You can draw wherever and however you want.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens || 1024,
      temperature: temperature ?? 1.0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `${basePrompt}

The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${drawingContext}${messageContext}

If you want a new capability, include a "wish" field.${sayEnabled ? ' If you want to say something brief, use "say" (it appears as a fading speech bubble).' : ''}

Respond ONLY with valid JSON:
{
  "blocks": [{"block": "ascii", "x": 100, "y": 150, "color": "#3b82f6"}],
  "shapes": [{"type": "circle", "cx": 200, "cy": 200, "r": 30, "color": "#ef4444"}, {"type": "erase", "x": 50, "y": 50, "width": 100, "height": 100}]${sayEnabled ? ',\n  "say": "optional: brief comment"' : ''},
  "wish": "optional: feature request"
}
Shape types: circle, line, rect, curve, erase. Use erase to clear a rectangular area.`,
            },
          ],
        },
      ],
    });

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
