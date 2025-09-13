import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

// Simple admin endpoint to view all saved messages
// Access at: /api/admin/messages?key=YOUR_SECRET_KEY

export async function GET(req: NextRequest) {
  // Simple auth check - replace with your own secret
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  
  // Set your own secret key here or use env variable
  const ADMIN_KEY = process.env.ADMIN_KEY || 'your-secret-key-here';
  
  if (key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('🔍 Fetching messages from KV...');
    
    // Get all visitor IDs
    const visitors = await kv.smembers('chat:visitors');
    console.log(`📊 Found ${visitors.length} visitors in KV`);
    
    const allConversations = [];
    let totalMessages = 0;
    
    for (const visitorId of visitors) {
      // Get all message keys for this visitor
      const messageKeys = await kv.lrange(`chat:${visitorId}:messages`, 0, -1);
      console.log(`👤 Visitor ${visitorId}: ${messageKeys.length} message keys`);
      
      const messages = [];
      for (const key of messageKeys) {
        const message = await kv.get(key as string);
        if (message) {
          messages.push(message);
        } else {
          console.log(`⚠️  Missing message for key: ${key}`);
        }
      }
      
      if (messages.length > 0) {
        totalMessages += messages.length;
        
        // Sort messages by timestamp (chronological order)
        const sortedMessages = messages.sort((a: any, b: any) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        allConversations.push({
          visitorId,
          messageCount: messages.length,
          messages: sortedMessages,
          lastMessageTime: sortedMessages[sortedMessages.length - 1]?.timestamp,
        });
      }
    }
    
    console.log(`✅ Retrieved ${totalMessages} total messages from ${visitors.length} visitors`);
    
    // Sort conversations by most recent activity
    allConversations.sort((a: any, b: any) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
    
    return new Response(JSON.stringify({
      totalVisitors: visitors.length,
      totalMessages,
      conversations: allConversations,
      debug: {
        kvConnected: true,
        timestamp: new Date().toISOString(),
      }
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch messages',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}