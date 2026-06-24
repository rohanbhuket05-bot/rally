import React, { useState, useEffect } from 'react';
import { isSupabaseConfigured, getGroupInvites, acceptGroupInvite, declineGroupInvite } from '../lib/supabaseClient';
import './HomeFeed.css';

const TYPE_COLORS = {
  club:   { color: 'var(--purple)', bg: 'var(--light-purple)' },
  friend: { color: 'var(--pink)',   bg: 'var(--light-pink)' },
  event:  { color: 'var(--teal)',   bg: 'var(--light-teal)' },
};

const TYPE_LABELS = { club: 'Club / Org', friend: 'Friend Group', event: 'Event Rally' };

const AVATAR_COLORS = ['#534AB7','#D4537E','#1D9E75','#EF9F27','#667EEA','#9B59B6'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function Groups({
  onNavigate = () => {},
  onOpenGroup = () => {},
  onCreateGroup = () => {},
  onGroupJoined = () => {},
  onViewGroup = () => {},
  groups = [],
  user,
}) {
  const myName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';
  const [invites, setInvites] = useState([]);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    getGroupInvites(user.id).then(setInvites);
  }, [user]);

  const myGroups = groups.filter(g =>
    g.members && (
      g.members.some(m => m.user_id && user ? m.user_id === user.id : m.name === myName)
    )
  );
  const recommended = groups.filter(g =>
    g.privacy === 'public' && !g.members?.some(m => m.user_id && user ? m.user_id === user.id : m.name === myName)
  );

  async function handleAccept(invite) {
    if (!user) return;
    const displayName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || 'You';
    const initials = displayName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    const memberEntry = {
      name: displayName,
      initials,
      color: avatarColor(displayName),
      role: 'member',
      user_id: user.id,
    };
    setAcceptError('');
    try {
      const group = await acceptGroupInvite(invite.id, memberEntry);
      if (group) {
        setInvites(s => s.filter(i => i.id !== invite.id));
        onGroupJoined(group);
      }
    } catch (e) {
      setAcceptError(e.message || 'Failed to accept invite.');
    }
  }

  async function handleDecline(invite) {
    const ok = await declineGroupInvite(invite.id);
    if (ok) setInvites(s => s.filter(i => i.id !== invite.id));
  }

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Groups</h1>
        <p className="tagline">Clubs, crews, and rallies</p>
      </header>

      {/* Create CTA */}
      <section style={{ marginTop: 8, marginBottom: 8 }}>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Create a group</div>
            <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Club, friend group, or event rally.</div>
          </div>
          <button className="join" style={{ borderRadius: 10, padding: '8px 16px', flexShrink: 0 }} onClick={() => onCreateGroup({})}>
            + New
          </button>
        </div>
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section style={{ marginTop: 8 }}>
          <h3 style={{ margin: '6px 0' }}>Invites</h3>
          {acceptError && (
            <div style={{ fontSize: 12, color: '#E74C3C', background: 'rgba(231,76,60,0.08)', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
              ⚠ {acceptError}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invites.map(inv => {
              const g = inv.group;
              if (!g) return null;
              const { color, bg } = TYPE_COLORS[g.type] || TYPE_COLORS.club;
              return (
                <div key={inv.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{g.name}</div>
                      {g.description && <div style={{ color: '#666', fontSize: 13, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description}</div>}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="category-pill" style={{ background: bg, color, fontSize: 11 }}>{TYPE_LABELS[g.type] || g.type}</span>
                        <span style={{ color: '#888', fontSize: 12 }}>{(g.members || []).length} members</span>
                      </div>
                    </div>
                  </div>
                  {inv.inviter && (
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
                      Invited by <strong>{inv.inviter.name || inv.inviter.username}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="join"
                      style={{ flex: 1, borderRadius: 8, padding: '7px 0', fontSize: 13 }}
                      onClick={() => handleAccept(inv)}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onViewGroup(g)}
                      style={{ flex: 1, borderRadius: 8, padding: '7px 0', fontSize: 13, background: 'none', border: '1px solid var(--purple)', color: 'var(--purple)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDecline(inv)}
                      style={{ flex: 1, borderRadius: 8, padding: '7px 0', fontSize: 13, background: 'none', border: '1px solid #E74C3C', color: '#E74C3C', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Your groups */}
      <section style={{ marginTop: 8 }}>
        <h3 style={{ margin: '6px 0' }}>Your groups</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myGroups.length > 0 ? myGroups.map(g => (
            <GroupRow key={g.id} group={g} onOpen={() => onOpenGroup(g.id)} />
          )) : (
            <div className="card" style={{ color: '#888', fontSize: 14 }}>
              No groups yet. Create one or join a public group below.
            </div>
          )}
        </div>
      </section>

      {/* Recommended / Discover */}
      {recommended.length > 0 && (
        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: '6px 0' }}>Discover</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommended.map(g => (
              <GroupRow key={g.id} group={g} onOpen={() => onOpenGroup(g.id)} />
            ))}
          </div>
        </section>
      )}

      <nav className="bottom-nav">
        <button className={`nav-btn`} onClick={() => onNavigate('home')}>
          <span className="nav-btn-icon">🏠</span><span className="nav-btn-label">Home</span>
        </button>
        <button className={`nav-btn`} onClick={() => onNavigate('explore')}>
          <span className="nav-btn-icon">🔍</span><span className="nav-btn-label">Explore</span>
        </button>
        <button className={`nav-btn`} onClick={() => onNavigate('post')}>
          <span className="nav-btn-icon">➕</span><span className="nav-btn-label">Create</span>
        </button>
        <button className={`nav-btn active`} onClick={() => onNavigate('groups')}>
          <span className="nav-btn-icon">💬</span><span className="nav-btn-label">Groups</span>
        </button>
        <button className={`nav-btn`} onClick={() => onNavigate('profile')}>
          <span className="nav-btn-icon">👤</span><span className="nav-btn-label">Profile</span>
        </button>
      </nav>
    </main>
  );
}

function GroupRow({ group, onOpen }) {
  const { type = 'club', privacy = 'public', members = [], name, description, eventTitle } = group;
  const { color, bg } = TYPE_COLORS[type] || TYPE_COLORS.club;

  return (
    <div
      className="card"
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      onClick={onOpen}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{name}</div>
        {description && <div style={{ color: '#666', fontSize: 13, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</div>}
        {eventTitle && <div style={{ color: 'var(--teal)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>🎯 {eventTitle}</div>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="category-pill" style={{ background: bg, color, fontSize: 11 }}>{TYPE_LABELS[type]}</span>
          <span style={{ color: '#888', fontSize: 12 }}>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
          {privacy !== 'public' && <span className="category-pill" style={{ background: '#F5F5F5', color: '#777', fontSize: 11 }}>{privacy === 'private' ? 'Private' : 'Friends Only'}</span>}
        </div>
      </div>
      <div style={{ color: '#bbb', fontSize: 18, flexShrink: 0 }}>›</div>
    </div>
  );
}
