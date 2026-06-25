import React, { useState } from 'react';
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

const CATEGORIES = ['On Campus', 'Social', 'Sports', 'Arts', 'Music', 'Food', 'Gaming', 'Outdoors', 'Other'];

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

const EMPTY_FORM = { title: '', month: '', day: '', time: '', location: '', city: '', category: 'Campus', description: '' };

export default function Create({ onNavigate = () => {}, onCreateGroup = () => {}, onAddEvent = () => {}, user = null, onAuthRequired = () => {} }) {
  const [showHostModal, setShowHostModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  function handleStart(option) {
    if (!user) { onAuthRequired('Sign in to create on Rally'); return; }
    if (option.id === 'host-event') { setShowHostModal(true); return; }
    if (option.id === 'create-rally') { onCreateGroup({ initialType: 'event' }); return; }
    alert(`${option.title} coming soon!`);
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
      category: form.category,
      description: form.description.trim(),
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
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #EEE', borderRadius: 8, zIndex: 200, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {cityMatches.map(city => (
                      <div key={city} onMouseDown={() => { setForm(f => ({ ...f, city })); setShowCitySuggestions(false); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #F5F5F5' }}>
                        {city}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Category</label>
                <select className="text-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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

      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => onNavigate('home')}><span className="nav-btn-icon">🏠</span><span className="nav-btn-label">Home</span></button>
        <button className="nav-btn" onClick={() => onNavigate('explore')}><span className="nav-btn-icon">🔍</span><span className="nav-btn-label">Explore</span></button>
        <button className="nav-btn active" onClick={() => onNavigate('post')}><span className="nav-btn-icon">➕</span><span className="nav-btn-label">Create</span></button>
        <button className="nav-btn" onClick={() => onNavigate('groups')}><span className="nav-btn-icon">💬</span><span className="nav-btn-label">Groups</span></button>
        <button className="nav-btn" onClick={() => onNavigate('profile')}><span className="nav-btn-icon">👤</span><span className="nav-btn-label">Profile</span></button>
      </nav>
    </main>
  );
}
