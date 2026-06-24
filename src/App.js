import './App.css';
import './styles/darkTheme.css';
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
import AuthModal from './components/AuthModal';
import UsernamePrompt from './components/UsernamePrompt';
import { groupsData } from './data/groups';
import { isSupabaseConfigured, signOut, getUser, onAuthStateChange, getEvents as sbGetEvents, insertEvent as sbInsertEvent, updateEvent as sbUpdateEvent, deleteEvent as sbDeleteEvent, insertGroup as sbInsertGroup, updateGroup as sbUpdateGroup, deleteGroup as sbDeleteGroup, getProfile, upsertProfile } from './lib/supabaseClient';

function App() {
  const [user, setUser] = useState(null);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState({
    name: localStorage.getItem('rally_name') || '',
    bio: localStorage.getItem('rally_bio') || '',
    username: localStorage.getItem('rally_username') || '',
    friends: (() => { try { return JSON.parse(localStorage.getItem('rally_friends') || '[]'); } catch(e) { return []; } })(),
  });
  const [authModalMessage, setAuthModalMessage] = useState(null); // null = hidden, string = shown
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

  const loadUserProfile = useCallback(async (userId) => {
    const data = await getProfile(userId);
    const loaded = {
      name: (data?.name) || '',
      bio: (data?.bio) || '',
      username: (data?.username) || '',
      friends: Array.isArray(data?.friends) ? data.friends : [],
    };
    setProfile(loaded);
    localStorage.setItem('rally_name', loaded.name);
    localStorage.setItem('rally_bio', loaded.bio);
    localStorage.setItem('rally_username', loaded.username);
    localStorage.setItem('rally_friends', JSON.stringify(loaded.friends));
    if (!loaded.username) setShowUsernamePrompt(true);
  }, []);

  const handleUsernameChosen = useCallback(async (username) => {
    const updated = { ...profile, username };
    setProfile(updated);
    setShowUsernamePrompt(false);
    localStorage.setItem('rally_username', username);
    if (user) await upsertProfile(user.id, updated);
  }, [profile, user]);

  const handleUpdateProfile = useCallback(async (updated) => {
    setProfile(updated);
    localStorage.setItem('rally_name', updated.name || '');
    localStorage.setItem('rally_bio', updated.bio || '');
    localStorage.setItem('rally_username', updated.username || '');
    localStorage.setItem('rally_friends', JSON.stringify(updated.friends || []));
    if (user) await upsertProfile(user.id, updated);
  }, [user]);

  // auth init — runs once, replaces the old AuthBar effect
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let mounted = true;
    (async () => {
      const u = await getUser();
      if (mounted) { setUser(u); if (u) loadUserProfile(u.id); }
    })();
    const unsub = onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserProfile(session.user.id);
    });
    return () => { mounted = false; unsub(); };
  }, [loadUserProfile]);

  const onAuthRequired = useCallback((message = 'Sign in to continue') => {
    setAuthModalMessage(message);
  }, []);

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
    <div className={`App${darkMode ? ' dark-theme' : ''}`}>
      {/* TEMPORARY dark mode preview toggle — remove before shipping */}
      <div style={{
        position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520, display: 'flex', justifyContent: 'flex-end',
        padding: '0 12px', boxSizing: 'border-box', zIndex: 99999, pointerEvents: 'none',
      }}>
        <button
          onClick={() => setDarkMode(d => !d)}
          style={{
            pointerEvents: 'all',
            background: darkMode ? '#9D8FFF' : '#222', color: '#fff',
            border: 'none', borderRadius: 8, padding: '6px 12px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: 0.85,
          }}
        >
          {darkMode ? '☀ Light' : '🌙 Dark'}
        </button>
      </div>
      {authModalMessage !== null && (
        <AuthModal message={authModalMessage} onClose={() => setAuthModalMessage(null)} />
      )}
      {showUsernamePrompt && user && (
        <UsernamePrompt user={user} onComplete={handleUsernameChosen} />
      )}
      {activeTab === 'home' && (
        <HomeFeed activeTab={activeTab} onNavigate={setActiveTab} events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onOpenEvent={openEvent} user={user} onAuthRequired={onAuthRequired} />
      )}
      {activeTab === 'explore' && (
        <Explore activeTab={activeTab} onNavigate={setActiveTab} events={events} onOpenEvent={openEvent} />
      )}
      {activeTab === 'groups' && (
        <Groups activeTab={activeTab} onNavigate={setActiveTab} groups={groups} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} onCreateGroup={openCreateGroup} user={user} onAuthRequired={onAuthRequired} />
      )}
      {activeTab === 'profile' && (
        <Profile user={user} profile={profile} onUpdateProfile={handleUpdateProfile} activeTab={activeTab} onNavigate={setActiveTab} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onSignOut={() => { signOut(); setUser(null); }} onAuthRequired={onAuthRequired} />
      )}
      {activeTab === 'post' && (
        <Create activeTab={activeTab} onNavigate={setActiveTab} onCreateGroup={openCreateGroup} user={user} onAuthRequired={onAuthRequired} />
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
          user={user}
          onAuthRequired={onAuthRequired}
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
          user={user}
          onAuthRequired={onAuthRequired}
        />
      )}
    </div>
  );
}

export default App;
