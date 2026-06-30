import React, { useState, useEffect } from 'react';
import EventCard from './EventCard';
import StoryViewer from './StoryViewer';
import { getPublicEvents, getSpontaneousPosts, subscribeToSpontaneousPosts, deleteSpontaneousPost, isSupabaseConfigured } from '../lib/supabaseClient';
import './HomeFeed.css';
import { avatarColor } from '../lib/avatarColor';
import { getInitials } from '../lib/utils';

const DAY_LETTERS = ['S','M','T','W','T','F','S'];

function getWeekDays(ref = new Date()) {
  const sunday = new Date(ref);
  sunday.setDate(ref.getDate() - ref.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function toDateKey(d) {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HomeFeed({ activeTab = 'home', onNavigate = () => {}, events = [], onAddEvent = () => {}, onUpdateEvent = () => {}, onDeleteEvent = () => {}, onOpenEvent = () => {}, user = null, profile = null, onAuthRequired = () => {}, groups = [], onOpenGroup = () => {} }) {
  const [campusEvents, setCampusEvents] = useState([]);
  const todayKey = toDateKey(new Date());
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

  const currentUserName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';

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
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0A0A0F', padding: 2, boxSizing: 'border-box' }}>
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
              const initials = getInitials(post.senderName);
              const color = avatarColor(post.senderName || '');
              const displayName = post.senderName?.split(' ')[0] || 'Someone';
              return (
                <div key={post.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => openStory(post.userId)}
                >
                  <div style={{ width: 62, height: 62, borderRadius: '50%', padding: 2, background: 'linear-gradient(135deg, #EF9F27, #FF6BA8)' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0A0A0F', padding: 2, boxSizing: 'border-box' }}>
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

      {campusEvents.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 10px', textAlign: 'left' }}>On Campus</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {campusEvents.slice(0, 4).map(ev => (
              <EventCard key={ev.id} event={ev} onJoin={handleJoin} currentUserName={currentUserName} currentUserId={user?.id} onOpenDetails={onOpenEvent} compact />
            ))}
          </div>
        </section>
      )}

      {/* Calendar — 7×2 grid */}
      {(() => {
        const allCalEvents = [...events, ...campusEvents];
        const now = new Date();
        const fourWeekDays = [0, 7, 14, 21].map(offset => {
          const ref = new Date(now);
          ref.setDate(now.getDate() + offset);
          return getWeekDays(ref);
        }).flat();

        return (
          <section style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 10px', textAlign: 'left' }}>Calendar</h3>

            {/* Day-letter header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {DAY_LETTERS.map((l, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#484860', letterSpacing: '0.05em' }}>
                  {l}
                </div>
              ))}
            </div>

            {/* 7×4 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {fourWeekDays.map((d) => {
                const key = toDateKey(d);
                const isToday = key === todayKey;
                const isPast = key < todayKey;
                const dayEvs = allCalEvents
                  .filter(ev => ev.dateISO && toDateKey(ev.dateISO) === key)
                  .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));

                return (
                  <div key={key} style={{
                    borderRadius: 8,
                    background: isToday ? 'rgba(83,74,183,0.18)' : 'rgba(255,255,255,0.04)',
                    boxShadow: isToday ? 'inset 0 0 0 1.5px var(--purple)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                    padding: '6px 3px 5px',
                    minHeight: 72,
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                    opacity: isPast ? 0.38 : 1,
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: isToday ? 'var(--purple)' : '#EEEEFF', lineHeight: 1, marginBottom: 2, paddingLeft: 3 }}>
                      {d.getDate()}
                    </span>
                    {dayEvs.slice(0, 2).map((ev, j) => (
                      <div key={j} onClick={() => onOpenEvent(ev)} style={{
                        width: '100%', padding: '2px 3px', borderRadius: 4, boxSizing: 'border-box',
                        background: 'rgba(83,74,183,0.32)',
                        fontSize: 9, fontWeight: 700, lineHeight: 1.35,
                        color: '#C4BAFF',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvs.length > 2 && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#555' }}>
                        +{dayEvs.length - 2}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

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
