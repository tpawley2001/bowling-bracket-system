import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Bowling Bracket System API',
    endpoints: {
      auth: '/api/auth',
      events: '/api/events',
      bowlers: '/api/bowlers',
      brackets: '/api/brackets',
    },
  });
}