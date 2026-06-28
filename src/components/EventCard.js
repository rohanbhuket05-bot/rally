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

export default function EventCard({ event, onJoin, currentUserName, currentUserId, onOpenDetails, compact = false }) {
  const { title, date, dateISO, showTime, location, attendees = [], trending, personal } = event;
  const dateDisplay = date || (dateISO ? (showTime ? new Date(dateISO).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : new Date(dateISO).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })) : 'Date TBD');
  const joined = currentUserId
    ? attendees.some(a => a.user_id === currentUserId)
    : (currentUserName && attendees.some(a => a.name === currentUserName));
  const isHost = currentUserId ? event.user_id === currentUserId : event.host === localStorage.getItem('rally_username');

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
    const tags = (event.tags && event.tags.length > 0) ? event.tags : (event.category ? [event.category] : []);
    return (
      <article className="card" onClick={() => onOpenDetails && onOpenDetails(event)} style={{ cursor: onOpenDetails ? 'pointer' : undefined, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <h3 className="card-title" style={{ margin: 0, fontSize: 13, lineHeight: 1.3, textAlign: 'left' }}>{title}</h3>
            {event.host && <div style={{ fontSize: 11, color: '#888', textAlign: 'left', marginTop: 2 }}>Hosted by: {event.host}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {isHost && <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>My Event</span>}
            {trending && <span className="badge" style={{ fontSize: 10 }}>Trending</span>}
            {!isHost && (
              <button className={`nav-action-btn ${joined ? 'joined' : ''}`} style={{ fontSize: 10, padding: '3px 9px', height: 'auto', width: 58, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 3, transition: 'all 200ms ease', borderRadius: 20, fontWeight: 700, ...(joined ? {} : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }) }} onClick={e => { e.stopPropagation(); onJoin && onJoin(event); }}>
                {joined ? (<><svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M1.5 6l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Joined</>) : 'Join'}
              </button>
            )}
          </div>
        </div>

        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {tags.slice(0, 3).map(tag => {
              const col = CATEGORY_COLORS[tag] || '#999999';
              return <span key={tag} className="category-pill" style={{ fontSize: 10, fontWeight: 700, color: col, background: `${col}1A`, padding: '2px 7px' }}>{tag}</span>;
            })}
            {tags.length > 3 && <span style={{ fontSize: 10, color: '#8888AA', fontWeight: 600 }}>+{tags.length - 3}</span>}
          </div>
        )}

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

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <div className="avatars">
            {attendees.slice(0, 3).map((a, i) => (
              a.avatar_url
                ? <img key={i} src={a.avatar_url} alt={a.name} referrerPolicy="no-referrer" title={a.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', zIndex: 10 - i, border: '2px solid var(--card-bg, #1e1e2e)' }} />
                : <div key={i} className="avatar" title={a.name} style={{ backgroundColor: a.color || '#DDD', zIndex: 10 - i, width: 28, height: 28, fontSize: 11 }}>{a.initials || (a.name && a.name[0])}</div>
            ))}
            {attendees.length > 3 && <div className="avatar extra" style={{ width: 28, height: 28, fontSize: 11 }}>+{attendees.length - 3}</div>}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="card" onClick={() => onOpenDetails && onOpenDetails(event)} style={onOpenDetails ? { cursor: 'pointer' } : undefined}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>
          {(event.tags && event.tags.length > 0 ? event.tags : (event.category ? [event.category] : [])).map(tag => {
            const col = CATEGORY_COLORS[tag] || '#999999';
            return <span key={tag} className="category-pill" style={{ fontSize: 11, fontWeight: 700, color: col, background: `${col}1A`, whiteSpace: 'nowrap' }}>{tag}</span>;
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isHost && <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 11, fontWeight: 700 }}>My Event</span>}
          {trending && <span className="badge">Trending</span>}
          {!isHost && (
            <button className={`nav-action-btn ${joined ? 'joined' : 'join'}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, width: 76, transition: 'all 200ms ease' }} onClick={e => { e.stopPropagation(); onJoin && onJoin(event); }}>
              {joined ? (<><svg viewBox="0 0 12 12" width="11" height="11" fill="none"><path d="M1.5 6l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Joined</>) : 'Join'}
            </button>
          )}
        </div>
      </div>
      {event.host && <div style={{ fontSize: 12, color: '#888', marginBottom: 6, textAlign: 'left' }}>Hosted by: {event.host}</div>}

      <div className="card-meta">
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
            a.avatar_url
              ? <img key={i} src={a.avatar_url} alt={a.name} referrerPolicy="no-referrer" title={a.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', zIndex: 10 - i, border: '2px solid var(--card-bg, #1e1e2e)' }} />
              : <div key={i} className="avatar" title={a.name} style={{ backgroundColor: a.color || '#DDD', zIndex: 10 - i }}>{a.initials || (a.name && a.name[0])}</div>
          ))}
          {attendees.length > 5 && <div className="avatar extra">+{attendees.length - 5}</div>}
        </div>
      </div>
    </article>
  );
}
