import './App.css';
import { useState, useEffect, useCallback } from 'react';
import HomeFeed from './components/HomeFeed';
import Profile from './components/Profile';
import Explore from './components/Explore';
import Groups from './components/Groups';
import Create from './components/Create';
import GroupDetails from './components/GroupDetails';
import GroupChat from './components/GroupChat';
import { groupsData } from './data/groups';
import { isSupabaseConfigured, signInWithOtp, signOut, getUser, onAuthStateChange, signInWithProvider, getEvents as sbGetEvents, insertEvent as sbInsertEvent, updateEvent as sbUpdateEvent, deleteEvent as sbDeleteEvent } from './lib/supabaseClient';

function AuthBar(){
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      if (isSupabaseConfigured()){
        const u = await getUser(); if (mounted) setUser(u);
        const unsub = onAuthStateChange((event, session)=>{ setUser(session?.user ?? null); });
        return ()=>{ unsub(); mounted=false };
      }
    })();
  },[]);

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
          <button className="nav-btn" onClick={()=>{ signOut(); setUser(null); }}>Sign out</button>
        </div>
      ) : (
        <div>
          <button className="nav-btn" onClick={()=>setShowForm(s=>!s)}>Sign in</button>
          <button className="nav-btn" style={{ marginLeft:8 }} onClick={()=>handleOAuth('google')}>Sign in with Google</button>
          {showForm && (
            <form onSubmit={handleSignIn} style={{ display:'flex', gap:8, marginTop:8 }}>
              <input className="text-input" placeholder="you@school.edu" value={email} onChange={e=>setEmail(e.target.value)} />
              <button className="join" type="submit">Send</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [events, setEvents] = useState([]);
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

  return (
    <div className="App">
      <AuthBar />
      {activeTab === 'home' && (
        <HomeFeed activeTab={activeTab} onNavigate={setActiveTab} events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} />
      )}
      {activeTab === 'explore' && (
        <Explore activeTab={activeTab} onNavigate={setActiveTab} events={events} />
      )}
      {activeTab === 'groups' && (
        <Groups activeTab={activeTab} onNavigate={setActiveTab} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} />
      )}
      {activeTab === 'profile' && (
        <Profile activeTab={activeTab} onNavigate={setActiveTab} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} />
      )}
      {activeTab === 'post' && (
        <Create activeTab={activeTab} onNavigate={setActiveTab} />
      )}
      {activeTab === 'group' && activeGroupId && (
        <GroupDetails
          activeTab={activeTab}
          onNavigate={(tab) => {
            setActiveTab(tab);
            if (tab !== 'group' && tab !== 'group-chat') setActiveGroupId(null);
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
      {/* other tabs (explore, post, groups) can be added later */}
    </div>
  );
}

export default App;
