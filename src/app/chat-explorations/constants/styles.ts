// Base style tokens
const baseText = {
  color: 'var(--color-black)',
  letterSpacing: '-0.02em'
} as const;

const baseBodyWithLineHeight = {
  ...baseText,
  lineHeight: 1.5
} as const;

// Paragraph style variants
type ParagraphVariant = {
  marginBottom: string;
};

const paragraphVariants: Record<string, ParagraphVariant> = {
  default: { marginBottom: '1rem' },
  tight: { marginBottom: '.5rem' },
  withLineHeight: { marginBottom: '0.5rem' },
  large: { marginBottom: '2rem' },
  spaced: { marginBottom: '1.5rem' },
  final: { marginBottom: '5rem' },
} as const;

// Helper to create paragraph styles
const createParagraphStyle = (variant: keyof typeof paragraphVariants) => ({
  ...baseBodyWithLineHeight,
  ...paragraphVariants[variant],
});

// Consolidated style objects
export const styles = {
  h1: {
    ...baseText,
    fontSize: '1.25rem',
    fontWeight: 400,
  },
  h2: {
    ...baseText,
    fontFamily: 'var(--font-caveat)',
    letterSpacing: '-0.02em',
    fontWeight: 500,
    fontSize: '1.75rem',
    marginBottom: '.25rem',
    textTransform: 'lowercase' as const
  },
  h3: {
    fontFamily: 'var(--font-caveat)',
    fontSize: '1.5rem',
    fontWeight: 500,
    marginBottom: '.25rem',
    color: 'var(--color-accentgray)',
    letterSpacing: '-0.02em',
    textTransform: 'lowercase' as const
  },
  date: {
    fontFamily: 'var(--font-caveat)',
    fontSize: '1.5rem',
    fontWeight: 400,
    color: 'var(--color-accentgray)',
    letterSpacing: '-0.02em',
    lineHeight: 1,
    textTransform: 'lowercase' as const
  },
  p: {
    ...baseBodyWithLineHeight,
    marginBottom: '0.5rem'
  },
  pTight: createParagraphStyle('tight'),
  pLarge: createParagraphStyle('large'),
  pSpaced: createParagraphStyle('spaced'),
  pFinal: createParagraphStyle('final'),
} as const;

// Layout constants
export const LAYOUT = {
  TEXT_MAX_WIDTH: '600px',
  PAGE_PADDING_TOP: '12rem',
  PAGE_PADDING_SIDE: '1rem',
  PAGE_PADDING_BOTTOM: '3rem',
  MAX_CONTENT_WIDTH: '1080px',
} as const;
