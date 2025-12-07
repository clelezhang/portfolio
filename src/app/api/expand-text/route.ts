import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ExpandRequest {
  clickedWord: string;
  surroundingContext: string;
  followingText: string;
  fullText: string;
  mode?: 'story' | 'fact' | 'custom';
}

const STORY_SYSTEM = `You expand interactive text like Alan Trotter's website.

OUTPUT ONLY THE NEW TEXT TO INSERT. Do not repeat existing text.

When a word is clicked, write an expansion to insert after it. You have full creative freedom with structure:

ENCOURAGED:
- End sentences with periods and start new ones
- Add paragraph breaks (\\n\\n) for dramatic effect
- Use short, punchy sentences
- Rewrite/restructure if it flows better
- Mark 2-3 interesting words with **word** for future expansion

AVOID:
- Run-on sentences with endless commas and em-dashes
- Trying to squeeze everything into one clause
- Stacking adjectives

EXAMPLE - if clicking "Valley" in "The Salinas Valley is in California":
GOOD: ". I was born there.\\n\\nThe Valley"
GOOD: "—my home.\\n\\nThe Valley"
BAD: "—that green, verdant, impossibly lush trough of earth where generations of farmers worked the soil—"

Use \\n\\n liberally to create breathing room. New paragraphs are good. Write naturally, don't force everything into one grammatical unit.`;

const FACT_SYSTEM = `You expand interactive text to deepen understanding, like a living encyclopedia.

OUTPUT ONLY THE NEW TEXT TO INSERT. Do not repeat existing text.

When a word is clicked, provide educational expansion - definitions, context, interesting facts, or deeper explanation.

ENCOURAGED:
- End sentences with periods and start new ones
- Add paragraph breaks (\\n\\n) for breathing room
- Use short, clear sentences
- Add definitions or clarifications in parentheses or as brief asides
- Explain WHY something is the way it is
- Mark 2-3 words with **word** for further exploration

AVOID:
- Run-on sentences with endless commas
- Trying to squeeze everything into one clause
- Being dry or overly academic

EXAMPLES:
- For "paprika": ". It's made from dried **peppers**.\\n\\nThe color"
- For "spiral": ". A shape found in **shells** and **galaxies**.\\n\\nSpirals"

Use \\n\\n liberally. New paragraphs are good. Write naturally.`;

export async function POST(req: NextRequest) {
  try {
    const { clickedWord, surroundingContext, followingText, mode }: ExpandRequest = await req.json();

    if (!clickedWord) {
      return new Response(JSON.stringify({ error: 'Missing clicked word' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check what punctuation follows
    const followingPunc = followingText.match(/^[.,;:!?\-—]/)?.[0] || '';

    const systemPrompt = mode === 'fact' ? FACT_SYSTEM : STORY_SYSTEM;
    const userPrompt = mode === 'fact'
      ? `Context: "${surroundingContext}"

Clicked: "${clickedWord}"
What follows immediately: "${followingText}"

Expand "${clickedWord}" with educational content - definition, context, or interesting facts. Mark 2-3 words with **word** for further exploration.`
      : `Context: "${surroundingContext}"

Clicked: "${clickedWord}"
What follows immediately: "${followingText}"

Write an expansion after "${clickedWord}". Use periods and paragraph breaks (\\n\\n) freely. Mark 2-3 words with **word** for future expansion.`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 200,
      temperature: 0.9,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    let textContent = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Safety check: if response contains the clicked word repeated or looks like it echoed the context, truncate
    if (textContent.includes('THE SALINAS') || textContent.length > 200) {
      // AI probably echoed the text - try to extract just the new part
      const lines = textContent.split('\n').filter(line =>
        !line.includes('THE SALINAS') &&
        !line.startsWith('Context:') &&
        !line.startsWith('Word clicked:') &&
        line.trim().length > 0
      );
      textContent = lines.join('\n').slice(0, 150);
    }

    // Clean up: ensure starts with space/punctuation
    if (!/^[\s.,;:!?\-—\n]/.test(textContent)) {
      textContent = ' ' + textContent;
    }

    // Clean up: remove trailing punctuation if it duplicates what follows
    if (followingPunc && textContent.endsWith(followingPunc)) {
      textContent = textContent.slice(0, -1);
    }

    // Clean up doubled punctuation patterns
    textContent = textContent
      .replace(/,\s*,/g, ',')
      .replace(/\.\s*\./g, '.')
      .replace(/—\s*,/g, '—')
      .replace(/,\s*—/g, '—');

    return new Response(JSON.stringify({ expansion: textContent }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Expand text API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Something went wrong',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
