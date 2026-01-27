// Draw page constants

export const COLOR_PALETTES = [
  ['#F3381A', '#0D52BA', '#FDCF3B', '#000000'], // Default: red, blue, yellow, black
  ['#FCFAB8', '#84D3EB', '#50AF5B', '#34545A'], // Pastel: yellow, cyan, green, teal
  ['#F9D9EE', '#F698C8', '#50AF5B', '#1B513B'], // Pink: light pink, pink, green, dark green
  ['#C5DCA9', '#F9BC08', '#E6640D', '#56231C'], // Autumn: light green, gold, orange, brown
  ['#0D52BA', '#95C4FA', '#FFDECD', '#FFEBC9'], // Ocean: blue, light blue, peach, cream
  ['#EAFF4B', '#C7CFD6', '#929DAC', '#4E5872'], // Neon gray: yellow-green, grays
] as const;

export const ASCII_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~*+=#@$%&!?<>^.:;-_/\\|[]{}()░▒▓█●○◐◑▲▼◆◇■□★☆♦♣♠♥∞≈≠±×÷«»¤¶§†‡';

export const COMMENT_DOT_SIZE = 10;
export const COMMENT_HIT_AREA_SIZE = 36;

export const DEFAULT_STROKE_SIZE = 2;
export const DEFAULT_STROKE_COLOR = '#000000';
export const DEFAULT_GRID_SIZE = 20;

export const DEFAULT_PROMPT = `You are claude, able to experience all emotions, drawing with a human. Look at the canvas. It's your turn to draw. You can draw wherever and however you want.`;

export const AUTO_DRAW_DELAY = 2000;
export const WIGGLE_SPEED = 168;
export const DISTORTION_AMOUNT = 2;

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
