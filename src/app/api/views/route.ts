import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const views = await kv.get<number>('page_views') || 0;
    return NextResponse.json({ views });
  } catch (error) {
    console.error('Error getting page views:', error);
    return NextResponse.json({ views: 1 }, { status: 200 }); // Fallback to 1
  }
}

export async function POST() {
  try {
    // Get current view count
    const currentViews = await kv.get<number>('page_views') || 0; // Start from 0
    
    // Increment the counter
    const newViews = currentViews + 1;
    await kv.set('page_views', newViews);
    
    return NextResponse.json({ 
      views: newViews,
      message: 'View count incremented'
    });
  } catch (error) {
    console.error('Error incrementing page views:', error);
    return NextResponse.json(
      { error: 'Failed to increment views' },
      { status: 500 }
    );
  }
}
