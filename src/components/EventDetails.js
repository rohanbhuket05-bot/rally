import React, { useState, useEffect } from 'react';
import { getEventMessages, subscribeToEventMessages, isSupabaseConfigured, getProfilesByIds } from '../lib/supabaseClient';
import './HomeFeed.css';

const TAGS = [
  { id: 'On Campus', color: '#FFB420', bg: 'rgba(255,180,32,0.12)' },
  { id: 'Social',    color: '#FF6BA8', bg: 'rgba(255,107,168,0.15)' },
  { id: 'Sports',    color: '#00E5A8', bg: 'rgba(0,229,168,0.15)' },
  { id: 'Arts',      color: '#9B59B6', bg: 'rgba(155,89,182,0.15)' },
  { id: 'Music',     color: '#9D8FFF', bg: 'rgba(157,143,255,0.15)' },
  { id: 'Food',      color: '#FF6BA8', bg: 'rgba(255,107,168,0.15)' },
  { id: 'Gaming',    color: '#667EEA', bg: 'rgba(102,126,234,0.15)' },
  { id: 'Outdoors',  color: '#00E5A8', bg: 'rgba(0,229,168,0.15)' },
  { id: 'Other',     color: '#999999', bg: 'rgba(153,153,153,0.15)' },
];

const AVATAR_COLORS = [
  '#534AB7', '#D4537E', '#1D9E75', '#EF9F27', '#667EEA',
  '#9B59B6', '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
];

function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function EventDetails({ event, onBack, onUpdateEvent, activeTab, onNavigate, onCreateGroup = () => {}, onOpenChat = () => {}, user = null, profile = null, onAuthRequired = () => {} }) {
  const [liveMessages, setLiveMessages] = useState([]);
  const [lastReadCount, setLastReadCount] = useState(0);
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [previewAvatarMap, setPreviewAvatarMap] = useState({});

  const eventId = event?.id ?? null;

  useEffect(() => {
    if (!eventId || !isSupabaseConfigured()) return;
    const readKey = `rally_chat_read_event_${eventId}`;
    setLastReadCount(parseInt(localStorage.getItem(readKey) || '0'));
    let cancelled = false;
    getEventMessages(eventId).then(msgs => { if (!cancelled) setLiveMessages(msgs); });
    const interval = setInterval(() => {
      getEventMessages(eventId).then(msgs => { if (!cancelled) setLiveMessages(msgs); });
    }, 5000);
    const unsub = subscribeToEventMessages(eventId, msg => {
      if (!cancelled) setLiveMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    });
    return () => { cancelled = true; clearInterval(interval); unsub(); };
  }, [eventId]);

  useEffect(() => {
    const unknownIds = [...new Set(liveMessages.map(m => m.userId).filter(id => id && !(id in previewAvatarMap)))];
    if (unknownIds.length === 0) return;
    getProfilesByIds(unknownIds).then(map => setPreviewAvatarMap(prev => ({ ...prev, ...map })));
  }, [liveMessages]);

  if (!event) return null;

  const currentUserName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';
  const { title, dateISO, showTime, location, attendees = [], trending, category, tags = [] } = event;

  const dateDisplay = dateISO
    ? showTime
      ? new Date(dateISO).toLocaleString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      : new Date(dateISO).toLocaleDateString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric',
        })
    : 'Date TBD';

  const isHost = user?.id ? event.user_id === user.id : event.host === currentUserName;
  const joined = isHost || (user?.id
    ? attendees.some(a => a.user_id === user.id)
    : (currentUserName && attendees.some(a => a.name === currentUserName)));

  function openChat() {
    localStorage.setItem(`rally_chat_read_event_${eventId}`, String(liveMessages.length));
    setLastReadCount(liveMessages.length);
    onOpenChat(event);
  }

  function openEdit() {
    const d = event.dateISO ? new Date(event.dateISO) : null;
    setEditForm({
      title: event.title || '',
      date: d ? d.toISOString().slice(0, 10) : '',
      time: d && event.showTime ? d.toTimeString().slice(0, 5) : '',
      showTime: !!event.showTime,
      location: event.location || '',
      tags: event.tags || [],
      visibility: event.visibility || 'public',
    });
    setShowEdit(true);
  }

  function handleEditSave() {
    const dateISO = editForm.date
      ? editForm.showTime && editForm.time
        ? new Date(`${editForm.date}T${editForm.time}`).toISOString()
        : new Date(`${editForm.date}T00:00:00`).toISOString()
      : event.dateISO;
    onUpdateEvent && onUpdateEvent({ ...event, title: editForm.title, dateISO, showTime: editForm.showTime && !!editForm.time, location: editForm.location, tags: editForm.tags, visibility: editForm.visibility });
    setShowEdit(false);
  }

  function handleJoin() {
    if (!user) { onAuthRequired('Sign in to join this event'); return; }
    const name = currentUserName;
    const initials = (name || 'You').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    const exists = attendees.some(a => a.name === name);
    const next = exists
      ? attendees.filter(a => a.name !== name)
      : [{ name, initials, color: '#FFFFFF', user_id: user?.id, avatar_url: profile?.avatar_url || '' }, ...attendees];
    onUpdateEvent && onUpdateEvent({ ...event, attendees: next });
  }

  return (
    <main className="feed-root" style={{ overflowY: 'auto' }}>
      {/* Back + title */}
      <header style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10,
            padding: '8px 12px', color: 'var(--purple)', fontWeight: 700,
            cursor: 'pointer', marginBottom: 12,
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, color: '#fff', lineHeight: 1.2 }}>{title}</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {(tags.length > 0 ? tags : (category ? [category] : [])).map(tag => {
            const tagDef = TAGS.find(t => t.id === tag);
            const col = tagDef?.color || '#9D8FFF';
            const bg = tagDef?.bg || 'rgba(157,143,255,0.15)';
            return <span key={tag} className="category-pill" style={{ color: col, background: bg }}>{tag}</span>;
          })}
          {trending && <span className="badge">Trending</span>}
        </div>
      </header>

      {/* Details + RSVP */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-meta" style={{ marginTop: 0 }}>
          <div className="meta-row">
            <span className="meta-label">When</span>
            <span className="meta-value">{dateDisplay}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Where</span>
            <span className="meta-value">{location || 'Location TBD'}</span>
          </div>
        </div>
        {isHost ? (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--purple)', fontWeight: 700, fontSize: 14 }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              You're hosting
            </div>
            <button onClick={openEdit} style={{ background: 'none', border: '1px solid rgba(83,74,183,0.3)', borderRadius: 8, padding: '5px 12px', color: 'var(--purple)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            className={joined ? 'nav-action-btn joined' : 'join'}
            style={{ marginTop: 14, width: '100%', padding: '12px 0', fontSize: 16, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {joined ? (<><svg viewBox="0 0 12 12" width="14" height="14" fill="none" style={{ marginRight: 6 }}><path d="M1.5 6l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Joined</>) : 'Join'}
          </button>
        )}
      </div>

      {/* Who's going */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Who's going</h3>
          <span className="badge" style={{ background: 'var(--teal)' }}>{attendees.length} going</span>
        </div>
        {attendees.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {attendees.map((a, i) => {
              const color = a.color && a.color !== '#FFFFFF' ? a.color : avatarColor(a.name);
              const initials = a.initials
                || (a.name ? a.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() : '?');
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {a.avatar_url
                    ? <img src={a.avatar_url} alt={a.name} referrerPolicy="no-referrer" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div className="avatar" style={{ backgroundColor: color, color: '#fff', flexShrink: 0, marginLeft: 0 }}>{initials}</div>
                  }
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name || 'Someone'}</span>
                  {a.name === currentUserName && (
                    <span style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 700 }}>You</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: 14, margin: 0 }}>No one yet — be the first!</p>
        )}
      </div>

      {/* Event Chat */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div
          className="group-chat-panel group-chat-preview"
          onClick={() => {
            if (!user) { onAuthRequired('Sign in to access the chat'); return; }
            if (!joined) { setShowJoinPrompt(true); return; }
            openChat();
          }}
          style={{ cursor: 'pointer', flex: 'none', filter: joined ? 'none' : 'blur(3px)', transition: 'filter 200ms', userSelect: 'none' }}
        >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: liveMessages.length > 0 ? 10 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ color: 'var(--purple)', flexShrink: 0 }}>
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Chat</span>
          </div>
          {(() => {
            const newCount = Math.max(0, liveMessages.length - lastReadCount);
            return newCount > 0
              ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pink)', background: 'var(--light-pink)', borderRadius: 20, padding: '3px 9px' }}>{newCount} new</span>
              : <span style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>up to date</span>;
          })()}
        </div>

        {liveMessages.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {(() => {
              const recent = liveMessages.slice(-3);
              const grps = [];
              recent.forEach(msg => {
                const last = grps[grps.length - 1];
                const lastMsg = last?.[last.length - 1];
                const isCont = lastMsg && lastMsg.userId === msg.userId &&
                  msg.createdAt && lastMsg.createdAt &&
                  (new Date(msg.createdAt) - new Date(lastMsg.createdAt)) < 5 * 60 * 1000;
                if (isCont) last.push(msg);
                else grps.push([msg]);
              });
              return grps.map(grp => {
                const isMe = user && grp[0].userId === user.id;
                const senderColor = isMe ? 'var(--purple)' : avatarColor(grp[0].sender || '');
                const senderName = isMe ? 'You' : (grp[0].sender || 'Unknown');
                const initials = senderName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
                const avatarUrl = isMe ? profile?.avatar_url : previewAvatarMap[grp[0].userId]?.avatar_url;
                const lastMsg = grp[grp.length - 1];
                return (
                  <div key={grp[0].id} style={{ display: 'flex', gap: 10 }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={senderName} referrerPolicy="no-referrer" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, alignSelf: 'flex-start' }} />
                    ) : (
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: senderColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, alignSelf: 'flex-start' }}>
                        {initials}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: senderColor }}>{senderName}</span>
                        <span style={{ fontSize: 11, color: '#555577' }}>{lastMsg.time}</span>
                      </div>
                      {grp.map(msg => (
                        <div key={msg.id} style={{ fontSize: 13, color: '#BBBBDD', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                          {msg.text}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div style={{ color: '#555577', fontSize: 13 }}>No messages yet — tap to start the conversation.</div>
        )}
        </div>

        {!joined && (
          <div
            onClick={() => { if (!user) { onAuthRequired('Sign in to access the chat'); return; } setShowJoinPrompt(true); }}
            style={{ position: 'absolute', inset: 0, borderRadius: 26, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(0,0,0,0.18)' }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#EEEEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#EEEEFF' }}>Join to unlock chat</span>
          </div>
        )}
      </div>

      <button
        className="join"
        onClick={() => {
          if (!user) { onAuthRequired('Sign in to join the chat'); return; }
          if (!joined) { setShowJoinPrompt(true); return; }
          openChat();
        }}
        style={{ width: '100%', padding: '14px', borderRadius: 14, marginBottom: 20, display: 'block', fontSize: 15, fontWeight: 700 }}
      >
        Open event chat
      </button>

      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '0 20px' }} onClick={() => setShowEdit(false)}>
          <div style={{ background: '#1A1A1E', borderRadius: 20, padding: '28px 20px 24px', width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800, color: '#EEEEFF' }}>Edit Event</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Title</label>
                <input className="text-input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Date</label>
                  <input type="date" className="text-input" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Time</label>
                  <input type="time" className="text-input" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value, showTime: !!e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Location</label>
                <input className="text-input" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Tags</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {TAGS.map(tag => {
                    const selected = (editForm.tags || []).includes(tag.id);
                    return (
                      <button key={tag.id} onClick={() => setEditForm(f => ({ ...f, tags: selected ? f.tags.filter(t => t !== tag.id) : [...(f.tags || []), tag.id] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: `1px solid ${selected ? tag.color : 'rgba(255,255,255,0.08)'}`, background: selected ? tag.bg : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: selected ? tag.color : 'rgba(255,255,255,0.15)', flexShrink: 0, transition: 'background 150ms' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: selected ? tag.color : '#AAAACC' }}>{tag.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Visibility</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[{ id: 'public', label: 'Public' }, { id: 'friends', label: 'Friends' }, { id: 'private', label: 'Private' }].map(v => (
                    <button key={v.id} onClick={() => setEditForm(f => ({ ...f, visibility: v.id }))}
                      style={{ padding: '9px 0', borderRadius: 10, border: `1px solid ${editForm.visibility === v.id ? 'var(--purple)' : 'rgba(255,255,255,0.08)'}`, background: editForm.visibility === v.id ? 'var(--light-purple)' : 'rgba(255,255,255,0.03)', color: editForm.visibility === v.id ? 'var(--purple)' : '#AAAACC', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowEdit(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#8888AA', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditSave} className="join" style={{ flex: 2, padding: '12px', borderRadius: 12, fontSize: 15 }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showJoinPrompt && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '0 24px' }}
          onClick={() => setShowJoinPrompt(false)}
        >
          <div
            style={{ background: '#1A1A1E', borderRadius: 20, padding: '32px 24px 28px', width: '100%', maxWidth: 360 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'none' }} />
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--light-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, textAlign: 'center', color: '#EEEEFF' }}>Members only</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#8888AA', textAlign: 'center', lineHeight: 1.6 }}>
              Join this event to access the group chat and coordinate with everyone going.
            </p>
            <button
              className="join"
              style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 16, fontWeight: 700 }}
              onClick={() => { setShowJoinPrompt(false); handleJoin(); }}
            >
              Join Event
            </button>
            <button
              onClick={() => setShowJoinPrompt(false)}
              style={{ width: '100%', padding: '12px', marginTop: 10, background: 'none', border: 'none', color: '#8888AA', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
