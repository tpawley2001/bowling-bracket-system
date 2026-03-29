# Bowling Bracket System

A web-based bowling bracket calculation system with handicap and scratch options, supporting forward and backward progression through 3 games.

## Features

- **Configurable Handicap**: Base score and percentage are adjustable (default: 230 base, 100%)
- **Handicap & Scratch Divisions**: Support for both handicap and scratch brackets
- **8-Player Brackets**: Each bracket supports up to 8 bowlers
- **3-Game Format**: Bowlers play 3 games, total scores determine advancement
- **Forward & Backward Progression**: Track winners through rounds (Quarter-finals → Semi-finals → Finals → Champion)
- **Public Viewing**: Anyone can view bracket results without login
- **Admin Access**: Email-based authentication for managing events, bowlers, and scores

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT with bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/tpawley2001/bowling-bracket-system.git
cd bowling-bracket-system

# Install dependencies
npm install

# Create data directory
mkdir -p data

# Run development server
npm run dev
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

The app will be available at `http://localhost:3002`

## Usage

### Admin Login

1. Navigate to `/login`
2. Default credentials: `admin@bowling.com` / `admin123`
3. Create events, add bowlers, and manage brackets

### Configure Handicap Settings

1. Login as admin
2. Go to **Settings** tab
3. Adjust:
   - **Base Score**: The reference score for handicap (default: 230)
   - **Handicap Percentage**: Multiplier for handicap (default: 100%)
4. Click **Save Settings** to recalculate all handicaps

### Handicap Formula

```
Handicap = (Base Score - Average) × Percentage
```

**Examples:**
- Base Score: 230, Percentage: 80%
- Bowler Average: 180
- Handicap = (230 - 180) × 0.80 = 40 pins

### Public View

1. Navigate to `/`
2. Select an event
3. Choose bracket type (Handicap/Scratch) and bracket number
4. View bracket results and game scores

## API Endpoints

### Authentication
- `POST /api/auth` - Login, register, verify token

### Settings
- `GET /api/settings` - Get current handicap settings
- `PUT /api/settings` - Update base score and percentage

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create new event
- `PUT /api/events` - Update event status

### Bowlers
- `GET /api/bowlers?eventId=X` - Get bowlers for event
- `POST /api/bowlers` - Add bowler to event
- `PUT /api/bowlers` - Update bowler average

### Brackets
- `GET /api/brackets?eventId=X&bracketNumber=N&entryType=scratch|handicap` - Get bracket entries
- `POST /api/brackets` - Create entry, add game score, calculate winners

## Database Schema

- **settings**: Configurable base score and handicap percentage
- **users**: Admin users with email/password
- **events**: Bowling tournaments/events
- **bowlers**: Bowler names, averages, handicaps
- **bracket_entries**: Which bowlers are in which brackets
- **games**: Individual game scores
- **bracket_results**: Final standings and progression

## Bracket Progression

1. **Round 1**: 8 bowlers, all compete
2. **Semi-Finals**: Top 4 by total score advance
3. **Finals**: Top 2 compete
4. **Champion**: Winner crowned

## License

MIT License

## Author

Created for bowling tournament management.