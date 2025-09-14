'use client';

import { useState } from 'react';

interface Message {
  visitorId: string;
  timestamp: string;
  message: string;
  cardImage?: string;
  cardContext?: string;
  inResponseTo?: string;
}

interface Conversation {
  visitorId: string;
  messageCount: number;
  messages: Message[];
}

interface Note {
  visitorId: string;
  note: string;
  isBookmarked: boolean;
  updatedAt: string;
}

interface AdminData {
  totalVisitors: number;
  totalMessages: number;
  conversations: Conversation[];
  debug: {
    kvConnected: boolean;
    timestamp: string;
  };
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  const fetchMessages = async () => {
    if (!adminKey.trim()) {
      setError('Please enter admin key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch messages and notes in parallel
      const [messagesResponse, notesResponse] = await Promise.all([
        fetch(`/api/admin/messages?key=${encodeURIComponent(adminKey)}`),
        fetch(`/api/admin/notes?key=${encodeURIComponent(adminKey)}`)
      ]);
      
      if (!messagesResponse.ok) {
        throw new Error(`HTTP ${messagesResponse.status}: ${messagesResponse.statusText}`);
      }

      const messagesResult = await messagesResponse.json();
      setData(messagesResult);

      // Notes might not exist yet, so don't throw error if 404
      if (notesResponse.ok) {
        const notesResult = await notesResponse.json();
        setNotes(notesResult.notes || {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async (visitorId: string, note: string, isBookmarked: boolean) => {
    try {
      const response = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, note, isBookmarked, adminKey })
      });

      if (response.ok) {
        const result = await response.json();
        setNotes(prev => ({
          ...prev,
          [visitorId]: result.note
        }));
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const toggleBookmark = async (visitorId: string) => {
    const currentNote = notes[visitorId];
    const newBookmarkState = !currentNote?.isBookmarked;
    await saveNote(visitorId, currentNote?.note || '', newBookmarkState);
  };

  const startEditingNote = (visitorId: string) => {
    setEditingNote(visitorId);
    setTempNote(notes[visitorId]?.note || '');
  };

  const saveEditedNote = async (visitorId: string) => {
    await saveNote(visitorId, tempNote, notes[visitorId]?.isBookmarked || false);
    setEditingNote(null);
    setTempNote('');
  };

  const cancelEditingNote = () => {
    setEditingNote(null);
    setTempNote('');
  };

  const filteredConversations = data?.conversations.filter(conv => {
    // Filter by bookmark status
    if (filterBookmarked && !notes[conv.visitorId]?.isBookmarked) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        conv.visitorId.toLowerCase().includes(searchLower) ||
        conv.messages.some(msg => 
          msg.message.toLowerCase().includes(searchLower)
        ) ||
        notes[conv.visitorId]?.note.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }
    
    return true;
  }) || [];

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getMessageType = (message: Message) => {
    return message.inResponseTo ? 'assistant' : 'user';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Chat Messages Admin</h1>
        
        {/* Admin Key Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Key
              </label>
              <input
                type="password"
                id="adminKey"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin key"
              />
            </div>
            <button
              onClick={fetchMessages}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Fetch Messages'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900">Total Visitors</h3>
              <p className="text-3xl font-bold text-blue-600">{data.totalVisitors}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900">Total Messages</h3>
              <p className="text-3xl font-bold text-green-600">{data.totalMessages}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900">KV Status</h3>
              <p className={`text-lg font-semibold ${data.debug.kvConnected ? 'text-green-600' : 'text-red-600'}`}>
                {data.debug.kvConnected ? '✅ Connected' : '❌ Disconnected'}
              </p>
              <p className="text-sm text-gray-500">Last check: {formatTimestamp(data.debug.timestamp)}</p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        {data && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex gap-4 items-center mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search messages, visitor IDs, or notes..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filterBookmarked}
                  onChange={(e) => setFilterBookmarked(e.target.checked)}
                  className="rounded"
                />
                Show only bookmarked
              </label>
            </div>
            <div className="text-sm text-gray-500">
              Showing {filteredConversations.length} of {data.conversations.length} conversations
              {Object.keys(notes).filter(id => notes[id].isBookmarked).length > 0 && (
                <span className="ml-2">
                  • {Object.keys(notes).filter(id => notes[id].isBookmarked).length} bookmarked
                </span>
              )}
            </div>
          </div>
        )}

        {/* Conversations */}
        {data && (
          <div className="space-y-6">
            {filteredConversations.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                {searchTerm ? 'No conversations match your search.' : 'No conversations found.'}
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div key={conversation.visitorId} className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Visitor: {conversation.visitorId.slice(0, 8)}...
                          </h3>
                          <button
                            onClick={() => toggleBookmark(conversation.visitorId)}
                            className={`text-xl ${
                              notes[conversation.visitorId]?.isBookmarked 
                                ? 'text-yellow-500' 
                                : 'text-gray-300 hover:text-yellow-400'
                            }`}
                            title={notes[conversation.visitorId]?.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                          >
                            ⭐
                          </button>
                        </div>
                        <p className="text-sm text-gray-500">
                          {conversation.messageCount} messages
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 text-right">
                        Latest: {formatTimestamp(conversation.messages[conversation.messages.length - 1]?.timestamp)}
                      </div>
                    </div>
                    
                    {/* Notes section */}
                    <div className="mb-3">
                      {editingNote === conversation.visitorId ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={tempNote}
                            onChange={(e) => setTempNote(e.target.value)}
                            placeholder="Add a note..."
                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEditedNote(conversation.visitorId)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditingNote}
                            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {notes[conversation.visitorId]?.note ? (
                            <div className="flex-1 px-3 py-1 text-sm bg-blue-50 border border-blue-200 rounded">
                              📝 {notes[conversation.visitorId].note}
                            </div>
                          ) : (
                            <div className="flex-1 text-sm text-gray-400 italic">
                              No notes
                            </div>
                          )}
                          <button
                            onClick={() => startEditingNote(conversation.visitorId)}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                          >
                            {notes[conversation.visitorId]?.note ? 'Edit' : 'Add Note'}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setSelectedVisitor(
                        selectedVisitor === conversation.visitorId ? null : conversation.visitorId
                      )}
                      className="w-full text-left text-sm text-blue-600 hover:text-blue-800"
                    >
                      {selectedVisitor === conversation.visitorId ? '▼ Hide messages' : '▶ View messages'}
                    </button>
                  </div>
                  
                  {selectedVisitor === conversation.visitorId && (
                    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                      {conversation.messages.map((message, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            getMessageType(message) === 'user'
                              ? 'bg-blue-50 border-l-4 border-blue-400'
                              : 'bg-green-50 border-l-4 border-green-400'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-semibold ${
                              getMessageType(message) === 'user' ? 'text-blue-700' : 'text-green-700'
                            }`}>
                              {getMessageType(message) === 'user' ? '👤 User' : '🤖 Assistant'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap">{message.message}</p>
                          {message.cardImage && (
                            <div className="mt-2 text-xs text-gray-500">
                              📷 Card: {message.cardImage}
                            </div>
                          )}
                          {message.inResponseTo && (
                            <div className="mt-2 text-xs text-gray-500">
                              💬 In response to: &quot;{message.inResponseTo.slice(0, 50)}...&quot;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
