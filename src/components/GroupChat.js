import React, { useState } from 'react';
import { groupsData } from '../data/groups';
import './HomeFeed.css';

export default function GroupChat({ activeTab = 'group-chat', onNavigate = () => {}, groupId, messages = [], onSendMessage, onBack }) {
  const group = groupsData.find((g) => g.id === groupId);
  const [draft, setDraft] = useState('');

  if (!group) {
    return (
      <main className="feed-root">
        <header className="feed-header">
          <h1>Group chat not found</h1>
        </header>
        <div className="card">This group chat could not be loaded.</div>
        <button className="nav-btn" onClick={onBack}>Back</button>
      </main>
    );
  }

  return (
    <main className="feed-root">
      <header className="feed-header" style={{ position: 'relative' }}>
        <button
          className="icon-btn"
          onClick={() => onNavigate('group')}
          style={{ position: 'absolute', left: 0, top: 0, transform: 'translateY(2px)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', padding: '8px 10px' }}
        >
          ←
        </button>
        <h1 style={{ marginTop: 32 }}>{group.name}</h1>
        <p className="tagline">{group.banner}</p>
      </header>

      <section className="group-chat-container" style={{ marginTop: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="group-chat-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}><span aria-hidden="true">💬</span>{group.name} chat</h3>
            <span className="category-pill" style={{ background: 'var(--light-teal)', color: 'var(--teal)' }}>{messages.length} messages</span>
          </div>
          <div className="message-thread" style={{ marginTop: 14 }}>
            {messages.map((message) => (
              <div key={message.id} className={`message-bubble ${message.me ? 'me' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{message.sender}</span>
                  <span style={{ color: '#999', fontSize: 11 }}>{message.time}</span>
                </div>
                <div style={{ color: message.me ? '#111' : '#222' }}>{message.text}</div>
              </div>
            ))}
          </div>
          <div className="message-input-row chat-input-row">
            <input
              className="text-input"
              placeholder="Message the group"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  onSendMessage(draft);
                  setDraft('');
                }
              }}
              style={{ flex: 1 }}
            />
            <button
              className="join"
              type="button"
              onClick={() => {
                if (!draft.trim()) return;
                onSendMessage(draft);
                setDraft('');
              }}
            >Send</button>
          </div>
        </div>
      </section>

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
        <button className={`nav-btn ${activeTab === 'groups' || activeTab === 'group' || activeTab === 'group-chat' ? 'active' : ''}`} onClick={() => onNavigate('groups')}>
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
