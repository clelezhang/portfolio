import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { content, preserveBookmarks = true }: { content: string; preserveBookmarks?: boolean } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // Extract bookmarks if preserveBookmarks is true
    const bookmarks: string[] = [];
    if (preserveBookmarks) {
      const markRegex = /<mark[^>]*>(.*?)<\/mark>/g;
      let match;
      while ((match = markRegex.exec(content)) !== null) {
        bookmarks.push(match[1].trim());
      }
    }

    // Create summarization prompt
    const systemPrompt = `You are a helpful assistant that creates concise, adaptive summaries of messages.

            ALWAYS start with a heading that captures the message type and context, then provide the summary content.

            Format:
            ## [Message Type/Context]
            [Summary content]

            **Message type examples:**
            - "## Advice: Portfolio Strategy"
            - "## Rewrite: Design Process"
            - "## Feedback: Application Draft"
            - "## Question: Job Application Help"
            - "## Explanation: API Integration"
            - "## Response: Design Critique"

            Summary rules:
            - **Maximum 2 sentences OR 3 bullet points** - never both
            - **Use bullets if more than 2 sentences needed**
            - **No paragraphs or blocks of text**
            - **Be extremely concise** - cut all filler words

            CRITICAL: When you encounter bookmarked content (text wrapped in <mark> tags), include it EXACTLY as it appears in the original context. Never move or modify bookmarked content.

            ${preserveBookmarks && bookmarks.length > 0 ?
            `\nBookmarked content to preserve exactly: ${bookmarks.map(b => `"${b}"`).join(', ')}` :
            ''}

            Format examples:

            Example 1:
            ## Advice: Portfolio Strategy
            Lead with AI/tech work and emphasize <mark>user empathy with craft</mark>. Show startup experience for fast-paced role.

            Example 2:
            ## Feedback: Design Process
            - Sounds too academic, needs concrete examples
            - Add specific tools/methods you actually use
            - Mention validation before shipping

            Guidelines:
            - Always include heading with message type/context
            - Never exceed 2 sentences or 3 bullets
            - Cut all unnecessary words
            - Preserve ALL <mark> tags exactly where they appear

            Return only the formatted summary with heading.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please summarize this message:\n\n${content}`
        }
      ],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : '';

    // Determine if message needs summarization (longer than 300 chars and not mostly bookmarks)
    const needsSummary = content.length > 300 && (bookmarks.join('').length / content.length) < 0.8;

    return NextResponse.json({
      summary,
      needsSummary,
      bookmarks
    });

  } catch (error) {
    console.error('Error in summarize API:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
