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

// Detect dark/light terminal — check macOS dark mode, then COLORFGBG env
function isDarkTerminal(): boolean {
  try {
    execSync('defaults read -g AppleInterfaceStyle', { stdio: 'pipe' });
    return true; // "Dark" returned = dark mode
  } catch {
    return false; // command fails = light mode
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

const COLORS = [IS_DARK ? '#FFFFFF' : '#000000', '#0260CB', '#50AF5B', '#F3381A', '#FC6D1A', '#FECC2D'];
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

// ============================================================
// Header (top-left Claude message, like the web app)
// ============================================================

const FACE = '( ◕ ‿ ◕ )';
const SPINNER_FRAMES = ['( ◐ ‿ ◐ )', '( ◓ ‿ ◓ )', '( ◑ ‿ ◑ )', '( ◒ ‿ ◒ )'];
let spinnerIndex = 0;

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
  } else {
    term.colorRgbHex(cell.color, cell.char);
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
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      canvas[y][x] = { char: ' ', color: '#FFFFFF', source: 'empty' };
    }
  }
  renderCanvas();
  renderStatus();
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
}

// ============================================================
// Canvas → Text Description (for Claude)
// ============================================================

function canvasToDescription(): string {
  const lines: string[] = [];
  const nonEmptyRows: { y: number; segments: string }[] = [];

  for (let y = 0; y < canvasHeight; y++) {
    let rowDesc = '';
    let runStart = -1;
    let runChar = '';
    let runColor = '';
    let runSource = '';

    const flushRun = () => {
      if (runStart >= 0 && runChar !== ' ') {
        const src = runSource === 'claude' ? 'C' : 'H';
        const len = rowDesc ? 1 : 1; // just note position
        void len;
        rowDesc += `[${runStart}:${runChar}${runChar.length > 1 ? '' : ''}(${src})] `;
      }
    };

    for (let x = 0; x < canvasWidth; x++) {
      const cell = canvas[y][x];
      if (cell.char !== runChar || cell.color !== runColor || cell.source !== (runSource as Cell['source'])) {
        flushRun();
        runStart = x;
        runChar = cell.char;
        runColor = cell.color;
        runSource = cell.source;
      }
    }
    flushRun();

    if (rowDesc.trim()) {
      nonEmptyRows.push({ y, segments: rowDesc.trim() });
    }
  }

  if (nonEmptyRows.length === 0) {
    return `<terminal-canvas width="${canvasWidth}" height="${canvasHeight}">\nCanvas is empty.\n</terminal-canvas>`;
  }

  lines.push(`<terminal-canvas width="${canvasWidth}" height="${canvasHeight}">`);
  for (const row of nonEmptyRows) {
    lines.push(`  row ${row.y}: ${row.segments}`);
  }
  lines.push('</terminal-canvas>');
  return lines.join('\n');
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

  // Send button
  const sendText = ' [⏎]send  ';
  statusHitZones.push({ x1: col, x2: col + sendText.length - 1, action: 'send' });
  if (hoveredAction === 'send') {
    term.defaultColor(sendText);
  } else {
    term.gray(sendText);
  }
  col += sendText.length;

  // Color swatches (hover brackets)
  for (let i = 0; i < COLORS.length; i++) {
    const num = String(i + 1);
    const c = COLORS[i];
    const action = `color:${i}`;
    const hovered = hoveredAction === action;
    const selected = i === colorIndex;
    statusHitZones.push({ x1: col, x2: col + 2, action });
    if (selected) {
      term.colorRgbHex(c, '[');
      term.colorRgbHex(c, num);
      term.colorRgbHex(c, ']');
    } else if (hovered) {
      term.gray('[');
      term.colorRgbHex(c, num);
      term.gray(']');
    } else {
      term(' ');
      term.colorRgbHex(c, num);
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
    term.colorRgbHex(color, brush);
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

  // Quit (not clickable)
  term.gray('  [ctrl c]quit');
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
Palette: #000000 black, #0260CB blue, #50AF5B green, #F3381A red, #FC6D1A orange, #FECC2D yellow
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
Output a single JSON object (no markdown, no backticks):
{
  "drawing": "short summary with ASCII art",
  "interactionStyle": "collaborative" or "playful",
  "blocks": [
    { "block": "★", "x": 10, "y": 5, "color": "#EAB308" },
    { "block": "~~~", "x": 5, "y": 20, "color": "#3B82F6" }
  ],
  "loadingMessages": ["5 short whimsical messages with ASCII/unicode art (see <style>). vary wildly."]
}
</output-format>`;
}

async function claudeTurn() {
  isClaudeTurn = true;
  claudeMessage = '';
  renderStatus();
  startLoadingCycle();

  const canvasDesc = canvasToDescription();

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

  const userMessage = `Here's the current terminal canvas state:

${canvasDesc}
${historyText}

It's your turn to draw! Add something creative to the canvas. Remember: output ONLY valid JSON.`;

  saveSnapshot();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: turnCount <= 3 ? 1.0 : 0.7,
      system: getSystemPrompt(),
      messages: [{ role: 'user', content: userMessage }],
    });

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
// Input Handling
// ============================================================

function drawAt(x: number, y: number) {
  // Convert from 1-indexed terminal coords to 0-indexed canvas coords
  const cx = x - 1;
  const cy = y - 1;
  if (cy >= canvasHeight) return; // don't draw on status bar

  // Dismiss splash on first draw (but not if loading — header stays)
  if (splashVisible && !isClaudeTurn) {
    splashVisible = false;
  }

  setCell(cx, cy, BRUSHES[brushIndex], COLORS[colorIndex], 'human');
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

  term.on('mouse', (name: string, data: { x: number; y: number }) => {
    // Always allow hover on status bar
    if (name === 'MOUSE_MOTION' && !isDrawing) {
      handleStatusHover(data.x, data.y);
      return;
    }

    if (name === 'MOUSE_LEFT_BUTTON_PRESSED') {
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

    // Number keys 1-7 for colors
    const num = parseInt(name);
    if (num >= 1 && num <= 6) {
      colorIndex = num - 1;
      renderStatus();
      return;
    }

    switch (name) {
      case 'ENTER':
        // Record human turn and send to Claude
        history.push({ who: 'human' });
        turnCount++;
        await claudeTurn();
        break;
      case 'b':
        brushIndex = (brushIndex + 1) % BRUSHES.length;
        renderStatus();
        break;
      case 'c':
        clearCanvas();
        history = [];
        turnCount = 0;
        renderStatus();
        break;
      case 'CTRL_Z':
        undo();
        break;
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
