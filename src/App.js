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
import { isSupabaseConfigured, signOut, getUser, onAuthStateChange, getEvents as sbGetEvents, insertEvent as sbInsertEvent, updateEvent as sbUpdateEvent, deleteEvent as sbDeleteEvent, getGroups as sbGetGroups, insertGroup as sbInsertGroup, updateGroup as sbUpdateGroup, deleteGroup as sbDeleteGroup, leaveGroup as sbLeaveGroup, mapGroupRow, getProfile, upsertProfile } from './lib/supabaseClient';

function App() {
  const [user, setUser] = useState(null);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('rally_dark_mode') === 'true');
  useEffect(() => { localStorage.setItem('rally_dark_mode', darkMode); }, [darkMode]);
  const [profile, setProfile] = useState({
    name: localStorage.getItem('rally_name') || '',
    bio: localStorage.getItem('rally_bio') || '',
    username: localStorage.getItem('rally_username') || '',
    friends: (() => { try { return JSON.parse(localStorage.getItem('rally_friends') || '[]'); } catch(e) { return []; } })(),
  });
  const [authModalMessage, setAuthModalMessage] = useState(null); // null = hidden, string = shown
  const MAIN_TABS = ['home', 'explore', 'groups', 'profile', 'post'];
  const PERSISTENT_TABS = [...MAIN_TABS, 'group', 'group-chat'];
  const [activeTab, setActiveTabRaw] = useState(() => {
    const saved = localStorage.getItem('rally_active_tab');
    // Reloading on group-chat causes a blank screen — redirect to groups until fixed
    if (saved === 'group-chat') return 'groups';
    return PERSISTENT_TABS.includes(saved) ? saved : 'home';
  });
  const setActiveTab = useCallback((tabOrFn) => {
    setActiveTabRaw(prev => {
      const next = typeof tabOrFn === 'function' ? tabOrFn(prev) : tabOrFn;
      if (PERSISTENT_TABS.includes(next)) localStorage.setItem('rally_active_tab', next);
      return next;
    });
  }, []);
  const [previousTab, setPreviousTab] = useState('home');
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('rally_active_group_id') || null);
  useEffect(() => {
    if (activeGroupId) localStorage.setItem('rally_active_group_id', activeGroupId);
    else localStorage.removeItem('rally_active_group_id');
  }, [activeGroupId]);
  const [activeEventId, setActiveEventId] = useState(null);
  const [createGroupContext, setCreateGroupContext] = useState(null);
  const [events, setEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rally_events') || '[]'); } catch(e) { return []; }
  });
  const [groups, setGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rally_groups') || '[]'); } catch(e) { return []; }
  });
  const [previewGroup, setPreviewGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState(() => {
    return groupsData.reduce((acc, group) => {
      acc[group.id] = group.messages || [];
      return acc;
    }, {});
  });

  // load events from Supabase; migrate any localStorage-only events up on first load
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!isSupabaseConfigured()) return;
      const rows = await sbGetEvents();
      if (!mounted) return;
      if (rows && rows.length > 0) {
        // Supabase is authoritative once it has data
        const fallbackHost = localStorage.getItem('rally_username') || localStorage.getItem('rally_name') || '';
        setEvents(rows.map(r => ({ id: r.id, title: r.title, dateISO: r.date_iso || r.dateISO, showTime: r.show_time ?? r.showTime ?? true, location: r.location, city: r.city || '', host: r.host || (r.personal ? undefined : fallbackHost), attendees: r.attendees || [], personal: r.personal ?? false })));
      } else {
        // Supabase empty — migrate any localStorage events up
        const local = (() => { try { return JSON.parse(localStorage.getItem('rally_events') || '[]'); } catch(e) { return []; } })();
        if (local.length > 0) {
          const uploaded = await Promise.all(
            local.map(e => sbInsertEvent({ title: e.title, date_iso: e.dateISO, show_time: e.showTime ?? true, location: e.location, attendees: e.attendees || [] }))
          );
          const migrated = uploaded.filter(Boolean).map(r => ({ id: r.id, title: r.title, dateISO: r.date_iso || r.dateISO, showTime: r.show_time ?? true, location: r.location, attendees: r.attendees || [] }));
          if (mounted && migrated.length > 0) setEvents(migrated);
        }
      }
    }
    load();
    return () => { mounted = false };
  }, []);

  // always persist events to localStorage
  useEffect(() => {
    try { localStorage.setItem('rally_events', JSON.stringify(events)); } catch(e){}
  }, [events]);

  // load groups from Supabase when user is available; migrate localStorage groups if Supabase is empty
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    let mounted = true;
    async function loadGroups() {
      const rows = await sbGetGroups();
      if (!mounted) return;
      if (rows.length > 0) {
        setGroups(rows);
      } else {
        const local = (() => { try { return JSON.parse(localStorage.getItem('rally_groups') || '[]'); } catch(e) { return []; } })();
        // Only migrate groups that don't already have a real UUID — those already exist in Supabase
        // and re-inserting them would create clones with different IDs (breaking group chat)
        const isUUID = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);
        const toMigrate = local.filter(g => !isUUID(g.id));
        if (toMigrate.length > 0) {
          const uploaded = await Promise.all(
            toMigrate.map(g => sbInsertGroup({
              ...g,
              members: (g.members || []).map(m => m.role === 'admin' ? { ...m, user_id: user.id } : m),
            }))
          );
          const migrated = uploaded.filter(Boolean);
          if (mounted && migrated.length > 0) setGroups(migrated);
        } else if (local.length > 0) {
          // UUID groups exist locally but Supabase returned empty — likely a transient auth
          // race condition. Keep local state; Supabase will be in sync on next load.
          setGroups(local);
        }
      }
    }
    loadGroups();
    return () => { mounted = false };
  }, [user]);

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
    const hostName = localStorage.getItem('rally_username') || localStorage.getItem('rally_name') || 'Unknown';
    const temp = { ...evt, id: Date.now(), host: evt.personal ? undefined : (evt.host || hostName) };
    setEvents(s => {
      const merged = [temp, ...s];
      merged.sort((a,b)=> new Date(a.dateISO||0)-new Date(b.dateISO||0));
      return merged;
    });

    if (isSupabaseConfigured()){
      const created = await sbInsertEvent({ title: evt.title, date_iso: evt.dateISO, show_time: evt.showTime, location: evt.location, city: evt.city || '', host: evt.host || '', attendees: evt.attendees || [], personal: evt.personal ?? false });
      if (created) {
        setEvents(s => s.map(x => x.id === temp.id ? ({ id: created.id, title: created.title, dateISO: created.date_iso || created.dateISO, showTime: created.show_time ?? created.showTime, location: created.location, city: evt.city || '', host: evt.host || '', attendees: created.attendees || [], personal: created.personal ?? false }) : x));
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
    const membersWithId = (groupData.members || []).map(m =>
      m.role === 'admin' && user ? { ...m, user_id: user.id } : m
    );
    const enriched = { ...groupData, members: membersWithId };
    const tempId = Date.now();
    const newGroup = { ...enriched, id: tempId };
    setGroups(s => [newGroup, ...s]);
    setActiveGroupId(tempId);
    setActiveTab('group');
    if (isSupabaseConfigured() && user) {
      sbInsertGroup(enriched).then(row => {
        if (row) {
          setGroups(s => s.map(g => g.id === tempId ? row : g));
          setActiveGroupId(row.id);
        }
      });
    }
  }, [user]);

  const updateGroup = useCallback((updated) => {
    setGroups(s => s.map(g => g.id === updated.id ? updated : g));
    if (isSupabaseConfigured()) sbUpdateGroup(updated.id, { members: updated.members });
  }, []);

  const deleteGroup = useCallback((id) => {
    setGroups(s => s.filter(g => g.id !== id));
    if (isSupabaseConfigured()) sbDeleteGroup(id);
  }, []);

  const handleLeaveGroup = useCallback((id) => {
    setGroups(s => s.filter(g => g.id !== id));
    if (isSupabaseConfigured()) sbLeaveGroup(id);
  }, []);

  return (
    <div className={`App${darkMode ? ' dark-theme' : ''}`}>
      {authModalMessage !== null && (
        <AuthModal message={authModalMessage} onClose={() => setAuthModalMessage(null)} />
      )}
      {showUsernamePrompt && user && (
        <UsernamePrompt user={user} onComplete={handleUsernameChosen} />
      )}
      {activeTab === 'home' && (
        <HomeFeed activeTab={activeTab} onNavigate={setActiveTab} events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onOpenEvent={openEvent} user={user} onAuthRequired={onAuthRequired} groups={groups} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} />
      )}
      {activeTab === 'explore' && (
        <Explore activeTab={activeTab} onNavigate={setActiveTab} events={events} onOpenEvent={openEvent} onUpdateEvent={updateEvent} user={user} onAuthRequired={onAuthRequired} />
      )}
      {activeTab === 'groups' && (
        <Groups
          activeTab={activeTab}
          onNavigate={setActiveTab}
          groups={groups}
          onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }}
          onCreateGroup={openCreateGroup}
          onLeaveGroup={handleLeaveGroup}
          user={user}
          onAuthRequired={onAuthRequired}
          onGroupJoined={(group) => {
            setGroups(s => s.some(g => g.id === group.id) ? s.map(g => g.id === group.id ? group : g) : [group, ...s]);
          }}
          onViewGroup={(group) => {
            setPreviewGroup(group);
            setActiveTab('group');
          }}
        />
      )}
      {activeTab === 'profile' && (
        <Profile user={user} profile={profile} onUpdateProfile={handleUpdateProfile} activeTab={activeTab} onNavigate={setActiveTab} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onSignOut={() => { signOut(); setUser(null); }} onAuthRequired={onAuthRequired} darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
      )}
      {activeTab === 'post' && (
        <Create activeTab={activeTab} onNavigate={setActiveTab} onCreateGroup={openCreateGroup} onAddEvent={addEvent} user={user} onAuthRequired={onAuthRequired} />
      )}
      {activeTab === 'group' && (activeGroupId || previewGroup) && (
        <GroupDetails
          activeTab={activeTab}
          onNavigate={(tab) => {
            setActiveTab(tab);
            if (tab !== 'group' && tab !== 'group-chat') { setActiveGroupId(null); setPreviewGroup(null); }
          }}
          group={previewGroup || groups.find(g => g.id === activeGroupId)}
          isPreview={!!previewGroup}
          onUpdateGroup={updateGroup}
          onDeleteGroup={(id) => { deleteGroup(id); setActiveGroupId(null); setPreviewGroup(null); setActiveTab('groups'); }}
          user={user}
          messages={[]}
          onBack={() => { setActiveGroupId(null); setPreviewGroup(null); setActiveTab('groups'); }}
          onOpenChat={() => setActiveTab('group-chat')}
        />
      )}
      {activeTab === 'group-chat' && activeGroupId && (
        <GroupChat
          activeTab={activeTab}
          onNavigate={(tab) => {
            setActiveTab(tab);
            if (tab !== 'group-chat' && tab !== 'group') setActiveGroupId(null);
          }}
          group={groups.find(g => g.id === activeGroupId)}
          user={user}
          profile={profile}
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
