export type Stage = {
  id: string;
  title: string;
  description: string;
  commitHash: string;
  embedUrl?: string;
  videoUrl?: string;
};

export const stages: Stage[] = [
  {
    id: 'v1-first-prototype',
    title: 'First Prototype',
    description: 'Basic canvas where Claude could draw simple shapes in response to your drawings.',
    commitHash: 'placeholder',
  },
  {
    id: 'v2-turn-based',
    title: 'Turn-Based Drawing',
    description: 'Introduced the turn-based system — draw, then watch Claude respond.',
    commitHash: 'placeholder',
  },
  {
    id: 'v3-ascii-art',
    title: 'ASCII Art Mode',
    description: 'Claude learned to render ASCII text blocks on the canvas.',
    commitHash: 'placeholder',
  },
  {
    id: 'v4-narration',
    title: 'Narration System',
    description: 'Claude started narrating its reasoning, observations, and intentions.',
    commitHash: 'placeholder',
  },
  {
    id: 'v5-visual-effects',
    title: 'Visual Effects',
    description: 'Added wobbly lines, distortion effects, and playful visual styles.',
    commitHash: 'placeholder',
  },
  {
    id: 'v6-interaction-styles',
    title: 'Interaction Styles',
    description: 'Claude detects whether you\'re being collaborative, playful, or adversarial.',
    commitHash: 'placeholder',
  },
  {
    id: 'v7-multi-ai',
    title: 'Multi-AI Backends',
    description: 'Added Gemini and Kimi alongside Claude for different drawing styles.',
    commitHash: 'placeholder',
  },
  {
    id: 'v8-current',
    title: 'Current Version',
    description: 'Comments, cloud save, and the full collaborative drawing experience.',
    commitHash: 'HEAD',
    embedUrl: '/draw',
  },
];
