import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.DRAW_WEB_API_KEY,
});

interface TurnToSummarize {
  turnNumber: number;
  who: 'human' | 'claude';
  description?: string;
  shapes?: Array<{ type: string; [key: string]: unknown }>;
  blocks?: Array<{ block: string; x: number; y: number }>;
}

interface SummarizeRequest {
  turns: TurnToSummarize[];
  existingSummary?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { turns, existingSummary } = await req.json() as SummarizeRequest;

    if (!turns || !Array.isArray(turns) || turns.length === 0) {
      return NextResponse.json({ error: 'Turns array required' }, { status: 400 });
    }

    // Build description of turns
    const turnsDescription = turns.map(turn => {
      if (turn.who === 'human') {
        return `Turn ${turn.turnNumber}: Human drew on the canvas`;
      }

      const parts: string[] = [];

      if (turn.shapes && turn.shapes.length > 0) {
        const shapeTypes = turn.shapes.map(s => s.type).join(', ');
        parts.push(`shapes (${shapeTypes})`);
      }

      if (turn.blocks && turn.blocks.length > 0) {
        const blockPreviews = turn.blocks.map(b =>
          b.block.slice(0, 30).replace(/\n/g, ' ')
        ).join('; ');
        parts.push(`text: "${blockPreviews}"`);
      }

      if (turn.description) {
        parts.push(turn.description.slice(0, 100));
      }

      const content = parts.length > 0 ? parts.join(', ') : 'drew something';
      return `Turn ${turn.turnNumber}: Claude ${content}`;
    }).join('\n');

    const prompt = existingSummary
      ? `You are summarizing a collaborative drawing session between a human and Claude.

Previous summary:
${existingSummary}

New turns to incorporate:
${turnsDescription}

Write an updated summary (under 100 words) that incorporates the new turns. Focus on: what was drawn, spatial relationships, any themes or narrative emerging, the back-and-forth dynamic.`
      : `Summarize this collaborative drawing session between a human and Claude:

${turnsDescription}

Write a concise summary (under 100 words) capturing: what was drawn, spatial relationships, any themes emerging, and the collaborative dynamic.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const textContent = response.content.find(b => b.type === 'text');

    return NextResponse.json({
      summary: textContent?.text || '',
      usage: response.usage,
    });

  } catch (error) {
    console.error('Summarize API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
