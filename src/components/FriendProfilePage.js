import React, { useState, useEffect } from 'react';
import { getProfile, getEventsByUserId } from '../lib/supabaseClient';
import './HomeFeed.css';

const AVATAR_COLORS = ['#534AB7', '#D4537E', '#1D9E75', '#EF9F27', '#667EEA', '#9B59B6'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function FriendProfilePage({ friendId, onBack, groups = [] }) {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!friendId) return;
    setLoading(true);
    Promise.all([getProfile(friendId), getEventsByUserId(friendId)]).then(([p, evs]) => {
      setProfile(p);
      setEvents(evs || []);
      setLoading(false);
    });
  }, [friendId]);

  const name = profile?.name || profile?.username || '?';
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  const now = new Date();
  const hostedCount = events.filter(e => !e.personal && e.date_iso && new Date(e.date_iso) < now).length;
  const attendedCount = events.filter(e => e.date_iso && new Date(e.date_iso) < now).length;
  const cheersCount = profile?.cheers || 0;

  const friendGroups = groups.filter(g =>
    (g.members || []).some(m => m.user_id === friendId)
  );

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
        ) : (
          <>
            {/* Profile hero card — matches personal profile layout */}
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
                  <div className="username" style={{ textAlign: 'left', margin: '3px 0 0' }}>{name}</div>
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
                {attendedCount > 0 && (
                  <span className="category-pill" style={{ background: 'var(--light-pink)', color: 'var(--pink)', fontSize: 12, padding: '6px 10px' }}>
                    {attendedCount} attended
                  </span>
                )}
              </div>

              {/* Bio below pills */}
              {profile?.bio && (
                <p style={{ margin: '10px 0 0', color: '#EEEEFF', textAlign: 'left', fontSize: 14, lineHeight: 1.5 }}>
                  {profile.bio}
                </p>
              )}
            </section>

            {/* Groups */}
            {friendGroups.length > 0 && (
              <section style={{ marginTop: 14 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Groups</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {friendGroups.map(g => (
                    <div key={g.id} style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      fontWeight: 700, fontSize: 14, color: '#EEEEFF', textAlign: 'left',
                    }}>
                      {g.name}
                      {g.members && <div style={{ fontSize: 12, color: '#666', fontWeight: 400, marginTop: 2 }}>{g.members.length} members</div>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
