import React, { useState, useEffect } from 'react';
import './HomeFeed.css';

const placeholderFriendNames = new Set(['Maya', 'Leo', 'Ava', 'Jon']);

export default function Profile({ activeTab = 'profile', onNavigate = () => {}, onOpenGroup = () => {}, events = [], onAddEvent = () => {}, onUpdateEvent = () => {}, onDeleteEvent = () => {} }) {
  const [name, setName] = useState(() => localStorage.getItem('rally_name') || '');
  const [bio, setBio] = useState(() => localStorage.getItem('rally_bio') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('rally_username') || '');
  const [editingProfile, setEditingProfile] = useState(false);

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

  const saveProfile = (newName, newBio, newUsername) => {
    setName(newName);
    setBio(newBio);
    setUsername(newUsername);
    localStorage.setItem('rally_name', newName);
    localStorage.setItem('rally_bio', newBio);
    localStorage.setItem('rally_username', newUsername);
    setEditingProfile(false);
  };
  // `events` and handlers are provided by App (single source of truth)
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
  const [showFriendsPanel, setShowFriendsPanel] = useState(true);

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

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Profile</h1>
        <p className="tagline">{name ? `${name} · UCSD` : 'Update your profile to personalize Rally'}</p>
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
              <span className="category-pill" style={{ background:'var(--light-teal)', color:'var(--teal)', fontSize:12, padding:'6px 10px' }}>{cheers.count} cheers</span>
              <span className="category-pill" style={{ background:'var(--light-purple)', color:'var(--purple)', fontSize:12, padding:'6px 10px' }}>{groups.length} groups</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, color: '#666' }}>Username</label>
            <input className="text-input" value={username} onChange={(e)=>setUsername(e.target.value)} />
            <label style={{ fontSize: 13, color: '#666' }}>Full name</label>
            <input className="text-input" value={name} onChange={(e)=>setName(e.target.value)} />
            <label style={{ fontSize: 13, color: '#666' }}>Bio</label>
            <textarea className="text-input textarea" value={bio} onChange={(e)=>setBio(e.target.value)} />
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button className="join" onClick={()=>saveProfile(name,bio,username)}>Save</button>
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
          >Friends</h3>
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

      <div className="scroll-area">
        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: '6px 0' }}>Attended</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attended.map(a => (
              <div key={a.id} className="card">
                <div style={{ fontWeight:700 }}>{a.title}</div>
                <div style={{ color:'#666', fontSize:13 }}>{new Date(a.date).toLocaleDateString()} · {a.location}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: '6px 0' }}>Media</h3>
          <div className="media-grid">
            {media.map(m => (
              <div key={m.id} className="media-item">Photo</div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: '6px 0' }}>Cheers</h3>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div className="cheers-count">{cheers.count}</div>
            <div style={{ display:'flex', gap:6 }}>
              {cheers.givers.map((g,i)=> (
                <div key={i} className="avatar" style={{ width:28, height:28, fontSize:12, marginLeft:0 }}>{g.name[0]}</div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: '6px 0' }}>Groups</h3>
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
