-- Bowling Bracket System Database Schema

-- Users table (for admin access)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table (configurable league settings)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  base_score INTEGER DEFAULT 230,
  handicap_percentage INTEGER DEFAULT 100,
  league_name TEXT DEFAULT 'Bowling League',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default settings
INSERT OR IGNORE INTO settings (id, base_score, handicap_percentage, league_name) 
VALUES (1, 230, 100, 'Bowling League');

-- Events table (bowling events/tournaments)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'open', -- open, closed, completed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bowlers table
CREATE TABLE IF NOT EXISTS bowlers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  average INTEGER,
  handicap INTEGER DEFAULT 0, -- calculated as 230 - average
  event_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Bracket entries (which bowlers are in which brackets)
CREATE TABLE IF NOT EXISTS bracket_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  bracket_number INTEGER NOT NULL, -- 1-8
  bowler_id INTEGER NOT NULL,
  entry_type TEXT NOT NULL, -- 'scratch' or 'handicap'
  position INTEGER, -- position in bracket (1-8)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (bowler_id) REFERENCES bowlers(id)
);

-- Games table (3 games per bracket)
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  bracket_number INTEGER NOT NULL,
  game_number INTEGER NOT NULL, -- 1, 2, or 3
  bowler_id INTEGER NOT NULL,
  scratch_score INTEGER,
  handicap_score INTEGER, -- scratch + handicap
  total_score INTEGER, -- scratch + handicap for handicap brackets
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (bowler_id) REFERENCES bowlers(id)
);

-- Bracket results (winners progression)
CREATE TABLE IF NOT EXISTS bracket_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  bracket_number INTEGER NOT NULL,
  entry_type TEXT NOT NULL, -- 'scratch' or 'handicap'
  round INTEGER NOT NULL, -- 1 = first round, 2 = semi, 3 = final, 4 = champion
  position INTEGER NOT NULL, -- 1-8 for round 1, 1-4 for round 2, etc.
  bowler_id INTEGER,
  game1_score INTEGER,
  game2_score INTEGER,
  game3_score INTEGER,
  total_score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (bowler_id) REFERENCES bowlers(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bowlers_event ON bowlers(event_id);
CREATE INDEX IF NOT EXISTS idx_entries_event ON bracket_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_games_event ON games(event_id);
CREATE INDEX IF NOT EXISTS idx_results_event ON bracket_results(event_id);

-- Default admin user (password: admin123)
-- Password hash generated with bcryptjs
INSERT OR IGNORE INTO users (email, password_hash, role) 
VALUES ('admin@bowling.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7X92qG4n0X8.0Z4Mx1K8K2a', 'admin');