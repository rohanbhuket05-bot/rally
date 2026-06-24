import React, { useState, useEffect } from 'react';
import './HomeFeed.css';
import { getSchoolFromEmail } from '../data/schools';
import { isSupabaseConfigured, signInWithOtp, signInWithProvider, checkUsernameAvailable } from '../lib/supabaseClient';
import { validateUsername } from '../lib/usernameValidation';

const placeholderFriendNames = new Set(['Maya', 'Leo', 'Ava', 'Jon']);

export default function Profile({ user, profile = {}, onUpdateProfile = () => {}, activeTab = 'profile', onNavigate = () => {}, onOpenGroup = () => {}, events = [], onAddEvent = () => {}, onUpdateEvent = () => {}, onDeleteEvent = () => {}, onSignOut = () => {}, onAuthRequired = () => {} }) {
  const [name, setName] = useState(() => profile.name || localStorage.getItem('rally_name') || '');
  const [bio, setBio] = useState(() => profile.bio || localStorage.getItem('rally_bio') || '');
  const [username, setUsername] = useState(() => profile.username || localStorage.getItem('rally_username') || '');
  const [editingProfile, setEditingProfile] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [usernameError, setUsernameError] = useState(null);

  const getInitials = (n) => n.split(' ').filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();


  const getStoredCheers = () => {
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
  };

  // Sync state when Supabase profile loads after sign-in
  useEffect(() => {
    if (profile.name !== undefined) setName(profile.name);
    if (profile.bio !== undefined) setBio(profile.bio);
    if (profile.username !== undefined) setUsername(profile.username);
    if (Array.isArray(profile.friends) && profile.friends.length > 0) {
      setFriends(profile.friends.filter(f => f?.name && !placeholderFriendNames.has(f.name)));
    }
  }, [profile]);

  // Live username validation + availability check while editing
  useEffect(() => {
    if (!editingProfile) return;
    const original = (profile.username || localStorage.getItem('rally_username') || '').toLowerCase();
    if (username.toLowerCase() === original) {
      setUsernameStatus('idle'); setUsernameError(null); return;
    }
    const { valid, error } = validateUsername(username);
    if (!valid) { setUsernameStatus('invalid'); setUsernameError(error); return; }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(username.toLowerCase(), user?.id);
      setUsernameStatus(available ? 'available' : 'taken');
      setUsernameError(available ? null : 'Username already taken');
    }, 400);
    return () => clearTimeout(timer);
  }, [username, editingProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = (newName, newBio, newUsername) => {
    if (usernameStatus === 'invalid' || usernameStatus === 'taken' || usernameStatus === 'checking') return;
    const finalUsername = newUsername.toLowerCase();
    setName(newName);
    setBio(newBio);
    setUsername(finalUsername);
    localStorage.setItem('rally_name', newName);
    localStorage.setItem('rally_bio', newBio);
    localStorage.setItem('rally_username', finalUsername);
    setEditingProfile(false);
    onUpdateProfile({ name: newName, bio: newBio, username: finalUsername, friends });
  };
  // `events` and handlers are provided by App (single source of truth)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalView, setModalView] = useState('details');

  function openEvent(ev) {
    setSelectedEvent(ev);
    setModalView('details');
  }

  function closeEventModal() {
    setSelectedEvent(null);
  }
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', month: '', day: '', time: '', location: '' });

  const [attended, setAttended] = useState([]);
  const [media, setMedia] = useState([]);
  const [cheers, setCheers] = useState({ count: getStoredCheers(), givers: [] });
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rally_friends') || '[]').filter((item) => item?.name && !placeholderFriendNames.has(item.name));
    } catch (e) {
      return [];
    }
  });
  const [incomingRequests, setIncomingRequests] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rally_friend_incoming') || '[]').filter((item) => item?.name && !placeholderFriendNames.has(item.name));
    } catch (e) {
      return [];
    }
  });
  const [outgoingRequests, setOutgoingRequests] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rally_friend_outgoing') || '[]').filter((item) => item?.name && !placeholderFriendNames.has(item.name));
    } catch (e) {
      return [];
    }
  });
  const [inviteName, setInviteName] = useState('');
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);

  useEffect(() => {
    const filterRequests = (list) => (Array.isArray(list) ? list.filter(item => item?.name && !placeholderFriendNames.has(item.name)) : []);
    const cleanedFriends = Array.isArray(friends) ? friends.filter((item) => item?.name && !placeholderFriendNames.has(item.name)) : [];
    const cleanedIncoming = filterRequests(incomingRequests);
    const cleanedOutgoing = filterRequests(outgoingRequests);

    if (cleanedFriends.length !== friends.length) {
      setFriends(cleanedFriends);
    }
    if (cleanedIncoming.length !== incomingRequests.length) {
      setIncomingRequests(cleanedIncoming);
    }
    if (cleanedOutgoing.length !== outgoingRequests.length) {
      setOutgoingRequests(cleanedOutgoing);
    }

    try {
      localStorage.setItem('rally_friends', JSON.stringify(cleanedFriends));
      localStorage.setItem('rally_friend_incoming', JSON.stringify(cleanedIncoming));
      localStorage.setItem('rally_friend_outgoing', JSON.stringify(cleanedOutgoing));
    } catch (e) {}
  }, [friends, incomingRequests, outgoingRequests]);

  useEffect(() => {
    const syncCheers = () => setCheers((current) => ({ ...current, count: getStoredCheers() }));
    syncCheers();

    const handleCheersUpdated = () => syncCheers();
    const handleStorage = (event) => {
      if (event.key === 'rally_cheers') {
        syncCheers();
      }
    };

    window.addEventListener('rally-cheers-updated', handleCheersUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('rally-cheers-updated', handleCheersUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  function addEvent(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    // require month and day, year is optional
    if (!form.month || !form.day) return;
    // time is optional; use 12:00 for ordering if not provided
    const useTime = form.time && form.time.trim();
    const timeForISO = useTime ? form.time : '12:00';
    const pad = (s) => String(s).padStart(2, '0');
    const yearForISO = String(new Date().getFullYear());
    const dateISO = `${yearForISO}-${pad(form.month)}-${pad(form.day)}T${timeForISO}`; // YYYY-MM-DDTHH:MM
    const next = { id: Date.now(), title: form.title.trim(), dateISO, showTime: !!useTime, location: form.location.trim() };
    // delegate persistence/upsert to App-level handler
    onAddEvent(next);
    setForm({ title: '', month: '', day: '', time: '', location: '' });
    setShowForm(false);
  }

  const school = getSchoolFromEmail(user?.email);

  // ── Logged-out state ─────────────────────────────────────────────────────────
  if (!user) {
    return <ProfileSignIn activeTab={activeTab} onNavigate={onNavigate} />;
  }

  return (
    <main className="feed-root">
      <header className="feed-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Profile</h1>
          <p className="tagline" style={{ margin: 0 }}>{name || 'Set up your profile'}</p>
        </div>
        <button
          onClick={() => setShowSignOutConfirm(true)}
          style={{ background: 'none', border: '1px solid #DDD', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#888', cursor: 'pointer', flexShrink: 0 }}
        >
          Sign out
        </button>

        {showSignOutConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 16 }}>Sign out?</p>
              <p style={{ margin: '0 0 20px', color: '#666', fontSize: 14 }}>You'll need to sign back in to join events or create groups.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="nav-btn" style={{ flex: 1 }} onClick={() => setShowSignOutConfirm(false)}>Cancel</button>
                <button className="join" style={{ flex: 1, borderRadius: 10 }} onClick={() => { setShowSignOutConfirm(false); onSignOut(); }}>Sign out</button>
              </div>
            </div>
          </div>
        )}
      </header>

      <section className="card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div style={{ width: 96, height: 96, borderRadius: 48, background: 'linear-gradient(180deg,var(--light-purple),#fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--purple)', fontWeight: 800 }}>
            {getInitials(name)}
          </div>
        </div>
        {!editingProfile ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'column' }}>
              <div className="username">{username ? `@${username}` : 'Set your handle'}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <h2 style={{ margin: '8px 0 4px' }}>{name || 'Your name'}</h2>
                <button className="edit-btn icon-btn" onClick={()=>setEditingProfile(true)} aria-label="Edit profile">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
                  </svg>
                </button>
              </div>
            </div>
            <p style={{ margin: 0, color: '#666' }}>{bio || 'Add a short bio to tell people what you’re about.'}</p>
            <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap', marginTop:12 }}>
              {school && (
                <span className="category-pill" style={{ background:'var(--purple)', color:'#fff', fontSize:12, padding:'6px 10px', fontWeight:700 }}>{school}</span>
              )}
              <span className="category-pill" style={{ background:'var(--light-teal)', color:'var(--teal)', fontSize:12, padding:'6px 10px' }}>{cheers.count} cheers</span>
              <span className="category-pill" style={{ background:'var(--light-purple)', color:'var(--purple)', fontSize:12, padding:'6px 10px' }}>{groups.length} groups</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, color: '#666' }}>Username</label>
            <input
              className="text-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                borderColor: usernameStatus === 'available' ? 'var(--teal)'
                  : usernameStatus === 'invalid' || usernameStatus === 'taken' ? '#E74C3C'
                  : undefined,
              }}
            />
            {usernameStatus === 'checking' && <div style={{ fontSize: 12, color: '#999' }}>Checking availability...</div>}
            {usernameStatus === 'available' && <div style={{ fontSize: 12, color: 'var(--teal)' }}>✓ Available</div>}
            {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <div style={{ fontSize: 12, color: '#E74C3C' }}>{usernameError}</div>}
            <label style={{ fontSize: 13, color: '#666' }}>Full name</label>
            <input className="text-input" value={name} onChange={(e)=>setName(e.target.value)} />
            <label style={{ fontSize: 13, color: '#666' }}>Bio</label>
            <textarea className="text-input textarea" value={bio} onChange={(e)=>setBio(e.target.value)} />
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button
                className="join"
                onClick={() => saveProfile(name, bio, username)}
                disabled={usernameStatus === 'invalid' || usernameStatus === 'taken' || usernameStatus === 'checking'}
                style={{ opacity: (usernameStatus === 'invalid' || usernameStatus === 'taken' || usernameStatus === 'checking') ? 0.45 : 1 }}
              >Save</button>
              <button className="nav-btn" onClick={()=>{ setUsername(localStorage.getItem('rally_username')||''); setName(localStorage.getItem('rally_name')||''); setBio(localStorage.getItem('rally_bio')||''); setEditingProfile(false); }}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{ margin: '6px 0', cursor: 'pointer' }}
            onClick={() => setShowFriendsPanel((current) => !current)}
          >
            Friends
            <span style={{ fontSize: 11, marginLeft: 6, color: '#999', transition: 'transform 200ms', display: 'inline-block', transform: showFriendsPanel ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </h3>
          <span style={{ color: '#666', fontSize: 13 }}>{friends.length} friends</span>
        </div>
        {showFriendsPanel && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
              className="text-input"
              placeholder="Invite a friend by name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="join"
              type="button"
              onClick={() => {
                const target = inviteName.trim();
                if (!target) return;
                if (target.toLowerCase() === username.toLowerCase() || target.toLowerCase() === name.toLowerCase()) {
                  setInviteName('');
                  return;
                }
                if (friends.some((f) => f.name.toLowerCase() === target.toLowerCase()) || outgoingRequests.some((r) => r.name.toLowerCase() === target.toLowerCase()) || incomingRequests.some((r) => r.name.toLowerCase() === target.toLowerCase())) {
                  setInviteName('');
                  return;
                }
                setOutgoingRequests((current) => [...current, { id: `o-${Date.now()}`, name: target }]);
                setInviteName('');
              }}
            >Invite</button>
          </div>

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Incoming requests</div>
              {incomingRequests.length ? incomingRequests.map((request) => (
                <div key={request.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{request.name}</div>
                    <div style={{ color: '#666', fontSize: 12 }}>{request.mutual} mutual friends</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="join" onClick={() => {
                      setFriends((current) => [...current, { id: `f-${Date.now()}`, name: request.name, mutual: request.mutual }]);
                      setIncomingRequests((current) => current.filter((r) => r.id !== request.id));
                    }}>Accept</button>
                    <button className="nav-btn" onClick={() => setIncomingRequests((current) => current.filter((r) => r.id !== request.id))}>Decline</button>
                  </div>
                </div>
              )) : <div style={{ color: '#666' }}>No incoming requests.</div>}
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Outgoing invites</div>
              {outgoingRequests.length ? outgoingRequests.map((request) => (
                <div key={request.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{request.name}</div>
                    <div style={{ color: '#666', fontSize: 12 }}>Awaiting response</div>
                  </div>
                  <button className="nav-btn" onClick={() => setOutgoingRequests((current) => current.filter((r) => r.id !== request.id))}>Cancel</button>
                </div>
              )) : <div style={{ color: '#666' }}>No outgoing invites.</div>}
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Friends</div>
              {friends.length ? friends.map((friend) => (
                <div key={friend.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{friend.name}</div>
                    <div style={{ color: '#666', fontSize: 12 }}>{friend.mutual ? `${friend.mutual} mutual friends` : 'Friend'}</div>
                  </div>
                  <button className="nav-btn">Message</button>
                </div>
              )) : <div style={{ color: '#666' }}>No friends yet.</div>}
            </div>
          </div>
        </div>
        )}
      </section>

      <section style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: '6px 0' }}>Upcoming</h3>
          <button className="add-btn" onClick={() => setShowForm((s) => !s)}>+</button>
        </div>

        {showForm && (
          <form className="card form-card" onSubmit={addEvent}>
            <label style={{ fontSize: 13, color: '#666' }}>Event name</label>
            <input className="text-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event name" />

            <label style={{ fontSize: 13, color: '#666' }}>Month</label>
            <select className="text-input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
              <option value="">Month</option>
              <option value="01">Jan</option>
              <option value="02">Feb</option>
              <option value="03">Mar</option>
              <option value="04">Apr</option>
              <option value="05">May</option>
              <option value="06">Jun</option>
              <option value="07">Jul</option>
              <option value="08">Aug</option>
              <option value="09">Sep</option>
              <option value="10">Oct</option>
              <option value="11">Nov</option>
              <option value="12">Dec</option>
            </select>

            <label style={{ fontSize: 13, color: '#666' }}>Day</label>
            <input
              className="text-input"
              type="number"
              min="1"
              max="31"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}
            />

            <label style={{ fontSize: 13, color: '#666' }}>Time (optional)</label>
            <input
              className="text-input"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />

            <label style={{ fontSize: 13, color: '#666' }}>Location</label>
            <input className="text-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" />

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" className="join">Add</button>
              <button type="button" className="nav-btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {events.map((ev) => (
            <div key={ev.id} className="card event-card" onClick={() => openEvent(ev)}>
              <button className="delete-btn" aria-label="Delete event" onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev.id); setShowConfirm(true); }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0 0-1.4z"/></svg>
              </button>
              <div style={{ fontWeight: 700 }}>{ev.title}</div>
              <div style={{ color: '#666', fontSize: 13 }}>
                {ev.dateISO ? (
                  ev.showTime ? new Date(ev.dateISO).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : new Date(ev.dateISO).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                ) : 'Date TBD'} · {ev.location}
              </div>
            </div>
          ))}

        {selectedEvent && (
          <div className="modal-overlay" onClick={closeEventModal}>
            <div className="modal" onClick={(e)=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <h3 style={{ margin:0 }}>{selectedEvent.title}</h3>
                <button className="delete-btn" onClick={closeEventModal} aria-label="Close modal">✕</button>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <button className={`nav-btn ${modalView==='details'?'active':''}`} onClick={()=>setModalView('details')}>Details</button>
                <button className={`nav-btn ${modalView==='edit'?'active':''}`} onClick={()=>setModalView('edit')}>Edit</button>
                <button className={`nav-btn ${modalView==='invite'?'active':''}`} onClick={()=>setModalView('invite')}>Invite</button>
              </div>

              {modalView === 'details' && (
                <div>
                  <div style={{ color:'#666', marginBottom:8 }}>{selectedEvent.showTime ? new Date(selectedEvent.dateISO).toLocaleString() : new Date(selectedEvent.dateISO).toLocaleDateString()}</div>
                  <div style={{ color:'#666', marginBottom:8 }}>{selectedEvent.location}</div>
                  <div style={{ color:'#666' }}>Attendees: { (selectedEvent.attendees && selectedEvent.attendees.length) || 0 }</div>
                </div>
              )}

              {modalView === 'edit' && (
                <EventEditor event={selectedEvent} onSave={(updated)=>{
                  onUpdateEvent(updated);
                  setSelectedEvent(updated);
                }} />
              )}

              {modalView === 'invite' && (
                <InvitePanel event={selectedEvent} onInvite={(names)=>{
                  const updated = { ...selectedEvent, attendees: [...(selectedEvent.attendees||[]), ...names.map(n=> ({ name:n }))] };
                  onUpdateEvent(updated);
                  setSelectedEvent(updated);
                }} />
              )}
            </div>
          </div>
        )}
        {showConfirm && (
          <div className="modal-overlay">
            <div className="modal">
              <p style={{ margin: 0, fontWeight: 700 }}>Are you sure you want to delete this rallypoint?</p>
              <p style={{ marginTop: 8, marginBottom: 12, color: '#666' }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="nav-btn" onClick={() => { setShowConfirm(false); setDeleteTarget(null); }}>Cancel</button>
                <button className="join" onClick={async () => {
                  if (deleteTarget == null) { setShowConfirm(false); return; }
                  onDeleteEvent(deleteTarget);
                  setShowConfirm(false);
                  setDeleteTarget(null);
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        </div>
      </section>

      <div className="scroll-area" style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
        <section style={{ marginTop: 14, width: '100%' }}>
          <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Attended</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attended.map(a => (
              <div key={a.id} className="card">
                <div style={{ fontWeight:700 }}>{a.title}</div>
                <div style={{ color:'#666', fontSize:13 }}>{new Date(a.date).toLocaleDateString()} · {a.location}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 14, width: '100%' }}>
          <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Media</h3>
          <div className="media-grid">
            {media.map(m => (
              <div key={m.id} className="media-item">Photo</div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 14, width: '100%' }}>
          <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Cheers</h3>
          <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-start' }}>
            <div className="cheers-count">{cheers.count}</div>
            <div style={{ display:'flex', gap:6 }}>
              {cheers.givers.map((g,i)=> (
                <div key={i} className="avatar" style={{ width:28, height:28, fontSize:12, marginLeft:0 }}>{g.name[0]}</div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ marginTop: 14, width: '100%' }}>
          <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Groups</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {groups.map(g => (
              <div key={g.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => onOpenGroup(g.id)}>
                <div>
                  <div style={{ fontWeight:700 }}>{g.name}</div>
                  <div style={{ color:'#666', fontSize:13 }}>{g.members} members</div>
                </div>
                <button className="nav-action-btn" onClick={(e)=>{ e.stopPropagation(); onOpenGroup(g.id); }}>View</button>
              </div>
            ))}
          </div>
        </section>
      </div>

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
        <button className={`nav-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => onNavigate('groups')}>
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

    function ProfileSignIn({ activeTab, onNavigate }) {
      const [email, setEmail] = React.useState('');
      const [sent, setSent] = React.useState(false);
      const configured = isSupabaseConfigured();

      async function handleGoogle() { await signInWithProvider('google'); }
      async function handleEmail(e) {
        e.preventDefault();
        if (!email.trim()) return;
        await signInWithOtp(email.trim());
        setSent(true);
      }

      return (
        <main className="feed-root" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ marginBottom: 32, marginTop: 24 }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--purple)', letterSpacing: '-1px', lineHeight: 1 }}>Rally</div>
            <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Experiences are better shared</div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Join the community</div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              Track events, form groups, and connect with people going to the same things.
            </div>

            {!configured ? (
              <div style={{ color: '#888', fontSize: 13, padding: 12, background: '#F7F7F7', borderRadius: 10 }}>
                Sign-in requires Supabase to be configured.
              </div>
            ) : sent ? (
              <div style={{ color: 'var(--teal)', fontWeight: 600, padding: 14, background: 'var(--light-teal)', borderRadius: 10 }}>
                Check your email for a sign-in link.
              </div>
            ) : (
              <>
                <button
                  onClick={handleGoogle}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 12,
                    border: '2px solid #E8E8E8', background: '#fff',
                    fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px', color: '#ccc', fontSize: 12 }}>
                  <div style={{ flex: 1, height: 1, background: '#EEE' }} />or<div style={{ flex: 1, height: 1, background: '#EEE' }} />
                </div>

                <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className="text-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                  <button type="submit" className="join" style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 15 }}>Send magic link</button>
                </form>
              </>
            )}
          </div>

          <nav className="bottom-nav">
            <button className="nav-btn" onClick={() => onNavigate('home')}><span className="nav-btn-icon">🏠</span><span className="nav-btn-label">Home</span></button>
            <button className="nav-btn" onClick={() => onNavigate('explore')}><span className="nav-btn-icon">🔍</span><span className="nav-btn-label">Explore</span></button>
            <button className="nav-btn" onClick={() => onNavigate('post')}><span className="nav-btn-icon">➕</span><span className="nav-btn-label">Create</span></button>
            <button className="nav-btn" onClick={() => onNavigate('groups')}><span className="nav-btn-icon">💬</span><span className="nav-btn-label">Groups</span></button>
            <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => onNavigate('profile')}><span className="nav-btn-icon">👤</span><span className="nav-btn-label">Profile</span></button>
          </nav>
        </main>
      );
    }

    function EventEditor({ event, onSave }){
      const [title, setTitle] = useState(event.title);
      const [date, setDate] = useState(event.dateISO ? event.dateISO.split('T')[0] : '');
      const [time, setTime] = useState(event.dateISO ? event.dateISO.split('T')[1] : '');
      const [location, setLocation] = useState(event.location || '');

      function save(){
        if(!title.trim() || !date) return;
        const showTime = !!time;
        const dateISO = `${date}T${ showTime ? time : '12:00' }`;
        onSave({ ...event, title: title.trim(), dateISO, showTime, location: location.trim() });
      }

      return (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <label style={{ fontSize:13, color:'#666' }}>Event name</label>
          <input className="text-input" value={title} onChange={e=>setTitle(e.target.value)} />

          <label style={{ fontSize:13, color:'#666' }}>Date</label>
          <input className="text-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />

          <label style={{ fontSize:13, color:'#666' }}>Time (optional)</label>
          <input className="text-input" type="time" value={time} onChange={e=>setTime(e.target.value)} />

          <label style={{ fontSize:13, color:'#666' }}>Location</label>
          <input className="text-input" value={location} onChange={e=>setLocation(e.target.value)} />

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="nav-btn" onClick={()=>{ setTitle(event.title); setDate(event.dateISO?.split('T')[0]||''); setTime(event.dateISO?.split('T')[1]||''); setLocation(event.location||''); }}>Reset</button>
            <button className="join" onClick={save}>Save</button>
          </div>
        </div>
      );
    }

    function InvitePanel({ event, onInvite }){
      const [text, setText] = useState('');
      function send(){
        const names = text.split(',').map(s=>s.trim()).filter(Boolean);
        if(names.length) onInvite(names);
        setText('');
      }
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <label style={{ fontSize:13, color:'#666' }}>Invite friends (comma-separated names)</label>
          <input className="text-input" value={text} onChange={e=>setText(e.target.value)} placeholder="Invite friends by name, separated with commas" />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="join" onClick={send}>Send Invites</button>
          </div>
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:13, color:'#666', marginBottom:6 }}>Current attendees</div>
            {event.attendees && event.attendees.length ? (
              event.attendees.map((a,i)=>(<div key={i} style={{ padding:'6px 0' }}>{a.name}</div>))
            ) : (
              <div style={{ color:'#666' }}>No attendees yet</div>
            )}
          </div>
        </div>
      );
    }
