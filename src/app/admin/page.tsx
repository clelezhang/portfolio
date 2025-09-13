'use client';

import { useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!adminKey.trim()) {
      setError('Please enter admin key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/messages?key=${encodeURIComponent(adminKey)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = data?.conversations.filter(conv => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.visitorId.toLowerCase().includes(searchLower) ||
      conv.messages.some(msg => 
        msg.message.toLowerCase().includes(searchLower)
      )
    );
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

        {/* Search */}
        {data && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search messages or visitor IDs..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
                  <div 
                    className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedVisitor(
                      selectedVisitor === conversation.visitorId ? null : conversation.visitorId
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Visitor: {conversation.visitorId.slice(0, 8)}...
                        </h3>
                        <p className="text-sm text-gray-500">
                          {conversation.messageCount} messages
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        Latest: {formatTimestamp(conversation.messages[conversation.messages.length - 1]?.timestamp)}
                      </div>
                    </div>
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
                              💬 In response to: "{message.inResponseTo.slice(0, 50)}..."
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
