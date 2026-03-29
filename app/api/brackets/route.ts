import { NextRequest, NextResponse } from 'next/server';
import { 
  createBracketEntry, 
  getBracketEntriesByEvent, 
  getBracketEntriesByType,
  createGame,
  getGamesByBracket,
  updateGameScores,
  calculateBracketWinners,
  getBracketResults
} from '@/lib/db';

// Get bracket entries or games
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const bracketNumber = searchParams.get('bracketNumber');
    const entryType = searchParams.get('entryType') as 'scratch' | 'handicap' | null;
    const action = searchParams.get('action');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }
    
    if (action === 'results' && bracketNumber && entryType) {
      const results = getBracketResults(parseInt(eventId), parseInt(bracketNumber), entryType);
      return NextResponse.json({ results });
    }
    
    if (action === 'games' && bracketNumber) {
      const games = getGamesByBracket(parseInt(eventId), parseInt(bracketNumber));
      return NextResponse.json({ games });
    }
    
    if (bracketNumber && entryType) {
      const entries = getBracketEntriesByType(parseInt(eventId), parseInt(bracketNumber), entryType);
      return NextResponse.json({ entries });
    }
    
    const entries = getBracketEntriesByEvent(parseInt(eventId));
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Get brackets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create bracket entry or game score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'entry') {
      const { eventId, bracketNumber, bowlerId, entryType, position } = body;
      
      if (!eventId || !bracketNumber || !bowlerId || !entryType) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      const entry = createBracketEntry(eventId, bracketNumber, bowlerId, entryType, position || 1);
      return NextResponse.json({ success: true, entry });
    }
    
    if (action === 'game') {
      const { eventId, bracketNumber, gameNumber, bowlerId, scratchScore, handicapScore } = body;
      
      if (!eventId || !bracketNumber || !gameNumber || !bowlerId || scratchScore === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      const game = createGame(eventId, bracketNumber, gameNumber, bowlerId, scratchScore, handicapScore || 0);
      return NextResponse.json({ success: true, game });
    }
    
    if (action === 'calculate') {
      const { eventId, bracketNumber, entryType } = body;
      
      if (!eventId || !bracketNumber || !entryType) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      const results = calculateBracketWinners(eventId, bracketNumber, entryType);
      return NextResponse.json({ success: true, results });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Post brackets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update game score
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, scratchScore, handicapScore } = body;
    
    if (!gameId || scratchScore === undefined) {
      return NextResponse.json({ error: 'Game ID and scratch score are required' }, { status: 400 });
    }
    
    const game = updateGameScores(gameId, scratchScore, handicapScore || 0);
    return NextResponse.json({ success: true, game });
  } catch (error) {
    console.error('Update game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}