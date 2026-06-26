import React from 'react';
import EventCard from './EventCard';
import './HomeFeed.css';


// HomeFeed now accepts `events` as a prop from App-level state

export default function HomeFeed({ activeTab = 'home', onNavigate = () => {}, events = [], onAddEvent = () => {}, onUpdateEvent = () => {}, onDeleteEvent = () => {}, onOpenEvent = () => {}, user = null, onAuthRequired = () => {}, groups = [], onOpenGroup = () => {} }) {
  const [showAllEvents, setShowAllEvents] = React.useState(false);
  const [cheersCount, setCheersCount] = React.useState(() => {
    try {
      const stored = Number(localStorage.getItem('rally_cheers'));
      if (Number.isNaN(stored) || stored < 0 || stored === 12) {
        localStorage.setItem('rally_cheers', '0');
        return 0;
      }
      return stored;
    } catch (e) {
      return 0;
    }
  });
  const [groupsJoined, setGroupsJoined] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rally_groups_joined') || '[]');
      return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : [];
    } catch(e){ return [] }
  });

  const spontaneousPosts = [];
  const allGroups = [];
  const validJoinedGroups = allGroups.filter((group) => groupsJoined.includes(group.id));

  const currentUserName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';

  function handleJoin(event){
    if (!user) { onAuthRequired('Sign in to join this event'); return; }
    const name = currentUserName;
    const initials = (name || 'You').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
    const exists = (event.attendees || []).some(a=>a.name === name);
    const attendees = exists ? (event.attendees || []).filter(a=>a.name !== name) : [{ name, initials, color: '#FFFFFF' }, ... (event.attendees || [])];
    const updated = { ...event, attendees };
    onUpdateEvent(updated);
  }

  function toggleGroup(id){
    const next = groupsJoined.includes(id) ? groupsJoined.filter(x=>x!==id) : [...groupsJoined, id];
    setGroupsJoined(next); localStorage.setItem('rally_groups_joined', JSON.stringify(next));
  }

  function addCheer(){
    const next = cheersCount + 1;
    setCheersCount(next);
    try {
      localStorage.setItem('rally_cheers', String(next));
      window.dispatchEvent(new Event('rally-cheers-updated'));
    } catch(e){}
  }

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Home</h1>
        <p className="tagline">Experiences are better shared</p>
      </header>

      {spontaneousPosts.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '6px 0' }}>Campus Pulse</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {spontaneousPosts.map((post) => (
              <div key={post.id} className="card" style={{ padding:'12px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, marginBottom:6 }}>{post.text}</div>
                    <div style={{ color:'#666', fontSize:12 }}>{post.location} · {post.time} · {post.group}</div>
                  </div>
                  <span className="category-pill" style={{ background: post.color, color:'#fff', fontSize:12 }}>{post.type}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 12 }}>
        <h3
          style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 6, cursor: events.length > 3 ? 'pointer' : undefined }}
          onClick={() => events.length > 3 && setShowAllEvents(s => !s)}
        >
          Upcoming
          {events.length > 3 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--purple)', fontSize: 11, fontWeight: 600 }}>
              {!showAllEvents && `+${events.length - 3}`}
              <span style={{ transition: 'transform 200ms', display: 'inline-block', transform: showAllEvents ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </span>
          )}
        </h3>
        <div className="cards">
          {(showAllEvents ? events : events.slice(0, 3)).map((ev) => (
            <EventCard key={ev.id} event={ev} onJoin={handleJoin} currentUserName={currentUserName} onOpenDetails={onOpenEvent} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 14 }}>
        <h3 style={{ margin: '6px 0' }}>Cheers</h3>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div className="cheers-count">{cheersCount}</div>
          <button className="join" onClick={addCheer}>Cheer</button>
        </div>
      </section>

      {(() => {
        const myGroups = groups.filter(g => g.members?.some(m => m.user_id && user ? m.user_id === user.id : false));
        if (!user || myGroups.length === 0) return null;
        return (
          <section style={{ marginTop: 14 }}>
            <h3 style={{ margin: '6px 0' }}>Groups</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myGroups.map(g => (
                <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => onOpenGroup(g.id)}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
                    {g.description && <div style={{ color: '#666', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description}</div>}
                  </div>
                  <div style={{ color: '#bbb', fontSize: 18, flexShrink: 0 }}>›</div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}
    </main>
  );
}
