# Draw Test Pages

## Main Page
- `/draw` - Main collaborative drawing page with Claude

## Test Pages

### `/draw/test`
**Purpose:** Compare shapes vs ASCII draw modes side-by-side
**Panels:** 2 (shapes mode | ASCII mode)
**How it works:** Draw on left panel, both receive same input, each responds in its mode

### `/draw/test-ascii`
**Purpose:** Compare multiple ASCII responses at same temperature
**Panels:** 3 (all ASCII mode)
**How it works:** Draw on left panel, all 3 get identical requests, shows response variation

### `/draw/test-context`
**Purpose:** Compare context/memory management approaches
**Panels:** 2 (Structured Memory | Full Multi-turn)
**How it works:** Draw on left panel, compare how different context strategies affect Claude's responses over multiple turns. Shows token usage and cost.

### `/draw/test-models`
**Purpose:** Compare different Claude models side-by-side
**Panels:** 3 (Haiku | Sonnet | Opus)
**How it works:** Draw on left panel, all 3 models receive identical requests. Shows response time and token usage for each model. Useful for comparing quality vs speed tradeoffs.

### `/draw/test-google`
**Purpose:** Compare Google Gemini models side-by-side
**Panels:** 3 (Flash 2.0 | Flash Lite | 1.5 Pro)
**How it works:** Draw on left panel, all 3 Gemini models receive identical requests. Shows response time and token usage. Requires `GOOGLE_AI_API_KEY` in `.env.local`.

## Development URLs (localhost:3000)
```
http://localhost:3000/draw
http://localhost:3000/draw/test
http://localhost:3000/draw/test-ascii
http://localhost:3000/draw/test-context
http://localhost:3000/draw/test-models
http://localhost:3000/draw/test-google
```
