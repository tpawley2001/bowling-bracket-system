'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Event {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: 'open' | 'closed' | 'completed';
}

interface Bowler {
  id: number;
  name: string;
  average: number;
  handicap: number;
  event_id: number;
}

interface Settings {
  base_score: number;
  handicap_percentage: number;
  league_name: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<{ id: number; email: string; role: string } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [bowlers, setBowlers] = useState<Bowler[]>([]);
  const [settings, setSettings] = useState<Settings>({ base_score: 230, handicap_percentage: 100, league_name: 'Bowling League' });
  const [tab, setTab] = useState<'events' | 'bowlers' | 'brackets' | 'settings'>('events');
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!storedUser || !token) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(storedUser));
    fetchEvents();
    fetchSettings();
  }, [router]);

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data.events || []);
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.settings) {
      setSettings(data.settings);
    }
  };

  const fetchBowlers = async (eventId: number) => {
    const res = await fetch(`/api/bowlers?eventId=${eventId}`);
    const data = await res.json();
    setBowlers(data.bowlers || []);
  };

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        date: formData.get('date'),
        location: formData.get('location'),
      }),
    });

    if (res.ok) {
      form.reset();
      fetchEvents();
    }
  };

  const handleAddBowler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const res = await fetch('/api/bowlers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        average: parseInt(formData.get('average') as string),
        eventId: selectedEvent.id,
      }),
    });

    if (res.ok) {
      form.reset();
      fetchBowlers(selectedEvent.id);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseScore: parseInt(formData.get('baseScore') as string),
        handicapPercentage: parseInt(formData.get('handicapPercentage') as string),
        leagueName: formData.get('leagueName') as string,
      }),
    });

    if (res.ok) {
      fetchSettings();
      if (selectedEvent) {
        fetchBowlers(selectedEvent.id);
      }
      alert('Settings updated! All handicaps have been recalculated.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="container">
      <nav className="nav" style={{ marginBottom: '20px' }}>
        <div className="nav-brand">🎳 Bowling Bracket Admin</div>
        <div className="nav-links">
          <span style={{ color: 'var(--text-secondary)' }}>{user.email}</span>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ marginLeft: '16px' }}>
            Logout
          </button>
        </div>
      </nav>

      <div className="tabs">
        <button className={`tab ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>
          Events
        </button>
        <button className={`tab ${tab === 'bowlers' ? 'active' : ''}`} onClick={() => setTab('bowlers')} disabled={!selectedEvent}>
          Bowlers
        </button>
        <button className={`tab ${tab === 'brackets' ? 'active' : ''}`} onClick={() => setTab('brackets')} disabled={!selectedEvent}>
          Brackets
        </button>
        <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          Settings
        </button>
      </div>

      {tab === 'events' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Events</h2>
          </div>

          <form onSubmit={handleCreateEvent} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Event Name</label>
                <input type="text" name="name" className="input" placeholder="Spring Tournament" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Date</label>
                <input type="date" name="date" className="input" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Location</label>
                <input type="text" name="location" className="input" placeholder="Bowling Center" />
              </div>
              <button type="submit" className="btn btn-primary">Add Event</button>
            </div>
          </form>

          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.name}</td>
                  <td>{event.date}</td>
                  <td>{event.location || '-'}</td>
                  <td>
                    <span className={`badge badge-${event.status === 'open' ? 'success' : event.status === 'closed' ? 'warning' : 'error'}`}>
                      {event.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setSelectedEvent(event);
                        fetchBowlers(event.id);
                        setTab('bowlers');
                      }}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bowlers' && selectedEvent && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Bowlers - {selectedEvent.name}</h2>
            <span className="badge badge-success">{selectedEvent.date}</span>
          </div>

          <form onSubmit={handleAddBowler} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Bowler Name</label>
                <input type="text" name="name" className="input" placeholder="John Doe" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Average</label>
                <input type="number" name="average" className="input" placeholder="180" min="1" max="300" required />
              </div>
              <button type="submit" className="btn btn-primary">Add Bowler</button>
            </div>
          </form>

          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Average</th>
                <th>Handicap ({settings.base_score} - avg) × {settings.handicap_percentage}%</th>
              </tr>
            </thead>
            <tbody>
              {bowlers.map((bowler) => (
                <tr key={bowler.id}>
                  <td>{bowler.name}</td>
                  <td>{bowler.average}</td>
                  <td>{bowler.handicap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">League Settings</h2>
          </div>

          <form onSubmit={handleUpdateSettings}>
            <div className="form-group">
              <label className="label">League Name</label>
              <input
                type="text"
                name="leagueName"
                className="input"
                defaultValue={settings.league_name}
                placeholder="Sunday Night Bowling League"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="label">Base Score (for handicap calculation)</label>
                <input
                  type="number"
                  name="baseScore"
                  className="input"
                  defaultValue={settings.base_score}
                  min="100"
                  max="300"
                  required
                />
                <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Typical values: 200-230
                </small>
              </div>

              <div className="form-group">
                <label className="label">Handicap Percentage (%)</label>
                <input
                  type="number"
                  name="handicapPercentage"
                  className="input"
                  defaultValue={settings.handicap_percentage}
                  min="0"
                  max="100"
                  required
                />
                <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Typical values: 80-100%
                </small>
              </div>
            </div>

            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '8px' }}>Handicap Formula</h4>
              <code style={{ fontSize: '1.1em', color: 'var(--primary)' }}>
                Handicap = ({settings.base_score} - Average) × {settings.handicap_percentage}%
              </code>
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                Example: A bowler with a 180 average would receive a handicap of {Math.round((settings.base_score - 180) * settings.handicap_percentage / 100)} pins.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }}>
              Save Settings & Recalculate Handicaps
            </button>
          </form>
        </div>
      )}

      {tab === 'brackets' && selectedEvent && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Brackets - {selectedEvent.name}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Bracket management coming soon. Add bowlers first, then assign them to brackets.
          </p>
        </div>
      )}
    </div>
  );
}