import React from 'react';
import EventCard from './EventCard';
import './HomeFeed.css';

// HomeFeed now accepts `events` as a prop from App-level state

export default function HomeFeed({ activeTab = 'home', onNavigate = () => {}, events = [], onAddEvent = () => {}, onUpdateEvent = () => {}, onDeleteEvent = () => {} }) {
  const [cheersCount, setCheersCount] = React.useState(() => { try { return Number(localStorage.getItem('rally_cheers') || 12) } catch(e){ return 12 } });
  const [groupsJoined, setGroupsJoined] = React.useState(() => { try { return JSON.parse(localStorage.getItem('rally_groups_joined') || '[]') } catch(e){ return [] } });

  const spontaneousPosts = [
    { id: 'p1', text: 'Anyone want to grab late-night pho at Price Center?', location: 'Price Center', time: 'Now', group: 'UCSD students', type: 'Live', color: 'var(--teal)' },
    { id: 'p2', text: 'Looking for 2 people to run the lake path tomorrow.', location: 'Sunset Cliffs', time: 'Tonight', group: 'Campus runners', type: 'Rally', color: 'var(--amber)' },
  ];

  const currentUserName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || 'You';

  function handleJoin(event){
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
    const next = cheersCount + 1; setCheersCount(next); try { localStorage.setItem('rally_cheers', String(next)) } catch(e){}
  }

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Home</h1>
        <p className="tagline">Experiences are better shared</p>
      </header>

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

      <section style={{ marginBottom: 12 }}>
        <h3 style={{ margin: '6px 0' }}>Upcoming</h3>
        <div className="cards">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} onJoin={handleJoin} currentUserName={currentUserName} />
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

      <section style={{ marginTop: 14 }}>
        <h3 style={{ margin: '6px 0' }}>Groups</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { id:'g1', name:'Live Music Club', members:24 },
            { id:'g2', name:'Campus Climbers', members:8 }
          ].map(g => (
            <div key={g.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700 }}>{g.name}</div>
                <div style={{ color:'#666', fontSize:13 }}>{g.members} members</div>
              </div>
              <button className={`nav-action-btn ${groupsJoined.includes(g.id) ? 'joined' : 'join'}`} onClick={() => toggleGroup(g.id)}>{groupsJoined.includes(g.id) ? 'Joined' : 'Join'}</button>
            </div>
          ))}
        </div>
      </section>

      <nav className="bottom-nav">
        <button
          className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          <span className="nav-btn-icon">🏠</span>
          <span className="nav-btn-label">Home</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'explore' ? 'active' : ''}`}
          onClick={() => onNavigate('explore')}
        >
          <span className="nav-btn-icon">🔍</span>
          <span className="nav-btn-label">Explore</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'post' ? 'active' : ''}`}
          onClick={() => onNavigate('post')}
        >
          <span className="nav-btn-icon">➕</span>
          <span className="nav-btn-label">Create</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => onNavigate('groups')}
        >
          <span className="nav-btn-icon">💬</span>
          <span className="nav-btn-label">Groups</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => onNavigate('profile')}
        >
          <span className="nav-btn-icon">👤</span>
          <span className="nav-btn-label">Profile</span>
        </button>
      </nav>
    </main>
  );
}
