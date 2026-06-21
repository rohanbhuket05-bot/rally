import React, { useState } from 'react';
import { groupsData } from '../data/groups';
import './HomeFeed.css';

export default function GroupDetails({ activeTab = 'group', onNavigate = () => {}, groupId, messages, onSendMessage, onOpenChat, onBack }) {
  const group = groupsData.find((g) => g.id === groupId);
  const [draft, setDraft] = useState('');
  if (!group) {
    return (
      <main className="feed-root">
        <header className="feed-header">
          <h1>Group not found</h1>
        </header>
        <div className="card">This group could not be loaded.</div>
        <button className="nav-btn" onClick={onBack}>Back</button>
      </main>
    );
  }

  return (
    <main className="feed-root">
      <header className="feed-header" style={{ position: 'relative' }}>
        <button
          className="icon-btn"
          onClick={onBack}
          style={{ position: 'absolute', left: 0, top: 0, transform: 'translateY(2px)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', padding: '8px 10px' }}
        >
          ←
        </button>
        <h1 style={{ marginTop: 32 }}>{group.name}</h1>
        <p className="tagline">{group.banner}</p>
      </header>

      <section className="card" style={{ padding: '18px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:18 }}>{group.name}</div>
            <div style={{ color:'#666', marginTop:6 }}>{group.description}</div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <span className="category-pill" style={{ background:'var(--light-purple)', color:'var(--purple)' }}>{group.privacy}</span>
            <span className="category-pill" style={{ background:'var(--light-teal)', color:'var(--teal)' }}>{group.members} members</span>
          </div>
        </div>

        <div style={{ marginTop:12 }}>
          <div style={{ fontWeight:700, marginBottom:6 }}>Icebreaker prompt</div>
          <div style={{ color:'#666' }}>{group.prompt}</div>
        </div>
      </section>

      <section style={{ marginTop:14 }}>
        <h3 style={{ margin: '6px 0' }}>Upcoming group events</h3>
        <div className="cards">
          {group.events.map((event) => (
            <div key={event.id} className="card" style={{ padding:'12px 14px' }}>
              <div style={{ fontWeight:700 }}>{event.title}</div>
              <div style={{ color:'#666', fontSize:13 }}>{event.date} · {event.location}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop:14 }}>
        <button
          className="small-action-btn"
          onClick={onOpenChat}
          style={{ marginBottom:12, display:'inline-flex' }}
        >
          Open group chat
        </button>

        <div className="group-chat-panel group-chat-preview" onClick={onOpenChat}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <h3 style={{ margin: '6px 0', display:'flex', alignItems:'center', gap:8 }}><span aria-hidden="true">💬</span>Group chat</h3>
            <span className="category-pill" style={{ background:'var(--light-teal)', color:'var(--teal)' }}>{messages.length} messages</span>
          </div>
          <div style={{ marginTop:6, color:'#666', fontSize:13 }}>Tap to open the full chat page for this group.</div>
          <div className="message-thread" style={{ marginTop:12 }}>
            {messages.slice(-2).map((message) => (
              <div key={message.id} className={`message-bubble ${message.me ? 'me' : ''}`}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{message.sender}</span>
                  <span style={{ color:'#999', fontSize:11 }}>{message.time}</span>
                </div>
                <div style={{ color: message.me ? '#111' : '#222' }}>{message.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <button className="small-action-btn" onClick={onBack} style={{ marginTop:16 }}>Back to groups</button>

      <nav className="bottom-nav">
        <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => onNavigate('home')}>
          <span className="nav-btn-icon">🏠</span>
          <span className="nav-btn-label">Home</span>
        </button>
        <button className={`nav-btn ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => onNavigate('explore')}>
          <span className="nav-btn-icon">🔍</span>
          <span className="nav-btn-label">Explore</span>
        </button>
        <button className={`nav-btn ${activeTab === 'post' ? 'active' : ''}`} onClick={() => onNavigate('post')}>
          <span className="nav-btn-icon">➕</span>
          <span className="nav-btn-label">Create</span>
        </button>
        <button className={`nav-btn ${activeTab === 'groups' || activeTab === 'group' ? 'active' : ''}`} onClick={() => onNavigate('groups')}>
          <span className="nav-btn-icon">💬</span>
          <span className="nav-btn-label">Groups</span>
        </button>
        <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => onNavigate('profile')}>
          <span className="nav-btn-icon">👤</span>
          <span className="nav-btn-label">Profile</span>
        </button>
      </nav>
    </main>
  );
}
