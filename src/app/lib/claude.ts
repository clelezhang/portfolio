import { Message } from './types';

// Extract all bookmarked content from messages
function extractBookmarks(messages: Message[]): string[] {
  const bookmarks: string[] = [];

  for (const message of messages) {
    // Use regex to find all <mark>content</mark> tags
    const markRegex = /<mark[^>]*>(.*?)<\/mark>/g;
    let match;

    while ((match = markRegex.exec(message.content)) !== null) {
      const bookmarkText = match[1].trim();
      if (bookmarkText && !bookmarks.includes(bookmarkText)) {
        bookmarks.push(bookmarkText);
      }
    }
  }

  return bookmarks;
}

export async function generateClaudeResponse(
  messages: Message[],
  searchResults?: { query: string; results: any[] },
  queueMode?: boolean,
  queueTopic?: string
): Promise<AsyncGenerator<string, void, unknown>> {
  // This function should only be used on the server side
  if (typeof window !== 'undefined') {
    throw new Error('Claude API should only be called from server side');
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // Extract bookmarks from all messages
  const bookmarks = extractBookmarks(messages);

  // Build system message components
  const systemParts: string[] = [];

  // Add queue mode instructions if enabled
  if (queueMode && queueTopic) {
    systemParts.push(`Focus ONLY on: "${queueTopic}"

Keep this response SHORT and to-the-point (aim for 10-125 words max). Cover just the essentials for "${queueTopic}" without going into excessive detail. Other aspects will be covered in separate responses.`);
  }

  // Add bookmarks if any exist
  if (bookmarks.length > 0) {
    systemParts.push(`The user has highlighted/bookmarked these important parts of our conversation:

${bookmarks.map((bookmark, index) => `${index + 1}. "${bookmark}"`).join('\n')}

Please reference and build upon these highlighted points when relevant to provide more contextual and helpful responses.`);
  }

  // Add search results if any exist
  if (searchResults && searchResults.results.length > 0) {
    const searchContext = `I've searched the web for: "${searchResults.query}"

Here are the most relevant results:

${searchResults.results.map((result, idx) => `
[${idx + 1}] ${result.title}
    URL: ${result.url}
    ${result.highlights && result.highlights.length > 0 ? `Key excerpts:\n    - ${result.highlights.join('\n    - ')}` : ''}
`).join('\n')}

CITATION FORMAT RULES:

When citing sources, you MUST follow these exact rules:

1. CITATION PLACEMENT: Place [1], [2] IMMEDIATELY AFTER punctuation (period, comma, colon, etc.)
   ✓ CORRECT: "Barrier methods have virtually no systemic side effects.[1]"
   ✓ CORRECT: "If you prefer hormonal methods,[2] these tend to cause fewer side effects."
   ✗ WRONG: "Barrier methods [1] have virtually no systemic side effects."
   ✗ WRONG: "Barrier methods have virtually no systemic side effects [1]."

   The citation number should appear DIRECTLY after the punctuation mark with NO space: "sentence.[1]" not "sentence. [1]" or "sentence [1]."

2. WHEN TO CITE:
   - Cite when first introducing information from a source
   - For lists/bullet points from the same source, cite ONCE (either in the intro sentence or after the last bullet)
   - Don't repeat the same citation number multiple times in a row

3. INLINE LINKS: Use {term:url} sparingly for important technical terms
   Example: "The {IUD:https://example.com} is a long-term option."

Do NOT include a sources list at the end. Just use inline citations throughout your response.`;

    systemParts.push(searchContext);
  }

  const systemMessage = systemParts.join('\n\n---\n\n');

  const anthropicMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: anthropicMessages,
    ...(systemMessage && { system: systemMessage }),
  });

  async function* streamResponse() {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  return streamResponse();
}

export function createMessage(role: 'user' | 'assistant', content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
  };
}
