# Chat Setup Instructions

## Environment Variable Setup

To enable the chat functionality with Claude API, you need to set up your Anthropic API key:

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

## What gets saved:
  - User messages with visitor ID, timestamp, text, and any
  card context
  - Assistant responses with the same info
  - Messages are grouped by visitor ID

  To view your saved messages:
  1. Set an ADMIN_KEY environment variable in Vercel
  2. Access:
  https://yoursite.com/api/admin/messages?key=YOUR_SECRET_KEY

  To set up Vercel KV:
  1. Go to your Vercel dashboard
  2. Select your project → Storage tab
  3. Create a KV database
  4. It will auto-connect to your project

  The messages will persist across deployments and you can view
   them anytime through the admin endpoint or directly in the
  Vercel KV browser in your dashboard.
