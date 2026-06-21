import React from 'react';
import './HomeFeed.css';

export default function EventCard({ event, onJoin, currentUserName }) {
  const { title, date, dateISO, showTime, location, attendees = [], trending } = event;
  const dateDisplay = date || (dateISO ? (showTime ? new Date(dateISO).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : new Date(dateISO).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })) : 'Date TBD');
  const joined = currentUserName && attendees.some(a => a.name === currentUserName);

  return (
    <article className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {trending && <span className="badge">Trending</span>}
      </div>

      <div className="card-meta">
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8, alignItems:'center' }}>
          <span className="category-pill">{event.category || 'Campus'}</span>
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
            <div
              key={i}
              className="avatar"
              title={a.name}
              style={{ backgroundColor: a.color || '#DDD', zIndex: 10 - i }}
            >
              {a.initials || (a.name && a.name[0])}
            </div>
          ))}
          {attendees.length > 5 && (
            <div className="avatar extra">+{attendees.length - 5}</div>
          )}
        </div>
        <button className={`nav-action-btn ${joined ? 'joined' : 'join'}`} onClick={() => onJoin && onJoin(event)}>{joined ? 'Joined' : "I'm in"}</button>
      </div>
    </article>
  );
}
