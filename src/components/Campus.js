import React, { useState, useEffect, useMemo } from 'react';
import EventCard from './EventCard';
import SchoolLogo from './SchoolLogo';
import StoryViewer from './StoryViewer';
import { getPublicEvents, getSpontaneousPosts, subscribeToSpontaneousPosts, deleteSpontaneousPost, isSupabaseConfigured } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import { avatarColor } from '../lib/avatarColor';
import CATEGORIES from '../data/categories';
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
  onUpdateEvent = () => {},
  onAuthRequired = () => {},
}) {
  const [dbEvents, setDbEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spontaneousPosts, setSpontaneousPosts] = useState([]);
  const [viewingStories, setViewingStories] = useState(false);
  const [storyStartIndex, setStoryStartIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [q, setQ] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);

  const school = profile?.school || localStorage.getItem('rally_school') || '';
  const schoolVerified = profile?.school_verified || false;
  const currentUserName = profile?.name || localStorage.getItem('rally_name') || '';

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    getPublicEvents().then(rows => {
      setDbEvents(rows.map(r => ({
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
      })));
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

  const allEvents = useMemo(() => {
    const dbIds = new Set(dbEvents.map(e => e.id));
    const localOnly = events.filter(e => !dbIds.has(e.id));
    return [...dbEvents, ...localOnly].sort((a, b) => {
      if (!a.dateISO) return 1;
      if (!b.dateISO) return -1;
      return new Date(a.dateISO) - new Date(b.dateISO);
    });
  }, [dbEvents, events]);

  const filteredEvents = useMemo(() => {
    const term = q.trim().toLowerCase();
    const catFiltered = selectedCategory
      ? allEvents.filter(e => e.category === selectedCategory || (e.tags || []).includes(selectedCategory))
      : allEvents;
    if (!term) return catFiltered;
    return catFiltered.filter(e =>
      (e.title || '').toLowerCase().includes(term) ||
      (e.location || '').toLowerCase().includes(term)
    );
  }, [q, allEvents, selectedCategory]);

  const campusOrgs = groups.filter(g => g.type === 'club');

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
        <h1>Scene</h1>
        <p className="tagline">Everything happening at your school</p>
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
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Verify your .edu to see what's happening at your school</div>
            <button className="join" onClick={() => onNavigate('profile')} style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13 }}>
              Verify school
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="text-input"
            placeholder="Search events, places…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 38 }}
          />
        </div>
      </section>

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

      {/* Browse by Category */}
      {!q && (
        <section style={{ marginBottom: 24 }}>
          <button
            onClick={() => setCategoryOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: categoryOpen ? '12px 12px 0 0' : 12, padding: '13px 16px',
              cursor: 'pointer', transition: 'border-radius 150ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#EEEEFF' }}>Browse by Category</span>
              {selectedCategory && (
                <span style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 600, background: 'rgba(83,74,183,0.15)', borderRadius: 20, padding: '2px 10px' }}>
                  {selectedCategory}
                </span>
              )}
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8888AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: categoryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {categoryOpen && (
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {CATEGORIES.map(c => {
                const count = allEvents.filter(e => e.category === c.label || (e.tags || []).includes(c.label)).length;
                const isSelected = selectedCategory === c.label;
                return (
                  <button
                    key={c.label}
                    onClick={() => { setSelectedCategory(isSelected ? null : c.label); setCategoryOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: isSelected ? `${c.color}18` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSelected ? c.color : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 10, padding: '11px 10px',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 150ms, background 150ms',
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: c.color }}>
                      {c.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#EEEEFF', lineHeight: 1.2 }}>{c.label}</div>
                      {count > 0 && <div style={{ fontSize: 11, color: '#8888AA', marginTop: 2 }}>{count} event{count !== 1 ? 's' : ''}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Events */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, textAlign: 'left' }}>
          {q ? 'Results' : selectedCategory ? `${selectedCategory} Events` : 'All Events'}
        </h2>
        {!loading && (
          <span style={{ fontSize: 12, color: '#888' }}>{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ padding: '28px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#888', textAlign: 'left' }}>Loading events…</div>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
          {filteredEvents.map(ev => (
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
          <div style={{ fontSize: 13, color: '#666', textAlign: 'left' }}>
            {q ? `No events matching "${q}"` : selectedCategory ? `No ${selectedCategory} events yet` : 'No events yet'}
          </div>
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
