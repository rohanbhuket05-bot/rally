import './App.css';
import './styles/darkTheme.css';
import { useState, useEffect, useCallback } from 'react';
import HomeFeed from './components/HomeFeed';
import Profile from './components/Profile';
import Groups from './components/Groups';
import Create from './components/Create';
import GroupDetails from './components/GroupDetails';
import GroupChat from './components/GroupChat';
import DmChat from './components/DmChat';
import FriendProfilePage from './components/FriendProfilePage';
import EventDetails from './components/EventDetails';
import EventChat from './components/EventChat';
import CreateGroup from './components/CreateGroup';
import AuthModal from './components/AuthModal';
import UsernamePrompt from './components/UsernamePrompt';
import BottomNav from './components/BottomNav';
import SpontaneousCompose from './components/SpontaneousCompose';
import Campus from './components/Campus';
import LandingPage from './components/LandingPage';
import OnboardingFlow from './components/OnboardingFlow';
import OrgOnboardingFlow from './components/OrgOnboardingFlow';
import AccountSwitcher from './components/AccountSwitcher';
import OrgDashboard from './components/OrgDashboard';
import { isSupabaseConfigured, signOut, getUser, onAuthStateChange, getEvents as sbGetEvents, insertEvent as sbInsertEvent, updateEvent as sbUpdateEvent, deleteEvent as sbDeleteEvent, joinEvent as sbJoinEvent, leaveEvent as sbLeaveEvent, getGroups as sbGetGroups, insertGroup as sbInsertGroup, updateGroup as sbUpdateGroup, deleteGroup as sbDeleteGroup, leaveGroup as sbLeaveGroup, getProfile, upsertProfile, createOrGetDm, uploadEventCover as sbUploadEventCover, getMyOrganizations } from './lib/supabaseClient';

const MAIN_TABS = ['home', 'campus', 'groups', 'profile', 'post'];
const PERSISTENT_TABS = [...MAIN_TABS, 'group', 'group-chat', 'friend-profile'];

function App() {
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOrgOnboarding, setShowOrgOnboarding] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [myOrgs, setMyOrgs] = useState([]);
  const [activeContext, setActiveContext] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sphera_active_context')) || { type: 'student' }; }
    catch { return { type: 'student' }; }
  });
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (!localStorage.getItem('sphera_dark_migrated_v1')) {
      localStorage.setItem('sphera_dark_mode', 'true');
      localStorage.setItem('sphera_dark_migrated_v1', '1');
      return true;
    }
    return localStorage.getItem('sphera_dark_mode') !== 'false';
  });
  useEffect(() => { localStorage.setItem('sphera_dark_mode', darkMode); }, [darkMode]);
  useEffect(() => { localStorage.setItem('sphera_active_context', JSON.stringify(activeContext)); }, [activeContext]);
  const [profile, setProfile] = useState({
    name: localStorage.getItem('sphera_name') || '',
    bio: localStorage.getItem('sphera_bio') || '',
    username: localStorage.getItem('sphera_username') || '',
    friends: (() => { try { return JSON.parse(localStorage.getItem('sphera_friends') || '[]'); } catch(e) { return []; } })(),
  });
  const [authModalMessage, setAuthModalMessage] = useState(null); // null = hidden, string = shown
  const [activeTab, setActiveTabRaw] = useState(() => {
    const saved = localStorage.getItem('sphera_active_tab');
    // Reloading on group-chat causes a blank screen — redirect to groups until fixed
    if (saved === 'group-chat') return 'groups';
    if (PERSISTENT_TABS.includes(saved)) return saved;
    // First-time visitors land on profile to set up their account
    const isFirstVisit = !localStorage.getItem('sphera_name') && !localStorage.getItem('sphera_username');
    return isFirstVisit ? 'profile' : 'home';
  });
  const setActiveTab = useCallback((tabOrFn) => {
    setActiveTabRaw(prev => {
      const next = typeof tabOrFn === 'function' ? tabOrFn(prev) : tabOrFn;
      if (PERSISTENT_TABS.includes(next)) localStorage.setItem('sphera_active_tab', next);
      return next;
    });
  }, []);
  const [previousTab, setPreviousTab] = useState('home');
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('sphera_active_group_id') || null);
  useEffect(() => {
    if (activeGroupId) localStorage.setItem('sphera_active_group_id', activeGroupId);
    else localStorage.removeItem('sphera_active_group_id');
  }, [activeGroupId]);
  const [activeEventId, setActiveEventId] = useState(null);
  const [activeEventData, setActiveEventData] = useState(null);
  const [viewingFriendId, setViewingFriendId] = useState(() => localStorage.getItem('sphera_viewing_friend_id') || null);
  useEffect(() => {
    if (viewingFriendId) localStorage.setItem('sphera_viewing_friend_id', viewingFriendId);
    else localStorage.removeItem('sphera_viewing_friend_id');
  }, [viewingFriendId]);
  const [createGroupContext, setCreateGroupContext] = useState(null);
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);

  // clear stale localStorage data — Supabase is the source of truth
  useEffect(() => {
    localStorage.removeItem('sphera_events');
    localStorage.removeItem('sphera_groups');
    localStorage.removeItem('sphera_events_migrated_v3');
  }, []);
  const [previewGroup, setPreviewGroup] = useState(null);
  const [activeDm, setActiveDm] = useState(null); // { id, otherUser }

  // load events from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let mounted = true;
    sbGetEvents().then(rows => {
      if (!mounted || !rows) return;
      const fallbackHost = localStorage.getItem('sphera_username') || localStorage.getItem('sphera_name') || '';
      setEvents(rows.map(r => {
        const isPersonal = r.personal === true;
        return { id: r.id, title: r.title, dateISO: r.date_iso || r.dateISO, showTime: r.show_time ?? r.showTime ?? true, location: r.location, city: r.city || '', host: r.host || (isPersonal ? undefined : fallbackHost), attendees: r.attendees || [], personal: isPersonal, tags: r.tags || [], visibility: isPersonal ? 'private' : (r.visibility || 'public'), user_id: r.user_id, coverUrl: r.cover_url || r.coverUrl || null };
      }));
    });
    return () => { mounted = false };
  }, []);

  // load groups from Supabase when user is available
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    let mounted = true;
    sbGetGroups().then(rows => {
      if (!mounted) return;
      setGroups(rows);
    });
    return () => { mounted = false };
  }, [user]);

  const loadUserProfile = useCallback(async (userId, u) => {
    const data = await getProfile(userId);
    const loaded = {
      name: (data?.name) || '',
      bio: (data?.bio) || '',
      username: (data?.username) || '',
      friends: Array.isArray(data?.friends) ? data.friends : [],
      school: (data?.school) || '',
      school_verified: !!(data?.school_verified),
      avatar_url: (data?.avatar_url) || u?.user_metadata?.avatar_url || '',
      grad_year: data?.grad_year || null,
    };
    setProfile(loaded);
    localStorage.setItem('sphera_name', loaded.name);
    localStorage.setItem('sphera_bio', loaded.bio);
    localStorage.setItem('sphera_username', loaded.username);
    localStorage.setItem('sphera_friends', JSON.stringify(loaded.friends));
    if (loaded.school) localStorage.setItem('sphera_school', loaded.school);
    if (loaded.school_verified) localStorage.setItem('sphera_school_verified', loaded.school);
    // Persist Google avatar and email to profiles table on first sign-in
    if (!data?.avatar_url && loaded.avatar_url || !data?.email) {
      upsertProfile(userId, { ...loaded, email: u?.email || '' });
    }
    const intent = localStorage.getItem('sphera_signup_intent');
    if (intent === 'org') {
      localStorage.removeItem('sphera_signup_intent');
      setShowOrgOnboarding(true);
      return;
    }
    const orgs = await getMyOrganizations(userId);
    setMyOrgs(orgs);
    const savedContext = (() => { try { return JSON.parse(localStorage.getItem('sphera_active_context')); } catch { return null; } })();
    const hasContext = savedContext && savedContext.type;
    if (orgs.length > 0 && !hasContext) {
      setShowAccountSwitcher(true);
    } else if (!loaded.school) {
      setShowOnboarding(true);
    } else if (!loaded.username) {
      setShowUsernamePrompt(true);
    }
  }, []);

  const handleOrgOnboardingComplete = useCallback(async () => {
    setShowOrgOnboarding(false);
    if (user) {
      const orgs = await getMyOrganizations(user.id);
      setMyOrgs(orgs);
      if (orgs.length > 0) setShowAccountSwitcher(true);
    }
  }, [user]);

  const handleUsernameChosen = useCallback(async (username) => {
    const updated = { ...profile, username };
    setProfile(updated);
    setShowUsernamePrompt(false);
    localStorage.setItem('sphera_username', username);
    if (user) await upsertProfile(user.id, updated);
  }, [profile, user]);

  const handleUpdateProfile = useCallback(async (updated) => {
    setProfile(updated);
    localStorage.setItem('sphera_name', updated.name || '');
    localStorage.setItem('sphera_bio', updated.bio || '');
    localStorage.setItem('sphera_username', updated.username || '');
    localStorage.setItem('sphera_friends', JSON.stringify(updated.friends || []));
    if (user) await upsertProfile(user.id, updated);
  }, [user]);

  // auth init — runs once, replaces the old AuthBar effect
  useEffect(() => {
    if (!isSupabaseConfigured()) { setAuthResolved(true); return; }
    let mounted = true;
    (async () => {
      const u = await getUser();
      if (mounted) { setUser(u); if (u) loadUserProfile(u.id, u); setAuthResolved(true); }
    })();
    const unsub = onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserProfile(session.user.id, session.user);
    });
    return () => { mounted = false; unsub(); };
  }, [loadUserProfile]);

  const onAuthRequired = useCallback((message = 'Sign in to continue') => {
    setAuthModalMessage(message);
  }, []);

  const handleOnboardingComplete = useCallback(async ({ school, gradYear, username, name, avatarUrl, schoolVerified, eduEmail }) => {
    const updated = { ...profile, school, grad_year: gradYear, username, name, avatar_url: avatarUrl, school_verified: !!schoolVerified };
    setProfile(updated);
    localStorage.setItem('sphera_school', school);
    localStorage.setItem('sphera_username', username);
    localStorage.setItem('sphera_name', name);
    if (schoolVerified) localStorage.setItem('sphera_school_verified', school);
    if (user) await upsertProfile(user.id, { ...updated, email: user.email, school_verified: !!schoolVerified });
    setShowOnboarding(false);
  }, [profile, user]);

  const addEvent = useCallback(async (evt) => {
    // optimistic add locally
    const hostName = localStorage.getItem('sphera_username') || localStorage.getItem('sphera_name') || 'Unknown';
    const temp = { ...evt, id: Date.now(), host: evt.personal ? undefined : (evt.host || hostName) };
    setEvents(s => {
      const merged = [temp, ...s];
      merged.sort((a,b)=> new Date(a.dateISO||0)-new Date(b.dateISO||0));
      return merged;
    });

    if (isSupabaseConfigured()){
      const created = await sbInsertEvent({ title: evt.title, date_iso: evt.dateISO, show_time: evt.showTime, location: evt.location, city: evt.city || '', host: temp.host || '', personal: evt.personal ?? false, tags: evt.tags || [], visibility: evt.visibility || 'public', cover_url: evt.coverUrl || null });
      if (created) {
        let coverUrl = created.cover_url || null;
        if (evt.coverFile && created.id) {
          const uploaded = await sbUploadEventCover(created.id, evt.coverFile);
          if (uploaded) {
            coverUrl = uploaded;
            await sbUpdateEvent({ id: created.id, cover_url: uploaded });
          }
        }
        setEvents(s => s.map(x => x.id === temp.id ? ({ id: created.id, title: created.title, dateISO: created.date_iso || created.dateISO, showTime: created.show_time ?? created.showTime, location: created.location, city: evt.city || '', host: temp.host || '', attendees: created.attendees || [], personal: evt.personal ?? created.personal ?? false, tags: created.tags || evt.tags || [], visibility: evt.visibility || created.visibility || (evt.personal ? 'private' : 'public'), user_id: created.user_id, coverUrl, description: evt.description || null }) : x));
      }
    }
  }, []);

  const updateEvent = useCallback(async (updated) => {
    let prevAttendees = [];
    setEvents(s => {
      const existing = s.find(x => x.id === updated.id);
      prevAttendees = existing?.attendees || [];
      return s.some(x => x.id === updated.id) ? s.map(x => x.id === updated.id ? updated : x) : [...s, updated];
    });
    setActiveEventData(prev => prev?.id === updated.id ? updated : prev);
    if (isSupabaseConfigured() && user) {
      const wasAttending = prevAttendees.some(a => a.user_id === user.id);
      const isAttending = (updated.attendees || []).some(a => a.user_id === user.id);
      if (!wasAttending && isAttending) {
        const a = (updated.attendees || []).find(a => a.user_id === user.id);
        await sbJoinEvent(updated.id, { userId: user.id, name: a?.name || '', initials: a?.initials || '', avatarUrl: a?.avatar_url || '' });
      } else if (wasAttending && !isAttending) {
        await sbLeaveEvent(updated.id, user.id);
      }
      if (updated.user_id === user.id) {
        await sbUpdateEvent({ id: updated.id, date_iso: updated.dateISO, show_time: updated.showTime, title: updated.title, location: updated.location, tags: updated.tags || [], visibility: updated.visibility || 'public', cover_url: updated.coverUrl || null, description: updated.description || null });
      }
    }
  }, [user]);

  const deleteEvent = useCallback(async (id) => {
    setEvents(s => s.filter(x => x.id !== id));
    if (isSupabaseConfigured()){
      await sbDeleteEvent(id);
    }
  }, []);

  const openEvent = useCallback((event) => {
    setActiveEventId(event.id);
    setActiveEventData(event);
    setActiveTab(current => { setPreviousTab(current); return 'event-details'; });
  }, [setActiveTab]);

  const navigateFromTab = useCallback((tab) => {
    if (tab === 'spontaneous') {
      setActiveTab(current => { setPreviousTab(current); return 'spontaneous'; });
    } else {
      setActiveTab(tab);
    }
  }, [setActiveTab]);

  const openCreateGroup = useCallback((context = {}) => {
    setCreateGroupContext(context);
    setActiveTab(current => { setPreviousTab(current); return 'create-group'; });
  }, [setActiveTab]);

  const handleGroupCreated = useCallback((groupData) => {
    const tempId = Date.now();
    const newGroup = { ...groupData, id: tempId, members: [] };
    setGroups(s => [newGroup, ...s]);
    setActiveGroupId(tempId);
    setActiveTab('group');
    if (isSupabaseConfigured() && user) {
      sbInsertGroup(groupData).then(row => {
        if (row) {
          setGroups(s => s.map(g => g.id === tempId ? row : g));
          setActiveGroupId(row.id);
        }
      });
    }
  }, [user, setActiveTab]);

  const updateGroup = useCallback((updated) => {
    setGroups(s => s.map(g => g.id === updated.id ? updated : g));
    if (isSupabaseConfigured()) {
      const payload = {};
      if (updated.logoColor !== undefined) payload.logo_color = updated.logoColor;
      if (updated.logoUrl !== undefined) payload.logo_url = updated.logoUrl;
      if (Object.keys(payload).length > 0) sbUpdateGroup(updated.id, payload);
    }
  }, []);

  const deleteGroup = useCallback((id) => {
    setGroups(s => s.filter(g => g.id !== id));
    if (isSupabaseConfigured()) sbDeleteGroup(id);
  }, []);

  const handleLeaveGroup = useCallback((id) => {
    setGroups(s => s.filter(g => g.id !== id));
    if (isSupabaseConfigured()) sbLeaveGroup(id);
  }, []);

  if (!authResolved) return null;
  if (!user) return <div className="dark-theme"><LandingPage /></div>;
  if (showOrgOnboarding) return <div className="dark-theme"><OrgOnboardingFlow user={user} onComplete={handleOrgOnboardingComplete} /></div>;
  if (showOnboarding) return <div className="dark-theme"><OnboardingFlow user={user} profile={profile} onComplete={handleOnboardingComplete} /></div>;
  if (showAccountSwitcher) return (
    <div className="dark-theme">
      <AccountSwitcher
        profile={profile}
        orgs={myOrgs}
        onSelectStudent={() => {
          setActiveContext({ type: 'student' });
          setShowAccountSwitcher(false);
          if (!profile.school) setShowOnboarding(true);
        }}
        onSelectOrg={(org) => {
          setActiveContext({ type: 'org', org });
          setShowAccountSwitcher(false);
        }}
      />
    </div>
  );
  if (activeContext.type === 'org') return (
    <div className="dark-theme">
      <OrgDashboard
        org={activeContext.org}
        onSwitch={() => setShowAccountSwitcher(true)}
      />
    </div>
  );

  return (
    <div className={`App${darkMode ? ' dark-theme' : ''}`}>
      {authModalMessage !== null && (
        <AuthModal message={authModalMessage} onClose={() => setAuthModalMessage(null)} />
      )}
      {showUsernamePrompt && user && (
        <UsernamePrompt user={user} onComplete={handleUsernameChosen} />
      )}
      {activeTab === 'home' && (
        <HomeFeed activeTab={activeTab} onNavigate={navigateFromTab} events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onOpenEvent={openEvent} user={user} profile={profile} onAuthRequired={onAuthRequired} groups={groups} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} />
      )}
      {activeTab === 'campus' && (
        <Campus user={user} profile={profile} events={events.filter(e => !e.personal && e.visibility === 'public')} groups={groups} onOpenEvent={openEvent} onNavigate={setActiveTab} onUpdateEvent={updateEvent} onAuthRequired={onAuthRequired} />
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
          profile={profile}
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
        <Profile user={user} profile={profile} onUpdateProfile={handleUpdateProfile} activeTab={activeTab} onNavigate={setActiveTab} onOpenGroup={(id) => { setActiveGroupId(id); setActiveTab('group'); }} events={events} groups={groups} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onSignOut={() => { signOut(); setUser(null); localStorage.removeItem('sphera_active_context'); setActiveContext({ type: 'student' }); setMyOrgs([]); }} onSwitchAccount={() => setShowAccountSwitcher(true)} onAuthRequired={onAuthRequired} darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} onViewFriend={(id) => { setViewingFriendId(id); setActiveTab('friend-profile'); }} onOpenDm={async (otherId, otherUser) => { const dm = await createOrGetDm(otherId); if (dm) { setActiveDm({ id: dm.id, otherUser }); setActiveTab('dm'); } }} />
      )}
      {activeTab === 'friend-profile' && (
        <FriendProfilePage
          friendId={viewingFriendId}
          groups={groups}
          onBack={() => { setViewingFriendId(null); setActiveTab('profile'); }}
        />
      )}
      {activeTab === 'post' && (
        <Create activeTab={activeTab} onNavigate={navigateFromTab} onCreateGroup={openCreateGroup} onAddEvent={addEvent} user={user} onAuthRequired={onAuthRequired} />
      )}
      {activeTab === 'spontaneous' && (
        <SpontaneousCompose
          user={user}
          profile={profile}
          onBack={() => setActiveTab(previousTab)}
          onPosted={() => setActiveTab('home')}
        />
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
      {activeTab === 'dm' && activeDm && (
        <DmChat
          dmId={activeDm.id}
          otherUser={activeDm.otherUser}
          user={user}
          profile={profile}
          onBack={() => { setActiveDm(null); setActiveTab('profile'); }}
        />
      )}
      {activeTab === 'event-details' && activeEventId && (
        <EventDetails
          event={activeEventData || events.find(e => e.id === activeEventId)}
          onBack={() => setActiveTab(previousTab)}
          onUpdateEvent={updateEvent}
          activeTab={previousTab}
          onNavigate={setActiveTab}
          onCreateGroup={openCreateGroup}
          onOpenChat={() => setActiveTab('event-chat')}
          user={user}
          profile={profile}
          onAuthRequired={onAuthRequired}
        />
      )}
      {activeTab === 'event-chat' && activeEventId && (
        <EventChat
          event={activeEventData || events.find(e => e.id === activeEventId)}
          user={user}
          profile={profile}
          onBack={() => setActiveTab('event-details')}
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
      <div className="nav-fade" />
      <BottomNav
        activeTab={activeTab}
        onNavigate={(tab) => {
          setActiveTab(tab);
          if (tab !== 'group' && tab !== 'group-chat') {
            setActiveGroupId(null);
            setPreviewGroup(null);
          }
        }}
      />
    </div>
  );
}

export default App;
