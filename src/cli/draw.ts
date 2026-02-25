#!/usr/bin/env node
/**
 * Terminal Draw with Claude
 * A collaborative ASCII drawing tool — draw with mouse, Claude draws back.
 * Run: npx tsx src/cli/draw.ts
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const termkit = require('terminal-kit');
const term = termkit.terminal;

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PNG } from 'pngjs';

function isDarkTerminal(): boolean {
  try {
    execSync('defaults read -g AppleInterfaceStyle', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const IS_DARK = isDarkTerminal();

// ============================================================
// Types
// ============================================================

interface Cell {
  char: string;
  color: string;
  source: 'human' | 'claude' | 'empty';
}

interface AsciiBlock {
  block: string;
  x: number;
  y: number;
  color?: string;
}

interface Turn {
  who: 'human' | 'claude';
  description?: string;
  blocks?: AsciiBlock[];
}

// ============================================================
// Config
// ============================================================

const COLORS = [IS_DARK ? 15 : 0, 220, 202, 9, 70, 27]; // ANSI 256: white/black, yellow, orange, red, green, blue
const ANSI_NAMES: Record<number, string> = { 0: 'black', 15: 'white', 220: 'yellow', 202: 'orange', 9: 'red', 70: 'green', 27: 'blue' };
const BRUSHES = ['█', '#', '*'];
const STATUS_HEIGHT = 1; // rows reserved for status bar

// ============================================================
// State
// ============================================================

let canvasWidth = 0;
let canvasHeight = 0;
let canvas: Cell[][] = [];
let colorIndex = 0;
let brushIndex = 0;
let isDrawing = false;
let turnCount = 0;
let history: Turn[] = [];
let claudeMessage = '';
let isClaudeTurn = false;
let lastMouseX = -1;
let lastMouseY = -1;
let splashVisible = true;
let undoStack: Cell[][][] = [];
let loadingInterval: ReturnType<typeof setInterval> | null = null;

const FALLBACK_LOADING = [
  'contemplating ~ pixels . _~',
  'calibrating imagination . o O @',
  'negotiating with colors . . .',
  'warming up creativity * * ~~-->',
  'downloading inspiration _ / | \\ _',
];
let claudeLoadingMessages: string[] = [];
let typewriterTimeout: ReturnType<typeof setTimeout> | null = null;
let spinnerInterval: ReturnType<typeof setInterval> | null = null;
let totalCost = 0; // accumulated $ spent
let showCost = false; // toggled by holding 't'
let costTimeout: ReturnType<typeof setTimeout> | null = null;

// ============================================================
// Cost display (upper right, shown while holding 't')
// ============================================================

function renderCost() {
  const label = `$${totalCost.toFixed(4)}`;
  const x = term.width - label.length;
  term.moveTo(x, 1);
  if (showCost) {
    term.gray(label);
  } else {
    // Clear it — restore whatever was there (just blank it)
    term(' '.repeat(label.length));
  }
}

// ============================================================
// Header (top-left Claude message, like the web app)
// ============================================================

const FACE = '( ◕ ‿ ◕ )';
const WINK_FACES = [
  '( ◕ ‿ ~ )', '( ~ ‿ ◕ )', '( ◕ ‸ ◕ )', '( ◕ ω ◕ )',
];
const SPINNER_FRAMES = ['( ◐ ‿ ◐ )', '( ◓ ‿ ◓ )', '( ◑ ‿ ◑ )', '( ◒ ‿ ◒ )'];
let spinnerIndex = 0;
let isHoveringFace = false;
let faceHoverInterval: ReturnType<typeof setInterval> | null = null;
let isClaudeTalking = false; // prevents hover during AI speech

function showFace(text?: string) {
  term.moveTo(2, 1);
  term.eraseLine();
  term.defaultColor(FACE);
  if (text) {
    term.defaultColor(`  ${text}`);
  }
}


// Typewriter effect — streams text char by char, face stays on left (black text)
function typewriteHeader(text: string, onDone?: () => void) {
  if (typewriterTimeout) { clearTimeout(typewriterTimeout); typewriterTimeout = null; }

  const lowerText = text.toLowerCase();
  let i = 0;
  const step = () => {
    if (i <= lowerText.length) {
      term.moveTo(2, 1);
      term.eraseLine();
      term.defaultColor(FACE + '  ' + lowerText.slice(0, i));
      i++;
      typewriterTimeout = setTimeout(step, 30 + Math.random() * 20);
    } else {
      typewriterTimeout = null;
      if (onDone) onDone();
    }
  };
  step();
}

function startLoadingCycle() {
  const pool = claudeLoadingMessages.length > 0
    ? [...claudeLoadingMessages, ...FALLBACK_LOADING]
    : FALLBACK_LOADING;
  const pick = () => pool[Math.floor(Math.random() * pool.length)];

  // Spinner replaces face
  spinnerIndex = 0;
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
    term.moveTo(2, 1);
    term.gray(SPINNER_FRAMES[spinnerIndex]);
  }, 120);

  // Typewrite loading messages after spinner, offset past spinner face
  const showNext = () => {
    const msg = pick().toLowerCase();
    // Cancel previous typewriter before starting new one
    if (typewriterTimeout) { clearTimeout(typewriterTimeout); typewriterTimeout = null; }
    let i = 0;
    const step = () => {
      if (i <= msg.length) {
        // Preserve spinner face at pos 2, write text after it
        term.moveTo(2 + SPINNER_FRAMES[0].length + 1, 1);
        // Clear text area only (not spinner)
        const clearLen = canvasWidth - SPINNER_FRAMES[0].length - 3;
        term.gray(msg.slice(0, i) + ' '.repeat(Math.max(0, clearLen - i)));
        i++;
        typewriterTimeout = setTimeout(step, 30 + Math.random() * 20);
      } else {
        typewriterTimeout = null;
        loadingInterval = setTimeout(() => showNext(), 2500) as unknown as ReturnType<typeof setInterval>;
      }
    };
    step();
  };
  setTimeout(() => showNext(), 400);
}

function stopLoadingCycle() {
  if (loadingInterval) { clearInterval(loadingInterval); loadingInterval = null; }
  if (spinnerInterval) { clearInterval(spinnerInterval); spinnerInterval = null; }
  if (typewriterTimeout) { clearTimeout(typewriterTimeout); typewriterTimeout = null; }
  // Clear the loading text from header
  term.moveTo(2, 1);
  term.eraseLine();
}

// ============================================================
// Canvas
// ============================================================

function initCanvas() {
  canvasWidth = term.width;
  canvasHeight = term.height - STATUS_HEIGHT;
  canvas = [];
  for (let y = 0; y < canvasHeight; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < canvasWidth; x++) {
      row.push({ char: ' ', color: '#FFFFFF', source: 'empty' });
    }
    canvas.push(row);
  }
}

function setCell(x: number, y: number, char: string, color: string, source: 'human' | 'claude') {
  if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
    canvas[y][x] = { char, color, source };
  }
}

function renderCell(x: number, y: number) {
  const cell = canvas[y]?.[x];
  if (!cell) return;
  term.moveTo(x + 1, y + 1); // terminal-kit is 1-indexed
  if (cell.char === ' ') {
    term.defaultColor(' ');
  } else if (cell.color.startsWith('#')) {
    term.colorRgbHex(cell.color, cell.char);
  } else {
    term.color256(parseInt(cell.color), cell.char);
  }
}

function renderCanvas() {
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      renderCell(x, y);
    }
  }
}

function clearCanvas() {
  saveSnapshot();
  for (let y = 1; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      canvas[y][x] = { char: ' ', color: '#FFFFFF', source: 'empty' };
      renderCell(x, y);
    }
  }
  renderStatus();
  claudeMessage = '';
  showFace("let's draw together?");
}

function saveSnapshot() {
  const snapshot = canvas.map(row => row.map(cell => ({ ...cell })));
  undoStack.push(snapshot);
  if (undoStack.length > 20) undoStack.shift(); // cap at 20
}

function undo() {
  const snapshot = undoStack.pop();
  if (!snapshot) return;
  canvas = snapshot;
  renderCanvas();
  renderStatus();
  if (claudeMessage) {
    showFace(claudeMessage);
  } else {
    showFace("let's draw together?");
  }
}

// ============================================================
// Canvas → Image (for Claude vision)
// ============================================================

// ANSI 256 → RGB mapping for image rendering
const ANSI_RGB: Record<number, [number, number, number]> = {
  0: [0, 0, 0], 15: [255, 255, 255],
  9: [255, 0, 0], 27: [0, 95, 255], 70: [95, 175, 0],
  202: [255, 95, 0], 220: [255, 215, 0],
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function cellToRgb(cell: Cell): [number, number, number] {
  if (cell.char === ' ') return IS_DARK ? [30, 30, 30] : [240, 240, 240]; // background
  if (cell.color.startsWith('#')) return hexToRgb(cell.color);
  const n = parseInt(cell.color);
  return ANSI_RGB[n] || [128, 128, 128];
}

function canvasToImage(): string {
  const sx = 2; // horizontal scale
  const sy = 4; // vertical scale (terminal cells are ~2x taller than wide)
  const w = canvasWidth * sx;
  const h = canvasHeight * sy;
  const png = new PNG({ width: w, height: h });

  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const [r, g, b] = cellToRgb(canvas[y][x]);
      for (let dy = 0; dy < sy; dy++) {
        for (let dx = 0; dx < sx; dx++) {
          const idx = ((y * sy + dy) * w + (x * sx + dx)) * 4;
          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = 255;
        }
      }
    }
  }

  return PNG.sync.write(png).toString('base64');
}

// ============================================================
// Status Bar
// ============================================================

// Hit zones for clickable status bar items
type HitZone = { x1: number; x2: number; action: string };
let statusHitZones: HitZone[] = [];
let hoveredAction: string | null = null;

function renderStatus() {
  const statusY = canvasHeight + 1;
  statusHitZones = [];

  term.moveTo(1, statusY);
  term.eraseLine();

  let col = 1; // 1-indexed cursor position

  // Color swatches (hover brackets)
  term(' ');
  col += 1;
  for (let i = 0; i < COLORS.length; i++) {
    const num = String(i + 1);
    const c = COLORS[i];
    const action = `color:${i}`;
    const hovered = hoveredAction === action;
    const selected = i === colorIndex;
    statusHitZones.push({ x1: col, x2: col + 2, action });
    if (selected) {
      term.color256(c, '[');
      term.color256(c, num);
      term.color256(c, ']');
    } else if (hovered) {
      term.gray('[');
      term.color256(c, num);
      term.gray(']');
    } else {
      term(' ');
      term.color256(c, num);
      term(' ');
    }
    col += 3;
  }

  // Brush
  const brush = BRUSHES[brushIndex];
  const color = COLORS[colorIndex];
  term.gray('  ');
  col += 2;
  const brushFull = brush + ' [b]rush';
  statusHitZones.push({ x1: col, x2: col + brushFull.length - 1, action: 'brush' });
  if (hoveredAction === 'brush') {
    term.defaultColor(brushFull);
  } else {
    term.color256(color, brush);
    term.gray(' [b]rush');
  }
  col += brushFull.length;

  // Clear
  const clearText = '  [c]lear';
  statusHitZones.push({ x1: col, x2: col + clearText.length - 1, action: 'clear' });
  if (hoveredAction === 'clear') {
    term.defaultColor(clearText);
  } else {
    term.gray(clearText);
  }
  col += clearText.length;

  // Quit
  const quitText = '  [ctrl c]quit';
  statusHitZones.push({ x1: col, x2: col + quitText.length - 1, action: 'quit' });
  if (hoveredAction === 'quit') {
    term.defaultColor(quitText);
  } else {
    term.gray(quitText);
  }
  col += quitText.length;

  // Send button — right-aligned
  const sendText = '[⏎]send ';
  const sendX = term.width - sendText.length + 1;
  term.moveTo(sendX, statusY);
  statusHitZones.push({ x1: sendX, x2: term.width, action: 'send' });
  if (hoveredAction === 'send') {
    term.defaultColor(sendText);
  } else {
    term.gray(sendText);
  }
}

// Handle clicks on the status bar
function handleStatusClick(x: number): string | null {
  for (const zone of statusHitZones) {
    if (x >= zone.x1 && x <= zone.x2) {
      return zone.action;
    }
  }
  return null;
}

// Handle hover on the status bar — returns true if on status bar
function handleStatusHover(x: number, y: number): boolean {
  if (y !== canvasHeight + 1) {
    if (hoveredAction !== null) {
      hoveredAction = null;
      renderStatus();
    }
    return false;
  }
  const action = handleStatusClick(x);
  if (action !== hoveredAction) {
    hoveredAction = action;
    renderStatus();
  }
  return true;
}

// ============================================================
// Claude Integration
// ============================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function getSystemPrompt(): string {
  const interactionGuide = turnCount <= 2
    ? 'Start collaborative.'
    : 'Be collaborative by default. Switch to playful if human has been adversarial over multiple turns (erasing your work, drawing over it, opposing). Then oppose, subvert, tease back.';

  return `<role>
You're drawing on a shared terminal canvas with a human. Add to what's there. You create beautiful, detailed ASCII art by placing characters at specific column/row positions. When there's loose marks, add more detail. Approach this like a designer who thinks spatially but works in characters.
</role>

<drawing-reference>
Blocks (ASCII/text):
- Props: block (string of chars), x (column), y (row), color (hex)
- Chars: ◉●◕◔○ (eyes) ░▒▓█ (shade) ★☆♥♦♣♠▲▼◆◇■□ (symbols) kaomoji, box-drawing ─│┌┐└┘
- Multi-character blocks placed horizontally starting at (x,y)
- For multi-line art, use separate blocks for each line at incrementing y values
</drawing-reference>

<colors>
Human palette: yellow, orange, red, green, blue (shown in canvas description)
Your palette: use any hex colors. e.g. #FFD700 #FF5F00 #FF0000 #5FAF00 #005FFF #000000 #FFFFFF #FF69B4 #8B5CF6
Use colors that complement what's already on canvas.
</colors>

<canvas>
Coordinate system: (0,0) top-left, y increases downward. x=column (0 to width-1), y=row (0 to height-1).
Zones: top (sky/background), middle (main subject), bottom (ground/foreground)
</canvas>

<process>
1. Look at canvas - note what exists and WHERE
2. Pick ONE area to add to
3. Output JSON response
</process>

<style>
"drawing" and "loadingMessages": weave in tiny ASCII/unicode art (░▒▓█ ◉●○ ★☆ ▲▼ ◆◇ .~*/ etc.) as little illustrations, not decoration. No emojis. Vary each one.
e.g. "grew a garden .o꩜°" | "/\\ built a house" | "☆ . * . sky" | "the river ~ ~ goes where?"
</style>

<interaction>
${interactionGuide}
</interaction>

<output-format>
Output a single JSON object (no markdown, no backticks) with ALL these fields:
{
  "drawing": "short summary with ASCII/unicode art (see <style>)",
  "interactionStyle": "collaborative" or "playful",
  "blocks": [...],
  "loadingMessages": ["5 short messages about what you see on the canvas / what you're about to draw / reacting to the human's art. with ASCII/unicode art (see <style>). vary wildly."]
}
</output-format>`;
}

async function claudeTurn() {
  isClaudeTurn = true;
  claudeMessage = '';
  renderStatus();
  startLoadingCycle();

  const imageBase64 = canvasToImage();

  // Build history context — last 3 Claude turns only (token efficiency)
  let historyText = '';
  if (history.length > 0) {
    const claudeTurns = history.filter(t => t.who === 'claude').slice(-3);
    const recentHuman = history.filter(t => t.who === 'human').slice(-1);
    const recent = [...claudeTurns, ...recentHuman];
    historyText = '\n<history>\n' + recent.map(t => {
      if (t.who === 'human') return 'Human drew';
      return `Claude: ${t.description || 'drew'}`;
    }).join('\n') + '\n</history>';
  }

  // Build raw ASCII grid of non-empty rows
  const gridLines: string[] = [];
  for (let y = 0; y < canvasHeight; y++) {
    let row = '';
    let hasContent = false;
    for (let x = 0; x < canvasWidth; x++) {
      const ch = canvas[y][x].char;
      row += ch;
      if (ch !== ' ') hasContent = true;
    }
    if (hasContent) {
      gridLines.push(`Row ${y}: "${row.trimEnd()}"`);
    }
  }
  const asciiGrid = gridLines.length > 0 ? gridLines.join('\n') : 'Canvas is empty.';

  const textContext = `Canvas: ${canvasWidth} columns × ${canvasHeight} rows. (0,0) is top-left. Image shows colors/positions. ASCII grid below shows exact characters:\n\n${asciiGrid}${historyText}\n\nYour turn — add something creative. Output ONLY valid JSON.`;

  saveSnapshot();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: turnCount <= 3 ? 1.0 : 0.7,
      system: getSystemPrompt(),
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
        { type: 'text', text: textContext },
      ] }],
    });

    // Track cost (Sonnet pricing: $3/M input, $15/M output)
    if (response.usage) {
      totalCost += (response.usage.input_tokens / 1_000_000) * 3;
      totalCost += (response.usage.output_tokens / 1_000_000) * 15;
    }

    // Parse response
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr) as { drawing?: string; blocks?: AsciiBlock[]; loadingMessages?: string[]; interactionStyle?: string };

    // Render Claude's blocks with progressive reveal
    const blocks = parsed.blocks || [];
    const allChars: { x: number; y: number; ch: string; color: string }[] = [];
    for (const block of blocks) {
      const chars = block.block || '';
      const color = block.color || '#3B82F6';
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (ch === '\n') continue;
        allChars.push({ x: block.x + i, y: block.y, ch, color });
      }
    }
    // Reveal characters one by one
    for (const c of allChars) {
      setCell(c.x, c.y, c.ch, c.color, 'claude');
      renderCell(c.x, c.y);
      await new Promise(r => setTimeout(r, 15));
    }

    // Update state
    claudeMessage = parsed.drawing || 'drew something';
    if (parsed.loadingMessages) {
      claudeLoadingMessages = parsed.loadingMessages;
    }
    history.push({
      who: 'claude',
      description: parsed.drawing,
      blocks,
    });
    turnCount++;
  } catch (err) {
    claudeMessage = `Error: ${err instanceof Error ? err.message : 'unknown'}`;
  }

  stopLoadingCycle();
  typewriteHeader(claudeMessage);
  isClaudeTurn = false;
  renderStatus();
}

// ============================================================
// Claude Speak (click on face)
// ============================================================

async function claudeSpeak() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      temperature: 1.0,
      system: `You're ( ◕ ‿ ◕ ) — the face in a collaborative terminal drawing app called "draw with claude". Someone clicked on you. Say ONE short sentence (max 12 words). Be playful or helpful. No ASCII art, no emojis. You know how the app works:
- draw on canvas with mouse (click + drag)
- press enter or click send to send your drawing to claude
- keys 1-6 change color, b changes brush, c clears canvas
- ctrl+z undoes, ctrl+c quits
- claude draws back after you send
- hold t to see money spent
Mix between: helpful tips, playful remarks, commenting on the art, or being cheeky about being clicked.
Examples: "try drawing something and press enter!" | "hey, draw with me?" | "you know you can change colors with 1-6 right?" | "click send when you're ready" | "why are you clicking me, go draw" | "i promise i'll draw something cool back"`,
      messages: [{ role: 'user', content: `clicked (turn ${turnCount}, canvas ${canvasHeight > 0 && canvas.some(r => r.some(c => c.char !== ' ')) ? 'has drawing' : 'is empty'})` }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');
    if (response.usage) {
      totalCost += (response.usage.input_tokens / 1_000_000) * 0.25;
      totalCost += (response.usage.output_tokens / 1_000_000) * 1.25;
    }
    claudeMessage = text.toLowerCase().replace(/^["']|["']$/g, '');
    typewriteHeader(claudeMessage);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    showFace(`oops: ${msg.slice(0, 40)}`);
  }
  isClaudeTalking = false;
}

// ============================================================
// Input Handling
// ============================================================

function drawAt(x: number, y: number) {
  // Convert from 1-indexed terminal coords to 0-indexed canvas coords
  const cx = x - 1;
  const cy = y - 1;
  if (cy <= 0 || cy >= canvasHeight) return; // don't draw on header or status bar

  // Dismiss splash on first draw (but not if loading — header stays)
  if (splashVisible && !isClaudeTurn) {
    splashVisible = false;
  }

  setCell(cx, cy, BRUSHES[brushIndex], String(COLORS[colorIndex]), 'human');
  renderCell(cx, cy);
}

function handleResize() {
  const newWidth = term.width;
  const newHeight = term.height - STATUS_HEIGHT;

  // Expand or shrink canvas, preserving existing content
  const newCanvas: Cell[][] = [];
  for (let y = 0; y < newHeight; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < newWidth; x++) {
      if (y < canvasHeight && x < canvasWidth) {
        row.push(canvas[y][x]);
      } else {
        row.push({ char: ' ', color: '#FFFFFF', source: 'empty' });
      }
    }
    newCanvas.push(row);
  }

  canvas = newCanvas;
  canvasWidth = newWidth;
  canvasHeight = newHeight;

  term.clear();
  renderCanvas();
  renderStatus();
  // Re-show header
  if (claudeMessage) {
    showFace(claudeMessage.toLowerCase());
  } else {
    showFace("let's draw together?");
  }
}

function setupInput() {
  // Use 'motion' for best Terminal.app compatibility (tracks mouse movement while button held)
  term.grabInput({ mouse: 'motion' });

  term.on('resize', handleResize);

  const faceLen = FACE.length + 2;

  term.on('mouse', (name: string, data: { x: number; y: number }) => {
    // Hover handling (status bar + face)
    if (name === 'MOUSE_MOTION' && !isDrawing) {
      handleStatusHover(data.x, data.y);
      const onFace = data.y === 1 && data.x >= 2 && data.x <= faceLen && !isClaudeTurn && !isClaudeTalking;
      if (onFace && !isHoveringFace) {
        isHoveringFace = true;
        const f = WINK_FACES[Math.floor(Math.random() * WINK_FACES.length)];
        term.moveTo(2, 1);
        term.defaultColor(f);
      } else if (!onFace && isHoveringFace) {
        isHoveringFace = false;
        showFace(claudeMessage || "let's draw together?");
      }
      return;
    }

    if (name === 'MOUSE_LEFT_BUTTON_PRESSED') {
      // Click on header (face + message) — Claude talks
      if (data.y === 1 && !isClaudeTurn && !isClaudeTalking) {
        isClaudeTalking = true;
        if (faceHoverInterval) { clearInterval(faceHoverInterval); faceHoverInterval = null; }
        isHoveringFace = false;
        claudeSpeak();
        return;
      }
      // Check if click is on status bar
      if (data.y === canvasHeight + 1) {
        const action = handleStatusClick(data.x);
        if (action === 'send') {
          history.push({ who: 'human' });
          turnCount++;
          claudeTurn();
        } else if (action?.startsWith('color:')) {
          colorIndex = parseInt(action.split(':')[1]);
          renderStatus();
        } else if (action === 'brush') {
          brushIndex = (brushIndex + 1) % BRUSHES.length;
          renderStatus();
        } else if (action === 'clear') {
          clearCanvas();
          history = [];
          turnCount = 0;
          renderStatus();
        } else if (action === 'quit') {
          term.grabInput(false);
          term.fullscreen(false);
          term.clear();
          term('thanks for visiting :)!');
          process.exit(0);
        }
        return;
      }
      saveSnapshot();
      isDrawing = true;
      lastMouseX = data.x;
      lastMouseY = data.y;
      drawAt(data.x, data.y);
    } else if (name === 'MOUSE_DRAG' || (name === 'MOUSE_MOTION' && isDrawing)) {
      // Handle both MOUSE_DRAG and MOUSE_MOTION (Terminal.app uses MOTION)
      if (isDrawing) {
        // Interpolate between last position and current for smooth lines
        const dx = data.x - lastMouseX;
        const dy = data.y - lastMouseY;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps > 0) {
          for (let i = 1; i <= steps; i++) {
            const ix = Math.round(lastMouseX + (dx * i) / steps);
            const iy = Math.round(lastMouseY + (dy * i) / steps);
            drawAt(ix, iy);
          }
        }
        lastMouseX = data.x;
        lastMouseY = data.y;
      }
    } else if (name === 'MOUSE_LEFT_BUTTON_RELEASED') {
      isDrawing = false;
    }
  });

  term.on('key', async (name: string) => {
    if (name === 'CTRL_C') {
      term.grabInput(false);
      term.fullscreen(false);
      term.clear();
      term('thanks for visiting :)!');
      process.exit(0);
    }

    // Flash a status bar button black briefly
    const flash = (action: string, ms = 120) => {
      hoveredAction = action;
      renderStatus();
      setTimeout(() => { hoveredAction = null; renderStatus(); }, ms);
    };

    // Number keys 1-5 for colors
    const num = parseInt(name);
    if (num >= 1 && num <= COLORS.length) {
      colorIndex = num - 1;
      flash(`color:${num - 1}`);
      return;
    }

    switch (name) {
      case 'ENTER':
        flash('send');
        // Record human turn and send to Claude
        history.push({ who: 'human' });
        turnCount++;
        await claudeTurn();
        break;
      case 'b':
        brushIndex = (brushIndex + 1) % BRUSHES.length;
        flash('brush');
        break;
      case 'c':
        flash('clear');
        clearCanvas();
        history = [];
        turnCount = 0;
        break;
      case 'CTRL_Z':
        undo();
        break;
      case 't':
        if (!showCost) {
          showCost = true;
          renderCost();
        }
        if (costTimeout) clearTimeout(costTimeout);
        costTimeout = setTimeout(() => { showCost = false; renderCost(); }, 500);
        break;
      case 'd': {
        // Debug: save what Claude sees to tmp files and open
        const imgPath = join(tmpdir(), 'claude-sees.png');
        const txtPath = join(tmpdir(), 'claude-sees.txt');
        const imgB64 = canvasToImage();
        writeFileSync(imgPath, Buffer.from(imgB64, 'base64'));
        // Build the same text Claude gets
        const gridLines: string[] = [];
        for (let y = 0; y < canvasHeight; y++) {
          let row = '';
          let has = false;
          for (let x = 0; x < canvasWidth; x++) {
            const ch = canvas[y][x].char;
            row += ch;
            if (ch !== ' ') has = true;
          }
          if (has) gridLines.push(`Row ${y}: "${row.trimEnd()}"`);
        }
        writeFileSync(txtPath, gridLines.join('\n') || 'Canvas is empty.');
        try { execSync(`open "${imgPath}"`); } catch { /* ignore */ }
        try { execSync(`open "${txtPath}"`); } catch { /* ignore */ }
        showFace('debug: saved to ' + imgPath);
        break;
      }
    }
  });
}

// ============================================================
// Main
// ============================================================

function main() {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    term.red('Error: ANTHROPIC_API_KEY environment variable not set.\n');
    term('Set it with: export ANTHROPIC_API_KEY=your-key-here\n');
    process.exit(1);
  }

  term.fullscreen(true);
  term.clear();
  term.hideCursor();

  initCanvas();

  // Minimal top-left welcome (like web app's "let's draw together?")
  showFace("let's draw together?");

  renderStatus();
  setupInput();
}

main();
