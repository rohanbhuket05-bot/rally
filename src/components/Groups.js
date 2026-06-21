import React, { useState } from 'react';
import './HomeFeed.css';

export default function Groups({ onNavigate = () => {}, onOpenGroup = () => {} }){
  const saved = (()=>{ try { return JSON.parse(localStorage.getItem('rally_groups_joined')||'[]') } catch(e){ return [] } })();
  const [joined, setJoined] = useState(saved);

  const recommended = [];

  function toggle(id){
    const next = joined.includes(id) ? joined.filter(x=>x!==id) : [...joined, id];
    setJoined(next); localStorage.setItem('rally_groups_joined', JSON.stringify(next));
  }

  const allGroups = [];

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Groups</h1>
        <p className="tagline">Clubs and communities</p>
      </header>

      <section style={{ marginTop:8 }}>
        <div className="card" style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700 }}>Create a new group</div>
            <div style={{ color:'#666', fontSize:13, marginTop:4 }}>Start a group by setting details, time, and location.</div>
          </div>
          <button className="nav-btn" onClick={()=>onNavigate('post')}>Start</button>
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
            <div className="card">No groups available right now.</div>
          )}
        </div>
      </section>

      <section style={{ marginTop:14 }}>
        <h3 style={{ margin:'6px 0' }}>Recommended</h3>
        <div className="card">No recommendations available yet.</div>
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
