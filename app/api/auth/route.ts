import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByEmail, createUser, validateUser } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'bowling-bracket-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password } = body;

    if (action === 'login') {
      // Find user and validate password
      const user = getUserByEmail(email);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }

      // Get password hash from database
      const db = (await import('@/lib/db')).getDatabase();
      const stmt = db.prepare('SELECT password_hash FROM users WHERE id = ?');
      const row = stmt.get(user.id) as { password_hash: string } | undefined;
      
      if (!row) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }

      const validPassword = await bcrypt.compare(password, row.password_hash);
      if (!validPassword) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({ 
        success: true, 
        user: { id: user.id, email: user.email, role: user.role },
        token 
      });
    }

    if (action === 'register') {
      // Check if user exists
      const existingUser = getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }

      // Hash password and create user
      const passwordHash = await bcrypt.hash(password, 10);
      const user = createUser(email, passwordHash, 'admin');

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({ 
        success: true, 
        user: { id: user.id, email: user.email, role: user.role },
        token 
      });
    }

    if (action === 'verify') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'No token provided' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string; role: string };
        return NextResponse.json({ 
          success: true, 
          user: { id: decoded.userId, email: decoded.email, role: decoded.role } 
        });
      } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}