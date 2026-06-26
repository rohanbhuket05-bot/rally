import React, { useState, useEffect } from 'react';
import { getProfile, getEventsByUserId } from '../lib/supabaseClient';
import './HomeFeed.css';

const AVATAR_COLORS = ['#534AB7', '#D4537E', '#1D9E75', '#EF9F27', '#667EEA', '#9B59B6'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function formatDate(dateISO, showTime) {
  if (!dateISO) return 'Date TBD';
  return showTime
    ? new Date(dateISO).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : new Date(dateISO).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function FriendProfilePage({ friendId, onBack, groups = [] }) {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  useEffect(() => {
    if (!friendId) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    setNotFound(false);
    Promise.all([getProfile(friendId), getEventsByUserId(friendId)]).then(([p, evs]) => {
      if (!p) { setNotFound(true); setLoading(false); return; }
      setProfile(p);
      setEvents((evs || []).map(r => ({
        id: r.id,
        title: r.title,
        dateISO: r.date_iso || r.dateISO,
        showTime: r.show_time ?? r.showTime ?? true,
        location: r.location,
        city: r.city || '',
        personal: r.personal ?? false,
      })));
      setLoading(false);
    });
  }, [friendId]);

  const name = profile?.name || profile?.username || '?';
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  const now = new Date();
  const upcomingEvents = events.filter(e => !e.personal && (!e.dateISO || new Date(e.dateISO) >= now));
  const attendedEvents = events.filter(e => !e.personal && e.dateISO && new Date(e.dateISO) < now);

  const friendGroups = groups.filter(g => (g.members || []).some(m => m.user_id === friendId));

  const hostedCount = attendedEvents.length;
  const cheersCount = profile?.cheers || 0;

  return (
    <main className="feed-root">
      <header style={{ display: 'flex', alignItems: 'center', padding: '0 4px 12px', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10,
            padding: '8px 14px', color: 'var(--purple)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </header>

      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: 'calc(var(--bottom-nav-height) + 16px)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888', fontSize: 14 }}>Loading...</div>
        ) : notFound ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <line x1="18" y1="6" x2="22" y2="10"/><line x1="22" y1="6" x2="18" y2="10"/>
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#EEEEFF', marginBottom: 8 }}>User not found</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>This profile may have been deleted or doesn't exist.</div>
            <button onClick={onBack} style={{ background: 'rgba(83,74,183,0.15)', border: 'none', borderRadius: 10, padding: '10px 20px', color: 'var(--purple)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>← Back</button>
          </div>
        ) : (
          <>
            {/* Profile hero card */}
            <section className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={name}
                    referrerPolicy="no-referrer"
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}
                  />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: avatarColor(name), color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 800, flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 20, textAlign: 'left' }}>
                    {profile?.username ? `@${profile.username}` : name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <div className="username" style={{ textAlign: 'left', margin: 0 }}>{name}</div>
                    {profile?.pronouns && <span style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>{profile.pronouns}</span>}
                  </div>
                </div>
              </div>

              {/* Pills */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: profile?.bio ? 10 : 0 }}>
                {profile?.school && (
                  <span style={{
                    background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
                    fontSize: 12, padding: '6px 10px', fontWeight: 700,
                    border: 'none', borderRadius: 999,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.76 2.24 5 5 5s5-2.24 5-5v-4.27l2-1.09V17h2V11.18L23 9 12 3zm5 14c0 1.66-1.34 3-3 3s-3-1.34-3-3v-3.73l3 1.64 3-1.64V17z"/>
                    </svg>
                    {profile.school}
                    {profile.school_verified && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#38bdf8' }}>
                        <svg viewBox="0 0 24 24" width="9" height="9" fill="#fff">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                      </span>
                    )}
                  </span>
                )}
                {cheersCount > 0 && (
                  <span className="category-pill" style={{ background: 'var(--light-teal)', color: 'var(--teal)', fontSize: 12, padding: '6px 10px' }}>
                    {cheersCount} cheers
                  </span>
                )}
                {hostedCount > 0 && (
                  <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 12, padding: '6px 10px' }}>
                    {hostedCount} hosted
                  </span>
                )}
                {attendedEvents.length > 0 && (
                  <span className="category-pill" style={{ background: 'var(--light-pink)', color: 'var(--pink)', fontSize: 12, padding: '6px 10px' }}>
                    {attendedEvents.length} attended
                  </span>
                )}
              </div>

              {profile?.bio && (
                <p style={{ margin: '10px 0 0', color: '#EEEEFF', textAlign: 'left', fontSize: 14, lineHeight: 1.5 }}>
                  {profile.bio}
                </p>
              )}
            </section>

            {/* Upcoming events */}
            <section style={{ marginTop: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3
                  style={{ margin: '6px 0', cursor: upcomingEvents.length > 3 ? 'pointer' : undefined, display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => upcomingEvents.length > 3 && setShowAllUpcoming(s => !s)}
                >
                  Upcoming
                  {upcomingEvents.length > 3 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--purple)', fontSize: 11, fontWeight: 600 }}>
                      {!showAllUpcoming && `+${upcomingEvents.length - 3}`}
                      <span style={{ transition: 'transform 200ms', display: 'inline-block', transform: showAllUpcoming ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </span>
                  )}
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {(showAllUpcoming ? upcomingEvents : upcomingEvents.slice(0, 3)).map(ev => (
                  <div key={ev.id} className="card event-card">
                    <div style={{ fontWeight: 700, fontSize: 14, textAlign: 'left' }}>{ev.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: '#aaa' }}>{[ev.location, ev.city].filter(Boolean).join(', ')}</span>
                      <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>{formatDate(ev.dateISO, ev.showTime)}</span>
                    </div>
                  </div>
                ))}
                {upcomingEvents.length === 0 && (
                  <div style={{ fontSize: 13, color: '#888' }}>No upcoming events.</div>
                )}
              </div>
            </section>

            {/* Attended events */}
            <section style={{ marginTop: 14, width: '100%' }}>
              <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Attended</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attendedEvents.map(ev => (
                  <div key={ev.id} className="card event-card">
                    <div style={{ fontWeight: 700, fontSize: 14, textAlign: 'left' }}>{ev.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: '#aaa' }}>{[ev.location, ev.city].filter(Boolean).join(', ')}</span>
                      <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>{formatDate(ev.dateISO, ev.showTime)}</span>
                    </div>
                  </div>
                ))}
                {attendedEvents.length === 0 && (
                  <div style={{ fontSize: 13, color: '#888' }}>No attended events yet.</div>
                )}
              </div>
            </section>

            {/* Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <section style={{ marginTop: 14, width: '100%' }}>
                <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Groups</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {friendGroups.map(g => (
                    <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>{g.name}</div>
                        <div style={{ color: '#666', fontSize: 13, textAlign: 'left' }}>{(g.members || []).length} members</div>
                      </div>
                    </div>
                  ))}
                  {friendGroups.length === 0 && (
                    <div style={{ fontSize: 13, color: '#888' }}>No shared groups.</div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
