'use client';

import { useState, useEffect } from 'react';

interface Event {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: 'open' | 'closed' | 'completed';
}

interface BracketResult {
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
  bowler_name?: string;
}

interface Bowler {
  id: number;
  name: string;
  average: number;
  handicap: number;
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [bracketType, setBracketType] = useState<'scratch' | 'handicap'>('handicap');
  const [bracketNumber, setBracketNumber] = useState(1);
  const [results, setResults] = useState<BracketResult[]>([]);
  const [bowlers, setBowlers] = useState<Bowler[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchBowlers(selectedEvent.id);
      fetchResults(selectedEvent.id, bracketNumber, bracketType);
    }
  }, [selectedEvent, bracketNumber, bracketType]);

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data.events || []);
    if (data.events && data.events.length > 0) {
      setSelectedEvent(data.events[0]);
    }
  };

  const fetchBowlers = async (eventId: number) => {
    const res = await fetch(`/api/bowlers?eventId=${eventId}`);
    const data = await res.json();
    setBowlers(data.bowlers || []);
  };

  const fetchResults = async (eventId: number, bracketNum: number, type: 'scratch' | 'handicap') => {
    const res = await fetch(`/api/brackets?eventId=${eventId}&bracketNumber=${bracketNum}&entryType=${type}&action=results`);
    const data = await res.json();
    setResults(data.results || []);
  };

  const getBowlerName = (bowlerId: number | null) => {
    if (!bowlerId) return 'TBD';
    const bowler = bowlers.find(b => b.id === bowlerId);
    return bowler ? bowler.name : 'Unknown';
  };

  const getBowlerHandicap = (bowlerId: number | null) => {
    if (!bowlerId) return 0;
    const bowler = bowlers.find(b => b.id === bowlerId);
    return bowler ? bowler.handicap : 0;
  };

  // Group results by round
  const resultsByRound = results.reduce((acc, result) => {
    if (!acc[result.round]) acc[result.round] = [];
    acc[result.round].push(result);
    return acc;
  }, {} as Record<number, BracketResult[]>);

  // Sort by position within each round
  Object.keys(resultsByRound).forEach(round => {
    resultsByRound[parseInt(round)].sort((a, b) => a.position - b.position);
  });

  return (
    <div className="container">
      <nav className="nav" style={{ marginBottom: '20px' }}>
        <div className="nav-brand">🎳 Bowling Brackets</div>
        <div className="nav-links">
          <a href="/" className="nav-link active">Public View</a>
          <a href="/login" className="nav-link">Admin Login</a>
        </div>
      </nav>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Select Event</h2>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {events.map((event) => (
            <button
              key={event.id}
              className={`btn ${selectedEvent?.id === event.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedEvent(event)}
            >
              {event.name} - {event.date}
            </button>
          ))}
        </div>
      </div>

      {selectedEvent && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{selectedEvent.name}</h2>
            <span className="badge badge-success">{selectedEvent.location || 'TBD'}</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Bracket Type</label>
              <select
                className="input"
                value={bracketType}
                onChange={(e) => setBracketType(e.target.value as 'scratch' | 'handicap')}
                style={{ width: '150px' }}
              >
                <option value="handicap">Handicap</option>
                <option value="scratch">Scratch</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Bracket #</label>
              <select
                className="input"
                value={bracketNumber}
                onChange={(e) => setBracketNumber(parseInt(e.target.value))}
                style={{ width: '100px' }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>Bracket {n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bracket Display */}
          <div style={{ overflowX: 'auto' }}>
            <h3 style={{ marginBottom: '16px' }}>
              {bracketType === 'handicap' ? 'Handicap' : 'Scratch'} Bracket {bracketNumber}
            </h3>

            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <p>No bracket results yet. Check back after games are entered.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                {/* Round 1 - 8 bowlers */}
                <div>
                  <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>Round 1</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(resultsByRound[1] || []).map((result, idx) => (
                      <div
                        key={result.id}
                        className="bracket-cell"
                        style={{ minWidth: '150px' }}
                      >
                        <div style={{ fontWeight: 600 }}>{getBowlerName(result.bowler_id)}</div>
                        {bracketType === 'handicap' && result.bowler_id && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            HDCP: {getBowlerHandicap(result.bowler_id)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Round 2 - 4 bowlers */}
                <div>
                  <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>Semi-Finals</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(resultsByRound[2] || []).map((result) => (
                      <div
                        key={result.id}
                        className="bracket-cell"
                        style={{ minWidth: '150px' }}
                      >
                        <div style={{ fontWeight: 600 }}>{getBowlerName(result.bowler_id)}</div>
                        {result.total_score && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Total: {result.total_score}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Round 3 - 2 bowlers */}
                <div>
                  <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>Finals</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(resultsByRound[3] || []).map((result) => (
                      <div
                        key={result.id}
                        className="bracket-cell"
                        style={{ minWidth: '150px' }}
                      >
                        <div style={{ fontWeight: 600 }}>{getBowlerName(result.bowler_id)}</div>
                        {result.total_score && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Total: {result.total_score}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Champion */}
                <div>
                  <h4 style={{ marginBottom: '12px', color: 'var(--success)' }}>🏆 Champion</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(resultsByRound[4] || []).map((result) => (
                      <div
                        key={result.id}
                        className="bracket-cell winner"
                        style={{ minWidth: '150px' }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '18px' }}>{getBowlerName(result.bowler_id)}</div>
                        {result.total_score && (
                          <div style={{ fontSize: '14px' }}>
                            Total: {result.total_score}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Game Scores Table */}
          {results.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ marginBottom: '16px' }}>Game Scores</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Bowler</th>
                    <th>Game 1</th>
                    <th>Game 2</th>
                    <th>Game 3</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {results.sort((a, b) => (a.position || 0) - (b.position || 0)).map((result) => (
                    <tr key={result.id}>
                      <td>{result.position}</td>
                      <td>{getBowlerName(result.bowler_id)}</td>
                      <td>{result.game1_score || '-'}</td>
                      <td>{result.game2_score || '-'}</td>
                      <td>{result.game3_score || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{result.total_score || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>How Brackets Work</h3>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p><strong>Handicap Division:</strong> Bowlers receive handicap based on 230 - average. Maximum handicap is 230.</p>
          <p><strong>Scratch Division:</strong> No handicap - actual scores only.</p>
          <p><strong>Format:</strong> 8 bowlers per bracket. Each bowler plays 3 games. Total scores determine advancement.</p>
          <p><strong>Advancement:</strong> Top 4 advance to semi-finals, top 2 to finals, winner crowned champion.</p>
        </div>
      </div>
    </div>
  );
}