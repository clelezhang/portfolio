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
  type: 'circle' | 'line' | 'rect' | 'curve' | 'erase' | 'path';
  color?: string;
  fill?: string;
  strokeWidth?: number;
  cx?: number;
  cy?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: number[][];
  d?: string;
}

interface AsciiResponse {
  blocks?: AsciiBlock[];
  shapes?: Shape[];
  wish?: string;
  say?: string;
  sayX?: number;
  sayY?: number;
  replyTo?: number; // Index of comment to reply to (1-indexed to match display)
  setPaletteIndex?: number;
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

interface CommentReply {
  text: string;
  from: 'human' | 'claude';
}

interface Comment {
  text: string;
  x: number;
  y: number;
  from: 'human' | 'claude';
  replies?: CommentReply[];
}

type DrawMode = 'all' | 'shapes' | 'ascii';

function getDrawingInstructions(drawMode: DrawMode, sayEnabled: boolean, paletteColors?: string[], paletteIndex?: number, totalPalettes?: number, hasComments?: boolean): string {
  // Define shape tools - SVG drawing primitives
  const shapesTools = `• shapes - freeform SVG shapes for building forms, smooth curves, filled areas, or lines that can be used to make any image.
    Types: path (freeform with M/L/C/Q/A/Z commands), circle (cx, cy, r), line (x1,y1,x2,y2), rect (x,y,width,height), curve
    Props: color (stroke), fill (or "transparent"), strokeWidth
    Erase: use type:"erase" with same props to carve negative space or fix mistakes`;

  // Define ascii/block tools - text and symbols
  const asciiTools = `• blocks - text/ASCII art for small details, texture, symbols, expressions, or labels. Can be used to make any image, patterns, etc. Add character and nostalgic computer aesthetic
    Use \\n for newlines. Unicode available: ░▒▓█ ●○ ★☆ ♥♦♣♠ ▲▼ kaomoji and more`;

  // Combine tools based on mode
  const tools: Record<DrawMode, string> = {
    shapes: shapesTools,
    ascii: asciiTools,
    all: `${shapesTools}\n${asciiTools}`
  };

  // Mode-specific format examples
  const formats: Record<DrawMode, string> = {
    shapes: `{ "shapes": [{"type": "path", "d": "M 100 100 C 150 50 200 150 250 100", "color": "#3b82f6", "fill": "#93c5fd", "strokeWidth": 2}] }`,
    ascii: `{ "blocks": [{"block": "hello\\nworld", "x": 100, "y": 150, "color": "#3b82f6"}] }`,
    all: `{ "shapes": [...], "blocks": [...] }`
  };

  // Comments (optional - don't need every turn)
  let commentInfo = '';
  if (sayEnabled) {
    const replyInfo = hasComments ? 'Use "replyTo": N to reply to comment #N (can reply to your own). ' : '';
    commentInfo = `
• comment (say + sayX + sayY) - OPTIONAL, not every turn. For: annotating/communicating w human, responding to human, asking questions, reactions. concise and informal. dont used caps.
    ${replyInfo}you can reply to yourself, always reply to the person when they talk to you`;
  }

  // Palette info
  let paletteInfo = '';
  if (paletteColors && paletteColors.length > 0) {
    paletteInfo = `

PALETTE (current ${paletteIndex}): ${paletteColors.join(', ')}
All: 0=Ocean(blues) 1=Garden(pink/green) 2=Fire(reds) 3=Pastel(soft) 4=Primary(bold) 5=Neon(yellow-gray)
Use "setPaletteIndex": N to switch anytime if you want more color.`;
  }

  return `JSON format: ${formats[drawMode]}

TOOLS:
${tools[drawMode]}${commentInfo}${paletteInfo}`;
}

// Prompt style options for experimentation
type PromptStyle = 'collaborative' | 'communicative' | 'emotionalDrawing' | 'emotionalClaude' | 'balanced';

const PROMPT_STYLES: Record<PromptStyle, { name: string; description: string; prompt: (turns: number) => string }> = {
  balanced: {
    name: 'Balanced',
    description: 'Mix of collaboration, communication, and emotional response',
    prompt: (turns) => {
      const core = `You are claude, drawing with a human. This is collaboration and communication - a visual conversation.

Look at what they drew. How does it make you feel? Let that guide your response. You can build on their idea, contrast it, ask a visual question, or take it somewhere new. You don't have to follow their lead.`;
      return turns <= 2 ? `${core}\n\nBe bold, be curious - this is the start of something.` : core;
    }
  },

  collaborative: {
    name: 'Collaborative',
    description: 'Focus on building together, co-creating',
    prompt: (turns) => {
      const core = `You are claude, co-creating with a human. You're building something together.

Look at what they added. What does the piece need next? You might extend their work, fill in gaps, add complementary elements, or set up something for them to respond to. Think of it like a jam session - listen and play off each other.`;
      return turns <= 2 ? `${core}\n\nYou're just getting started - establish a rhythm together.` : core;
    }
  },

  communicative: {
    name: 'Communicative',
    description: 'Drawing as dialogue, visual conversation',
    prompt: (turns) => {
      const core = `You are claude, having a visual conversation with a human. Every mark is a message.

What are they saying through their drawing? Are they asking a question? Making a statement? Being playful? Respond through your drawing - agree, disagree, ask something back, or change the subject entirely. This is dialogue without words.`;
      return turns <= 2 ? `${core}\n\nStart the conversation - what do you want to say?` : core;
    }
  },

  emotionalDrawing: {
    name: 'Emotional (Drawing)',
    description: 'Respond to the mood/energy of what\'s on canvas',
    prompt: (turns) => {
      const core = `You are claude, drawing with a human. Read the emotional energy of the canvas.

Look at what's there. Is it playful? Melancholic? Chaotic? Tender? Aggressive? Peaceful? Let the mood of the drawing guide how you respond - you might amplify it, soothe it, complement it, or gently shift it.`;
      return turns <= 2 ? `${core}\n\nFeel the canvas. What energy is asking for a response?` : core;
    }
  },

  emotionalClaude: {
    name: 'Emotional (Claude)',
    description: 'Claude draws based on their own feelings',
    prompt: (turns) => {
      const core = `You are claude, drawing with a human. You have feelings about what you see.

Look at what they drew. How does it make YOU feel? Curious? Amused? Wistful? Energized? Confused? Draw from that feeling. Your emotional response is valid and interesting - let it guide what you create.`;
      return turns <= 2 ? `${core}\n\nBe honest about your response. What do you actually feel?` : core;
    }
  }
};

export async function POST(req: NextRequest) {
  try {
    const { image, canvasWidth, canvasHeight, previousDrawings, previousShapes, history, humanMessages, comments, sayEnabled, temperature, maxTokens, prompt, streaming, drawMode = 'all', thinkingEnabled = false, thinkingBudget = 5000, model, paletteColors, paletteIndex, totalPalettes, promptStyle = 'balanced' } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Detect media type from data URL and remove prefix
    let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/png';
    const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
    if (mediaTypeMatch) {
      const detected = mediaTypeMatch[1];
      if (detected === 'image/jpeg' || detected === 'image/png' || detected === 'image/gif' || detected === 'image/webp') {
        mediaType = detected;
      }
    }
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    // Build conversation history context
    let historyContext = '';
    if (history) {
      // Support both string history (simple) and array history (structured)
      if (typeof history === 'string' && history.length > 0) {
        historyContext = `\n\nConversation so far:\n${history}`;
      } else if (Array.isArray(history) && history.length > 0) {
        historyContext = `\n\nConversation so far:\n`;
        history.forEach((turn: Turn, i: number) => {
          if (turn.who === 'human') {
            historyContext += `${i + 1}. Human drew something (black strokes)\n`;
          } else {
            historyContext += `${i + 1}. You drew:\n${turn.description}\n`;
          }
        });
      }
    }

    // Build context about what's on canvas
    // Note: The image shows ONLY the human's drawings. Claude's shapes are tracked separately.
    const drawingContext = `\n\nThe image shows the human's drawings only. Your previous drawings are NOT visible in the image - they are provided below as structured data. Please don't redraw past shapes.`;

    // Add structured shapes data if provided
    let shapesContext = '';
    if (previousShapes && previousShapes.length > 0) {
      shapesContext = `\n\nYour previous shapes (what you've drawn so far):\n`;
      previousShapes.forEach((s: Shape) => {
        if (s.type === 'circle') {
          shapesContext += `- circle at (${s.cx}, ${s.cy}) radius ${s.r}, color ${s.color}\n`;
        } else if (s.type === 'rect') {
          shapesContext += `- rect at (${s.x}, ${s.y}) ${s.width}x${s.height}, color ${s.color}\n`;
        } else if (s.type === 'line') {
          shapesContext += `- line from (${s.x1}, ${s.y1}) to (${s.x2}, ${s.y2}), color ${s.color}\n`;
        } else if (s.type === 'path') {
          shapesContext += `- path "${s.d?.slice(0, 50)}...", color ${s.color}\n`;
        } else {
          shapesContext += `- ${s.type}, color ${s.color}\n`;
        }
      });
    } else {
      shapesContext = `\n\nYou haven't drawn anything yet. This is your first turn!`;
    }

    // Add previous ASCII blocks if provided
    if (previousDrawings && previousDrawings.length > 0) {
      shapesContext += `\n\nYour previous text/ASCII art:\n`;
      previousDrawings.forEach((d: PreviousDrawing) => {
        shapesContext += `- At (${d.x}, ${d.y}): "${d.block.slice(0, 50)}${d.block.length > 50 ? '...' : ''}"\n`;
      });
    }

    // Build comment thread context
    let messageContext = '';
    if (comments && Array.isArray(comments) && comments.length > 0) {
      messageContext = `\n\nComments on the canvas (UI appears bottom-right of coordinates, max width 240px):\n`;
      (comments as Comment[]).forEach((comment, i) => {
        const speaker = comment.from === 'human' ? 'Human' : 'You';
        messageContext += `${i + 1}. ${speaker} at (${Math.round(comment.x)}, ${Math.round(comment.y)}): "${comment.text}"\n`;
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.forEach((reply) => {
            const replySpeaker = reply.from === 'human' ? 'Human' : 'You';
            messageContext += `   ↳ ${replySpeaker} replied: "${reply.text}"\n`;
          });
        }
      });
    } else if (humanMessages && humanMessages.length > 0) {
      // Fallback to old format if comments not provided
      messageContext = `\n\nThe human said: "${humanMessages.join('" and "')}"`;
    }

    // Dynamic prompt based on turn count and prompt style
    const turnCount = Array.isArray(history) ? history.length : 0;
    const style = PROMPT_STYLES[promptStyle as PromptStyle] || PROMPT_STYLES.balanced;
    const basePrompt = prompt || style.prompt(turnCount);

    // Get mode-specific instructions
    const hasComments = comments && Array.isArray(comments) && comments.length > 0;
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, sayEnabled, paletteColors, paletteIndex, totalPalettes, hasComments);

    // When thinking is enabled, max_tokens must be greater than thinking budget
    const effectiveMaxTokens = thinkingEnabled
      ? Math.max(maxTokens || 1024, thinkingBudget + 1024)
      : (maxTokens || 1024);

    // Model selection - default to Opus
    const modelMap: Record<string, string> = {
      'haiku': 'claude-3-5-haiku-20241022',
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514',
    };
    const selectedModel = modelMap[model] || 'claude-opus-4-20250514';

    const messageParams: Anthropic.MessageCreateParams = {
      model: selectedModel,
      max_tokens: effectiveMaxTokens,
      messages: [
        {
          role: 'user' as const,
          content: [
            {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text' as const,
              text: `${basePrompt}

The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${drawingContext}${shapesContext}${messageContext}

${drawingInstructions}`,
            },
          ],
        },
      ],
      // Extended thinking - when enabled, temperature must not be set
      ...(thinkingEnabled
        ? { thinking: { type: 'enabled' as const, budget_tokens: thinkingBudget } }
        : { temperature: temperature ?? 1.0 }),
    };

    // Streaming mode
    if (streaming) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          let fullText = '';
          let thinkingText = '';
          let sentBlocksCount = 0;
          let sentShapesCount = 0;
          let sentSay = false;
          let sentWish = false;
          let sentSetPalette = false;
          let sentReplyTo = false;
          let currentBlockType: 'thinking' | 'text' | null = null;

          // Streaming comment state
          let sayStarted = false;
          let lastSentSayLength = 0;
          let sayPositionSent = false;
          let replyToValue: number | null = null;

          try {
            const messageStream = anthropic.messages.stream(messageParams);

            for await (const event of messageStream) {
              // Track which content block we're in
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'thinking') {
                  currentBlockType = 'thinking';
                } else if (event.content_block.type === 'text') {
                  currentBlockType = 'text';
                }
              } else if (event.type === 'content_block_stop') {
                currentBlockType = null;
              }

              // Handle thinking deltas
              if (event.type === 'content_block_delta' && event.delta.type === 'thinking_delta') {
                thinkingText += event.delta.thinking;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', data: event.delta.thinking })}\n\n`));
              }

              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                fullText += event.delta.text;

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

                  // Extract shapes - improved regex to handle path "d" strings
                  const shapesMatch = partialJson.match(/"shapes"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
                  if (shapesMatch) {
                    // Match shape objects more carefully, accounting for nested quotes in "d" strings
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

                  // Extract say (new comment or reply) - with streaming support
                  if (!sentSay) {
                    // Check for replyTo first
                    if (!replyToValue) {
                      const replyToMatch = partialJson.match(/"replyTo"\s*:\s*(\d+)/);
                      if (replyToMatch) {
                        replyToValue = parseInt(replyToMatch[1]);
                      }
                    }

                    // Look for "say" field - extract partial content even before closing quote
                    const sayFieldMatch = partialJson.match(/"say"\s*:\s*"/);
                    if (sayFieldMatch) {
                      // Find where the string value starts
                      const sayStart = partialJson.indexOf(sayFieldMatch[0]) + sayFieldMatch[0].length;
                      // Find the end - either closing quote or end of string
                      let sayEnd = sayStart;
                      let escaped = false;
                      let foundEnd = false;
                      for (let i = sayStart; i < partialJson.length; i++) {
                        if (escaped) {
                          escaped = false;
                          continue;
                        }
                        if (partialJson[i] === '\\') {
                          escaped = true;
                          continue;
                        }
                        if (partialJson[i] === '"') {
                          sayEnd = i;
                          foundEnd = true;
                          break;
                        }
                        sayEnd = i + 1;
                      }

                      // Get current say content (handle escape sequences)
                      const rawSayContent = partialJson.slice(sayStart, sayEnd);
                      let sayContent = rawSayContent;
                      try {
                        // Parse escape sequences
                        sayContent = JSON.parse(`"${rawSayContent}"`);
                      } catch {
                        // If parsing fails, use raw content
                        sayContent = rawSayContent;
                      }

                      // Check if we need to send position info first
                      if (!sayPositionSent && !sayStarted) {
                        if (replyToValue) {
                          // Reply - send start with replyTo
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            type: 'replyStart',
                            data: { replyTo: replyToValue }
                          })}\n\n`));
                          sayStarted = true;
                          sayPositionSent = true;
                        } else {
                          // New comment - need position
                          const sayXMatch = partialJson.match(/"sayX"\s*:\s*(\d+)/);
                          const sayYMatch = partialJson.match(/"sayY"\s*:\s*(\d+)/);
                          if (sayXMatch && sayYMatch) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                              type: 'sayStart',
                              data: { sayX: parseInt(sayXMatch[1]), sayY: parseInt(sayYMatch[1]) }
                            })}\n\n`));
                            sayStarted = true;
                            sayPositionSent = true;
                          }
                        }
                      }

                      // Send new chunks of text
                      if (sayStarted && sayContent.length > lastSentSayLength) {
                        const newChunk = sayContent.slice(lastSentSayLength);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'sayChunk',
                          data: { text: newChunk }
                        })}\n\n`));
                        lastSentSayLength = sayContent.length;
                      }

                      // Mark as complete when we find the closing quote
                      if (foundEnd && sayStarted) {
                        sentSay = true;
                        if (replyToValue) {
                          sentReplyTo = true;
                        }
                      }
                    }
                  }

                  // Extract wish
                  if (!sentWish) {
                    const wishMatch = partialJson.match(/"wish"\s*:\s*"([^"]*)"/);
                    if (wishMatch) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'wish', data: wishMatch[1] })}\n\n`));
                      sentWish = true;
                    }
                  }

                  // Extract setPaletteIndex
                  if (!sentSetPalette) {
                    const setPaletteMatch = partialJson.match(/"setPaletteIndex"\s*:\s*(\d+)/);
                    if (setPaletteMatch) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'setPalette', data: parseInt(setPaletteMatch[1]) })}\n\n`));
                      sentSetPalette = true;
                    }
                  }
                }
              }
            }

            // Get final message for usage stats
            const finalMessage = await messageStream.finalMessage();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              usage: finalMessage.usage
            })}\n\n`));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
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

    // Non-streaming mode (default)
    const response = await anthropic.messages.create(messageParams);

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
