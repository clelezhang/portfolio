import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

// API for managing conversation notes and bookmarks
// POST: Add/update note for a conversation
// GET: Get all notes
// DELETE: Remove note for a conversation

export async function POST(req: NextRequest) {
  // Simple auth check
  const { visitorId, note, isBookmarked, adminKey } = await req.json();
  
  const ADMIN_KEY = process.env.ADMIN_KEY || 'your-secret-key-here';
  
  if (adminKey !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!visitorId) {
    return new Response(JSON.stringify({ error: 'visitorId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const noteKey = `note:${visitorId}`;
    const noteData = {
      visitorId,
      note: note || '',
      isBookmarked: isBookmarked || false,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(noteKey, noteData);
    
    // Also maintain a set of all noted conversations for easy retrieval
    if (note || isBookmarked) {
      await kv.sadd('noted:conversations', visitorId);
    } else {
      await kv.srem('noted:conversations', visitorId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      note: noteData 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error saving note:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to save note',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  
  const ADMIN_KEY = process.env.ADMIN_KEY || 'your-secret-key-here';
  
  if (adminKey !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get all noted conversations
    const notedVisitors = await kv.smembers('noted:conversations');
    const notes: Record<string, unknown> = {};
    
    for (const visitorId of notedVisitors) {
      const noteKey = `note:${visitorId}`;
      const noteData = await kv.get(noteKey);
      if (noteData) {
        notes[visitorId as string] = noteData;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notes 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch notes',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req: NextRequest) {
  const { visitorId, adminKey } = await req.json();
  
  const ADMIN_KEY = process.env.ADMIN_KEY || 'your-secret-key-here';
  
  if (adminKey !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!visitorId) {
    return new Response(JSON.stringify({ error: 'visitorId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const noteKey = `note:${visitorId}`;
    await kv.del(noteKey);
    await kv.srem('noted:conversations', visitorId);

    return new Response(JSON.stringify({ 
      success: true 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error deleting note:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete note',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
