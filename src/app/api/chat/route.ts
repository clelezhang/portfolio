import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { validateOrigin, createCORSHeaders, generateVisitorId } from '../../lib/security';
import { checkChatRateLimit, createRateLimitHeaders } from '../../lib/rate-limit';
import { createSystemPrompt } from '../../lib/prompts';
import { kv } from '@vercel/kv';

// Configure for edge runtime for better performance
export const runtime = 'edge';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Rate limiting (skip in development for faster testing)
    let rateLimitResult;
    if (process.env.NODE_ENV === 'development') {
      // Skip expensive rate limiting in development
      rateLimitResult = {
        allowed: true,
        remaining: 29,
        resetTime: Date.now() + 3600000,
        total: 30
      };
    } else {
      const visitorId = await generateVisitorId(req);
      rateLimitResult = await checkChatRateLimit(visitorId);
    }
    
    const corsHeaders = createCORSHeaders(req);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    const allHeaders = { ...corsHeaders, ...rateLimitHeaders };

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
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
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save incoming user message to KV
    const visitorId = await generateVisitorId(req);
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

    // 4. Build conversation with personality
    const systemPrompt = createSystemPrompt(cardContext);
    
    // Convert messages to Claude format (Claude API doesn't support system role in messages)
    const claudeMessages = messages.map((message: Message) => ({
      role: message.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: message.text,
    }));

    // 5. Create streaming response optimized for speed
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',  
      max_tokens: 800,  
      messages: claudeMessages,
      system: systemPrompt, 
        stream: true,
        temperature: 0.6, // Slightly lower for more consistent speed
    });

    // 6. Optimized streaming for faster initial response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullAssistantResponse = '';
        
        try {
          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              fullAssistantResponse += text;
              // Add artificial delay for slower streaming effect
              await new Promise(resolve => setTimeout(resolve, 200));
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
        error: 'An error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
