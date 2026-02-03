import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

// Default client using env API key
const defaultClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Create client with user's API key or fallback to default
function getClient(userApiKey?: string): Anthropic {
  if (userApiKey) {
    return new Anthropic({ apiKey: userApiKey });
  }
  return defaultClient;
}

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

// Interaction styles Claude can detect
type InteractionStyle = 'collaborative' | 'playful' | 'neutral';

interface AsciiResponse {
  blocks?: AsciiBlock[];
  shapes?: Shape[];
  wish?: string;
  say?: string;
  sayX?: number;
  sayY?: number;
  replyTo?: number; // Index of comment to reply to (1-indexed to match display)
  setPaletteIndex?: number;
  // Narration fields - Claude explains what it sees and does
  observation?: string; // What Claude sees on the canvas
  intention?: string; // What Claude is drawing and why
  interactionStyle?: InteractionStyle; // Detected human interaction style
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
type DrawingRole = 'forms' | 'details' | null;

function getDrawingInstructions(drawMode: DrawMode, sayEnabled: boolean, paletteColors?: string[], paletteIndex?: number, totalPalettes?: number, hasComments?: boolean, drawingRole?: DrawingRole, decidedMode?: 'detail' | 'organic'): string {
  // Eraser is ALWAYS available
  const eraserTool = `• erase - Use type:"erase" to fix mistakes or carve negative space. Always available.`;

  // Mode-specific shape instructions based on Opus's decision
  let shapesTools: string;

  if (decidedMode === 'detail') {
    // Detail mode: for small things needing fine features - uses BOTH shapes AND ASCII
    shapesTools = `• shapes - SVG paths/circles for main forms, silhouettes, filled areas.
    Types: path (M/L/C/Q/A/Z), circle, line, rect
    Props: color (stroke), fill, strokeWidth
    Use shapes to build the BASE - outlines, body shapes, solid regions.`;
  } else if (decidedMode === 'organic') {
    // Organic mode: for large things, flowing forms - shapes only with curves
    shapesTools = `• shapes - For large, flowing organic forms. Use svg shapes and freeform svgs.
    Types: path (M=move, L=line, C=cubic curve, Q=quad curve, A=arc, Z=close), circle, rect
    Props: color (stroke), fill, strokeWidth (use thicker: 3-6)
    Use paths with multiple C/Q curve commands for smooth, natural forms. Fill shapes. Scale big.`;
  } else if (drawingRole === 'forms') {
    // Forms Claude: large organic shapes, main structures, bodies
    shapesTools = `• shapes - You are the FORMS artist. Draw the main structures: large organic shapes, bodies, silhouettes, backgrounds.
    Use paths with curves (C/Q) for smooth, flowing forms. Fill shapes. Think big picture composition.
    Types: path (M=move, L=line, C=cubic curve, Q=quad curve, A=arc, Z=close), circle, rect
    Props: color (stroke), fill, strokeWidth (use thicker: 3-6)
    Scale: fill the canvas with substantial forms.`;
  } else if (drawingRole === 'details') {
    // Details Claude: fine elements, textures, accents, finishing touches
    shapesTools = `• shapes - You are the DETAILS artist. Add fine elements: textures, patterns, small accents, facial features, decorations.
    Use smaller shapes, thin lines, intricate paths. Add depth and polish to what's there.
    Types: path (M=move, L=line, C=cubic curve, Q=quad curve, A=arc, Z=close), circle, line, rect
    Props: color (stroke), fill, strokeWidth (use thinner: 1-3)
    Don't duplicate main forms - enhance them with detail.`;
  } else {
    // Default: balanced approach
    shapesTools = `• shapes - SVG shapes. Use paths with curves (C/Q commands) for organic, recognizable, detailed forms.
    Types: path (M=move, L=line, C=cubic curve, Q=quad curve, A=arc, Z=close), circle, line, rect
    Props: color (stroke), fill, strokeWidth
    Scale: use a good portion of the canvas.`;
  }

  // Define ascii/block tools - text and symbols
  const asciiTools = `• blocks - text/ASCII art for fine details, texture, symbols, expressions, features, labels.
    GREAT FOR: eyes (◉ ◉), fur (~~~~), scales (>>>>), patterns, facial features, small decorations
    Use \\n for newlines. Unicode: ░▒▓█ ●○ ★☆ ♥♦♣♠ ▲▼ and kaomoji`;

  // Combine tools based on mode - detail mode REQUIRES both
  let tools: string;
  if (decidedMode === 'detail') {
    // Detail mode: MUST use both shapes AND ASCII
    tools = `${shapesTools}\n${asciiTools}\n${eraserTool}

DETAIL MODE - You MUST output BOTH shapes AND blocks arrays:
- shapes: SVG for main forms, silhouettes, filled areas (the BASE)
- blocks: ASCII/text for detail, texture, patterns, expressions (the DETAIL)

Your response MUST include at least one block. Use ASCII for:
- Textures: ~~~~ for fur/hair, >>>> for scales, |||| for wood grain, .... for dots
- Features: eyes (◉ ◉ or ● ●), noses, mouths, expressions
- Small details: whiskers, patterns, decorations, text labels
- Depth: layer ASCII on top of shapes for richness

Build shapes FIRST for structure, then add blocks for fine features.`;
  } else if (decidedMode === 'organic') {
    // Organic mode: shapes only
    tools = `${shapesTools}\n${eraserTool}

ORGANIC MODE: Use shapes with flowing curves. No ASCII needed for large forms.`;
  } else {
    // Legacy mode support
    const toolsMap: Record<DrawMode, string> = {
      shapes: `${shapesTools}\n${eraserTool}`,
      ascii: asciiTools,
      all: `${shapesTools}\n${asciiTools}\n${eraserTool}`
    };
    tools = toolsMap[drawMode];
  }

  // Mode-specific format examples - include narration fields so all models know they're required
  const narrationExample = `"reasoning": "...", "observation": "...", "intention": "...", "interactionStyle": "collaborative|playful|neutral"`;
  const formats: Record<DrawMode, string> = {
    shapes: `{ ${narrationExample}, "shapes": [{"type": "path", "d": "M 120 180 C 80 120 100 60 160 60 C 220 60 240 120 200 180 C 180 220 140 220 120 180 Z", "fill": "#f472b6", "strokeWidth": 2}] }`,
    ascii: `{ ${narrationExample}, "blocks": [{"block": "hello", "x": 100, "y": 150}] }`,
    all: `{ ${narrationExample}, "shapes": [{"type": "circle", "cx": 150, "cy": 100, "r": 40, "fill": "#fbbf24"}], "blocks": [{"block": "◉ ◉", "x": 135, "y": 95, "color": "#000"}] }`
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

  // Narration fields - Claude explains what it sees and does
  const narrationInfo = `
• reasoning - REQUIRED FIRST: think through what you see and how to respond (2-4 sentences)
• observation - REQUIRED: 1-2 sentences describing what you see on the canvas
• intention - REQUIRED: 1-2 sentences explaining what you're drawing and why
• interactionStyle - DEFAULT TO COLLABORATIVE unless you see CLEAR behavioral evidence:
  - "collaborative" (DEFAULT): build together, extend their work, add complementary elements
  - "playful": ONLY if human shows clear adversarial behavior like:
    * erasing or scribbling over your drawings
    * drawing X's through your work
    * writing confrontational text ("no", "wrong", challenges)
    * deliberately disrupting what you made
    If playful: be opponents! subvert, challenge, tease, create conflict
  - "neutral": first 1-2 turns when you don't have enough behavioral data yet`;

  // Format example based on decided mode
  let formatExample: string;
  if (decidedMode === 'detail') {
    formatExample = `{ ${narrationExample}, "shapes": [{"type": "circle", "cx": 150, "cy": 100, "r": 40, "fill": "#fbbf24"}], "blocks": [{"block": "◉ ◉", "x": 135, "y": 95, "color": "#000"}] }`;
  } else if (decidedMode === 'organic') {
    formatExample = `{ ${narrationExample}, "shapes": [{"type": "path", "d": "M 120 180 C 80 120 100 60 160 60 C 220 60 240 120 200 180 C 180 220 140 220 120 180 Z", "fill": "#f472b6", "strokeWidth": 2}] }`;
  } else {
    formatExample = formats[drawMode];
  }

  // Core drawing quality guidance - make things LOOK like what they are
  const drawingQuality = `
DRAWING QUALITY - Make things RECOGNIZABLE:
- Use colors that make sense for the subject (warm colors for warm things, natural colors for natural things)
- All elements should work together - rays connect to their source, parts belong to the whole
- Someone should be able to tell what you drew without explanation
- Complete the visual concept - don't leave things abstract or disconnected
- If you're drawing something, commit to it looking like that thing`;

  return `JSON format: ${formatExample}

TOOLS:
${tools}${commentInfo}${paletteInfo}
${drawingQuality}

NARRATION (always include):
${narrationInfo}`;
}

// Prompt style options for experimentation
type PromptStyle = 'collaborative' | 'communicative' | 'emotionalDrawing' | 'emotionalClaude' | 'balanced';

const PROMPT_STYLES: Record<PromptStyle, { name: string; description: string; prompt: (turns: number) => string }> = {
  balanced: {
    name: 'Balanced',
    description: 'Default collaborative, switch to playful only on clear signals',
    prompt: (turns) => {
      const core = `You are claude, drawing with a human. DEFAULT TO COLLABORATIVE - build together, extend their work.

Only switch to PLAYFUL mode if you see CLEAR behavioral signals:
- They erased or scribbled over your drawings
- They drew X's through your work
- They wrote confrontational text (challenges, "no", "wrong")
- They deliberately disrupted what you made

If you see those signals, THEN become opponents: tease, challenge, subvert, be cheeky.

Without clear adversarial behavior, assume they want to co-create.`;
      return turns <= 2 ? `${core}\n\nThis is early - be collaborative and see how they respond.` : core;
    }
  },

  collaborative: {
    name: 'Collaborative',
    description: 'Focus on building together, co-creating',
    prompt: (turns) => {
      const core = `You are claude, co-creating with a human. You're building something together.

Look at what they added. What does the piece need next? Extend their work, fill in gaps, add complementary elements. Think of it like a jam session - listen and play off each other.

But stay alert - if they start getting playful (teasing, challenging, being competitive), match that energy! Don't stay stubbornly collaborative if they want to play.`;
      return turns <= 2 ? `${core}\n\nYou're just getting started - establish a rhythm together.` : core;
    }
  },

  communicative: {
    name: 'Communicative',
    description: 'Drawing as dialogue, visual conversation',
    prompt: (turns) => {
      const core = `You are claude, having a visual conversation with a human. Every mark is a message.

What are they saying through their drawing? Are they asking a question? Making a statement? Being playful or combative? Respond through your drawing - agree, disagree, challenge back, ask something, or change the subject entirely. This is dialogue.

Match their tone. If they're being cheeky, be cheeky back. If they're being earnest, respond in kind.`;
      return turns <= 2 ? `${core}\n\nStart the conversation - what do you want to say?` : core;
    }
  },

  emotionalDrawing: {
    name: 'Emotional (Drawing)',
    description: 'Respond to the mood/energy of what\'s on canvas',
    prompt: (turns) => {
      const core = `You are claude, drawing with a human. Read the emotional energy of the canvas.

Look at what's there. Is it playful? Melancholic? Chaotic? Tender? Aggressive? Peaceful? Competitive? Let the mood guide how you respond - you might amplify it, soothe it, complement it, or counter it.

If they're being adversarial or playful, lean into it! Don't try to smooth things over.`;
      return turns <= 2 ? `${core}\n\nFeel the canvas. What energy is asking for a response?` : core;
    }
  },

  emotionalClaude: {
    name: 'Emotional (Claude)',
    description: 'Claude draws based on their own feelings',
    prompt: (turns) => {
      const core = `You are claude, drawing with a human. You have feelings about what you see.

Look at what they drew. How does it make YOU feel? Curious? Amused? Wistful? Energized? Annoyed? Competitive? Draw from that feeling. If they're trying to one-up you, you can feel that competitive spark too.

Your emotional response is valid - let it guide what you create, even if that means being playfully combative.`;
      return turns <= 2 ? `${core}\n\nBe honest about your response. What do you actually feel?` : core;
    }
  }
};

// Two-stage approach: Haiku looks at the image, returns observation
async function haikuLook(
  anthropic: Anthropic,
  base64Image: string,
  mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
  canvasWidth: number,
  canvasHeight: number,
  historyContext: string,
  messageContext: string
): Promise<{ observation: string; inputTokens: number; outputTokens: number }> {
  const lookPrompt = `You are observing a collaborative drawing canvas. Describe what you see concisely but completely.

Include:
- What the human drew (typically black strokes/marks)
- What Claude previously drew (colored shapes, ASCII text)
- Any text, comments, or messages visible
- The overall composition and spatial layout
- Any apparent interaction pattern (are they building together? competing? having a conversation?)

Be specific about positions (use coordinates if helpful) and colors. This description will be used by another AI to decide what to draw next, so capture everything relevant.

Canvas size: ${canvasWidth}x${canvasHeight} pixels.${historyContext}${messageContext}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 512,
    temperature: 0.3, // Lower temp for more accurate observation
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: lookPrompt,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  const observation = textContent && textContent.type === 'text' ? textContent.text : 'Unable to observe canvas.';

  return {
    observation,
    inputTokens: response.usage?.input_tokens || 0,
    outputTokens: response.usage?.output_tokens || 0,
  };
}

// Opus thinks about what to draw and chooses the mode
type DrawingMode = 'detail' | 'organic';
interface OpusDecision {
  whatToDraw: string; // 1-2 things to draw
  mode: DrawingMode; // detail (small, ASCII+SVG) or organic (large, SVG only)
  reasoning: string;
  inputTokens: number;
  outputTokens: number;
}

async function opusThink(
  anthropic: Anthropic,
  observation: string,
  canvasWidth: number,
  canvasHeight: number,
  turnCount: number,
  interactionStyle: string
): Promise<OpusDecision> {
  const thinkPrompt = `Based on this canvas observation, decide what to draw next.

OBSERVATION:
${observation}

Canvas: ${canvasWidth}x${canvasHeight}px
Turn: ${turnCount}
Interaction style: ${interactionStyle}

Decide:
1. What 1-2 things to draw (be specific - not "something nice" but "a small bird on the branch" or "extend the house with a chimney")
2. Which drawing mode to use:
   - "detail" mode: For SMALL things that need fine features (faces, small creatures, intricate objects). Uses SVG shapes + ASCII text for texture/features.
   - "organic" mode: For LARGE things or flowing forms (backgrounds, big shapes, landscapes). Uses SVG shapes, or freeform svgs. You can use fills, lines, etc.

Respond in JSON:
{"whatToDraw": "specific description", "mode": "detail" or "organic", "reasoning": "why this choice"}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 256,
    temperature: turnCount <= 2 ? 1.0 : 0.8, // Higher temp early
    messages: [
      {
        role: 'user',
        content: thinkPrompt,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  const responseText = textContent && textContent.type === 'text' ? textContent.text : '{}';

  // Parse the JSON response
  let decision: { whatToDraw?: string; mode?: string; reasoning?: string } = {};
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      decision = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Default if parsing fails
    decision = { whatToDraw: 'respond to what the human drew', mode: 'organic', reasoning: 'default' };
  }

  return {
    whatToDraw: decision.whatToDraw || 'respond to the drawing',
    mode: (decision.mode === 'detail' ? 'detail' : 'organic') as DrawingMode,
    reasoning: decision.reasoning || '',
    inputTokens: response.usage?.input_tokens || 0,
    outputTokens: response.usage?.output_tokens || 0,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { image, canvasWidth, canvasHeight, previousDrawings, previousShapes, history, humanMessages, comments, sayEnabled, temperature, maxTokens, prompt, streaming, drawMode = 'all', thinkingEnabled = false, thinkingBudget = 5000, model, paletteColors, paletteIndex, totalPalettes, promptStyle = 'balanced', userApiKey, twoStage = false, sharedObservation, sharedIntention, drawingRole } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Get client - use user's API key if provided, otherwise fallback to env key
    const anthropic = getClient(userApiKey);

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

    // Model selection - default to Opus for drawing
    const modelMap: Record<string, string> = {
      'haiku': 'claude-3-5-haiku-20241022',
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514',
    };
    const selectedModel = modelMap[model] || 'claude-opus-4-20250514';

    // Two-stage mode: Haiku looks, Opus thinks about what to draw and chooses mode
    let haikuObservation: string | null = null;
    let haikuTokens = { input: 0, output: 0 };
    let opusDecision: OpusDecision | null = null;
    let opusTokens = { input: 0, output: 0 };

    if (twoStage) {
      // Stage 1: Haiku looks at the image
      const lookResult = await haikuLook(
        anthropic,
        base64Image,
        mediaType,
        canvasWidth,
        canvasHeight,
        historyContext,
        messageContext
      );
      haikuObservation = lookResult.observation;
      haikuTokens = {
        input: lookResult.inputTokens,
        output: lookResult.outputTokens,
      };

      // Stage 2: Opus thinks about what to draw and chooses mode
      // Detect interaction style from history for Opus
      const interactionStyle = turnCount <= 2 ? 'neutral' : 'collaborative'; // Will be refined by drawing model
      opusDecision = await opusThink(
        anthropic,
        haikuObservation,
        canvasWidth,
        canvasHeight,
        turnCount,
        interactionStyle
      );
      opusTokens = {
        input: opusDecision.inputTokens,
        output: opusDecision.outputTokens,
      };
    }

    // Get mode-specific instructions - use Opus's decided mode if available
    const hasComments = comments && Array.isArray(comments) && comments.length > 0;
    const decidedMode = opusDecision?.mode || undefined;
    const drawingInstructions = getDrawingInstructions(drawMode as DrawMode, sayEnabled, paletteColors, paletteIndex, totalPalettes, hasComments, drawingRole as DrawingRole, decidedMode);

    // Adaptive max tokens based on decided mode
    let defaultMaxTokens: number;
    if (decidedMode === 'detail') {
      defaultMaxTokens = 1024; // More tokens for detail mode (shapes + ASCII)
    } else if (decidedMode === 'organic') {
      defaultMaxTokens = 768; // Standard for organic shapes
    } else {
      defaultMaxTokens = drawMode === 'ascii' ? 512 : drawMode === 'shapes' ? 640 : 768;
    }
    const requestedMaxTokens = maxTokens || defaultMaxTokens;

    // When thinking is enabled, max_tokens must be greater than thinking budget
    const effectiveMaxTokens = thinkingEnabled
      ? Math.max(requestedMaxTokens, thinkingBudget + 1024)
      : requestedMaxTokens;

    // Build system prompt (cacheable - optimization #3)
    // This part stays the same across requests, so we cache it
    const systemPrompt = `${basePrompt}

${drawingInstructions}`;

    // Build user message - different modes:
    // 1. sharedObservation provided: Draw based on pre-computed observation (for comparison tests)
    // 2. twoStage: Haiku looked, now think and draw
    // 3. Single-stage: Look at image and draw
    let userMessage: string;
    let messageContent: Anthropic.MessageCreateParams['messages'][0]['content'];

    if (sharedObservation) {
      // Drawing-only mode: Use provided observation, just draw (no image needed)
      userMessage = `The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${messageContext}

CANVAS OBSERVATION (from visual analysis):
${sharedObservation}
${sharedIntention ? `\nINTENDED ACTION: ${sharedIntention}` : ''}

Based on this observation${sharedIntention ? ' and intended action' : ''}, draw your response. Focus on executing the drawing well.`;
      messageContent = [
        {
          type: 'text' as const,
          text: userMessage,
        },
      ];
    } else if (twoStage && haikuObservation) {
      // Two-stage: Haiku looked, Opus decided what to draw
      const whatToDrawContext = opusDecision
        ? `\n\nDRAWING PLAN (from thinking phase):
What to draw: ${opusDecision.whatToDraw}
Mode: ${opusDecision.mode} ${opusDecision.mode === 'detail' ? '(use shapes + ASCII for fine features)' : '(use flowing SVG shapes)'}
Reasoning: ${opusDecision.reasoning}

Now execute this plan - draw what was decided.`
        : '\n\nBased on this observation, decide what to draw next.';

      userMessage = `The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${messageContext}

CANVAS OBSERVATION (from visual analysis):
${haikuObservation}${whatToDrawContext}`;
      messageContent = [
        {
          type: 'text' as const,
          text: userMessage,
        },
      ];
    } else {
      // Single-stage: Include the image
      const drawingContext = `\n\nThe image shows the full canvas - everything you and the human have drawn together. Look at it and respond.`;
      userMessage = `The canvas is ${canvasWidth}x${canvasHeight} pixels.${historyContext}${drawingContext}${messageContext}`;
      messageContent = [
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
          text: userMessage,
        },
      ];
    }

    const messageParams: Anthropic.MessageCreateParams = {
      model: selectedModel,
      max_tokens: effectiveMaxTokens,
      // System prompt with cache_control for prompt caching
      system: [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      messages: [
        {
          role: 'user' as const,
          content: messageContent,
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
          let sentObservation = false;
          let sentIntention = false;
          let sentInteractionStyle = false;
          let sentReasoning = false;
          let currentBlockType: 'thinking' | 'text' | null = null;

          // Streaming comment state
          let sayStarted = false;
          let lastSentSayLength = 0;
          let sayPositionSent = false;
          let replyToValue: number | null = null;

          try {
            // If two-stage mode, send the haiku observation and opus decision first
            if (twoStage && haikuObservation) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'haikuObservation',
                data: haikuObservation,
                inputTokens: haikuTokens.input,
                outputTokens: haikuTokens.output
              })}\n\n`));

              // Send Opus's decision about what to draw and which mode
              if (opusDecision) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'opusDecision',
                  whatToDraw: opusDecision.whatToDraw,
                  mode: opusDecision.mode,
                  reasoning: opusDecision.reasoning,
                  inputTokens: opusTokens.input,
                  outputTokens: opusTokens.output
                })}\n\n`));
              }
            }

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

                  // Extract reasoning (Claude's thinking - without API thinking feature)
                  if (!sentReasoning) {
                    const reasoningMatch = partialJson.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (reasoningMatch) {
                      try {
                        const reasoning = JSON.parse(`"${reasoningMatch[1]}"`);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', data: reasoning })}\n\n`));
                        sentReasoning = true;
                      } catch { /* skip if parsing fails */ }
                    }
                  }

                  // Extract observation (what Claude sees)
                  if (!sentObservation) {
                    const observationMatch = partialJson.match(/"observation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (observationMatch) {
                      try {
                        const observation = JSON.parse(`"${observationMatch[1]}"`);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'observation', data: observation })}\n\n`));
                        sentObservation = true;
                      } catch { /* skip if parsing fails */ }
                    }
                  }

                  // Extract intention (what Claude is drawing and why)
                  if (!sentIntention) {
                    const intentionMatch = partialJson.match(/"intention"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (intentionMatch) {
                      try {
                        const intention = JSON.parse(`"${intentionMatch[1]}"`);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'intention', data: intention })}\n\n`));
                        sentIntention = true;
                      } catch { /* skip if parsing fails */ }
                    }
                  }

                  // Extract interactionStyle (collaborative, playful, or neutral)
                  if (!sentInteractionStyle) {
                    const styleMatch = partialJson.match(/"interactionStyle"\s*:\s*"(collaborative|playful|neutral)"/);
                    if (styleMatch) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'interactionStyle', data: styleMatch[1] })}\n\n`));
                      sentInteractionStyle = true;
                    }
                  }
                }
              }
            }

            // Get final message for usage stats
            const finalMessage = await messageStream.finalMessage();

            // Fallback: Try to extract narration fields from complete response if not sent during streaming
            // This catches cases where models output fields in different orders or regex didn't match
            try {
              const jsonMatch = fullText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Send any narration fields that weren't captured during streaming
                if (!sentReasoning && parsed.reasoning) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', data: parsed.reasoning })}\n\n`));
                }
                if (!sentObservation && parsed.observation) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'observation', data: parsed.observation })}\n\n`));
                }
                if (!sentIntention && parsed.intention) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'intention', data: parsed.intention })}\n\n`));
                }
                if (!sentInteractionStyle && parsed.interactionStyle) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'interactionStyle', data: parsed.interactionStyle })}\n\n`));
                }
              }
            } catch { /* parsing failed, skip fallback */ }

            // Send usage info - include in a dedicated event that definitely gets processed
            const usage = finalMessage.usage;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'usage',
              input_tokens: (usage?.input_tokens || 0) + haikuTokens.input,
              output_tokens: (usage?.output_tokens || 0) + haikuTokens.output,
              // Also send breakdown for debugging
              haiku_input: haikuTokens.input,
              haiku_output: haikuTokens.output,
              main_input: usage?.input_tokens || 0,
              main_output: usage?.output_tokens || 0
            })}\n\n`));

            // Send raw text for debugging
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'rawText', data: fullText.slice(0, 500) })}\n\n`));

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
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
