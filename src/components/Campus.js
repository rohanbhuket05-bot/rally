import React, { useState, useEffect, useMemo } from 'react';
import EventCard from './EventCard';
import SchoolLogo from './SchoolLogo';
import StoryViewer from './StoryViewer';
import { getPublicEvents, getSpontaneousPosts, subscribeToSpontaneousPosts, deleteSpontaneousPost, isSupabaseConfigured } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import { avatarColor } from '../lib/avatarColor';
import CATEGORIES from '../data/categories';
import './HomeFeed.css';

function OrgAvatar({ g, size = 44 }) {
  return g.logoUrl
    ? <img src={g.logoUrl} alt={g.name} style={{ width: size, height: size, borderRadius: size * 0.25, objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: size * 0.25, background: g.logoColor || avatarColor(g.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.32, flexShrink: 0 }}>{getInitials(g.name)}</div>;
}

function OrgRow({ g, user, currentUserName }) {
  const memberCount = g.members?.length || 0;
  const isAdmin = g.members?.some(m => ((user && m.user_id === user.id) || m.name === currentUserName) && m.role === 'admin');
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', ...(isAdmin ? { border: '1px solid rgba(255,185,0,0.4)' } : {}) }}>
      <OrgAvatar g={g} size={44} />
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
      </div>
      {isAdmin && <span style={{ fontSize: 10, fontWeight: 700, color: '#EF9F27', background: 'rgba(239,159,39,0.12)', borderRadius: 6, padding: '3px 7px', flexShrink: 0 }}>Admin</span>}
    </div>
  );
}

function OrgCard({ g, user, currentUserName }) {
  const memberCount = g.members?.length || 0;
  const isAdmin = g.members?.some(m => ((user && m.user_id === user.id) || m.name === currentUserName) && m.role === 'admin');
  const isMember = g.members?.some(m => (user && m.user_id === user.id) || m.name === currentUserName);
  return (
    <div className="card" style={{ padding: '16px', ...(isAdmin ? { border: '1px solid rgba(255,185,0,0.4)' } : {}) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: g.description ? 10 : 0 }}>
        <OrgAvatar g={g} size={52} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
            {isMember && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', background: 'rgba(29,158,117,0.12)', borderRadius: 6, padding: '2px 7px' }}>Member</span>}
            {isAdmin && <span style={{ fontSize: 10, fontWeight: 700, color: '#EF9F27', background: 'rgba(239,159,39,0.12)', borderRadius: 6, padding: '2px 7px' }}>Admin</span>}
          </div>
        </div>
      </div>
      {g.description && (
        <p style={{ margin: 0, fontSize: 13, color: '#8888AA', lineHeight: 1.5, textAlign: 'left' }}>{g.description}</p>
      )}
    </div>
  );
}

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
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [q, setQ] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [showOrgsPage, setShowOrgsPage] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');

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
        coverUrl: r.cover_url || null,
        description: r.description || null,
        visibility: r.visibility || 'public',
        city: r.city || '',
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
    const catFiltered = selectedCategories.length > 0
      ? allEvents.filter(e => selectedCategories.some(cat => e.category === cat || (e.tags || []).includes(cat)))
      : allEvents;
    if (!term) return catFiltered;
    return catFiltered.filter(e =>
      (e.title || '').toLowerCase().includes(term) ||
      (e.location || '').toLowerCase().includes(term)
    );
  }, [q, allEvents, selectedCategories]);

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

            {/* Others */}
            {storyCircles.filter(p => p.userId !== user?.id).map(post => {
              const col = avatarColor(post.senderName || '');
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
        <section style={{ marginBottom: 24, position: 'relative', zIndex: 10 }}>
          <button
            onClick={() => setCategoryOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: categoryOpen ? '12px 12px 0 0' : 12, padding: '13px 16px',
              cursor: 'pointer', transition: 'border-radius 150ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#EEEEFF', flexShrink: 0 }}>Browse by Category</span>
              {selectedCategories.map(cat => {
                const color = CATEGORIES.find(c => c.label === cat)?.color || 'var(--purple)';
                return (
                  <span key={cat} style={{ fontSize: 11, color, fontWeight: 700, background: `${color}22`, borderRadius: 20, padding: '2px 9px', flexShrink: 0 }}>
                    {cat}
                  </span>
                );
              })}
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8888AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: categoryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {categoryOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, background: '#13131A', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
              {CATEGORIES.map(c => {
                const count = allEvents.filter(e => e.category === c.label || (e.tags || []).includes(c.label)).length;
                const isSelected = selectedCategories.includes(c.label);
                return (
                  <button
                    key={c.label}
                    onClick={() => setSelectedCategories(prev => isSelected ? prev.filter(x => x !== c.label) : [...prev, c.label])}
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
          {q ? 'Results' : selectedCategories.length === 1 ? `${selectedCategories[0]} Events` : selectedCategories.length > 1 ? 'Filtered Events' : 'All Events'}
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
            {q ? `No events matching "${q}"` : selectedCategories.length > 0 ? `No events in selected categories` : 'No events yet'}
          </div>
        </div>
      )}

      {/* Orgs — compact preview */}
      <section style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, textAlign: 'left' }}>Orgs</h2>
          <button
            onClick={() => setShowOrgsPage(true)}
            style={{ background: 'none', border: 'none', color: 'var(--purple)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            See all →
          </button>
        </div>
        {campusOrgs.length === 0 ? (
          <div className="card" style={{ padding: '20px 16px', textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: '#555' }}>No organizations yet. Create a group with type "club" to list it here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {campusOrgs.slice(0, 3).map(g => <OrgRow key={g.id} g={g} user={user} currentUserName={currentUserName} />)}
            {campusOrgs.length > 3 && (
              <button
                onClick={() => setShowOrgsPage(true)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 600, color: 'var(--purple)', cursor: 'pointer' }}
              >
                +{campusOrgs.length - 3} more organizations
              </button>
            )}
          </div>
        )}
      </section>

      {/* Orgs full-page overlay */}
      {showOrgsPage && (
        <div style={{ position: 'fixed', inset: 0, background: '#0A0A0F', zIndex: 200, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <button
              onClick={() => setShowOrgsPage(false)}
              style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EEEEFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#EEEEFF' }}>Organizations</div>
              {campusOrgs.length > 0 && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{campusOrgs.length} org{campusOrgs.length !== 1 ? 's' : ''} at {profile?.school || 'your school'}</div>}
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: '14px 20px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="text-input"
                placeholder="Search organizations…"
                value={orgSearch}
                onChange={e => setOrgSearch(e.target.value)}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* Org list */}
          <div style={{ flex: 1, padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(() => {
              const term = orgSearch.trim().toLowerCase();
              const filtered = term
                ? campusOrgs.filter(g => (g.name || '').toLowerCase().includes(term) || (g.description || '').toLowerCase().includes(term))
                : campusOrgs;
              if (filtered.length === 0) return (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#444', fontSize: 14 }}>
                  {term ? `No orgs matching "${orgSearch}"` : 'No organizations yet'}
                </div>
              );
              return filtered.map(g => <OrgCard key={g.id} g={g} user={user} currentUserName={currentUserName} />);
            })()}
          </div>
        </div>
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
