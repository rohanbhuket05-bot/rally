import React, { useState, useEffect } from 'react';
import EventCard from './EventCard';
import StoryViewer from './StoryViewer';
import { getPublicEvents, getSpontaneousPosts, subscribeToSpontaneousPosts, deleteSpontaneousPost, isSupabaseConfigured } from '../lib/supabaseClient';
import './HomeFeed.css';
import SchoolLogo from './SchoolLogo';

const AVATAR_COLORS = ['#534AB7','#D4537E','#1D9E75','#EF9F27','#667EEA','#9B59B6'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function HomeFeed({ activeTab = 'home', onNavigate = () => {}, events = [], onAddEvent = () => {}, onUpdateEvent = () => {}, onDeleteEvent = () => {}, onOpenEvent = () => {}, user = null, profile = null, onAuthRequired = () => {}, groups = [], onOpenGroup = () => {} }) {
  const [showAllEvents, setShowAllEvents] = React.useState(false);
  const [groupsJoined, setGroupsJoined] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rally_groups_joined') || '[]');
      return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : [];
    } catch(e){ return [] }
  });

  const [campusEvents, setCampusEvents] = useState([]);
  const [spontaneousPosts, setSpontaneousPosts] = useState([]);
  const [viewingStories, setViewingStories] = useState(false);
  const [storyStartIndex, setStoryStartIndex] = useState(0);

  useEffect(() => {
    getPublicEvents().then(rows => {
      const campus = rows
        .filter(r => (r.tags || []).includes('On Campus') || r.category === 'On Campus')
        .map(r => ({
          id: r.id, title: r.title,
          dateISO: r.date_iso || r.dateISO,
          showTime: r.show_time ?? r.showTime ?? true,
          location: r.location || '', city: r.city || '',
          tags: r.tags || [], category: r.category || '',
          host: r.host || '', attendees: r.attendees || [],
          personal: false, user_id: r.user_id,
        }));
      setCampusEvents(campus);
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !user) return;
    getSpontaneousPosts().then(posts => setSpontaneousPosts(posts));
    const unsub = subscribeToSpontaneousPosts(
      post => setSpontaneousPosts(prev => [post, ...prev.filter(p => p.id !== post.id)]),
      id => setSpontaneousPosts(prev => prev.filter(p => p.id !== id))
    );
    return unsub;
  }, [user]);

  const allGroups = [];
  const currentUserName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';
  const school = profile?.school || localStorage.getItem('rally_school') || '';
  const schoolVerified = profile?.school_verified || localStorage.getItem('rally_school_verified');

  // Deduplicate by user: most recent post per user
  const storyByUser = Object.values(
    spontaneousPosts.reduce((acc, p) => { if (!acc[p.userId]) acc[p.userId] = p; return acc; }, {})
  );
  // Own story first
  const storyCircles = [
    ...storyByUser.filter(p => p.userId === user?.id),
    ...storyByUser.filter(p => p.userId !== user?.id),
  ];
  const hasOwnStory = storyByUser.some(p => p.userId === user?.id);

  function openStory(userId) {
    const idx = storyCircles.findIndex(p => p.userId === userId);
    setStoryStartIndex(Math.max(0, idx));
    setViewingStories(true);
  }

  function handleJoin(event){
    if (!user) { onAuthRequired('Sign in to join this event'); return; }
    const name = currentUserName;
    const initials = (name || 'You').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
    const exists = (event.attendees || []).some(a=>a.name === name);
    const attendees = exists ? (event.attendees || []).filter(a=>a.name !== name) : [{ name, initials, color: '#FFFFFF', user_id: user?.id, avatar_url: profile?.avatar_url || '' }, ...(event.attendees || [])];
    onUpdateEvent({ ...event, attendees });
  }

  function toggleGroup(id){
    const next = groupsJoined.includes(id) ? groupsJoined.filter(x=>x!==id) : [...groupsJoined, id];
    setGroupsJoined(next); localStorage.setItem('rally_groups_joined', JSON.stringify(next));
  }

  async function handleDeleteStory(id) {
    await deleteSpontaneousPost(id);
    setSpontaneousPosts(prev => prev.filter(p => p.id !== id));
  }

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Home</h1>
        <p className="tagline">Experiences are better shared</p>
      </header>
      <div className="scroll-area">

      {/* Story circles — shown when signed in */}
      {user && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>

            {/* Your story circle — always visible */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
              onClick={() => hasOwnStory ? openStory(user.id) : (user ? onNavigate('spontaneous') : onAuthRequired('Sign in to post'))}
            >
              <div style={{ position: 'relative', width: 62, height: 62 }}>
                <div style={{ width: 62, height: 62, borderRadius: '50%', padding: 2, background: hasOwnStory ? 'linear-gradient(135deg, #EF9F27, #FF6BA8)' : 'rgba(255,255,255,0.1)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0A0A0F', padding: 2 }}>
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#EF9F27', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                        {(profile?.name || profile?.username || 'Y')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                {!hasOwnStory && (
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: '#EF9F27', border: '2px solid #0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, color: '#8888AA', fontWeight: 600, maxWidth: 62, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Your story
              </span>
            </div>

            {/* Other users' story circles */}
            {storyCircles.filter(p => p.userId !== user?.id).map(post => {
              const initials = (post.senderName || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
              const color = avatarColor(post.senderName || '');
              const displayName = post.senderName?.split(' ')[0] || 'Someone';
              return (
                <div key={post.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => openStory(post.userId)}
                >
                  <div style={{ width: 62, height: 62, borderRadius: '50%', padding: 2, background: 'linear-gradient(135deg, #EF9F27, #FF6BA8)' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0A0A0F', padding: 2 }}>
                      {post.avatarUrl ? (
                        <img src={post.avatarUrl} alt={post.senderName} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                          {initials}
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#8888AA', fontWeight: 600, maxWidth: 62, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* College section */}
      <section style={{ marginBottom: 20 }}>
        {school ? (
          <div className="card" style={{ marginBottom: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <SchoolLogo school={school} size={42} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#EEEEFF', lineHeight: 1.2 }}>{school}</div>
                <div style={{ fontSize: 12, color: '#8888AA', marginTop: 2 }}>
                  {campusEvents.length > 0 ? `${campusEvents.length} campus event${campusEvents.length !== 1 ? 's' : ''}` : 'No campus events yet'}
                </div>
              </div>
            </div>
            {schoolVerified && (
              <span className="category-pill" style={{ background: 'rgba(29,158,117,0.15)', color: 'var(--teal)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                ✓ Verified
              </span>
            )}
          </div>
        ) : user ? (
          <div className="card" style={{ marginBottom: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }} onClick={() => onNavigate('profile')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#EEEEFF' }}>Add your school</div>
                <div style={{ fontSize: 12, color: '#8888AA', marginTop: 2 }}>See events happening on your campus</div>
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        ) : null}

        {campusEvents.length > 0 && (
          <>
            <h3 style={{ margin: '0 0 10px', textAlign: 'left' }}>On Campus</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {campusEvents.slice(0, 4).map(ev => (
                <EventCard key={ev.id} event={ev} onJoin={handleJoin} currentUserName={currentUserName} currentUserId={user?.id} onOpenDetails={onOpenEvent} compact />
              ))}
            </div>
          </>
        )}
      </section>

      <section style={{ marginBottom: 12 }}>
        <h3
          style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 6, cursor: events.length > 3 ? 'pointer' : undefined }}
          onClick={() => events.length > 3 && setShowAllEvents(s => !s)}
        >
          Upcoming
          {events.length > 3 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--purple)', fontSize: 11, fontWeight: 600 }}>
              {!showAllEvents && `+${events.length - 3}`}
              <span style={{ transition: 'transform 200ms', display: 'inline-block', transform: showAllEvents ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </span>
          )}
        </h3>
        <div className="cards">
          {(showAllEvents ? events : events.slice(0, 3)).map((ev) => (
            <EventCard key={ev.id} event={ev} onJoin={handleJoin} currentUserName={currentUserName} currentUserId={user?.id} onOpenDetails={onOpenEvent} />
          ))}
        </div>
      </section>

      {(() => {
        const myGroups = groups.filter(g => g.members?.some(m => m.user_id && user ? m.user_id === user.id : false));
        if (!user || myGroups.length === 0) return null;
        return (
          <section style={{ marginTop: 14 }}>
            <h3 style={{ margin: '6px 0' }}>Groups</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myGroups.map(g => (
                <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => onOpenGroup(g.id)}>
                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
                    {g.description && <div style={{ color: '#666', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description}</div>}
                  </div>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      </div>

      {viewingStories && storyCircles.length > 0 && (
        <StoryViewer
          posts={storyCircles}
          startIndex={storyStartIndex}
          user={user}
          onClose={() => setViewingStories(false)}
          onDelete={handleDeleteStory}
        />
      )}
    </main>
  );
}
