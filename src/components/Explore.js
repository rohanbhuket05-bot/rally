import React, { useState, useMemo } from 'react';
import EventCard from './EventCard';
import './HomeFeed.css';

const CATEGORIES = [
  {
    label: 'Music',
    color: '#9D8FFF',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
      </svg>
    ),
  },
  {
    label: 'Food',
    color: '#FF6BA8',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7H1v-2h15.03v2zm0-4H1v-2h15.03v2z"/>
      </svg>
    ),
  },
  {
    label: 'Outdoors',
    color: '#00E5A8',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
      </svg>
    ),
  },
  {
    label: 'On Campus',
    color: '#FFB420',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.76 2.24 5 5 5s5-2.24 5-5v-4.27l2 -1.09V17h2V11.18L23 9 12 3zm5 14c0 1.66-1.34 3-3 3s-3-1.34-3-3v-3.73l3 1.64 3-1.64V17z"/>
      </svg>
    ),
  },
  {
    label: 'Social',
    color: '#667EEA',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
  },
  {
    label: 'Sports',
    color: '#00E5A8',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>
      </svg>
    ),
  },
  {
    label: 'Arts',
    color: '#9B59B6',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.2-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm5.5 11c-.83 0-1.5-.67-1.5-1.5S16.67 10 17.5 10s1.5.67 1.5 1.5S18.33 13 17.5 13zm-3-4c-.83 0-1.5-.67-1.5-1.5S13.67 6 14.5 6s1.5.67 1.5 1.5S15.33 9 14.5 9zM5 11.5C5 10.67 5.67 10 6.5 10S8 10.67 8 11.5 7.33 13 6.5 13 5 12.33 5 11.5zm6-4c0 .83-.67 1.5-1.5 1.5S8 8.33 8 7.5 8.67 6 9.5 6s1.5.67 1.5 1.5z"/>
      </svg>
    ),
  },
  {
    label: 'Gaming',
    color: '#667EEA',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4 1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
      </svg>
    ),
  },
  {
    label: 'Other',
    color: '#8888AA',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
      </svg>
    ),
  },
];

export default function Explore({ events = [], onNavigate = () => {}, onOpenEvent = () => {}, onUpdateEvent = () => {}, user = null, onAuthRequired = () => {} }) {
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  function handleJoin(event) {
    if (!user) { onAuthRequired('Sign in to join this event'); return; }
    const name = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';
    const initials = (name || 'You').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    const exists = (event.attendees || []).some(a => a.name === name);
    const attendees = exists
      ? (event.attendees || []).filter(a => a.name !== name)
      : [{ name, initials, color: '#FFFFFF' }, ...(event.attendees || [])];
    onUpdateEvent({ ...event, attendees });
  }

  const results = useMemo(() => {
    const publicEvents = events.filter(e => !e.personal);
    const term = (q || '').trim().toLowerCase();
    const catFiltered = selectedCategory ? publicEvents.filter(e => e.category === selectedCategory) : publicEvents;
    if (!term) return catFiltered;
    return catFiltered.filter(e => (e.title || '').toLowerCase().includes(term) || (e.location || '').toLowerCase().includes(term));
  }, [q, events, selectedCategory]);

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Explore</h1>
        <p className="tagline">Find happenings around you</p>
      </header>

      <section style={{ marginBottom: 12 }}>
        <input
          className="text-input"
          placeholder="Search events, places, tags"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </section>

      <section style={{ marginTop: 8 }}>
        <h3 style={{ margin: '6px 0' }}>Trending</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {results.slice(0, 4).map(ev => (
            <EventCard key={`t-${ev.id}`} event={ev} onJoin={handleJoin} currentUserName={localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || ''} onOpenDetails={onOpenEvent} compact />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 14 }}>
        <h3 style={{ margin: '6px 0' }}>Nearby</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {results.slice(4, 10).map(ev => (
            <EventCard key={`n-${ev.id}`} event={ev} onJoin={handleJoin} currentUserName={localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || ''} onOpenDetails={onOpenEvent} compact />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 800 }}>Browse by Category</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {CATEGORIES.map(c => {
            const count = events.filter(e => !e.personal && e.category === c.label).length;
            const isSelected = selectedCategory === c.label;
            return (
              <button
                key={c.label}
                onClick={() => setSelectedCategory(isSelected ? null : c.label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isSelected ? `${c.color}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? c.color : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12, padding: '13px 12px',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 150ms, background 150ms',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: c.color }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#EEEEFF', lineHeight: 1.2 }}>{c.label}</div>
                  {count > 0 && <div style={{ fontSize: 12, color: '#8888AA', marginTop: 2 }}>{count} event{count !== 1 ? 's' : ''}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
