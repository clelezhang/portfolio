'use client';

import { useState, useEffect } from 'react';
import { QueueItem } from '@/app/lib/types';
import { Play, Edit2, X, SkipForward } from 'lucide-react';

interface ConversationQueueProps {
  queueItems: QueueItem[];
  onSkip: () => void;
  onPlay: (itemId: string) => void;
  onEdit: (itemId: string, newTitle: string) => void;
  onDelete: (itemId: string) => void;
  onReorder: (items: QueueItem[]) => void;
}

export default function ConversationQueue({
  queueItems,
  onSkip,
  onPlay,
  onEdit,
  onDelete,
  onReorder,
}: ConversationQueueProps) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Separate items by status
  const pastItems = queueItems
    .filter(item => item.status === 'past')
    .sort((a, b) => b.order - a.order); // Most recent first
  const nowItem = queueItems.find(item => item.status === 'now');
  const upcomingItems = queueItems
    .filter(item => item.status === 'upcoming')
    .sort((a, b) => a.order - b.order); // Upcoming in order

  // Only show last 0-2 past items by default
  const visiblePastItems = pastItems.slice(0, 2);

  const handleEditStart = (item: QueueItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
  };

  const handleEditComplete = (itemId: string) => {
    if (editTitle.trim()) {
      onEdit(itemId, editTitle.trim());
    }
    setEditingItemId(null);
    setEditTitle('');
  };

  const handleEditCancel = () => {
    setEditingItemId(null);
    setEditTitle('');
  };

  // Drag and drop handlers for upcoming items
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    if (draggedItemId && draggedItemId !== itemId) {
      setDragOverItemId(itemId);
    }
  };

  const handleDragEnd = () => {
    if (draggedItemId && dragOverItemId && draggedItemId !== dragOverItemId) {
      const draggedItem = upcomingItems.find(item => item.id === draggedItemId);
      const dragOverItem = upcomingItems.find(item => item.id === dragOverItemId);

      if (draggedItem && dragOverItem) {
        // Create new order
        const reordered = [...upcomingItems];
        const draggedIndex = reordered.findIndex(item => item.id === draggedItemId);
        const dragOverIndex = reordered.findIndex(item => item.id === dragOverItemId);

        // Remove dragged item and insert at new position
        reordered.splice(draggedIndex, 1);
        reordered.splice(dragOverIndex, 0, draggedItem);

        // Update orders
        const updatedItems = reordered.map((item, index) => ({
          ...item,
          order: nowItem ? nowItem.order + index + 1 : index,
        }));

        // Combine with other items
        const allItems = [
          ...pastItems,
          ...(nowItem ? [nowItem] : []),
          ...updatedItems,
        ];

        onReorder(allItems);
      }
    }

    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  return (
    <div className="conversation-queue">
      {/* Past Section */}
      {visiblePastItems.length > 0 && (
        <div className="queue-section past-section">
          <div className="section-header">
            <span className="section-label">Past</span>
          </div>
          {visiblePastItems.map((item) => (
            <div
              key={item.id}
              className="queue-item past-item"
            >
              <span className="queue-item-title">{item.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* NOW Section */}
      {nowItem && (
        <div className="queue-section now-section">
          <div className="section-header">
            <span className="section-label now-label">NOW</span>
          </div>
          <div
            className="queue-item now-item"
            onMouseEnter={() => setHoveredItemId(nowItem.id)}
            onMouseLeave={() => setHoveredItemId(null)}
          >
            <span className="queue-item-title">{nowItem.title}</span>
            {hoveredItemId === nowItem.id && (
              <button
                className="queue-action-button skip-button"
                onClick={onSkip}
                title="Skip to next"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* UP NEXT Section */}
      {upcomingItems.length > 0 && (
        <div className="queue-section upcoming-section">
          <div className="section-header">
            <span className="section-label">Up Next</span>
          </div>
          {upcomingItems.map((item) => (
            <div
              key={item.id}
              className={`queue-item upcoming-item ${
                draggedItemId === item.id ? 'dragging' : ''
              } ${dragOverItemId === item.id ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragEnd={handleDragEnd}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              {editingItemId === item.id ? (
                <input
                  className="queue-item-edit-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleEditComplete(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditComplete(item.id);
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <span className="queue-item-title">{item.title}</span>
                  {hoveredItemId === item.id && (
                    <div className="queue-actions">
                      <button
                        className="queue-action-button play-button"
                        onClick={() => onPlay(item.id)}
                        title="Play now"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        className="queue-action-button edit-button"
                        onClick={() => handleEditStart(item)}
                        title="Edit title"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        className="queue-action-button delete-button"
                        onClick={() => onDelete(item.id)}
                        title="Remove from queue"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .conversation-queue {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          height: 100%;
          overflow-y: auto;
        }

        .queue-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .section-header {
          margin-bottom: 0.25rem;
        }

        .section-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-gray);
        }

        .now-label {
          color: var(--color-olive-dark);
        }

        .queue-item {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 150ms ease;
          position: relative;
        }

        .queue-item-title {
          flex: 1;
          font-size: 0.875rem;
        }

        .past-item {
          background-color: var(--color-bg-200);
          color: var(--color-gray);
          opacity: 0.6;
        }

        .now-item {
          background-color: rgba(155, 173, 115, 0.15);
          border: 1.5px solid var(--color-olive-dark);
          color: var(--color-olive-dark);
          font-weight: 500;
          cursor: pointer;
        }

        .now-item:hover {
          background-color: rgba(155, 173, 115, 0.25);
        }

        .upcoming-item {
          background-color: var(--color-bg-200);
          border: 1px solid var(--color-border);
          cursor: grab;
        }

        .upcoming-item:hover {
          background-color: var(--color-bg-300);
          border-color: var(--color-olive-dark);
        }

        .upcoming-item.dragging {
          opacity: 0.5;
          cursor: grabbing;
        }

        .upcoming-item.drag-over {
          border-top: 2px solid var(--color-olive-dark);
        }

        .queue-actions {
          display: flex;
          gap: 0.25rem;
          margin-left: 0.5rem;
        }

        .queue-action-button {
          padding: 0.25rem;
          border-radius: 4px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 150ms ease;
          color: var(--color-gray);
        }

        .queue-action-button:hover {
          background-color: var(--color-bg-100);
        }

        .skip-button:hover {
          color: var(--color-olive-dark);
        }

        .play-button:hover {
          color: var(--color-olive-dark);
        }

        .edit-button:hover {
          color: var(--color-blue);
        }

        .delete-button:hover {
          color: var(--color-red);
        }

        .queue-item-edit-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.875rem;
          padding: 0;
          color: inherit;
        }
      `}</style>
    </div>
  );
}

