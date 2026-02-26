import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { validateOrigin, createCORSHeaders, generateVisitorId } from '../../lib/security';
import { checkChatRateLimit, createRateLimitHeaders } from '../../lib/rate-limit';
import { createSystemPrompt } from '../../lib/prompts';
import { kv } from '@vercel/kv';
import { fetchPortfolioPage, getAvailablePages, PortfolioPageId } from '../../lib/portfolio-content';

// Configure for edge runtime for better performance
export const runtime = 'edge';

const anthropic = new Anthropic({
  apiKey: process.env.CHAT_API_KEY,
});

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  cardImage?: string;
}

interface ChatRequest {
  messages: Message[];
  cardContext?: string; // Context when message comes from card interaction
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(req: NextRequest) {
  const corsHeaders = createCORSHeaders(req);
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Origin validation (strict like RYO)
    if (!validateOrigin(req)) {
      return new Response(JSON.stringify({ error: 'this request looks a bit suspicious; try refreshing the page?' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Rate limiting
    const visitorId = await generateVisitorId(req);
    const rateLimitResult = await checkChatRateLimit(visitorId);
    
    const corsHeaders = createCORSHeaders(req);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    const allHeaders = { ...corsHeaders, ...rateLimitHeaders };

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'we\'ve chatted a lot today! we can talk again tomorrow',
          resetTime: rateLimitResult.resetTime 
        }), 
        {
          status: 429,
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Parse and validate request
    const { messages, cardContext }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'hmm your message got a bit scrambled; try sending it again?' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save incoming user message to KV
    const timestamp = new Date().toISOString();
    const lastUserMessage = messages[messages.length - 1];
    
    if (lastUserMessage && lastUserMessage.sender === 'user') {
      try {
        // Store message with visitor ID and timestamp
        const messageKey = `chat:${visitorId}:${timestamp}:user`;
        await kv.set(messageKey, {
          visitorId,
          timestamp,
          message: lastUserMessage.text,
          cardImage: lastUserMessage.cardImage,
          cardContext: cardContext,
        });
        
        // Also maintain a list of all message keys for easy retrieval
        await kv.lpush(`chat:${visitorId}:messages`, messageKey);
        
        // Keep track of all unique visitors
        await kv.sadd('chat:visitors', visitorId);
      } catch (kvError) {
        console.error('Error saving message to KV:', kvError);
        // Continue even if KV save fails
      }
    }

    // 4. Check for rude/toxic content using Claude - only moderate after first warning to reduce latency
    if (lastUserMessage && lastUserMessage.sender === 'user') {
      const warningKey = `chat:${visitorId}:warned`;
      const rudeCountKey = `chat:${visitorId}:rudeCount`;
      const hasBeenWarned = await kv.get(warningKey);

      if (hasBeenWarned) {
        // Already warned - now moderate every message
        const moderationResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: lastUserMessage.text }],
          system: `You are a content moderator. Respond with only "RUDE" or "OK".
Say "RUDE" if the message is: rude, mean, disrespectful, insulting, harassing, condescending, passive-aggressive, sexually inappropriate, or generally unkind.
Say "OK" if the message is neutral or friendly, even if it's a bit blunt or direct.
Only respond with one word.`,
        });

        const moderationResult = moderationResponse.content[0];
        if (moderationResult.type === 'text' && moderationResult.text.trim().toUpperCase() === 'RUDE') {
          return new Response('__BLOCKED__', {
            headers: {
              ...allHeaders,
              'Content-Type': 'text/plain; charset=utf-8',
            },
          });
        }
      } else {
        // Not yet warned - use lightweight keyword check instead of Haiku call
        const rudePatterns = /\b(fuck|shit|stfu|bitch|ass ?hole|dick|idiot|stupid|dumb|hate you|kill|die|suck|loser|trash|pathetic|worthless|ugly|retard|cunt|slut|whore|cock|bastard|moron|shut up|piss off|screw you|go away)\b/i;
        if (rudePatterns.test(lastUserMessage.text)) {
          // Increment rude count
          const rudeCount = ((await kv.get(rudeCountKey)) as number || 0) + 1;
          await kv.set(rudeCountKey, rudeCount, { ex: 86400 });

          if (rudeCount >= 2) {
            // Set warned flag and send warning
            await kv.set(warningKey, true, { ex: 86400 });

            const warningMessage = "be nice or i'll stop responding.";
            const warningStream = new ReadableStream({
              async start(controller) {
                const encoder = new TextEncoder();
                for (const char of warningMessage) {
                  await new Promise(resolve => setTimeout(resolve, 15));
                  controller.enqueue(encoder.encode(char));
                }
                controller.close();
              },
            });

            return new Response(warningStream, {
              headers: {
                ...allHeaders,
                'Content-Type': 'text/plain; charset=utf-8',
              },
            });
          }
        }
      }
    }

    // 5. Build conversation with personality
    const systemPrompt = createSystemPrompt(cardContext);

    // Convert messages to Claude format (Claude API doesn't support system role in messages)
    const claudeMessages = messages.map((message: Message) => ({
      role: message.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: message.text,
    }));

    // Tool definition for reading portfolio content
    const tools: Anthropic.Tool[] = [
      {
        name: 'read_portfolio_page',
        description: `Read the content of a page from Lele's website. Use this when someone asks detailed questions about your work, projects, case studies, or anything on the website. Available pages: ${getAvailablePages().join(', ')}`,
        input_schema: {
          type: 'object' as const,
          properties: {
            page: {
              type: 'string',
              description: 'The page to read. Options: home (main portfolio page with work overview), pearl (detailed Pearl case study)',
              enum: getAvailablePages(),
            },
          },
          required: ['page'],
        },
      },
    ];

    // Get base URL for fetching portfolio pages
    const baseUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://lelezhang.com';

    // 5. First call - check if tool use is needed
    const initialResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: claudeMessages,
      system: systemPrompt,
      tools,
      temperature: 0.6,
    });

    // Handle tool use if needed
    let finalMessages: Anthropic.MessageParam[] = claudeMessages;
    let responseToStream: Anthropic.Messages.Message | null = null;

    if (initialResponse.stop_reason === 'tool_use') {
      const toolUseBlock = initialResponse.content.find(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlock && toolUseBlock.name === 'read_portfolio_page') {
        const pageId = (toolUseBlock.input as { page: string }).page as PortfolioPageId;
        const pageContent = await fetchPortfolioPage(pageId, baseUrl);

        // Add assistant's tool use and tool result to messages
        finalMessages = [
          ...claudeMessages,
          {
            role: 'assistant' as const,
            content: initialResponse.content,
          },
          {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result' as const,
                tool_use_id: toolUseBlock.id,
                content: pageContent,
              },
            ],
          },
        ];
      }
    } else {
      // No tool use, we can stream the initial response
      responseToStream = initialResponse;
    }

    // 6. Create streaming response
    if (responseToStream) {
      // Stream the already-received response
      const textContent = responseToStream.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('');

      const nonToolStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          // Stream in word-sized chunks for natural feel
          const words = textContent.split(/(\s+)/);
          for (const word of words) {
            controller.enqueue(encoder.encode(word));
            if (word.trim()) await new Promise(resolve => setTimeout(resolve, 30));
          }

          // Save to KV
          try {
            const assistantTimestamp = new Date().toISOString();
            const assistantKey = `chat:${visitorId}:${assistantTimestamp}:assistant`;
            await kv.set(assistantKey, {
              visitorId,
              timestamp: assistantTimestamp,
              message: textContent,
              inResponseTo: lastUserMessage?.text,
            });
            await kv.lpush(`chat:${visitorId}:messages`, assistantKey);
          } catch (kvError) {
            console.error('Error saving assistant response to KV:', kvError);
          }

          controller.close();
        },
      });

      return new Response(nonToolStream, {
        headers: {
          ...allHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // If we used a tool, make the final streaming call
    const toolResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: finalMessages,
      system: systemPrompt,
      tools,
      stream: true,
      temperature: 0.6,
    });

    // Optimized streaming for faster initial response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullAssistantResponse = '';

        try {
          for await (const chunk of toolResponse) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              fullAssistantResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          
          // Save assistant's response to KV after streaming completes
          try {
            const assistantTimestamp = new Date().toISOString();
            const assistantKey = `chat:${visitorId}:${assistantTimestamp}:assistant`;
            await kv.set(assistantKey, {
              visitorId,
              timestamp: assistantTimestamp,
              message: fullAssistantResponse,
              inResponseTo: lastUserMessage?.text,
            });
            await kv.lpush(`chat:${visitorId}:messages`, assistantKey);
          } catch (kvError) {
            console.error('Error saving assistant response to KV:', kvError);
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...allHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    const corsHeaders = createCORSHeaders(req);
    return new Response(
      JSON.stringify({ 
        error: 'something went wrong on my end; try again in a sec?',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
