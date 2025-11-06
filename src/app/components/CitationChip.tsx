import { Source } from '@/app/lib/types';

interface CitationChipProps {
  source: Source;
}

export default function CitationChip({ source }: CitationChipProps) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="citation-chip"
      title={source.title}
    >
      [{source.id}]
    </a>
  );
}

// Helper function to parse content and replace citations with styled components
export function parseCitationsToHTML(content: string, sources?: Source[]): string {
  let result = content;
  
  if (sources && sources.length > 0) {
    // Create a map of source IDs to sources
    const sourceMap = new Map(sources.map(s => [s.id, s]));

    // Replace [1], [2], etc. with citation chips showing domain
    // Match [number] but not inside HTML tags
    const citationRegex = /\[(\d+)\]/g;
    
    result = result.replace(citationRegex, (match, num) => {
      const sourceId = parseInt(num);
      const source = sourceMap.get(sourceId);
      
      if (source) {
        // Extract domain from URL for display
        try {
          const url = new URL(source.url);
          const domain = url.hostname.replace('www.', '');
          return `<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="citation-chip" title="${source.title.replace(/"/g, '&quot;')}">${domain}</a>`;
        } catch {
          return `<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="citation-chip" title="${source.title.replace(/"/g, '&quot;')}">[${sourceId}]</a>`;
        }
      }
      
      return match;
    });
  }
  
  // Also parse {text:url} syntax for green dotted links
  // Example: {concern:https://example.com}
  const linkRegex = /\{([^:]+):([^}]+)\}/g;
  result = result.replace(linkRegex, (match, text, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="citation-link">${text}</a>`;
  });
  
  return result;
}

