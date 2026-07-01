import React, { useState } from 'react';
import { avatarColor } from '../lib/avatarColor';
import { getInitials } from '../lib/utils';
import './HomeFeed.css';

const TYPE_OPTIONS = [
  { value: 'club',   label: 'Club / Org',    color: 'var(--purple)', bg: 'var(--light-purple)', hint: 'A public organization with hosted events and a member roster.' },
  { value: 'friend', label: 'Friend Group',  color: 'var(--pink)',   bg: 'var(--light-pink)',   hint: 'A private group of people you already know.' },
  { value: 'event',  label: 'Event Group',   color: 'var(--teal)',   bg: 'var(--light-teal)',   hint: 'A group formed around attending a specific event together.' },
];

const PRIVACY_OPTIONS = [
  { value: 'public',  label: 'Public' },
  { value: 'friends', label: 'Friends Only' },
  { value: 'private', label: 'Private' },
];

export default function CreateGroup({
  onBack,
  onCreateGroup,
  initialType = null,
  initialEventId = null,
  initialEventTitle = null,
  user = null,
  onAuthRequired = () => {},
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(initialEventId ? 'event' : (initialType || 'club'));
  const [privacy, setPrivacy] = useState(initialType === 'friend' ? 'private' : 'public');
  const [icebreaker, setIcebreaker] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState([]);

  const myName = localStorage.getItem('sphera_name') || localStorage.getItem('sphera_username') || 'You';
  const myInitials = getInitials(myName);

  function addMember() {
    const n = memberInput.trim();
    if (!n || members.some(m => m.name.toLowerCase() === n.toLowerCase())) return;
    const initials = getInitials(n);
    setMembers(prev => [...prev, { name: n, initials, color: avatarColor(n), role: 'member' }]);
    setMemberInput('');
  }

  function handleSubmit() {
    if (!name.trim()) return;
    if (!user) { onAuthRequired('Sign in to create a group'); return; }
    onCreateGroup({
      name: name.trim(),
      description: description.trim(),
      type,
      privacy,
      icebreaker: icebreaker.trim(),
      members: [
        { name: myName, initials: myInitials, color: avatarColor(myName), role: 'admin' },
        ...members,
      ],
      eventId: initialEventId || null,
      eventTitle: initialEventTitle || null,
      createdAt: new Date().toISOString(),
      createdBy: myName,
    });
  }

  const eventLocked = Boolean(initialEventId);
  const selectedTypeMeta = TYPE_OPTIONS.find(t => t.value === type);

  return (
    <main className="feed-root" style={{ overflowY: 'auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10,
            padding: '8px 12px', color: 'var(--purple)', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20, color: '#111' }}>Create a Group</h2>
      </header>

      {/* Event link badge */}
      {initialEventTitle && (
        <div className="card" style={{ marginBottom: 12, background: 'var(--light-teal)', border: '2px solid var(--teal)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Linked event</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#111', marginTop: 2 }}>{initialEventTitle}</div>
            </div>
          </div>
        </div>
      )}

      {/* Name */}
      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 8, color: '#555' }}>GROUP NAME *</label>
        <input
          className="text-input"
          placeholder={type === 'club' ? 'UCSD Outdoor Club, ACM at UCSD...' : type === 'friend' ? 'Friday Crew, Beach Squad...' : 'Who\'s rallying for this?'}
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 8, color: '#555' }}>DESCRIPTION</label>
        <textarea
          className="text-input textarea"
          placeholder="What's this group about?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* Type selector */}
      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 10, color: '#555' }}>GROUP TYPE</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {TYPE_OPTIONS.map(opt => {
            const active = type === opt.value;
            const locked = eventLocked && opt.value !== 'event';
            return (
              <button
                key={opt.value}
                onClick={() => !locked && setType(opt.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `2px solid ${opt.color}`,
                  background: active ? opt.color : '#fff',
                  color: active ? '#fff' : opt.color,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: locked ? 'default' : 'pointer',
                  opacity: locked ? 0.35 : 1,
                  transition: 'all 150ms ease',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>{selectedTypeMeta?.hint}</div>
      </div>

      {/* Privacy */}
      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 10, color: '#555' }}>VISIBILITY</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {PRIVACY_OPTIONS.map(opt => {
            const active = privacy === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setPrivacy(opt.value)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  borderRadius: 999,
                  border: '2px solid var(--purple)',
                  background: active ? 'var(--purple)' : '#fff',
                  color: active ? '#fff' : 'var(--purple)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Icebreaker — skip for clubs */}
      {type !== 'club' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 4, color: '#555' }}>ICEBREAKER PROMPT <span style={{ fontWeight: 400, color: '#aaa' }}>optional</span></label>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Sent to members when the group first forms.</div>
          <input
            className="text-input"
            placeholder="Drop your most-listened artist this week..."
            value={icebreaker}
            onChange={e => setIcebreaker(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* Members */}
      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 4, color: '#555' }}>MEMBERS <span style={{ fontWeight: 400, color: '#aaa' }}>optional</span></label>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Add people by name now, or invite later from the group page.</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="text-input"
            placeholder="Add member by name"
            value={memberInput}
            onChange={e => setMemberInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMember()}
            style={{ flex: 1 }}
          />
          <button className="join" onClick={addMember} style={{ flexShrink: 0, borderRadius: 10 }}>Add</button>
        </div>

        {/* Creator row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: members.length ? 8 : 0, borderBottom: members.length ? '1px solid #F0F0F0' : 'none', marginBottom: members.length ? 8 : 0 }}>
          <div className="avatar" style={{ backgroundColor: avatarColor(myName), color: '#fff', marginLeft: 0, flexShrink: 0 }}>{myInitials}</div>
          <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{myName}</span>
          <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 11 }}>Admin</span>
        </div>

        {members.map(m => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8 }}>
            <div className="avatar" style={{ backgroundColor: m.color, color: '#fff', marginLeft: 0, flexShrink: 0 }}>{m.initials}</div>
            <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{m.name}</span>
            <button
              onClick={() => setMembers(prev => prev.filter(x => x.name !== m.name))}
              style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        className="join"
        onClick={handleSubmit}
        disabled={!name.trim()}
        style={{
          width: '100%', padding: '14px', fontSize: 16, borderRadius: 12,
          marginBottom: 12, opacity: name.trim() ? 1 : 0.45, cursor: name.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        Create Group
      </button>
    </main>
  );
}
