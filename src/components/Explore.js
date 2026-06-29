import React, { useState, useEffect, useMemo } from 'react';
import EventCard from './EventCard';
import { getPublicEvents } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import CATEGORIES from '../data/categories';
import './HomeFeed.css';

export default function Explore({ events = [], onNavigate = () => {}, onOpenEvent = () => {}, onUpdateEvent = () => {}, user = null, profile = null, onAuthRequired = () => {} }) {
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dbPublicEvents, setDbPublicEvents] = useState([]);

  useEffect(() => {
    getPublicEvents().then(rows => {
      setDbPublicEvents(rows.map(r => ({
        id: r.id,
        title: r.title,
        dateISO: r.date_iso || r.dateISO,
        showTime: r.show_time ?? r.showTime ?? true,
        location: r.location || '',
        city: r.city || '',
        category: r.category || '',
        tags: r.tags || [],
        host: r.host || '',
        personal: false,
        attendees: r.attendees || [],
        description: r.description || '',
        user_id: r.user_id,
      })));
    });
  }, []);

  const allPublicEvents = useMemo(() => {
    const dbIds = new Set(dbPublicEvents.map(e => e.id));
    const localOnly = events.filter(e => !dbIds.has(e.id));
    return [...dbPublicEvents, ...localOnly];
  }, [dbPublicEvents, events]);

  function handleJoin(event) {
    if (!user) { onAuthRequired('Sign in to join this event'); return; }
    const name = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';
    const initials = getInitials(name || 'You');
    const exists = (event.attendees || []).some(a => a.name === name);
    const attendees = exists
      ? (event.attendees || []).filter(a => a.name !== name)
      : [{ name, initials, color: '#FFFFFF', user_id: user?.id, avatar_url: profile?.avatar_url || '' }, ...(event.attendees || [])];
    const updated = { ...event, attendees };
    setDbPublicEvents(s => s.map(e => e.id === updated.id ? updated : e));
    onUpdateEvent(updated);
  }

  const results = useMemo(() => {
    const term = (q || '').trim().toLowerCase();
    const catFiltered = selectedCategory
      ? allPublicEvents.filter(e => e.category === selectedCategory || (e.tags || []).includes(selectedCategory))
      : allPublicEvents;
    if (!term) return catFiltered;
    return catFiltered.filter(e =>
      (e.title || '').toLowerCase().includes(term) ||
      (e.location || '').toLowerCase().includes(term) ||
      (e.city || '').toLowerCase().includes(term)
    );
  }, [q, allPublicEvents, selectedCategory]);

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Explore</h1>
        <p className="tagline">Find happenings around you</p>
      </header>
      <div className="scroll-area">

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
        <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Trending</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {results.slice(0, 4).map(ev => (
            <EventCard key={`t-${ev.id}`} event={ev} onJoin={handleJoin} currentUserName={localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || ''} currentUserId={user?.id} onOpenDetails={onOpenEvent} compact />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 14 }}>
        <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Nearby</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {results.slice(4, 10).map(ev => (
            <EventCard key={`n-${ev.id}`} event={ev} onJoin={handleJoin} currentUserName={localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || ''} currentUserId={user?.id} onOpenDetails={onOpenEvent} compact />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 800, textAlign: 'left' }}>Browse by Category</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {CATEGORIES.map(c => {
            const count = allPublicEvents.filter(e => e.category === c.label || (e.tags || []).includes(c.label)).length;
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
      </div>
    </main>
  );
}
