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

export default function AdminPage() {
  const [user, setUser] = useState<{ id: number; email: string; role: string } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [bowlers, setBowlers] = useState<Bowler[]>([]);
  const [tab, setTab] = useState<'events' | 'bowlers' | 'brackets'>('events');
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
  }, [router]);

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data.events || []);
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
                <th>Handicap (230-avg)</th>
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