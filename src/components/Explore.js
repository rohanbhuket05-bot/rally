import React, { useState, useMemo } from 'react';
import EventCard from './EventCard';
import './HomeFeed.css';

export default function Explore({ events = [], onNavigate = () => {}, onOpenEvent = () => {} }) {
  const [q, setQ] = useState('');

  const categories = [
    { label: 'Music', color: 'var(--purple)' },
    { label: 'Food', color: 'var(--pink)' },
    { label: 'Outdoors', color: 'var(--teal)' },
    { label: 'Campus', color: 'var(--amber)' },
    { label: 'Casual', color: '#667EEA' },
  ];

  const results = useMemo(() => {
    const publicEvents = events.filter(e => !e.personal);
    const term = (q || '').trim().toLowerCase();
    if (!term) return publicEvents;
    return publicEvents.filter(e => (e.title || '').toLowerCase().includes(term) || (e.location || '').toLowerCase().includes(term));
  }, [q, events]);

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
        <div className="cards">
          {results.slice(0,3).map(ev => (
            <EventCard key={`t-${ev.id}`} event={ev} onOpenDetails={onOpenEvent} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 14 }}>
        <h3 style={{ margin: '6px 0' }}>Nearby</h3>
        <div className="cards">
          {results.slice(0,5).map(ev => (
            <EventCard key={`n-${ev.id}`} event={ev} onOpenDetails={onOpenEvent} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 14 }}>
        <h3 style={{ margin: '6px 0' }}>Categories</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c.label} className="nav-btn" style={{ padding: '8px 12px', borderColor:c.color, color:c.color, background:'#fff' }}>{c.label}</button>
          ))}
        </div>
      </section>

      <nav className="bottom-nav">
        <button className={`nav-btn`} onClick={()=>onNavigate('home')}>
          <span className="nav-btn-icon">🏠</span>
          <span className="nav-btn-label">Home</span>
        </button>
        <button className={`nav-btn active`} onClick={()=>onNavigate('explore')}>
          <span className="nav-btn-icon">🔍</span>
          <span className="nav-btn-label">Explore</span>
        </button>
        <button className={`nav-btn`} onClick={()=>onNavigate('post')}>
          <span className="nav-btn-icon">➕</span>
          <span className="nav-btn-label">Create</span>
        </button>
        <button className={`nav-btn`} onClick={()=>onNavigate('groups')}>
          <span className="nav-btn-icon">💬</span>
          <span className="nav-btn-label">Groups</span>
        </button>
        <button className={`nav-btn`} onClick={()=>onNavigate('profile')}>
          <span className="nav-btn-icon">👤</span>
          <span className="nav-btn-label">Profile</span>
        </button>
      </nav>
    </main>
  );
}
