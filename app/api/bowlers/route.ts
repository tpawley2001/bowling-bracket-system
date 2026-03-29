import { NextRequest, NextResponse } from 'next/server';
import { createBowler, getBowlersByEvent, updateBowlerAverage, getBowlerById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }
    
    const bowlers = getBowlersByEvent(parseInt(eventId));
    return NextResponse.json({ bowlers });
  } catch (error) {
    console.error('Get bowlers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, average, eventId } = body;
    
    if (!name || average === undefined || !eventId) {
      return NextResponse.json({ error: 'Name, average, and eventId are required' }, { status: 400 });
    }
    
    const bowler = createBowler(name, average, eventId);
    return NextResponse.json({ success: true, bowler });
  } catch (error) {
    console.error('Create bowler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, average } = body;
    
    if (!id || average === undefined) {
      return NextResponse.json({ error: 'ID and average are required' }, { status: 400 });
    }
    
    const bowler = updateBowlerAverage(id, average);
    return NextResponse.json({ success: true, bowler });
  } catch (error) {
    console.error('Update bowler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}