import React from 'react';
import './HomeFeed.css';

const AVATAR_COLORS = [
  '#534AB7', '#D4537E', '#1D9E75', '#EF9F27', '#667EEA',
  '#9B59B6', '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
];

function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function EventDetails({ event, onBack, onUpdateEvent, activeTab, onNavigate, onCreateGroup = () => {}, user = null, onAuthRequired = () => {} }) {
  if (!event) return null;

  const currentUserName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';
  const { title, dateISO, showTime, location, attendees = [], trending, category } = event;

  const dateDisplay = dateISO
    ? showTime
      ? new Date(dateISO).toLocaleString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      : new Date(dateISO).toLocaleDateString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric',
        })
    : 'Date TBD';

  const joined = currentUserName && attendees.some(a => a.name === currentUserName);

  function handleJoin() {
    if (!user) { onAuthRequired('Sign in to join this event'); return; }
    const name = currentUserName;
    const initials = (name || 'You').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    const exists = attendees.some(a => a.name === name);
    const next = exists
      ? attendees.filter(a => a.name !== name)
      : [{ name, initials, color: '#FFFFFF' }, ...attendees];
    onUpdateEvent && onUpdateEvent({ ...event, attendees: next });
  }

  return (
    <main className="feed-root" style={{ overflowY: 'auto' }}>
      {/* Back + title */}
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10,
            padding: '8px 12px', color: 'var(--purple)', fontWeight: 700,
            cursor: 'pointer', flexShrink: 0, marginTop: 2,
          }}
        >
          ← Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span className="category-pill">{category || 'Campus'}</span>
            {trending && <span className="badge">Trending</span>}
          </div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#111', lineHeight: 1.2 }}>{title}</h2>
        </div>
      </header>

      {/* Details + RSVP */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-meta" style={{ marginTop: 0 }}>
          <div className="meta-row">
            <span className="meta-label">When</span>
            <span className="meta-value">{dateDisplay}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Where</span>
            <span className="meta-value">{location || 'Location TBD'}</span>
          </div>
        </div>
        <button
          onClick={handleJoin}
          className={joined ? 'nav-action-btn joined' : 'join'}
          style={{
            marginTop: 14, width: '100%', padding: '12px 0',
            fontSize: 16, borderRadius: 12, display: 'block',
          }}
        >
          {joined ? "✓  You're in" : "I'm in"}
        </button>
      </div>

      {/* Who's going */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Who's going</h3>
          <span className="badge" style={{ background: 'var(--teal)' }}>{attendees.length} going</span>
        </div>
        {attendees.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {attendees.map((a, i) => {
              const color = a.color && a.color !== '#FFFFFF' ? a.color : avatarColor(a.name);
              const initials = a.initials
                || (a.name ? a.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() : '?');
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    className="avatar"
                    style={{ backgroundColor: color, color: '#fff', flexShrink: 0, marginLeft: 0 }}
                  >
                    {initials}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name || 'Someone'}</span>
                  {a.name === currentUserName && (
                    <span style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 700 }}>You</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: 14, margin: 0 }}>No one yet — be the first!</p>
        )}
      </div>

      {/* Groups CTA — placeholder until group formation is built */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Groups</h3>
        </div>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>
          No groups formed yet. Find your crew before you show up.
        </p>
        <button
          className="join"
          style={{ width: '100%', padding: '10px 0', borderRadius: 12, display: 'block' }}
          onClick={() => { if (!user) { onAuthRequired('Sign in to form a group'); return; } onCreateGroup({ eventId: event.id, eventTitle: event.title }); }}
        >
          + Form a Group
        </button>
      </div>

      <nav className="bottom-nav">
        <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => onNavigate('home')}>
          <span className="nav-btn-icon">🏠</span>
          <span className="nav-btn-label">Home</span>
        </button>
        <button className={`nav-btn ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => onNavigate('explore')}>
          <span className="nav-btn-icon">🔍</span>
          <span className="nav-btn-label">Explore</span>
        </button>
        <button className={`nav-btn ${activeTab === 'post' ? 'active' : ''}`} onClick={() => onNavigate('post')}>
          <span className="nav-btn-icon">➕</span>
          <span className="nav-btn-label">Create</span>
        </button>
        <button className={`nav-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => onNavigate('groups')}>
          <span className="nav-btn-icon">💬</span>
          <span className="nav-btn-label">Groups</span>
        </button>
        <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => onNavigate('profile')}>
          <span className="nav-btn-icon">👤</span>
          <span className="nav-btn-label">Profile</span>
        </button>
      </nav>
    </main>
  );
}
