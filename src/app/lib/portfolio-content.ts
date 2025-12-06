/**
 * Portfolio content fetcher for the AI assistant
 * Fetches real content from the portfolio website pages
 */

// Available portfolio pages that can be fetched
export const PORTFOLIO_PAGES = {
  home: '/',
  pearl: '/pearl',
} as const;

export type PortfolioPageId = keyof typeof PORTFOLIO_PAGES;

/**
 * Fetch and extract text content from a portfolio page
 * This is called server-side to get the actual rendered content
 */
export async function fetchPortfolioPage(pageId: PortfolioPageId, baseUrl: string): Promise<string> {
  const path = PORTFOLIO_PAGES[pageId];
  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      return `Error fetching ${pageId} page: ${response.status}`;
    }

    const html = await response.text();

    // Extract text content from HTML (simple extraction)
    const textContent = extractTextFromHtml(html);
    return textContent;
  } catch (error) {
    return `Error fetching ${pageId} page: ${error}`;
  }
}

/**
 * Simple HTML to text extraction
 * Removes scripts, styles, and HTML tags while preserving text
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags and their content
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  // Remove HTML tags but keep text content
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Get list of available pages the assistant can read
 */
export function getAvailablePages(): string[] {
  return Object.keys(PORTFOLIO_PAGES);
}
