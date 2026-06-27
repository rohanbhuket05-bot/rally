import React, { useState, useEffect, useRef } from 'react';
import './HomeFeed.css';


const CITIES = [
  'Atlanta, GA','Austin, TX','Baltimore, MD','Boston, MA','Charlotte, NC',
  'Chicago, IL','Cincinnati, OH','Cleveland, OH','Columbus, OH','Dallas, TX',
  'Denver, CO','Detroit, MI','El Paso, TX','Fort Worth, TX','Fresno, CA',
  'Houston, TX','Indianapolis, IN','Jacksonville, FL','Kansas City, MO','Las Vegas, NV',
  'Long Beach, CA','Los Angeles, CA','Louisville, KY','Memphis, TN','Mesa, AZ',
  'Miami, FL','Milwaukee, WI','Minneapolis, MN','Nashville, TN','New Orleans, LA',
  'New York, NY','Oakland, CA','Oklahoma City, OK','Omaha, NE','Philadelphia, PA',
  'Phoenix, AZ','Portland, OR','Raleigh, NC','Sacramento, CA','San Antonio, TX',
  'San Diego, CA','San Francisco, CA','San Jose, CA','Seattle, WA','Tampa, FL',
  'Tucson, AZ','Tulsa, OK','Virginia Beach, VA','Washington, DC',
  'London, UK','Paris, France','Tokyo, Japan','Sydney, Australia','Toronto, Canada',
  'Vancouver, Canada','Mexico City, Mexico','Berlin, Germany','Amsterdam, Netherlands',
  'Barcelona, Spain','Madrid, Spain','Rome, Italy','Dubai, UAE','Singapore',
  'Seoul, South Korea','Mumbai, India','Bangkok, Thailand','Hong Kong',
];

const TAGS = [
  { id: 'On Campus', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  { id: 'Social',    color: '#FF6BA8', bg: 'rgba(255,107,168,0.15)' },
  { id: 'Sports',    color: '#00E5A8', bg: 'rgba(0,229,168,0.15)' },
  { id: 'Arts',      color: '#FFB420', bg: 'rgba(255,180,32,0.12)' },
  { id: 'Music',     color: '#9D8FFF', bg: 'rgba(157,143,255,0.15)' },
  { id: 'Food',      color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
  { id: 'Gaming',    color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
  { id: 'Outdoors',  color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  { id: 'Other',     color: '#9CA3AF', bg: 'rgba(156,163,175,0.13)' },
];

const createOptions = [
  {
    id: 'host-event',
    title: 'Host an event',
    description: 'Post a real event with time, place, and RSVP so people can show up together.',
    accent: '#534AB7',
  },
  {
    id: 'create-rally',
    title: 'Create a rally',
    description: 'Anchor your plan to an existing event and invite people to join your group.',
    accent: '#1D9E75',
  },
  {
    id: 'spontaneous',
    title: 'Spontaneous post',
    description: 'Drop a short live post for easy meet-ups that expire in a few hours.',
    accent: '#EF9F27',
  },
];

const EMPTY_FORM = { title: '', month: '', day: '', time: '', location: '', city: '', tags: [], description: '', visibility: 'public' };

const VISIBILITY_OPTIONS = [
  {
    id: 'public',
    label: 'Public',
    desc: 'Anyone can see and join',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    id: 'friends',
    label: 'Friends',
    desc: 'Only your friends can see',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'private',
    label: 'Private',
    desc: 'Only invited people can see',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
];

export default function Create({ onNavigate = () => {}, onCreateGroup = () => {}, onAddEvent = () => {}, user = null, onAuthRequired = () => {} }) {
  const [showHostModal, setShowHostModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const tagsRef = useRef(null);
  useEffect(() => {
    if (!showTagsMenu) return;
    function handleClick(e) { if (tagsRef.current && !tagsRef.current.contains(e.target)) setShowTagsMenu(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTagsMenu]);

  function handleStart(option) {
    if (!user) { onAuthRequired('Sign in to create on Rally'); return; }
    if (option.id === 'host-event') { setShowHostModal(true); return; }
    if (option.id === 'create-rally') { onCreateGroup({ initialType: 'event' }); return; }
    if (option.id === 'spontaneous') { onNavigate('spontaneous'); return; }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.month || !form.day) return;
    const useTime = form.time && form.time.trim();
    const pad = (s) => String(s).padStart(2, '0');
    const currentYear = new Date().getFullYear();
    let dateISO = `${currentYear}-${pad(form.month)}-${pad(form.day)}T${useTime ? form.time : '12:00'}`;
    if (new Date(dateISO) < new Date()) dateISO = `${currentYear + 1}-${pad(form.month)}-${pad(form.day)}T${useTime ? form.time : '12:00'}`;
    onAddEvent({
      title: form.title.trim(),
      dateISO,
      showTime: !!useTime,
      location: form.location.trim(),
      city: (form.city || '').trim(),
      tags: form.tags,
      description: form.description.trim(),
      visibility: form.visibility,
      attendees: [],
      personal: false,
    });
    setForm(EMPTY_FORM);
    setShowHostModal(false);
  }

  const cityMatches = form.city.length >= 1
    ? CITIES.filter(c => c.toLowerCase().includes(form.city.toLowerCase())).slice(0, 6)
    : [];

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Create</h1>
        <p className="tagline">Launch something new for your crew.</p>
      </header>
      <div className="scroll-area">

      <section className="create-grid">
        {createOptions.map((option) => (
          <article key={option.id} className="create-card" style={{ borderTopColor: option.accent }}>
            <div>
              <div className="create-badge" style={{ backgroundColor: option.accent }}>
                {option.title}
              </div>
              <p>{option.description}</p>
            </div>
            <button className="nav-btn" onClick={() => handleStart(option)}>
              {option.id === 'host-event' ? 'Start' : 'Coming soon'}
            </button>
          </article>
        ))}
      </section>

      {/* Host Event Modal */}
      {showHostModal && (
        <div className="modal-overlay" onClick={() => setShowHostModal(false)}>
          <div className="modal" style={{ maxWidth: 420, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Host an event</h3>
              <button onClick={() => setShowHostModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', lineHeight: 1, padding: '0 4px' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Event name</label>
                <input className="text-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Event name" autoFocus />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Month</label>
                  <select className="text-input" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
                    <option value="">Month</option>
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Day</label>
                  <input className="text-input" type="number" min="1" max="31" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} placeholder="1–31" />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Time <span style={{ color: '#aaa' }}>(opt)</span></label>
                  <input className="text-input" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Location</label>
                <input className="text-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Venue or address" />
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>City <span style={{ color: '#aaa' }}>(optional)</span></label>
                <input
                  className="text-input"
                  value={form.city}
                  onChange={e => { setForm({ ...form, city: e.target.value }); setShowCitySuggestions(true); }}
                  onFocus={() => setShowCitySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
                  placeholder="Search city..."
                />
                {showCitySuggestions && cityMatches.length > 0 && (
                  <div className="city-suggestions">
                    {cityMatches.map(city => (
                      <div key={city} className="city-suggestions-item" onMouseDown={() => { setForm(f => ({ ...f, city })); setShowCitySuggestions(false); }}>
                        {city}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }} ref={tagsRef}>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>Tags</label>

                {/* Trigger row */}
                <button
                  type="button"
                  onClick={() => setShowTagsMenu(s => !s)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 8, padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${showTagsMenu ? 'var(--purple)' : 'rgba(255,255,255,0.1)'}`,
                    background: showTagsMenu ? 'rgba(157,143,255,0.07)' : 'rgba(255,255,255,0.04)',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, minWidth: 0 }}>
                    {(form.tags || []).length === 0 ? (
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>Add tags...</span>
                    ) : (
                      (form.tags || []).map(id => {
                        const tag = TAGS.find(t => t.id === id);
                        if (!tag) return null;
                        return (
                          <span key={id} style={{
                            background: tag.bg, color: tag.color, border: `1px solid ${tag.color}`,
                            borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '3px 9px',
                            display: 'inline-flex', alignItems: 'center',
                          }}>{id}</span>
                        );
                      })
                    )}
                  </div>
                  <svg
                    viewBox="0 0 24 24" width="15" height="15" fill="none"
                    stroke={showTagsMenu ? 'var(--purple)' : '#666'} strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" flexShrink="0"
                    style={{ flexShrink: 0, transition: 'transform 200ms ease', transform: showTagsMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Expandable checklist */}
                {showTagsMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300,
                    padding: '10px 10px 6px', borderRadius: 10,
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    background: '#1A1A1E',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      {TAGS.map(tag => {
                        const checked = (form.tags || []).includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => setForm(f => {
                              const current = f.tags || [];
                              return { ...f, tags: checked ? current.filter(t => t !== tag.id) : [...current, tag.id] };
                            })}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                              border: `1.5px solid ${tag.color}${checked ? 'ff' : '55'}`,
                              background: checked ? tag.bg : `${tag.color}0D`,
                              transition: 'all 130ms ease',
                            }}
                          >
                            <span style={{
                              width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                              border: `2px solid ${tag.color}${checked ? 'ff' : '88'}`,
                              background: checked ? tag.color : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 130ms ease',
                            }}>
                              {checked && (
                                <svg viewBox="0 0 10 8" width="8" height="8" fill="none">
                                  <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: tag.color, lineHeight: 1, opacity: checked ? 1 : 0.7 }}>
                              {tag.id}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>Visibility</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {VISIBILITY_OPTIONS.map(opt => {
                    const active = form.visibility === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm({ ...form, visibility: opt.id })}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          padding: '10px 8px', borderRadius: 12, border: `1.5px solid ${active ? 'var(--purple)' : 'rgba(255,255,255,0.1)'}`,
                          background: active ? 'rgba(83,74,183,0.15)' : 'rgba(255,255,255,0.04)',
                          color: active ? 'var(--purple)' : '#888',
                          cursor: 'pointer', transition: 'all 150ms ease',
                        }}
                      >
                        {opt.icon}
                        <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{opt.label}</span>
                        <span style={{ fontSize: 10, color: active ? 'var(--purple)' : '#666', lineHeight: 1.3, textAlign: 'center' }}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Description <span style={{ color: '#aaa' }}>(optional)</span></label>
                <textarea className="text-input textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What's this event about?" rows={3} />
              </div>

              <button type="submit" className="join" style={{ width: '100%', padding: '12px', fontSize: 15, borderRadius: 12, marginTop: 4 }}>
                Post event
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
