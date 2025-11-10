import { NextRequest, NextResponse } from 'next/server';
import { generateClaudeResponse } from '@/app/lib/claude';
import { Message } from '@/app/lib/types';
import { checkRateLimit, createRateLimitHeaders } from '@/app/lib/rate-limit';
import { generateVisitorId } from '@/app/lib/security';
import { BLOG_DEMO_RATE_LIMITS } from '@/app/lib/blog-demo-rate-limits';
import Exa from 'exa-js';

// Helper to determine if a query needs web search
function shouldSearchAuto(query: string): boolean {
  const searchIndicators = [
    'current', 'latest', 'recent', 'today', 'news', 'price',
    'what is', 'how to', 'best', 'compare', 'vs', 'review',
    'where', 'when', 'who', 'statistics', 'data', 'research'
  ];
  const lowerQuery = query.toLowerCase();
  return searchIndicators.some(indicator => lowerQuery.includes(indicator));
}

// Perform Exa search
async function performSearch(query: string): Promise<{ query: string; results: Array<{
  url: string;
  title: string;
  publishedDate?: string;
  author?: string;
  score?: number;
}> } | null> {
  try {
    const exa = new Exa(process.env.EXA_API_KEY);
    const searchResponse = await exa.searchAndContents(query, {
      numResults: 5,
      type: 'auto',
    });

    const results = searchResponse.results.map(result => ({
      url: result.url,
      title: result.title || 'Untitled',
      publishedDate: result.publishedDate,
      author: result.author,
      score: result.score,
    }));

    return { query, results };
  } catch (error) {
    console.error('Exa search error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const visitorId = await generateVisitorId(request);
    const rateLimitResult = await checkRateLimit(
      visitorId,
      BLOG_DEMO_RATE_LIMITS.claude
    );

    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "you've run out of messages" },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const {
      messages,
      searchMode = 'auto',
      queueMode = false,
      queueTopic
    }: {
      messages: Message[];
      searchMode?: 'on' | 'auto' | 'off';
      queueMode?: boolean;
      queueTopic?: string;
    } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    console.log('Search mode:', searchMode, 'Queue mode:', queueMode, 'Queue topic:', queueTopic);

    // Get the last user message to potentially search
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    let searchResults = null;

    // Determine if we should search
    const shouldSearch = searchMode === 'on' ||
                        (searchMode === 'auto' && lastUserMessage && shouldSearchAuto(lastUserMessage.content));

    if (shouldSearch && lastUserMessage) {
      // Strip HTML tags for search query
      const searchQuery = lastUserMessage.content.replace(/<[^>]*>/g, '').trim();
      console.log('Performing search for:', searchQuery);
      searchResults = await performSearch(searchQuery);
      console.log('Search results count:', searchResults?.results?.length || 0);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const responseGenerator = await generateClaudeResponse(
            messages,
            searchResults || undefined,
            queueMode,
            queueTopic
          );

          for await (const chunk of responseGenerator) {
            const data = JSON.stringify({ content: chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send sources metadata at the end if we had search results
          if (searchResults) {
            const sourcesData = JSON.stringify({
              sources: searchResults.results.map((result, idx) => ({
                id: idx + 1,
                url: result.url,
                title: result.title,
              }))
            });
            controller.enqueue(encoder.encode(`data: ${sourcesData}\n\n`));
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
  } catch (error) {
    console.error('Error in Claude API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
