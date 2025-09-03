// Animation and layout constants for the portfolio

// Animation and layout constants
export const ANIMATION_CONSTANTS = {
  SNAP_POINT_PADDING: 128,
  CARD_CONTAINER_HEIGHT: 850,
  ENVELOPE_MAX_WIDTH: 600,
  ENVELOPE_BODY_HEIGHT: 375,
  DRAG_THROTTLE_MS: 16, // ~60fps
  FADE_OUT_DURATION: 600,
  PULL_ANIMATION_DURATION: 600,
  REAPPEAR_DELAY: 100,
  BOUNCE_DURATION: 200,
} as const;

// Card positioning configuration
export const CARD_SCATTERED_POSITIONS = [
  { x: -450, y: 30, rotate: 12, z: 1 },   // apps - far left
  { x: -350, y: -10, rotate: 4, z: 2 },   // house - top center
  { x: -250, y: 50, rotate: -25, z: 3 },  // apple - right
  { x: -175, y: -60, rotate: -15, z: 4 }, // cyanotype - left
  { x: -20, y: -10, rotate: -3, z: 9 },   // journal - center left
  { x: 175, y: -50, rotate: 8, z: 6 },    // charcuterie - center right
  { x: 245, y: 20, rotate: 5, z: 8 },     // family - upper far left
  { x: 360, y: 60, rotate: 16, z: 7 },    // lilypad - far right
  { x: 475, y: -30, rotate: -5, z: 5 }    // friend - upper right
] as const;
