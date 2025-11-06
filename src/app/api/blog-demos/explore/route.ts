import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import Exa from 'exa-js';
import { ExploreSegment } from '@/app/lib/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const exa = new Exa(process.env.EXA_API_KEY);

// Detect if a topic is time-sensitive and needs web search
async function isTimeSensitiveTopic(topic: string): Promise<boolean> {
  const timeSensitiveKeywords = [
    // Current events
    'news', 'latest', 'recent', 'current', 'today', '2024', '2025', 'now',
    // Technology trends
    'ai', 'artificial intelligence', 'llm', 'gpt', 'claude', 'chatgpt',
    'cryptocurrency', 'crypto', 'bitcoin', 'ethereum', 'blockchain',
    // Market/Business
    'stock', 'market', 'stock price', 'ipo', 'earnings', 'economy',
    // Politics/Events
    'election', 'president', 'government', 'congress', 'senate',
    // Specific companies/products (often need latest info)
    'tesla', 'apple', 'google', 'microsoft', 'amazon', 'meta', 'nvidia',
    // Sports
    'nfl', 'nba', 'mlb', 'world cup', 'olympics', 'championship',
    // Weather/Climate
    'weather', 'hurricane', 'climate', 'temperature',
  ];

  const lowerTopic = topic.toLowerCase();
  return timeSensitiveKeywords.some(keyword => lowerTopic.includes(keyword));
}

// Search Exa for recent web content
async function searchExaForTopic(topic: string): Promise<string> {
  try {
    const searchResponse = await exa.searchAndContents(topic, {
      type: 'auto',
      numResults: 5,
      text: { maxCharacters: 2000 },
      useAutoprompt: true,
    });

    if (!searchResponse.results || searchResponse.results.length === 0) {
      return '';
    }

    // Format results as context for Claude
    let context = '\n\n# Recent Web Sources\n\n';
    searchResponse.results.forEach((result, idx) => {
      context += `## Source ${idx + 1}: ${result.title}\n`;
      context += `URL: ${result.url}\n`;
      if (result.text) {
        context += `Content: ${result.text.substring(0, 800)}...\n\n`;
      }
    });

    return context;
  } catch (error) {
    console.error('Error searching Exa:', error);
    return '';
  }
}

// Helper to generate a complete answer with natural sections (streaming)
async function* generateInitialAnswer(topic: string): AsyncGenerator<string> {
  // Check if topic needs web search
  const needsWebSearch = await isTimeSensitiveTopic(topic);
  let webContext = '';

  if (needsWebSearch) {
    console.log(`[Exa] Topic "${topic}" is time-sensitive, searching web...`);
    webContext = await searchExaForTopic(topic);
    if (webContext) {
      console.log(`[Exa] Found ${webContext.split('## Source').length - 1} sources`);
    }
  } else {
    console.log(`[Exa] Topic "${topic}" is timeless, using Claude knowledge only`);
  }

  const basePrompt = `Please provide a comprehensive yet clear explanation about: "${topic}"

CRITICAL FORMATTING RULES:
- Create 3-5 distinct sections (use ## for section headers)
- Each section MUST be EXACTLY ONE PARAGRAPH (3-5 sentences maximum)
- Keep each section concise - users will click to expand for more detail
- Think of each section as a preview/teaser of that subtopic
- Feel free to use bullet points in the initial sections
- DO NOT write multiple paragraphs per section

Structure your response like:
## Section Title 1
A single concise paragraph explaining this aspect. Keep it brief and focused. This is just an overview.

## Section Title 2
Another single paragraph for the next aspect. Short and informative.

Use markdown formatting:
- **Bold** for key terms and important concepts
- *Italics* for technical terms or emphasis`;

  const prompt = webContext
    ? `${basePrompt}

IMPORTANT: I've gathered recent information from the web to help you provide up-to-date context. Use this information to enhance your response with current facts, but integrate it naturally into your explanation. Cite specific facts when relevant.

${webContext}`
    : basePrompt;

  const stream = anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text;
    }
  }
}

// Helper to expand a section with more detailed content and subsections (streaming)
async function* expandSection(
  sectionTitle: string,
  sectionContent: string,
  parentContext: string,
  depth: number
): AsyncGenerator<string> {
  const headerLevel = depth + 3; // depth 0 uses ##, depth 1 uses ###, etc.
  const headerMarker = '#'.repeat(headerLevel);

  const prompt = `Someone is exploring "${parentContext}" and wants to dig DEEPER specifically into "${sectionTitle}".

Current overview they already have:
${sectionContent}

IMPORTANT: They don't need more context or background about the broader topic. They want to go DEEPER into "${sectionTitle}" itself. Provide specific, detailed information about THIS topic only:

If the broader topic was about:
Concept *A* and *B* -> make two sections about A and B
Concept - A, - B, and - C -> make three sections about A, B, and C
Concept A, B, C, and D -> make three sections about A, B, C, and D

Organize your response into 2-3 focused subsections (use ${headerMarker} for headers). Each subsection should explore a DIFFERENT specific aspect of "${sectionTitle}".
- You can use more than 2 sections ONLY if the broader topic contained 3+ clear subtopics to review.
- Each section MUST be EXACTLY ONE PARAGRAPH (2-4 sentences/bullets maximum). NO RUN ON SENTENCES/BULLETS
- Keep each section concise. Think of each section as a preview/teaser of that subtopic
- Feel free to use bullet points

Use brief explanatory text and/or bullet points for key information outside of the headings. Use markdown formatting:
- **Bold** for key terms and important concepts
- *Italics* for technical terms or emphasis

Focus on depth and specificity about "${sectionTitle}" - NOT on context or overview.`;

  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, topic, sectionTitle, sectionContent, parentContext, depth, selectedText } = body;

    if (action === 'generateInitial') {
      // Stream the initial answer for a topic
      if (!topic) {
        return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generateInitialAnswer(topic)) {
              const data = JSON.stringify({ content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Error in stream:', error);
            const errorData = JSON.stringify({ error: 'Failed to generate response' });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else if (action === 'expandSection' || action === 'expandSelection') {
      // Validate based on action type
      if (action === 'expandSection' && (!sectionTitle || sectionContent === undefined || !parentContext)) {
        return NextResponse.json(
          { error: 'Section title, content, and parent context are required' },
          { status: 400 }
        );
      }
      if (action === 'expandSelection' && (!selectedText || !parentContext)) {
        return NextResponse.json(
          { error: 'Selected text and parent context are required' },
          { status: 400 }
        );
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let generator;

            if (action === 'expandSection') {
              // Use existing generator for section expansion
              generator = expandSection(sectionTitle, sectionContent, parentContext, depth || 0);
            } else {
              // Use generator for selection expansion
              const headerLevel = (depth || 0) + 3; // depth 0 uses ###, depth 1 uses ####, etc.
              const headerMarker = '#'.repeat(headerLevel);
              const prompt = `The user is exploring "${parentContext}" and selected this specific text to dig deeper:

"${selectedText}"

IMPORTANT: Provide specific, detailed information about this selected text. Organize your response into 2-4 focused subsections (use ${headerMarker} for headers). Each subsection should explore a DIFFERENT specific aspect of the selected text.

FORMATTING RULES:
- DO NOT include a page title or main heading - start directly with subsections
- Each section MUST be EXACTLY ONE PARAGRAPH (3-5 sentences maximum)
- Keep each section concise - this is a preview/teaser
- Use **bold** for key terms and important concepts
- Use *italics* for technical terms or emphasis
- You may use bullet points sparingly

Focus on depth and specificity about the selected text - NOT on general context or overview.`;

              const messageStream = await anthropic.messages.stream({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 3000,
                messages: [{ role: 'user', content: prompt }],
              });

              // Convert to generator-like pattern
              generator = (async function*() {
                for await (const event of messageStream) {
                  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    yield event.delta.text;
                  }
                }
              })();
            }

            let accumulatedContent = '';
            for await (const chunk of generator) {
              accumulatedContent += chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: accumulatedContent })}\n\n`));
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Error in stream:', error);
            const errorData = JSON.stringify({ error: `Failed to ${action === 'expandSection' ? 'expand section' : 'expand selection'}` });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in explore API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
