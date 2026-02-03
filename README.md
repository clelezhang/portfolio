# Portfolio

Personal portfolio and experimental projects.

## Projects

### `/draw` - Collaborative Drawing with Claude
An interactive canvas where humans and Claude take turns drawing together.

**Features:**
- Turn-based drawing: human draws, then Claude responds with shapes and ASCII art
- Interaction styles: Claude detects if you're collaborative or playful/adversarial
- Visual effects: wobbly hand-drawn aesthetic with customizable distortion
- Multiple tools: pen, eraser, ASCII stamps, color palettes
- AI narration: Claude explains what it sees and its intentions
- Comments: leave notes on the canvas for Claude to respond to

**AI Backends:** Claude (primary), Gemini, Kimi

**Auth & Storage** (requires Supabase setup):
- Google OAuth sign-in
- Save/load drawings to cloud
- User-provided API keys

### `/chat-explorations`
Experimental chat interfaces and demos.

### `/pearl`
Interactive pearl animation.

### `/expandable-text`
Text expansion with AI.

### `/sky-clock`
Visual clock component.

## Tech Stack
- Next.js 15 (App Router, Turbopack)
- Tailwind CSS 4
- Anthropic SDK, Google Generative AI
- Supabase (auth/db)
- Framer Motion, Three.js

## Development

```bash
npm install
npm run dev
```

## Environment Variables

```bash
# Required for /draw
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# Optional - for auth & cloud save
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Supabase Setup (Optional)

1. Create project at [supabase.com](https://supabase.com)
2. Run SQL: `src/lib/supabase/schema.sql`
3. Enable Google OAuth in Supabase dashboard
4. Add env variables
