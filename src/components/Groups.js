import React, { useState } from 'react';
import './HomeFeed.css';

export default function Groups({ onNavigate = () => {}, onOpenGroup = () => {} }){
  const saved = (()=>{ try { return JSON.parse(localStorage.getItem('rally_groups_joined')||'[]') } catch(e){ return [] } })();
  const [joined, setJoined] = useState(saved);

  const recommended = [
    { id: 'g3', name: 'Board Game Night', members: 18, privacy: 'Public' },
    { id: 'g4', name: 'Hiking Crew', members: 42, privacy: 'Friends' },
    { id: 'g5', name: 'Vegan Eats', members: 9, privacy: 'Open' },
  ];

  function toggle(id){
    const next = joined.includes(id) ? joined.filter(x=>x!==id) : [...joined, id];
    setJoined(next); localStorage.setItem('rally_groups_joined', JSON.stringify(next));
  }

  const allGroups = [
    { id:'g1', name:'Live Music Club', members:24, privacy: 'Public' },
    { id:'g2', name:'Campus Climbers', members:8, privacy: 'Private' },
  ];

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Groups</h1>
        <p className="tagline">Clubs and communities</p>
      </header>

      <section style={{ marginTop:8 }}>
        <div className="card" style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700 }}>Build a group for your next plan</div>
            <div style={{ color:'#666', fontSize:13, marginTop:4 }}>Set a target size and first prompt, then let people join with less pressure.</div>
          </div>
          <button className="nav-btn" onClick={()=>alert('Group creation flow coming soon!')}>Start</button>
        </div>
      </section>

      <section style={{ marginTop:8 }}>
        <h3 style={{ margin:'6px 0' }}>Your groups</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {allGroups.filter(g => joined.includes(g.id)).length ? allGroups.filter(g => joined.includes(g.id)).map(g => (
            <div key={g.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => onOpenGroup(g.id)}>
              <div>
                <div style={{ fontWeight:700 }}>{g.name}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', color:'#666', fontSize:13 }}>
                  <span className="category-pill" style={{ background:'var(--light-purple)', color:'var(--purple)', fontSize:12 }}>{g.privacy}</span>
                  <span>{g.members} members</span>
                </div>
              </div>
              <button className="nav-action-btn joined" onClick={(e)=>{ e.stopPropagation(); toggle(g.id); }}>Joined</button>
            </div>
          )) : (
            <div className="card">You haven't joined any groups yet.</div>
          )}
        </div>
      </section>

      <section style={{ marginTop:14 }}>
        <h3 style={{ margin:'6px 0' }}>Recommended</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {recommended.map(g => (
            <div key={g.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700 }}>{g.name}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', color:'#666', fontSize:13 }}>
                  <span className="category-pill" style={{ background:'var(--light-purple)', color:'var(--purple)', fontSize:12 }}>{g.privacy}</span>
                  <span>{g.members} members</span>
                </div>
              </div>
              <button className={`nav-action-btn ${joined.includes(g.id)?'joined':'join'}`} onClick={()=>toggle(g.id)}>{joined.includes(g.id)?'Joined':'Join'}</button>
            </div>
          ))}
        </div>
      </section>

      <nav className="bottom-nav">
        <button className={`nav-btn`} onClick={()=>onNavigate('home')}>
          <span className="nav-btn-icon">🏠</span>
          <span className="nav-btn-label">Home</span>
        </button>
        <button className={`nav-btn`} onClick={()=>onNavigate('explore')}>
          <span className="nav-btn-icon">🔍</span>
          <span className="nav-btn-label">Explore</span>
        </button>
        <button className={`nav-btn`} onClick={()=>onNavigate('post')}>
          <span className="nav-btn-icon">➕</span>
          <span className="nav-btn-label">Create</span>
        </button>
        <button className={`nav-btn active`} onClick={()=>onNavigate('groups')}>
          <span className="nav-btn-icon">💬</span>
          <span className="nav-btn-label">Groups</span>
        </button>
        <button className={`nav-btn`} onClick={()=>onNavigate('profile')}>
          <span className="nav-btn-icon">👤</span>
          <span className="nav-btn-label">Profile</span>
        </button>
      </nav>
    </main>
  );
}
