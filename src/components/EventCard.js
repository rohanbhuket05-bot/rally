import React from 'react';
import './HomeFeed.css';

const CATEGORY_COLORS = {
  Music:    'var(--purple)',
  Food:     'var(--pink)',
  Outdoors: 'var(--teal)',
  'On Campus': 'var(--amber)',
  Casual:   '#667EEA',
  Social:   'var(--pink)',
  Sports:   'var(--teal)',
  Arts:     '#9B59B6',
  Gaming:   '#667EEA',
  Other:    '#999',
};

export default function EventCard({ event, onJoin, currentUserName, onOpenDetails }) {
  const { title, date, dateISO, showTime, location, attendees = [], trending, personal } = event;
  const dateDisplay = date || (dateISO ? (showTime ? new Date(dateISO).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : new Date(dateISO).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })) : 'Date TBD');
  const joined = currentUserName && attendees.some(a => a.name === currentUserName);
  const isHost = event.host && event.host === localStorage.getItem('rally_username');

  if (personal) {
    return (
      <article className="card" onClick={() => onOpenDetails && onOpenDetails(event)} style={{ padding: '10px 12px', cursor: onOpenDetails ? 'pointer' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
          <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>{dateDisplay}</span>
        </div>
        {(location || event.city) && <div style={{ fontSize: 12, color: '#aaa', marginTop: 2, textAlign: 'left' }}>{[location, event.city].filter(Boolean).join(', ')}</div>}
      </article>
    );
  }

  return (
    <article className="card" onClick={() => onOpenDetails && onOpenDetails(event)} style={onOpenDetails ? { cursor: 'pointer' } : undefined}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>
          {(() => {
            const cat = event.category || 'On Campus';
            const col = CATEGORY_COLORS[cat] || '#999';
            return <span style={{ fontSize: 11, fontWeight: 700, color: col, border: `1.5px solid ${col}`, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{cat}</span>;
          })()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isHost && <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 11, fontWeight: 700 }}>My Event</span>}
          {trending && <span className="badge">Trending</span>}
        </div>
      </div>
      {event.host && <div style={{ fontSize: 12, color: '#888', marginBottom: 6, textAlign: 'left' }}>Hosted by: {event.host}</div>}

      <div className="card-meta">
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8, alignItems:'center' }}>
          <span className="badge" style={{ background:'var(--teal)' }}>{attendees.length} going</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">When</span>
          <span className="meta-value">{dateDisplay}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Where</span>
          <span className="meta-value">{location}</span>
        </div>
      </div>

      <div className="card-footer">
        <div className="avatars">
          {attendees.slice(0, 5).map((a, i) => (
            <div key={i} className="avatar" title={a.name} style={{ backgroundColor: a.color || '#DDD', zIndex: 10 - i }}>
              {a.initials || (a.name && a.name[0])}
            </div>
          ))}
          {attendees.length > 5 && <div className="avatar extra">+{attendees.length - 5}</div>}
        </div>
        {!isHost && <button className={`nav-action-btn ${joined ? 'joined' : 'join'}`} onClick={e => { e.stopPropagation(); onJoin && onJoin(event); }}>{joined ? 'Joined' : "I'm in"}</button>}
      </div>
    </article>
  );
}
