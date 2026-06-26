import React from 'react';
import './HomeFeed.css';

const CATEGORY_COLORS = {
  Music:       '#9D8FFF',
  Food:        '#FF6BA8',
  Outdoors:    '#00E5A8',
  'On Campus': '#FFB420',
  Casual:      '#667EEA',
  Social:      '#FF6BA8',
  Sports:      '#00E5A8',
  Arts:        '#9B59B6',
  Gaming:      '#667EEA',
  Other:       '#999999',
};

export default function EventCard({ event, onJoin, currentUserName, onOpenDetails, compact = false }) {
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

  if (compact) {
    const cat = event.category || 'On Campus';
    const col = CATEGORY_COLORS[cat] || '#999999';
    return (
      <article className="card" onClick={() => onOpenDetails && onOpenDetails(event)} style={{ cursor: onOpenDetails ? 'pointer' : undefined, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: 13, lineHeight: 1.3 }}>{title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {isHost && <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>My Event</span>}
            {trending && <span className="badge" style={{ fontSize: 10 }}>Trending</span>}
          </div>
        </div>

        {event.host && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, color: '#888' }}>Hosted by: {event.host}</div>
            <span className="category-pill" style={{ fontSize: 10, fontWeight: 700, color: col, background: `${col}1A`, padding: '2px 7px' }}>{cat}</span>
          </div>
        )}
        {!event.host && (
          <span className="category-pill" style={{ fontSize: 10, fontWeight: 700, color: col, background: `${col}1A`, padding: '2px 7px', alignSelf: 'flex-start' }}>{cat}</span>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span className="category-pill" style={{ color: 'var(--teal)', background: 'var(--light-teal)', fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>{attendees.length} going</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div className="meta-row" style={{ fontSize: 11 }}>
            <span className="meta-label">When</span>
            <span className="meta-value" style={{ fontSize: 11 }}>{dateDisplay}</span>
          </div>
          <div className="meta-row" style={{ fontSize: 11 }}>
            <span className="meta-label">Where</span>
            <span className="meta-value" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{location}</span>
          </div>
        </div>

        <div className="card-footer" style={{ marginTop: 4 }}>
          <div className="avatars">
            {attendees.slice(0, 3).map((a, i) => (
              <div key={i} className="avatar" title={a.name} style={{ backgroundColor: a.color || '#DDD', zIndex: 10 - i, width: 28, height: 28, fontSize: 11 }}>
                {a.initials || (a.name && a.name[0])}
              </div>
            ))}
            {attendees.length > 3 && <div className="avatar extra" style={{ width: 28, height: 28, fontSize: 11 }}>+{attendees.length - 3}</div>}
          </div>
          {!isHost && (
            <button className={`nav-action-btn ${joined ? 'joined' : 'join'}`} style={{ fontSize: 11, padding: '4px 10px', height: 'auto', minWidth: 0 }} onClick={e => { e.stopPropagation(); onJoin && onJoin(event); }}>{joined ? 'Joined' : "I'm in"}</button>
          )}
        </div>
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
            const col = CATEGORY_COLORS[cat] || '#999999';
            return <span className="category-pill" style={{ fontSize: 11, fontWeight: 700, color: col, background: `${col}1A`, whiteSpace: 'nowrap' }}>{cat}</span>;
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
          <span className="category-pill" style={{ color: 'var(--teal)', background: 'var(--light-teal)', fontSize: 11, fontWeight: 700 }}>{attendees.length} going</span>
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
