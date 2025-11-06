import { NextRequest, NextResponse } from 'next/server';
import { Message } from '@/app/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Valid messages array is required' }, { status: 400 });
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // Format messages for summarization
    const conversationText = messages
      .map(m => {
        const cleanContent = m.content.replace(/<[^>]*>/g, ''); // Strip HTML
        return `${m.role}: ${cleanContent}`;
      })
      .join('\n');

    // Create prompt for section title generation
    const systemPrompt = `You are a helpful assistant that creates concise section titles for conversation segments.

Your task is to read a section of a conversation and generate a brief, descriptive title that captures the main topic or purpose.

Rules:
- Title should be 3-7 words maximum
- Should capture the main topic or action discussed
- Use present tense or noun phrases
- Be specific but concise
- No punctuation at the end

Examples of good titles:
- "Setting up authentication flow"
- "Debugging API connection issues"
- "Discussing project architecture"
- "Planning database schema"
- "Implementing user interface"
- "Reviewing code performance"

Return ONLY the title, nothing else.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a title for this conversation section:\n\n${conversationText}`
        }
      ],
    });

    const title = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    return NextResponse.json({ title });

  } catch (error) {
    console.error('Error in index API:', error);
    return NextResponse.json(
      { error: 'Failed to generate section title' },
      { status: 500 }
    );
  }
}
