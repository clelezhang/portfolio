export interface Comment {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CommentThread {
  id: string;
  comments: Comment[];
  // Note: Highlights are now embedded in markdown as <mark data-thread-id="xxx">text</mark>
  // The thread ID matches the data-thread-id attribute in the markdown
}

export interface Source {
  id: number;
  url: string;
  title: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  commentThreads?: CommentThread[]; // Inline comment threads attached to highlights
  startInEditMode?: boolean; // Flag to indicate message should start in edit mode
  sources?: Source[]; // Sources for citations
}

export interface IndexSection {
  id: string;
  startMessageId: string;
  endMessageId: string;
  title?: string;          // Generated lazily via API
  generatedAt?: number;    // When title was generated
}

export interface ConversationIndex {
  sections: IndexSection[];
  lastGenerated: number;   // When sections were last detected
}

export interface Conversation {
  id: string;
  messages: Message[];
  title?: string;
  createdAt: number;
  updatedAt: number;
  index?: ConversationIndex;
  queue?: ConversationQueue;
}

export interface ApiResponse {
  content: string;
  error?: string;
}

export interface StreamingResponse {
  content: string;
  done: boolean;
  error?: string;
}

// Exploration types (for "Dig Deeper" feature)
export interface ExploreSegment {
  id: string;
  title: string;
  description: string; // Brief description for collapsed state
  content?: string; // Full content for this segment/section
  depth: number;
  isExpanded: boolean;
  subSegments?: ExploreSegment[]; // Sub-topics to explore deeper
  isGenerating?: boolean; // Flag for loading state
}

export interface DepthCacheEntry {
  parentSegmentId: string;
  parentPath: string[];
  sections: ExploreSegment[];
  generatedAt: number;
}

export interface Exploration {
  id: string;
  rootTopic: string;
  title?: string; // Generated from rootTopic
  fullContent: string; // The complete streamed response
  segments: ExploreSegment[]; // Parsed sections from the response
  depthCache?: { [depthKey: string]: DepthCacheEntry }; // Cache of expanded depths
  createdAt: number;
  updatedAt: number;
}

// Swipe Deeper types (for horizontal swipe navigation)
export interface SwipeDepthPage {
  depth: number;
  parentPath: string[]; // Breadcrumb trail (e.g., ["Topic", "Section", "Subsection"])
  parentSegmentId?: string; // ID of the parent segment that was expanded
  sections: ExploreSegment[]; // Editable sections on this page
}

// Queue types (for queue-based chat interface)
export type QueueItemStatus = 'past' | 'now' | 'upcoming';

export interface QueueItem {
  id: string;
  title: string;
  content?: string; // The actual message content for this topic
  status: QueueItemStatus;
  order: number; // Order in the queue
  isEditing?: boolean; // Whether the title is being edited
}

export interface ConversationQueue {
  items: QueueItem[];
  currentItemId: string | null; // ID of the "NOW" item
  autoplay: boolean; // Whether to auto-continue to next item
}