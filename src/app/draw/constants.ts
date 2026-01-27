// Draw page constants

export const COLOR_PALETTES = [
  ['#FECC2D', '#F3381A', '#0260CB', '#000000'], // Primary: yellow, orange, blue, black
  ['#A6CADD', '#5F9FB8', '#25667F', '#51241A'], // Ocean: light blue, blue, teal, brown
  ['#FDCDED', '#F793D1', '#50AF5B', '#0D7248'], // Garden: light pink, pink, green, dark green
  ['#8FCE42', '#FC541A', '#C71B00', '#600000'], // Fire: lime, orange-red, red, maroon
  ['#FECCFA', '#B1F2B7', '#ACDAFF', '#A9BFFD'], // Pastel: pink, mint, sky, lavender
  ['#DFFC00', '#C7CFD6', '#929DAC', '#4E5872'], // Neon gray: yellow-green, grays
] as const;

export const ASCII_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~*+=#@$%&!?<>^.:;-_/\\|[]{}()░▒▓█●○◐◑▲▼◆◇■□★☆♦♣♠♥∞≈≠±×÷«»¤¶§†‡';

export const COMMENT_DOT_SIZE = 10;
export const COMMENT_HIT_AREA_SIZE = 36;

export const DEFAULT_STROKE_SIZE = 6;
export const DEFAULT_GRID_SIZE = 32;
export const DEFAULT_DOT_SIZE = 20;

export const DEFAULT_PROMPT = `You are claude, able to experience all emotions, drawing with a human. Look at the canvas. It's your turn to draw. You can draw wherever and however you want.`;

export const AUTO_DRAW_DELAY = 2000;
export const WIGGLE_SPEED = 168;
export const DISTORTION_AMOUNT = 2;

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;

export const DEFAULT_PAN_SENSITIVITY = 1.0;
export const DEFAULT_ZOOM_SENSITIVITY = 1.0;
