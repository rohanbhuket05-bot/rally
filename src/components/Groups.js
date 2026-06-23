import React from 'react';
import './HomeFeed.css';

const TYPE_COLORS = {
  club:   { color: 'var(--purple)', bg: 'var(--light-purple)' },
  friend: { color: 'var(--pink)',   bg: 'var(--light-pink)' },
  event:  { color: 'var(--teal)',   bg: 'var(--light-teal)' },
};

const TYPE_LABELS = { club: 'Club / Org', friend: 'Friend Group', event: 'Event Rally' };

export default function Groups({ onNavigate = () => {}, onOpenGroup = () => {}, onCreateGroup = () => {}, groups = [] }) {
  const myName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';

  const myGroups = groups.filter(g => g.members && g.members.some(m => m.name === myName));
  const recommended = groups.filter(g => g.privacy === 'public' && !g.members?.some(m => m.name === myName));

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
