import React, { useState, useEffect } from 'react';
import EventCard from './EventCard';
import SchoolLogo from './SchoolLogo';
import StoryViewer from './StoryViewer';
import { getPublicEvents, getSpontaneousPosts, subscribeToSpontaneousPosts, deleteSpontaneousPost, isSupabaseConfigured } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import { avatarColor } from '../lib/avatarColor';
import './HomeFeed.css';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Campus({
  user = null,
  profile = {},
  events = [],
  groups = [],
  onOpenEvent = () => {},
  onNavigate = () => {},
}) {
  const [campusEvents, setCampusEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spontaneousPosts, setSpontaneousPosts] = useState([]);
  const [viewingStories, setViewingStories] = useState(false);
  const [storyStartIndex, setStoryStartIndex] = useState(0);

  const school = profile?.school || localStorage.getItem('rally_school') || '';
  const schoolVerified = profile?.school_verified || false;
  const currentUserName = profile?.name || localStorage.getItem('rally_name') || '';

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    getPublicEvents().then(rows => {
      const campus = rows
        .filter(r => (r.tags || []).includes('On Campus') || r.category === 'On Campus')
        .map(r => ({
          id: r.id,
          title: r.title,
          date: r.date,
          dateISO: r.date_iso || r.dateISO,
          showTime: r.show_time ?? r.showTime ?? false,
          location: r.location,
          attendees: r.attendees || [],
          tags: r.tags || [],
          category: r.category,
          host: r.host,
          user_id: r.user_id,
          trending: r.trending,
        }));
      setCampusEvents(campus);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !user) return;
    getSpontaneousPosts().then(setSpontaneousPosts);
    const unsub = subscribeToSpontaneousPosts(
      post => setSpontaneousPosts(prev => [post, ...prev.filter(p => p.id !== post.id)]),
      id   => setSpontaneousPosts(prev => prev.filter(p => p.id !== id))
    );
    return unsub;
  }, [user]);

  const myOnCampusEvents = events.filter(e =>
    (e.tags || []).includes('On Campus') || e.category === 'On Campus'
  );
  const allCampusEvents = [
    ...myOnCampusEvents,
    ...campusEvents.filter(ce => !myOnCampusEvents.some(me => me.id === ce.id)),
  ].sort((a, b) => {
    if (!a.dateISO) return 1;
    if (!b.dateISO) return -1;
    return new Date(a.dateISO) - new Date(b.dateISO);
  });

  const campusOrgs = groups.filter(g => g.type === 'club');

  // Deduplicate posts by user, own story first
  const storyByUser = Object.values(
    spontaneousPosts.reduce((acc, p) => { if (!acc[p.userId]) acc[p.userId] = p; return acc; }, {})
  );
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

  async function handleDeleteStory(id) {
    await deleteSpontaneousPost(id);
    setSpontaneousPosts(prev => prev.filter(p => p.id !== id));
  }

  return (
    <main className="feed-root" style={{ overflowY: 'auto' }}>
      <header className="feed-header">
        <h1>Campus</h1>
        <p className="tagline">Your school, your scene</p>
      </header>

      {/* School banner */}
      {school ? (
        <div style={{
          marginBottom: 20,
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(83,74,183,0.15) 0%, rgba(83,74,183,0.05) 100%)',
          border: '1px solid rgba(83,74,183,0.28)',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <SchoolLogo school={school} size={52} style={{ flexShrink: 0 }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: 19, color: 'var(--text-primary)', lineHeight: 1.2 }}>{school}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
              {schoolVerified ? (
                <>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="var(--teal)">
                    <path d="M9 16.2l-4.2-4.2-1.4 1.4 5.6 5.6 12-12-1.4-1.4z"/>
                  </svg>
                  <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>Verified Student</span>
                </>
              ) : (
                <button
                  onClick={() => onNavigate('profile')}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--purple)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Verify your .edu →
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20, padding: '22px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3.333 2 8.667 2 12 0v-5"/>
          </svg>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Add your college</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Verify your .edu to unlock your campus feed</div>
            <button className="join" onClick={() => onNavigate('profile')} style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13 }}>
              Verify school
            </button>
          </div>
        </div>
      )}

      {/* Stories */}
      {user && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, textAlign: 'left' }}>Stories</h2>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>

            {/* Your story */}
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
              onClick={() => hasOwnStory ? openStory(user.id) : onNavigate('spontaneous')}
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

            {/* Others */}
            {storyCircles.filter(p => p.userId !== user?.id).map(post => {
              const col = avatarColor(post.senderName || '');
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
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                          {getInitials(post.senderName)}
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

      {/* Rallypoints */}
      {spontaneousPosts.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, textAlign: 'left' }}>Rallypoints</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {spontaneousPosts.map(post => {
              const col = avatarColor(post.senderName || '');
              const isOwn = post.userId === user?.id;
              return (
                <div key={post.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {post.avatarUrl ? (
                      <img src={post.avatarUrl} alt={post.senderName} referrerPolicy="no-referrer" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {getInitials(post.senderName)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{post.senderName || 'Someone'}</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>{timeAgo(post.createdAt)}</div>
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => handleDeleteStory(post.id)}
                        style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '4px', lineHeight: 1, fontSize: 18 }}
                        aria-label="Delete"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)', textAlign: 'left' }}>{post.text}</p>
                  {post.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span style={{ fontSize: 12, color: '#888' }}>{post.location}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Campus Events */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, textAlign: 'left' }}>Campus Events</h2>
        {!loading && (
          <span style={{ fontSize: 12, color: '#888' }}>{allCampusEvents.length} event{allCampusEvents.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ padding: '28px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#888', textAlign: 'left' }}>Loading events…</div>
        </div>
      ) : allCampusEvents.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
          {allCampusEvents.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              compact
              onOpenDetails={onOpenEvent}
              currentUserId={user?.id}
              currentUserName={currentUserName}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '28px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 4, textAlign: 'left' }}>No campus events yet</div>
          <div style={{ fontSize: 12, color: '#888', textAlign: 'left' }}>Tag your events "On Campus" when creating them to see them here</div>
        </div>
      )}

      {/* Campus Orgs */}
      {campusOrgs.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, textAlign: 'left' }}>Campus Organizations</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {campusOrgs.map(g => {
              const memberCount = g.members?.length || 0;
              const isAdmin = g.members?.some(m =>
                ((user && m.user_id === user.id) || m.name === currentUserName) && m.role === 'admin'
              );
              return (
                <div key={g.id} className="card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '12px 14px', ...(isAdmin ? { border: '1px solid rgba(255,185,0,0.5)', boxShadow: '0 0 10px rgba(255,185,0,0.15), inset 0 0 10px rgba(255,185,0,0.03)' } : {}) }}>
                  {g.logoUrl
                    ? <img src={g.logoUrl} alt={g.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, borderRadius: 10, background: g.logoColor || avatarColor(g.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{getInitials(g.name)}</div>
                  }
                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
