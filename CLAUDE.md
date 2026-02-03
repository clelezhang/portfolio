# Claude Code Instructions

## Project Overview
Personal portfolio with experimental projects. Main feature is `/draw` - a collaborative drawing app with Claude.

## Key Directories
- `src/app/draw/` - Main drawing app (page.tsx is large ~2500 lines)
- `src/app/api/draw/` - Claude drawing API endpoint
- `src/lib/supabase/` - Auth and database (hooks, types, schema)
- `src/app/draw/components/auth/` - UserMenu, ApiKeyModal, DrawingsPanel

## Development Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npx tsc --noEmit # Type check
```

## Current Status

### Draw App Features
- Turn-based human + Claude drawing
- Interaction style detection (collaborative/playful/adversarial)
- Claude narration (reasoning, observation, intention)
- Visual effects (wobbly lines, distortion)
- Comments system
- Multiple AI backends (Claude, Gemini, Kimi)

### Auth System (Supabase)
**Status: Code complete, optional**
- Google OAuth setup
- Cloud save/load drawings
- User API key storage
- App works without Supabase configured (auth UI hidden, features disabled)
- To enable: create Supabase project, add env vars, run schema.sql

### Pending Setup
User needs to:
1. Create Supabase project
2. Run `src/lib/supabase/schema.sql`
3. Enable Google OAuth in Supabase
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to env

## Important Patterns

### Type Assertions for Supabase
Tables use `as never` assertions until Supabase types are generated:
```typescript
.insert({ user_id: user.id, name, data } as never)
```

### Draw API Structure
The `/api/draw` endpoint:
- Receives combined canvas image (human + Claude drawings)
- Returns streaming JSON with shapes, ASCII blocks, narration
- Supports user-provided API keys via `userApiKey` param

### Cost/Speed Optimizations
- **Image compression**: JPEG at 0.7 quality, max 1200px (saves ~60% on image tokens)
- **Prompt caching**: System prompt uses `cache_control: ephemeral` (saves ~90% after first request)
- **Adaptive max_tokens**: ASCII=512, shapes=640, all=768 (reduces output overhead)

## Maintenance

### Keep README.md Updated
When adding features or changing project structure, update README.md to reflect:
- New routes/features
- Changed environment variables
- New setup requirements

### Keep This File Updated
Update CLAUDE.md when:
- Project status changes (e.g., auth gets configured)
- New patterns or conventions are established
- Important architectural decisions are made
