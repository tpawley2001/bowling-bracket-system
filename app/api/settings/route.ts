import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings, recalculateAllHandicaps } from '@/lib/db';

// Get current settings
export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseScore, handicapPercentage, leagueName } = body;
    
    if (baseScore === undefined || handicapPercentage === undefined) {
      return NextResponse.json({ error: 'Base score and handicap percentage are required' }, { status: 400 });
    }
    
    if (baseScore < 100 || baseScore > 300) {
      return NextResponse.json({ error: 'Base score must be between 100 and 300' }, { status: 400 });
    }
    
    if (handicapPercentage < 0 || handicapPercentage > 100) {
      return NextResponse.json({ error: 'Handicap percentage must be between 0 and 100' }, { status: 400 });
    }
    
    const settings = updateSettings(baseScore, handicapPercentage, leagueName);
    
    // Recalculate all handicaps with new settings
    recalculateAllHandicaps();
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}