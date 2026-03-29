import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'brackets.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const { mkdirSync, existsSync } = require('fs');
    const dbDir = join(process.cwd(), 'data');
    
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    
    // Initialize schema if needed
    const schemaPath = join(process.cwd(), 'schema.sql');
    if (existsSync(schemaPath)) {
      const schema = readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
    }
  }
  
  return db;
}

export interface Settings {
  id: number;
  base_score: number;
  handicap_percentage: number;
  league_name: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  role: string;
  created_at: string;
}

export interface Event {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: 'open' | 'closed' | 'completed';
  created_at: string;
}

export interface Bowler {
  id: number;
  name: string;
  average: number;
  handicap: number;
  event_id: number;
  created_at: string;
}

export interface BracketEntry {
  id: number;
  event_id: number;
  bracket_number: number;
  bowler_id: number;
  entry_type: 'scratch' | 'handicap';
  position: number;
  created_at: string;
}

export interface Game {
  id: number;
  event_id: number;
  bracket_number: number;
  game_number: number;
  bowler_id: number;
  scratch_score: number;
  handicap_score: number;
  total_score: number;
  created_at: string;
}

export interface BracketResult {
  id: number;
  event_id: number;
  bracket_number: number;
  entry_type: 'scratch' | 'handicap';
  round: number;
  position: number;
  bowler_id: number | null;
  game1_score: number | null;
  game2_score: number | null;
  game3_score: number | null;
  total_score: number | null;
  created_at: string;
}

// Settings functions
export function getSettings(): Settings {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM settings WHERE id = 1');
  return stmt.get() as Settings;
}

export function updateSettings(baseScore: number, handicapPercentage: number, leagueName?: string): Settings {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE settings SET base_score = ?, handicap_percentage = ?, league_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1');
  stmt.run(baseScore, handicapPercentage, leagueName || getSettings().league_name);
  return getSettings();
}

export function calculateHandicap(average: number): number {
  const settings = getSettings();
  if (average >= settings.base_score) return 0;
  return Math.round((settings.base_score - average) * (settings.handicap_percentage / 100));
}

// User functions
export function createUser(email: string, passwordHash: string, role: string = 'admin'): User {
  const db = getDatabase();
  const stmt = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
  const result = stmt.run(email, passwordHash, role);
  return getUserById(result.lastInsertRowid as number)!;
}

export function getUserByEmail(email: string): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, email, role, created_at FROM users WHERE email = ?');
  return stmt.get(email) as User | null;
}

export function getUserById(id: number): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?');
  return stmt.get(id) as User | null;
}

export function validateUser(email: string, passwordHash: string): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, email, role, created_at FROM users WHERE email = ? AND password_hash = ?');
  return stmt.get(email, passwordHash) as User | null;
}

// Event functions
export function createEvent(name: string, date: string, location?: string): Event {
  const db = getDatabase();
  const stmt = db.prepare('INSERT INTO events (name, date, location) VALUES (?, ?, ?)');
  const result = stmt.run(name, date, location || null);
  return getEventById(result.lastInsertRowid as number)!;
}

export function getEventById(id: number): Event | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
  return stmt.get(id) as Event | null;
}

export function getAllEvents(): Event[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM events ORDER BY date DESC');
  return stmt.all() as Event[];
}

export function updateEventStatus(id: number, status: 'open' | 'closed' | 'completed'): Event | null {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE events SET status = ? WHERE id = ?');
  stmt.run(status, id);
  return getEventById(id);
}

// Bowler functions
export function createBowler(name: string, average: number, eventId: number): Bowler {
  const db = getDatabase();
  const handicap = calculateHandicap(average);
  const stmt = db.prepare('INSERT INTO bowlers (name, average, handicap, event_id) VALUES (?, ?, ?, ?)');
  const result = stmt.run(name, average, handicap, eventId);
  return getBowlerById(result.lastInsertRowid as number)!;
}

export function getBowlerById(id: number): Bowler | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM bowlers WHERE id = ?');
  return stmt.get(id) as Bowler | null;
}

export function getBowlersByEvent(eventId: number): Bowler[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM bowlers WHERE event_id = ? ORDER BY name');
  return stmt.all(eventId) as Bowler[];
}

export function updateBowlerAverage(id: number, average: number): Bowler | null {
  const db = getDatabase();
  const handicap = calculateHandicap(average);
  const stmt = db.prepare('UPDATE bowlers SET average = ?, handicap = ? WHERE id = ?');
  stmt.run(average, handicap, id);
  return getBowlerById(id);
}

// Recalculate all handicaps when settings change
export function recalculateAllHandicaps(): void {
  const db = getDatabase();
  const bowlers = db.prepare('SELECT id, average FROM bowlers').all() as { id: number; average: number }[];
  for (const bowler of bowlers) {
    const handicap = calculateHandicap(bowler.average);
    db.prepare('UPDATE bowlers SET handicap = ? WHERE id = ?').run(handicap, bowler.id);
  }
}

// Bracket entry functions
export function createBracketEntry(eventId: number, bracketNumber: number, bowlerId: number, entryType: 'scratch' | 'handicap', position: number): BracketEntry {
  const db = getDatabase();
  const stmt = db.prepare('INSERT INTO bracket_entries (event_id, bracket_number, bowler_id, entry_type, position) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(eventId, bracketNumber, bowlerId, entryType, position);
  return getBracketEntryById(result.lastInsertRowid as number)!;
}

export function getBracketEntryById(id: number): BracketEntry | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM bracket_entries WHERE id = ?');
  return stmt.get(id) as BracketEntry | null;
}

export function getBracketEntriesByEvent(eventId: number): BracketEntry[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM bracket_entries WHERE event_id = ? ORDER BY bracket_number, position');
  return stmt.all(eventId) as BracketEntry[];
}

export function getBracketEntriesByType(eventId: number, bracketNumber: number, entryType: 'scratch' | 'handicap'): BracketEntry[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM bracket_entries WHERE event_id = ? AND bracket_number = ? AND entry_type = ? ORDER BY position');
  return stmt.all(eventId, bracketNumber, entryType) as BracketEntry[];
}

// Game functions
export function createGame(eventId: number, bracketNumber: number, gameNumber: number, bowlerId: number, scratchScore: number, handicapScore: number): Game {
  const db = getDatabase();
  const totalScore = scratchScore + handicapScore;
  const stmt = db.prepare('INSERT INTO games (event_id, bracket_number, game_number, bowler_id, scratch_score, handicap_score, total_score) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(eventId, bracketNumber, gameNumber, bowlerId, scratchScore, handicapScore, totalScore);
  return getGameById(result.lastInsertRowid as number)!;
}

export function getGameById(id: number): Game | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
  return stmt.get(id) as Game | null;
}

export function getGamesByBowler(eventId: number, bowlerId: number): Game[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM games WHERE event_id = ? AND bowler_id = ? ORDER BY game_number');
  return stmt.all(eventId, bowlerId) as Game[];
}

export function getGamesByBracket(eventId: number, bracketNumber: number): Game[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM games WHERE event_id = ? AND bracket_number = ? ORDER BY game_number, bowler_id');
  return stmt.all(eventId, bracketNumber) as Game[];
}

export function updateGameScores(id: number, scratchScore: number, handicapScore: number): Game | null {
  const db = getDatabase();
  const totalScore = scratchScore + handicapScore;
  const stmt = db.prepare('UPDATE games SET scratch_score = ?, handicap_score = ?, total_score = ? WHERE id = ?');
  stmt.run(scratchScore, handicapScore, totalScore, id);
  return getGameById(id);
}

// Bracket result functions
export function createBracketResult(eventId: number, bracketNumber: number, entryType: 'scratch' | 'handicap', round: number, position: number, bowlerId: number | null): BracketResult {
  const db = getDatabase();
  const stmt = db.prepare('INSERT INTO bracket_results (event_id, bracket_number, entry_type, round, position, bowler_id) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(eventId, bracketNumber, entryType, round, position, bowlerId);
  return getBracketResultById(result.lastInsertRowid as number)!;
}

export function getBracketResultById(id: number): BracketResult | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM bracket_results WHERE id = ?');
  return stmt.get(id) as BracketResult | null;
}

export function getBracketResults(eventId: number, bracketNumber: number, entryType: 'scratch' | 'handicap'): BracketResult[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM bracket_results WHERE event_id = ? AND bracket_number = ? AND entry_type = ? ORDER BY round, position');
  return stmt.all(eventId, bracketNumber, entryType) as BracketResult[];
}

export function updateBracketResultScores(id: number, game1: number, game2: number, game3: number, total: number): BracketResult | null {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE bracket_results SET game1_score = ?, game2_score = ?, game3_score = ?, total_score = ? WHERE id = ?');
  stmt.run(game1, game2, game3, total, id);
  return getBracketResultById(id);
}

// Calculate bracket winners
export function calculateBracketWinners(eventId: number, bracketNumber: number, entryType: 'scratch' | 'handicap'): BracketResult[] {
  const db = getDatabase();
  
  // Get all entries for this bracket
  const entries = getBracketEntriesByType(eventId, bracketNumber, entryType);
  
  if (entries.length < 2) {
    return [];
  }
  
  // Get all games for this bracket
  const games = db.prepare(`
    SELECT g.*, b.name as bowler_name 
    FROM games g 
    JOIN bowlers b ON g.bowler_id = b.id 
    WHERE g.event_id = ? AND g.bracket_number = ?
    ORDER BY g.bowler_id, g.game_number
  `).all(eventId, bracketNumber) as (Game & { bowler_name: string })[];
  
  // Calculate totals for each bowler
  const bowlerTotals: { [key: number]: { name: string; game1: number; game2: number; game3: number; total: number } } = {};
  
  for (const game of games) {
    if (!bowlerTotals[game.bowler_id]) {
      bowlerTotals[game.bowler_id] = { name: game.bowler_name, game1: 0, game2: 0, game3: 0, total: 0 };
    }
    if (game.game_number === 1) bowlerTotals[game.bowler_id].game1 = game.total_score;
    if (game.game_number === 2) bowlerTotals[game.bowler_id].game2 = game.total_score;
    if (game.game_number === 3) bowlerTotals[game.bowler_id].game3 = game.total_score;
    bowlerTotals[game.bowler_id].total += game.total_score;
  }
  
  // Clear existing results
  db.prepare('DELETE FROM bracket_results WHERE event_id = ? AND bracket_number = ? AND entry_type = ?').run(eventId, bracketNumber, entryType);
  
  // Create bracket structure (8 bowlers -> 4 -> 2 -> 1 champion)
  const results: BracketResult[] = [];
  
  // Round 1: 8 bowlers, 4 matches
  // Round 2: 4 bowlers, 2 matches (semis)
  // Round 3: 2 bowlers, 1 match (final)
  // Round 4: 1 champion
  
  // For simplicity, we'll use total scores across all 3 games
  // In a real bracket, you'd have match-by-match scoring
  
  const sortedBowlers = Object.entries(bowlerTotals)
    .map(([id, scores]) => ({ id: parseInt(id), ...scores }))
    .sort((a, b) => b.total - a.total);
  
  // Create results for each round
  for (let i = 0; i < sortedBowlers.length; i++) {
    const bowler = sortedBowlers[i];
    const round = i < 1 ? 4 : i < 2 ? 3 : i < 4 ? 2 : 1;
    const position = i + 1;
    
    const result = createBracketResult(eventId, bracketNumber, entryType, round, position, bowler.id);
    updateBracketResultScores(result.id, bowler.game1, bowler.game2, bowler.game3, bowler.total);
    results.push(result);
  }
  
  return results;
}