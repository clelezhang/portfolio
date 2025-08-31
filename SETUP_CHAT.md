# Chat Setup Instructions

## Environment Variable Setup

To enable the chat functionality with Claude API, you need to set up your Anthropic API key:

1. **Get your Anthropic API Key:**
   - Go to [Anthropic Console](https://console.anthropic.com/)
   - Create an account or log in
   - Navigate to API keys section
   - Create a new API key

2. **Set up environment variables:**
   - Create a `.env.local` file in the project root (or update existing one)
   - Add your API key:
     ```
     ANTHROPIC_API_KEY=your_actual_api_key_here
     ```

3. **For rate limiting (optional in development):**
   - **Development**: Rate limiting is automatically disabled without KV setup
   - **Production**: You'll need Vercel KV for rate limiting to work
   - To set up KV: Go to Vercel dashboard → Storage → Create KV Database
   - Add to `.env.local`:
     ```
     KV_REST_API_URL=your_vercel_kv_url
     KV_REST_API_TOKEN=your_vercel_kv_token
     ```

4. **For deployment on Vercel:**
   - Deploy normally - KV database can be created after deployment
   - Add environment variables in Vercel project settings

## What's been implemented:

✅ **Advanced API Route** (`/src/app/api/chat/route.ts`):
- Handles POST requests to `/api/chat` with streaming responses
- **Origin Validation**: Strict allowlist-based CORS protection
- **Rate Limiting**: Simple limit (30 messages/hour per visitor)
- **Personality System**: Lele's character and communication style
- **Smart Streaming**: Enhanced chunking for smooth text delivery
- **Edge Runtime**: Optimized for performance

✅ **Security System** (`/src/app/lib/security.ts`):
- Origin validation against strict allowlist
- Visitor ID generation for anonymous tracking
- CORS headers with security-first approach

✅ **Rate Limiting** (`/src/app/lib/rate-limit.ts`):
- Simple 30 messages/hour limit per visitor
- Vercel KV storage for production (optional in development)
- Graceful degradation if rate limiting fails

✅ **Personality Prompts** (`/src/app/lib/prompts.ts`):
- Comprehensive personality definition for Lele Zhang
- Context-aware responses based on card interactions
- Authentic communication style and values

✅ **Enhanced Chat Hook** (`/src/app/hooks/useChat.ts`):
- Card context support for personalized responses
- Improved error handling with rate limit awareness
- Streaming text consumption with better UX

✅ **Updated Portfolio Component**:
- Card interactions trigger contextual AI responses
- Maintains all existing drag & drop functionality
- Enhanced error states and loading indicators

## Testing:

1. Start the development server: `npm run dev`
2. Add your API key to `.env.local`
3. Try sending a message or dragging a card to start a conversation
4. The chat should now use real Claude API responses instead of mock data

## Features:

- **Streaming responses**: Messages appear as they're being generated
- **Error handling**: Shows error messages if API calls fail
- **Loading states**: Shows typing indicator while waiting for responses
- **Card integration**: Dragging cards still triggers contextual questions
