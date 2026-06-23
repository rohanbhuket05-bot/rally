import './App.css';
import { useState, useEffect, useCallback } from 'react';
import HomeFeed from './components/HomeFeed';
import Profile from './components/Profile';
import Explore from './components/Explore';
import Groups from './components/Groups';
import Create from './components/Create';
import GroupDetails from './components/GroupDetails';
import GroupChat from './components/GroupChat';
import EventDetails from './components/EventDetails';
import CreateGroup from './components/CreateGroup';
import { groupsData } from './data/groups';
import { isSupabaseConfigured, signInWithOtp, signOut, getUser, onAuthStateChange, signInWithProvider, getEvents as sbGetEvents, insertEvent as sbInsertEvent, updateEvent as sbUpdateEvent, deleteEvent as sbDeleteEvent, insertGroup as sbInsertGroup, updateGroup as sbUpdateGroup, deleteGroup as sbDeleteGroup } from './lib/supabaseClient';

function AuthBar({ user, onSetUser }){
  const [email, setEmail] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      if (isSupabaseConfigured()){
        const u = await getUser(); if (mounted) onSetUser(u);
        const unsub = onAuthStateChange((event, session)=>{ onSetUser(session?.user ?? null); });
        return ()=>{ unsub(); mounted=false };
      }
    })();
  },[onSetUser]);

  if (!isSupabaseConfigured()) return null;

  async function handleSignIn(e){
    e.preventDefault();
    if(!email) return;
    await signInWithOtp(email);
    setShowForm(false);
    alert('Check your email for a sign-in link (magic link).');
  }

  async function handleOAuth(provider){
    await signInWithProvider(provider);
    // redirects to provider flow
  }

  return (
    <div style={{ position:'fixed', top:12, right:12 }}>
      {user ? (
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ fontWeight:700 }}>{user.email}</div>
          <button className="nav-btn" onClick={()=>{ signOut(); onSetUser(null); }}>Sign out</button>
        </div>
      ) : (
        <div>
          <button className="nav-btn" onClick={()=>setShowForm(s=>!s)}>Sign in</button>
          <button className="nav-btn" style={{ marginLeft:8 }} onClick={()=>handleOAuth('google')}>Sign in with Google</button>
          {showForm && (
            <form onSubmit={handleSignIn} style={{ display:'flex', gap:8, marginTop:8 }}>
              <input className="text-input" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} />
              <button className="join" type="submit">Send</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [previousTab, setPreviousTab] = useState('home');
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeEventId, setActiveEventId] = useState(null);
  const [createGroupContext, setCreateGroupContext] = useState(null);
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupMessages, setGroupMessages] = useState(() => {
    return groupsData.reduce((acc, group) => {
      acc[group.id] = group.messages || [];
      return acc;
    }, {});
  });

  // load events once
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (isSupabaseConfigured()) {
        const rows = await sbGetEvents();
        if (mounted && rows) {
          setEvents(rows.map(r => ({ id: r.id, title: r.title, dateISO: r.date_iso || r.dateISO, showTime: r.show_time ?? r.showTime ?? true, location: r.location, attendees: r.attendees || [] })));
        }
      } else {
        const raw = localStorage.getItem('rally_events');
        if (raw) {
          try { const parsed = JSON.parse(raw); if (mounted) setEvents(parsed); } catch(e){}
        } else {
          setEvents([]);
        }
      }
    }
    load();
    return () => { mounted = false };
  }, []);

  // persist to localStorage when not using Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()){
      try { localStorage.setItem('rally_events', JSON.stringify(events)); } catch(e){}
    }
  }, [events]);

  // load groups from localStorage (Supabase groups schema migration required before enabling)
  useEffect(() => {
    const raw = localStorage.getItem('rally_groups');
    if (raw) { try { setGroups(JSON.parse(raw)); } catch(e){} }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('rally_groups', JSON.stringify(groups)); } catch(e){}
  }, [groups]);

  const addEvent = useCallback(async (evt) => {
    // optimistic add locally
    const temp = { ...evt, id: Date.now() };
    setEvents(s => {
      const merged = [temp, ...s];
      merged.sort((a,b)=> new Date(a.dateISO||0)-new Date(b.dateISO||0));
      return merged;
    });

    if (isSupabaseConfigured()){
      const created = await sbInsertEvent({ title: evt.title, date_iso: evt.dateISO, show_time: evt.showTime, location: evt.location, attendees: evt.attendees || [] });
      if (created) {
        setEvents(s => s.map(x => x.id === temp.id ? ({ id: created.id, title: created.title, dateISO: created.date_iso || created.dateISO, showTime: created.show_time ?? created.showTime, location: created.location, attendees: created.attendees || [] }) : x));
      }
    }
  }, []);

  const updateEvent = useCallback(async (updated) => {
    setEvents(s => s.map(x => x.id === updated.id ? updated : x));
    if (isSupabaseConfigured()){
      await sbUpdateEvent(updated.id, { title: updated.title, date_iso: updated.dateISO, show_time: updated.showTime, location: updated.location, attendees: updated.attendees || [] });
    }
  }, []);

  const deleteEvent = useCallback(async (id) => {
    setEvents(s => s.filter(x => x.id !== id));
    if (isSupabaseConfigured()){
      await sbDeleteEvent(id);
    }
  }, []);

  const openEvent = useCallback((event) => {
    setActiveEventId(event.id);
    setActiveTab(current => { setPreviousTab(current); return 'event-details'; });
  }, []);

  const openCreateGroup = useCallback((context = {}) => {
    setCreateGroupContext(context);
    setActiveTab(current => { setPreviousTab(current); return 'create-group'; });
  }, []);

  const handleGroupCreated = useCallback((groupData) => {
    const newGroup = { ...groupData, id: Date.now() };
    setGroups(s => [newGroup, ...s]);
    setActiveGroupId(newGroup.id);
    setActiveTab('group');
    if (isSupabaseConfigured()) sbInsertGroup(groupData).then(row => {
      if (row) setGroups(s => s.map(g => g.id === newGroup.id ? { ...newGroup, id: row.id } : g));
    });
  }, []);

  const updateGroup = useCallback((updated) => {
    setGroups(s => s.map(g => g.id === updated.id ? updated : g));
    if (isSupabaseConfigured()) sbUpdateGroup(updated.id, { members: updated.members });
  }, []);

  const deleteGroup = useCallback((id) => {
    setGroups(s => s.filter(g => g.id !== id));
    if (isSupabaseConfigured()) sbDeleteGroup(id);
  }, []);

  return (
    <div className="App">
      <AuthBar user={user} onSetUser={setUser} />
      {activeTab === 'home' && (
        <HomeFeed activeTab={activeTab} onNavigate={setActiveTab} events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onOpenEvent={openEvent} />
      )}
      {activeTab === 'explore' && (
        <Explore activeTab={activeTab} onNavigate={setActiveTab} events={events} onOpenEvent={openEvent} />
      )}
      {activeTab === 'groups' && (
        <Groups activeTab={activeTab} onNavigate={setActiveTab} groups={groups} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} onCreateGroup={openCreateGroup} />
      )}
      {activeTab === 'profile' && (
        <Profile user={user} activeTab={activeTab} onNavigate={setActiveTab} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} />
      )}
      {activeTab === 'post' && (
        <Create activeTab={activeTab} onNavigate={setActiveTab} onCreateGroup={openCreateGroup} />
      )}
      {activeTab === 'group' && activeGroupId && (
        <GroupDetails
          activeTab={activeTab}
          onNavigate={(tab) => {
            setActiveTab(tab);
            if (tab !== 'group' && tab !== 'group-chat') setActiveGroupId(null);
          }}
          group={groups.find(g => g.id === activeGroupId)}
          onUpdateGroup={updateGroup}
          messages={groupMessages[activeGroupId] ?? []}
          onSendMessage={(text) => {
            setGroupMessages((current) => ({
              ...current,
              [activeGroupId]: [
                ...((current[activeGroupId] || [])),
                { id: `new-${Date.now()}`, sender: 'You', text: text.trim(), time: 'Now', me: true },
              ],
            }));
          }}
          onBack={() => { setActiveGroupId(null); setActiveTab('groups'); }}
          onOpenChat={() => setActiveTab('group-chat')}
        />
      )}
      {activeTab === 'group-chat' && activeGroupId && (
        <GroupChat
          activeTab={activeTab}
          onNavigate={(tab) => {
            setActiveTab(tab);
            if (tab !== 'group-chat') setActiveGroupId(null);
          }}
          groupId={activeGroupId}
          messages={groupMessages[activeGroupId] ?? []}
          onSendMessage={(text) => {
            setGroupMessages((current) => ({
              ...current,
              [activeGroupId]: [
                ...((current[activeGroupId] || [])),
                { id: `new-${Date.now()}`, sender: 'You', text: text.trim(), time: 'Now', me: true },
              ],
            }));
          }}
          onBack={() => setActiveTab('group')}
        />
      )}
      {activeTab === 'event-details' && activeEventId && (
        <EventDetails
          event={events.find(e => e.id === activeEventId)}
          onBack={() => setActiveTab(previousTab)}
          onUpdateEvent={updateEvent}
          activeTab={previousTab}
          onNavigate={setActiveTab}
          onCreateGroup={openCreateGroup}
        />
      )}
      {activeTab === 'create-group' && (
        <CreateGroup
          onBack={() => setActiveTab(previousTab)}
          onCreateGroup={handleGroupCreated}
          initialType={createGroupContext?.initialType || null}
          initialEventId={createGroupContext?.eventId || null}
          initialEventTitle={createGroupContext?.eventTitle || null}
          activeTab={previousTab}
          onNavigate={setActiveTab}
        />
      )}
    </div>
  );
}

export default App;
