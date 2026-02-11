// Draw page constants

export const COLOR_PALETTES = [
  ['#A6CADD', '#5F9FB8', '#25667F', '#51241A'], // Denim: light blue, blue, teal, brown
  ['#FDCDED', '#F793D1', '#50AF5B', '#0D7248'], // Garden: light pink, pink, green, dark green
  ['#8FCE42', '#FC541A', '#C71B00', '#600000'], // Warm: lime, orange-red, red, maroon
  ['#FECCFA', '#B1F2B7', '#ACDAFF', '#A9BFFD'], // Pastel: pink, mint, sky, lavender
  ['#FECC2D', '#F3381A', '#0260CB', '#000000'], // Primary: yellow, orange, blue, black
  ['#DFFC00', '#C7CFD6', '#929DAC', '#4E5872'], // Neon gray: yellow-green, grays
] as const;

export const ASCII_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~*+=#@$%&!?<>^.:;-_/\\|[]{}()░▒▓█●○◐◑▲▼◆◇■□★☆♦♣♠♥∞≈≠±×÷«»¤¶§†‡';

export const COMMENT_DOT_SIZE = 10;
export const COMMENT_HIT_AREA_SIZE = 36;

export const DEFAULT_STROKE_SIZE = 6;
export const DEFAULT_GRID_SIZE = 32;
export const DEFAULT_DOT_SIZE = 20;

export const DEFAULT_PROMPT = `You are claude, drawing with a human. The canvas shows what exists so far. Ignore the grid/dots background pattern - it's just a visual aid. You and the human can also use comments.

Available to you:
- Draw svgs/shapes (paths, circles, lines, rectangles, curves)
- Draw text/ASCII art
- Leave a comment/question/suggestion  (set say, sayX, sayY)
- Express a wish for the collaboration (set wish)

You can: draw shapes, draw text, comment, or express a wish.`;

export const AUTO_DRAW_DELAY = 3000;
export const AUTO_DRAW_MIN_INTERVAL = 10000; // Minimum 10s between auto-draws
export const WIGGLE_SPEED = 168;
export const DISTORTION_AMOUNT = 2;

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;

export const DEFAULT_PAN_SENSITIVITY = 1.1;
export const DEFAULT_ZOOM_SENSITIVITY = 1.1;

// UI interaction thresholds
export const DRAG_THRESHOLD = 5; // Minimum pixel distance before drag is recognized
export const LOCALSTORAGE_DEBOUNCE_MS = 500; // Debounce delay for localStorage saves
export const ANIMATION_FRAME_DELAY_MS = 15; // Base delay between animation frames
export const CURSOR_HIDE_CHECK_INTERVAL_MS = 50; // Polling interval to check if Claude cursor should hide

// Shared tooltip styling for BaseUI StatefulTooltip
export const TOOLTIP_OVERRIDES = {
  Body: {
    style: {
      backgroundColor: '#1a1a1a',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 500,
      zIndex: 1000,
    },
  },
  Inner: {
    style: {
      backgroundColor: '#1a1a1a',
      color: '#fff',
      padding: '6px 10px',
    },
  },
  Arrow: {
    style: {
      backgroundColor: '#1a1a1a',
    },
  },
} as const;
