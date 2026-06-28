import React, { useState, useEffect } from 'react';
import './HomeFeed.css';

import { getSchoolFromEmail, getSchoolFromDomain, SCHOOLS, getDomainsForSchool } from '../data/schools';
import FriendsPanel from './FriendsPanel';
import { isSupabaseConfigured, signInWithOtp, signInWithProvider, checkUsernameAvailable, getFriendNotifications, sendEduVerification, verifyEduCode } from '../lib/supabaseClient';
import { validateUsername } from '../lib/usernameValidation';

const placeholderFriendNames = new Set(['Maya', 'Leo', 'Ava', 'Jon']);

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

export default function Profile({ user, profile = {}, onUpdateProfile = () => {}, activeTab = 'profile', onNavigate = () => {}, onOpenGroup = () => {}, events = [], groups: allGroups = [], onAddEvent = () => {}, onUpdateEvent = () => {}, onDeleteEvent = () => {}, onSignOut = () => {}, onAuthRequired = () => {}, darkMode = false, onToggleDark = () => {}, onViewFriend = () => {} }) {
  const [name, setName] = useState(() => profile.name || localStorage.getItem('rally_name') || '');
  const [bio, setBio] = useState(() => profile.bio || localStorage.getItem('rally_bio') || '');
  const [username, setUsername] = useState(() => profile.username || localStorage.getItem('rally_username') || '');
  const [pronouns, setPronouns] = useState(() => profile.pronouns || localStorage.getItem('rally_pronouns') || '');
  const [editingProfile, setEditingProfile] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [usernameError, setUsernameError] = useState(null);

  const getInitials = (n) => n.split(' ').filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();


  const getStoredCheers = () => {
    try {
      const stored = Number(localStorage.getItem('rally_cheers'));
      if (Number.isNaN(stored) || stored < 0 || stored === 12) {
        localStorage.setItem('rally_cheers', '0');
        return 0;
      }
      return stored;
    } catch (e) {
      return 0;
    }
  };

  // Sync state when Supabase profile loads after sign-in
  useEffect(() => {
    if (profile.name !== undefined) setName(profile.name);
    if (profile.bio !== undefined) setBio(profile.bio);
    if (profile.username !== undefined) setUsername(profile.username);
    if (profile.pronouns !== undefined) setPronouns(profile.pronouns || '');
    if (profile.school) { setSchool(profile.school); localStorage.setItem('rally_school', profile.school); }
    if (profile.school_verified) { localStorage.setItem('rally_school_verified', profile.school); }
  }, [profile]);

  // Live username validation + availability check while editing
  useEffect(() => {
    if (!editingProfile) return;
    const original = (profile.username || localStorage.getItem('rally_username') || '').toLowerCase();
    if (username.toLowerCase() === original) {
      setUsernameStatus('idle'); setUsernameError(null); return;
    }
    const { valid, error } = validateUsername(username);
    if (!valid) { setUsernameStatus('invalid'); setUsernameError(error); return; }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(username.toLowerCase(), user?.id);
      setUsernameStatus(available ? 'available' : 'taken');
      setUsernameError(available ? null : 'Username already taken');
    }, 400);
    return () => clearTimeout(timer);
  }, [username, editingProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = (newName, newBio, newUsername) => {
    if (usernameStatus === 'invalid' || usernameStatus === 'taken' || usernameStatus === 'checking') return;
    const finalUsername = newUsername.toLowerCase();
    setName(newName);
    setBio(newBio);
    setUsername(finalUsername);
    localStorage.setItem('rally_name', newName);
    localStorage.setItem('rally_bio', newBio);
    localStorage.setItem('rally_username', finalUsername);
    localStorage.setItem('rally_pronouns', pronouns);
    setEditingProfile(false);
    onUpdateProfile({ name: newName, bio: newBio, username: finalUsername, friends: [], pronouns });
  };
  // `events` and handlers are provided by App (single source of truth)
  const [showSettings, setShowSettings] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalView, setModalView] = useState('details');

  function openEvent(ev) {
    setSelectedEvent(ev);
    setModalView('details');
  }

  function closeEventModal() {
    setSelectedEvent(null);
  }
  const [showForm, setShowForm] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [form, setForm] = useState({ title: '', month: '', day: '', time: '', location: '', city: '' });
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const [attended, setAttended] = useState([]);
  const [media, setMedia] = useState([]);
  const [cheers, setCheers] = useState({ count: getStoredCheers(), givers: [] });
  const groups = user ? allGroups.filter(g => (g.members || []).some(m => m.user_id === user.id)) : [];
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [friendNotifCount, setFriendNotifCount] = useState(0);

  // .edu verification flow
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyStep, setVerifyStep] = useState('email'); // 'email' | 'code' | 'success'
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  useEffect(() => {
    if (!user) return;
    getFriendNotifications(user.id).then(({ incoming, acceptedTotal }) => {
      const seenAccepted = parseInt(localStorage.getItem('rally_seen_accepted') || '0');
      setFriendNotifCount(incoming + Math.max(0, acceptedTotal - seenAccepted));
    });
  }, [user]);

  function handleToggleFriendsPanel() {
    const opening = !showFriendsPanel;
    setShowFriendsPanel(opening);
    if (opening && user) {
      getFriendNotifications(user.id).then(({ acceptedTotal }) => {
        localStorage.setItem('rally_seen_accepted', String(acceptedTotal));
      });
      setFriendNotifCount(0);
    }
  }

  function openVerifyModal() {
    setShowSchoolPicker(false);
    setSchoolSearch('');
    setVerifyStep('email');
    setVerifyEmail('');
    setVerifyCode('');
    setVerifyError(null);
    setShowVerifyModal(true);
  }

  async function handleSendCode() {
    const email = verifyEmail.trim().toLowerCase();
    if (!email) return;
    const domain = email.split('@')[1] || '';
    const expectedDomains = getDomainsForSchool(school);
    if (!domain.endsWith('.edu')) {
      setVerifyError('Must be a .edu email address.');
      return;
    }
    if (expectedDomains.length > 0 && !expectedDomains.includes(domain)) {
      setVerifyError(`Must be a @${expectedDomains[0]} email for ${school}.`);
      return;
    }
    setVerifyLoading(true);
    setVerifyError(null);
    const { success, error } = await sendEduVerification(email, school);
    setVerifyLoading(false);
    if (success) {
      setVerifyStep('code');
    } else {
      setVerifyError(error || 'Failed to send code. Try again.');
    }
  }

  async function handleVerifyCode() {
    if (verifyCode.length !== 6) return;
    setVerifyLoading(true);
    setVerifyError(null);
    const { success, error } = await verifyEduCode(verifyEmail.trim().toLowerCase(), verifyCode);
    setVerifyLoading(false);
    if (success) {
      localStorage.setItem('rally_school_verified', school);
      onUpdateProfile({ name, bio, username, friends: [], school, school_verified: true });
      setVerifyStep('success');
    } else {
      setVerifyError(error || 'Invalid or expired code. Try again.');
    }
  }


  useEffect(() => {
    const syncCheers = () => setCheers((current) => ({ ...current, count: getStoredCheers() }));
    syncCheers();

    const handleCheersUpdated = () => syncCheers();
    const handleStorage = (event) => {
      if (event.key === 'rally_cheers') {
        syncCheers();
      }
    };

    window.addEventListener('rally-cheers-updated', handleCheersUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('rally-cheers-updated', handleCheersUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  function addEvent(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    // require month and day, year is optional
    if (!form.month || !form.day) return;
    // time is optional; use 12:00 for ordering if not provided
    const useTime = form.time && form.time.trim();
    const timeForISO = useTime ? form.time : '12:00';
    const pad = (s) => String(s).padStart(2, '0');
    const currentYear = new Date().getFullYear();
    let dateISO = `${currentYear}-${pad(form.month)}-${pad(form.day)}T${timeForISO}`;
    if (new Date(dateISO) < new Date()) dateISO = `${currentYear + 1}-${pad(form.month)}-${pad(form.day)}T${timeForISO}`;
    const next = { id: Date.now(), title: form.title.trim(), dateISO, showTime: !!useTime, location: form.location.trim(), city: (form.city || '').trim(), personal: true };
    onAddEvent(next);
    setForm({ title: '', month: '', day: '', time: '', location: '', city: '' });
    setShowCitySuggestions(false);
    setShowForm(false);
  }

  const detectedSchool = getSchoolFromEmail(user?.email);
  const [school, setSchool] = useState(() => localStorage.getItem('rally_school') || detectedSchool || '');
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');

  // Verified if the sign-in email's .edu domain auto-maps to the current school,
  // or if a previous OTP verification was completed (future flow).
  const schoolVerified = !!school && (
    detectedSchool === school ||
    localStorage.getItem('rally_school_verified') === school
  );

  // ── Logged-out state ─────────────────────────────────────────────────────────
  if (!user) {
    return <ProfileSignIn activeTab={activeTab} onNavigate={onNavigate} />;
  }

  return (
    <main className="feed-root" style={{ height: '100vh', overflow: 'hidden', paddingBottom: 0 }}>
      <header className="feed-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ margin: 0 }}>Profile</h1>
          <p className="tagline" style={{ margin: 0 }}>{name || 'Set up your profile'}</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm7.43-2.44c.04-.32.07-.64.07-.96s-.03-.64-.07-.97l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.63c-.04.33-.07.65-.07.97s.03.64.07.97l-2.11 1.63c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.63z"/>
          </svg>
        </button>

        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal" style={{ padding: 0, maxWidth: 340, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F0F0F0' }}>
                <span style={{ fontWeight: 700, fontSize: 17 }}>Settings</span>
                <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', lineHeight: 1, padding: '0 4px' }}>✕</button>
              </div>

              <div style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Dark mode</span>
                  <button
                    onClick={onToggleDark}
                    aria-label="Toggle dark mode"
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: darkMode ? 'var(--purple)' : '#DDD',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 200ms', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 9, background: '#fff',
                      position: 'absolute', top: 3, left: darkMode ? 23 : 3,
                      transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>

                <div style={{ height: 1, background: '#F0F0F0', margin: '0 20px' }} />

                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  style={{ width: '100%', textAlign: 'left', padding: '14px 20px', background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#E74C3C', cursor: 'pointer' }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {showSignOutConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 16 }}>Sign out?</p>
              <p style={{ margin: '0 0 20px', color: '#666', fontSize: 14 }}>You'll need to sign back in to join events or create groups.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="nav-btn" style={{ flex: 1 }} onClick={() => setShowSignOutConfirm(false)}>Cancel</button>
                <button className="join" style={{ flex: 1, borderRadius: 10 }} onClick={() => { setShowSignOutConfirm(false); setShowSettings(false); onSignOut(); }}>Sign out</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Scrollable content — everything below the top header */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: 'calc(var(--bottom-nav-height) + 16px)' }}>

      <section className="card" style={{ position: 'relative' }}>
        {!editingProfile ? (
          <>
            {/* Pencil in top-right corner */}
            <button className="edit-btn icon-btn" onClick={() => setEditingProfile(true)} aria-label="Edit profile" style={{ position: 'absolute', top: 12, right: 12 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
              </svg>
            </button>

            {/* Avatar + username + real name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={name}
                  referrerPolicy="no-referrer"
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}
                />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(180deg,var(--light-purple),#fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--purple)', fontWeight: 800, flexShrink: 0 }}>
                  {getInitials(name)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 20, textAlign: 'left' }}>{username ? `@${username}` : 'Set your handle'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <div className="username" style={{ textAlign: 'left', margin: 0 }}>{name || 'Your name'}</div>
                  {pronouns && <span style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>{pronouns}</span>}
                </div>
              </div>
            </div>

            {/* Pills */}
            <div style={{ display:'flex', justifyContent:'flex-start', gap:8, flexWrap:'wrap', marginBottom: bio ? 10 : 0 }}>
              {school ? (
                <button
                  onClick={() => setShowSchoolPicker(true)}
                  style={{ background:'rgba(56,189,248,0.15)', color:'#38bdf8', fontSize:12, padding:'6px 10px', fontWeight:700, border:'none', borderRadius:999, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.76 2.24 5 5 5s5-2.24 5-5v-4.27l2-1.09V17h2V11.18L23 9 12 3zm5 14c0 1.66-1.34 3-3 3s-3-1.34-3-3v-3.73l3 1.64 3-1.64V17z"/></svg>
                  {school}
                  {schoolVerified && (
                    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:14, height:14, borderRadius:'50%', background:'#38bdf8' }}>
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowSchoolPicker(true)}
                  style={{ background:'transparent', color:'#888', fontSize:12, padding:'5px 10px', fontWeight:600, border:'1.5px dashed rgba(128,128,180,0.4)', borderRadius:999, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.76 2.24 5 5 5s5-2.24 5-5v-4.27l2-1.09V17h2V11.18L23 9 12 3zm5 14c0 1.66-1.34 3-3 3s-3-1.34-3-3v-3.73l3 1.64 3-1.64V17z"/></svg>
                  Join your university
                </button>
              )}
              <span className="category-pill" style={{ background:'var(--light-teal)', color:'var(--teal)', fontSize:12, padding:'6px 10px' }}>{cheers.count} cheers</span>
              <span className="category-pill" style={{ background:'var(--light-purple)', color:'var(--purple)', fontSize:12, padding:'6px 10px' }}>{events.filter(e => !e.personal && e.dateISO && new Date(e.dateISO) < new Date()).length} hosted</span>
              <span className="category-pill" style={{ background:'var(--light-pink)', color:'var(--pink)', fontSize:12, padding:'6px 10px' }}>{events.filter(e => e.dateISO && new Date(e.dateISO) < new Date()).length} attended</span>
            </div>

            {bio && <p style={{ margin: '10px 0 0', color: '#EEEEFF', textAlign: 'left', fontSize: 14, lineHeight: 1.5 }}>{bio}</p>}

          {/* .edu Verification modal */}
          {showVerifyModal && (() => {
            const expectedDomains = getDomainsForSchool(school);
            const placeholder = expectedDomains.length > 0 ? `you@${expectedDomains[0]}` : 'you@university.edu';
            return (
              <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
                <div className="modal" style={{ padding: 24 }} onClick={e => e.stopPropagation()}>

                  {verifyStep === 'email' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 17 }}>Verify student status</h3>
                        <button onClick={() => setShowVerifyModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1, padding: '0 2px' }}>×</button>
                      </div>
                      <p style={{ margin: '0 0 4px', fontSize: 14 }}>Enter your <strong>{school}</strong> email to get a verification code.</p>
                      {expectedDomains.length > 0 && (
                        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#888' }}>Must end in @{expectedDomains[0]}</p>
                      )}
                      <input
                        className="text-input"
                        type="email"
                        placeholder={placeholder}
                        value={verifyEmail}
                        onChange={e => { setVerifyEmail(e.target.value); setVerifyError(null); }}
                        style={{ marginBottom: verifyError ? 8 : 14 }}
                        autoFocus
                      />
                      {verifyError && <div style={{ fontSize: 12, color: '#E74C3C', marginBottom: 12 }}>{verifyError}</div>}
                      <button
                        className="join"
                        style={{ width: '100%', padding: 13, fontSize: 15 }}
                        disabled={verifyLoading || !verifyEmail.trim()}
                        onClick={handleSendCode}
                      >
                        {verifyLoading ? 'Sending…' : 'Send code'}
                      </button>
                    </>
                  )}

                  {verifyStep === 'code' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 17 }}>Check your email</h3>
                        <button onClick={() => setShowVerifyModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1, padding: '0 2px' }}>×</button>
                      </div>
                      <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.5 }}>
                        We sent a 6-digit code to <strong>{verifyEmail}</strong>. It expires in 10 minutes.
                      </p>
                      <input
                        className="text-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={verifyCode}
                        onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyError(null); }}
                        style={{ marginBottom: verifyError ? 8 : 14, fontSize: 26, textAlign: 'center', letterSpacing: '0.35em', fontWeight: 700 }}
                        autoFocus
                      />
                      {verifyError && <div style={{ fontSize: 12, color: '#E74C3C', marginBottom: 12 }}>{verifyError}</div>}
                      <button
                        className="join"
                        style={{ width: '100%', padding: 13, fontSize: 15, marginBottom: 10 }}
                        disabled={verifyLoading || verifyCode.length !== 6}
                        onClick={handleVerifyCode}
                      >
                        {verifyLoading ? 'Verifying…' : 'Verify'}
                      </button>
                      <button
                        onClick={() => { setVerifyStep('email'); setVerifyCode(''); setVerifyError(null); }}
                        style={{ background: 'none', border: 'none', color: 'var(--purple)', fontSize: 13, cursor: 'pointer', width: '100%', padding: '4px 0' }}
                      >
                        ← Use a different email
                      </button>
                    </>
                  )}

                  {verifyStep === 'success' && (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--light-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg viewBox="0 0 24 24" fill="var(--teal)" width="30" height="30"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      </div>
                      <h3 style={{ margin: '0 0 8px', fontSize: 19 }}>You're verified!</h3>
                      <p style={{ margin: '0 0 22px', fontSize: 14 }}>Your {school} student status is confirmed.</p>
                      <button className="join" style={{ width: '100%', padding: 13, fontSize: 15 }} onClick={() => setShowVerifyModal(false)}>
                        Done
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          })()}

            {showSchoolPicker && (
              <div className="modal-overlay" onClick={() => { setShowSchoolPicker(false); setSchoolSearch(''); }}>
                <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight:'70vh', display:'flex', flexDirection:'column', gap:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <h3 style={{ margin:0, fontSize:16 }}>Your University</h3>
                    <button onClick={() => { setShowSchoolPicker(false); setSchoolSearch(''); }} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#888', lineHeight:1 }}>×</button>
                  </div>
                  <input
                    className="text-input"
                    placeholder="Search universities..."
                    value={schoolSearch}
                    onChange={e => setSchoolSearch(e.target.value)}
                    autoFocus
                    style={{ marginBottom:10 }}
                  />
                  <div style={{ overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                    {(schoolSearch.trim()
                      ? SCHOOLS.filter(s => s.toLowerCase().includes(schoolSearch.toLowerCase()))
                      : SCHOOLS
                    ).map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setSchool(s);
                          localStorage.setItem('rally_school', s);
                          setShowSchoolPicker(false);
                          setSchoolSearch('');
                          onUpdateProfile({ name, bio, username, friends: [], school: s, school_verified: detectedSchool === s });
                        }}
                        style={{
                          background: s === school ? 'rgba(83,74,183,0.12)' : 'transparent',
                          border: 'none', borderRadius:8, padding:'10px 12px',
                          textAlign:'left', cursor:'pointer', fontSize:14, fontWeight: s === school ? 700 : 400,
                          color: s === school ? 'var(--purple)' : 'inherit',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                    {schoolSearch.trim() && SCHOOLS.filter(s => s.toLowerCase().includes(schoolSearch.toLowerCase())).length === 0 && (
                      <div style={{ fontSize:13, color:'#888', padding:'10px 12px' }}>No results for "{schoolSearch}"</div>
                    )}
                  </div>
                  {school && !schoolVerified && (
                    <div style={{ marginTop:10, padding:'10px 12px', borderRadius:10, background:'rgba(83,74,183,0.07)', border:'1px solid rgba(83,74,183,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600 }}>Verify your student status</div>
                        <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Get a checkmark on your {school} badge</div>
                      </div>
                      <button
                        onClick={openVerifyModal}
                        style={{ fontSize:12, fontWeight:700, color:'var(--purple)', background:'none', border:'1px solid var(--purple)', borderRadius:8, padding:'5px 10px', cursor:'pointer' }}
                      >
                        Verify
                      </button>
                    </div>
                  )}
                  {school && schoolVerified && (
                    <div style={{ marginTop:10, padding:'8px 12px', borderRadius:10, background:'rgba(0,229,168,0.07)', border:'1px solid rgba(0,229,168,0.2)', display:'flex', alignItems:'center', gap:6 }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--teal)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      <span style={{ fontSize:13, color:'var(--teal)', fontWeight:600 }}>Student status verified</span>
                    </div>
                  )}
                  {school && (
                    <button
                      onClick={() => { setSchool(''); localStorage.removeItem('rally_school'); localStorage.removeItem('rally_school_verified'); setShowSchoolPicker(false); setSchoolSearch(''); onUpdateProfile({ name, bio, username, friends: [], school: '', school_verified: false }); }}
                      style={{ marginTop:8, background:'none', border:'none', color:'#888', fontSize:13, cursor:'pointer', textAlign:'center' }}
                    >
                      Remove university
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, color: '#666' }}>Username</label>
            <input
              className="text-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                borderColor: usernameStatus === 'available' ? 'var(--teal)'
                  : usernameStatus === 'invalid' || usernameStatus === 'taken' ? '#E74C3C'
                  : undefined,
              }}
            />
            {usernameStatus === 'checking' && <div style={{ fontSize: 12, color: '#999' }}>Checking availability...</div>}
            {usernameStatus === 'available' && <div style={{ fontSize: 12, color: 'var(--teal)' }}>✓ Available</div>}
            {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <div style={{ fontSize: 12, color: '#E74C3C' }}>{usernameError}</div>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Full name</label>
                <input className="text-input" value={name} onChange={(e)=>setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Pronouns</label>
                <input
                  className="text-input"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder="e.g. she/her"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <label style={{ fontSize: 13, color: '#666' }}>Bio</label>
            <textarea className="text-input textarea" value={bio} onChange={(e)=>setBio(e.target.value)} />
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button
                className="join"
                onClick={() => saveProfile(name, bio, username)}
                disabled={usernameStatus === 'invalid' || usernameStatus === 'taken' || usernameStatus === 'checking'}
                style={{ opacity: (usernameStatus === 'invalid' || usernameStatus === 'taken' || usernameStatus === 'checking') ? 0.45 : 1 }}
              >Save</button>
              <button className="nav-btn" onClick={()=>{ setUsername(localStorage.getItem('rally_username')||''); setName(localStorage.getItem('rally_name')||''); setBio(localStorage.getItem('rally_bio')||''); setPronouns(localStorage.getItem('rally_pronouns')||''); setEditingProfile(false); }}>Cancel</button>
            </div>
          </div>
        )}
      </section>


      <section style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{ margin: '6px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleToggleFriendsPanel}
          >
            Friends
            {friendNotifCount > 0 && (
              <span style={{
                background: '#E74C3C', color: '#fff', borderRadius: 999,
                fontSize: 11, fontWeight: 700, padding: '2px 7px', lineHeight: 1.4,
              }}>
                {friendNotifCount}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--purple)', transition: 'transform 200ms', display: 'inline-block', transform: showFriendsPanel ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </h3>
        </div>
        {showFriendsPanel && (
          <div className="card" style={{ padding: 16 }}>
            <FriendsPanel user={user} onViewFriend={onViewFriend} />
        </div>
        )}
      </section>

      {(() => {
        const now = new Date();
        const upcomingEvents = events.filter(e => !e.dateISO || new Date(e.dateISO) >= now);
        const attendedEvents = events.filter(e => e.dateISO && new Date(e.dateISO) < now);
        return (<>
      <section style={{ marginTop: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{ margin: '6px 0', cursor: upcomingEvents.length > 3 ? 'pointer' : undefined, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => upcomingEvents.length > 3 && setShowAllEvents(s => !s)}
          >
            Upcoming
            {upcomingEvents.length > 3 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--purple)', fontSize: 11, fontWeight: 600 }}>
                {!showAllEvents && `+${upcomingEvents.length - 3}`}
                <span style={{ transition: 'transform 200ms', display: 'inline-block', transform: showAllEvents ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </span>
            )}
          </h3>
          <button className="add-btn" onClick={() => setShowForm((s) => !s)}>+</button>
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" style={{ width: '100%', maxWidth: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>Add Event</h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', lineHeight: 1, padding: '0 4px' }}>✕</button>
              </div>
              <form onSubmit={addEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Event name</label>
                  <input className="text-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event name" autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Month</label>
                    <select className="text-input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
                      <option value="">Month</option>
                      <option value="01">Jan</option>
                      <option value="02">Feb</option>
                      <option value="03">Mar</option>
                      <option value="04">Apr</option>
                      <option value="05">May</option>
                      <option value="06">Jun</option>
                      <option value="07">Jul</option>
                      <option value="08">Aug</option>
                      <option value="09">Sep</option>
                      <option value="10">Oct</option>
                      <option value="11">Nov</option>
                      <option value="12">Dec</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Day</label>
                    <input className="text-input" type="number" min="1" max="31" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} placeholder="1–31" />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Time <span style={{ color: '#aaa' }}>(opt)</span></label>
                    <input className="text-input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Location</label>
                  <input className="text-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Venue or address" />
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>City <span style={{ color: '#aaa' }}>(optional)</span></label>
                  <input
                    className="text-input"
                    value={form.city}
                    onChange={(e) => { setForm({ ...form, city: e.target.value }); setShowCitySuggestions(true); }}
                    onFocus={() => setShowCitySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
                    placeholder="Search city..."
                  />
                  {showCitySuggestions && form.city.length >= 1 && (() => {
                    const matches = CITIES.filter(c => c.toLowerCase().includes(form.city.toLowerCase())).slice(0, 6);
                    return matches.length > 0 ? (
                      <div className="city-suggestions">
                        {matches.map(city => (
                          <div key={city} className="city-suggestions-item" onMouseDown={() => { setForm(f => ({ ...f, city })); setShowCitySuggestions(false); }}>
                            {city}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                <button type="submit" className="join" style={{ marginTop: 4, width: '100%', padding: '12px', fontSize: 15 }}>Add Event</button>
              </form>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {(showAllEvents ? upcomingEvents : upcomingEvents.slice(0, 3)).map((ev) => (
            <div key={ev.id} className="card event-card" onClick={() => openEvent(ev)}>
              <button className="delete-btn" aria-label="Delete event" onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev.id); setShowConfirm(true); }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0 0-1.4z"/></svg>
              </button>
              <div style={{ fontWeight: 700, fontSize: 14, textAlign: 'left' }}>{ev.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 12, color: '#aaa' }}>{[ev.location, ev.city].filter(Boolean).join(', ')}</span>
                <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>
                  {ev.dateISO ? (ev.showTime ? new Date(ev.dateISO).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : new Date(ev.dateISO).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })) : 'Date TBD'}
                </span>
              </div>
            </div>
          ))}

        {selectedEvent && (
          <div className="modal-overlay" onClick={closeEventModal}>
            <div className="modal" onClick={(e)=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <h3 style={{ margin:0 }}>{selectedEvent.title}</h3>
                <button className="delete-btn" onClick={closeEventModal} aria-label="Close modal">✕</button>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <button className={`nav-btn ${modalView==='details'?'active':''}`} onClick={()=>setModalView('details')}>Details</button>
                <button className={`nav-btn ${modalView==='edit'?'active':''}`} onClick={()=>setModalView('edit')}>Edit</button>
                <button className={`nav-btn ${modalView==='invite'?'active':''}`} onClick={()=>setModalView('invite')}>Invite</button>
              </div>

              {modalView === 'details' && (
                <div>
                  <div style={{ color:'#666', marginBottom:8 }}>{selectedEvent.showTime ? new Date(selectedEvent.dateISO).toLocaleString() : new Date(selectedEvent.dateISO).toLocaleDateString()}</div>
                  <div style={{ color:'#666', marginBottom:8 }}>{selectedEvent.location}</div>
                  <div style={{ color:'#666' }}>Attendees: { (selectedEvent.attendees && selectedEvent.attendees.length) || 0 }</div>
                </div>
              )}

              {modalView === 'edit' && (
                <EventEditor event={selectedEvent} onSave={(updated)=>{
                  onUpdateEvent(updated);
                  setSelectedEvent(updated);
                }} />
              )}

              {modalView === 'invite' && (
                <InvitePanel event={selectedEvent} onInvite={(names)=>{
                  const updated = { ...selectedEvent, attendees: [...(selectedEvent.attendees||[]), ...names.map(n=> ({ name:n }))] };
                  onUpdateEvent(updated);
                  setSelectedEvent(updated);
                }} />
              )}
            </div>
          </div>
        )}
        {showConfirm && (
          <div className="modal-overlay">
            <div className="modal">
              <p style={{ margin: 0, fontWeight: 700 }}>Are you sure you want to delete this rallypoint?</p>
              <p style={{ marginTop: 8, marginBottom: 12, color: '#666' }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="nav-btn" onClick={() => { setShowConfirm(false); setDeleteTarget(null); }}>Cancel</button>
                <button className="join" onClick={async () => {
                  if (deleteTarget == null) { setShowConfirm(false); return; }
                  onDeleteEvent(deleteTarget);
                  setShowConfirm(false);
                  setDeleteTarget(null);
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        </div>
      </section>

      <section style={{ marginTop: 14, width: '100%' }}>
        <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Attended</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attendedEvents.map(ev => (
            <div key={ev.id} className="card event-card" onClick={() => openEvent(ev)}>
              <button className="delete-btn" aria-label="Delete event" onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev.id); setShowConfirm(true); }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0 0-1.4z"/></svg>
              </button>
              <div style={{ fontWeight: 700, fontSize: 14, textAlign: 'left' }}>{ev.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 12, color: '#aaa' }}>{[ev.location, ev.city].filter(Boolean).join(', ')}</span>
                <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>
                  {ev.dateISO ? (ev.showTime ? new Date(ev.dateISO).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : new Date(ev.dateISO).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })) : 'Date TBD'}
                </span>
              </div>
            </div>
          ))}
          {attendedEvents.length === 0 && <div style={{ fontSize: 13, color: '#888' }}>Events you've attended will appear here.</div>}
        </div>
      </section>
      </>); })()}

      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>

        <section style={{ marginTop: 14, width: '100%' }}>
          <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Groups</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {groups.map(g => {
              const isAdmin = (g.members || []).some(m => m.user_id === user?.id && m.role === 'admin');
              return (
              <div key={g.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => onOpenGroup(g.id)}>
                <div>
                  <div style={{ fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                    {g.name}
                    {isAdmin && (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="#22c55e" style={{ flexShrink:0 }}>
                        <path d="M2 19h20v2H2v-2zM12 2L4 8l2 9h12l2-9-8-6zm0 2.8L18 9l-1.5 6h-9L6 9l6-4.2z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ color:'#666', fontSize:13, textAlign:'left' }}>{(g.members || []).length} members</div>
                </div>
                <button className="nav-action-btn" onClick={(e)=>{ e.stopPropagation(); onOpenGroup(g.id); }}>View</button>
              </div>
              );
            })}
          </div>
        </section>

        <section style={{ marginTop: 14, width: '100%' }}>
          <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Media</h3>
          <div className="media-grid">
            {media.map(m => (
              <div key={m.id} className="media-item">Photo</div>
            ))}
          </div>
        </section>
      </div>

      </div>{/* end scrollable content */}
    </main>
  );
}

    function ProfileSignIn({ activeTab, onNavigate }) {
      const [email, setEmail] = React.useState('');
      const [sent, setSent] = React.useState(false);
      const configured = isSupabaseConfigured();

      async function handleGoogle() { await signInWithProvider('google'); }
      async function handleEmail(e) {
        e.preventDefault();
        if (!email.trim()) return;
        await signInWithOtp(email.trim());
        setSent(true);
      }

      return (
        <main className="feed-root" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ marginBottom: 32, marginTop: 24 }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--purple)', letterSpacing: '-1px', lineHeight: 1 }}>Rally</div>
            <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Experiences are better shared</div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Join the community</div>
            <div style={{ color: '#666', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              Track events, form groups, and connect with people going to the same things.
            </div>

            {!configured ? (
              <div style={{ color: '#888', fontSize: 13, padding: 12, background: '#F7F7F7', borderRadius: 10 }}>
                Sign-in requires Supabase to be configured.
              </div>
            ) : sent ? (
              <div style={{ color: 'var(--teal)', fontWeight: 600, padding: 14, background: 'var(--light-teal)', borderRadius: 10 }}>
                Check your email for a sign-in link.
              </div>
            ) : (
              <>
                <button
                  onClick={handleGoogle}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 12,
                    border: '2px solid #E8E8E8', background: '#fff',
                    fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px', color: '#ccc', fontSize: 12 }}>
                  <div style={{ flex: 1, height: 1, background: '#EEE' }} />or<div style={{ flex: 1, height: 1, background: '#EEE' }} />
                </div>

                <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className="text-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                  <button type="submit" className="join" style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 15 }}>Send magic link</button>
                </form>
              </>
            )}
          </div>
        </main>
      );
    }

    function EventEditor({ event, onSave }){
      const [title, setTitle] = useState(event.title);
      const [date, setDate] = useState(event.dateISO ? event.dateISO.split('T')[0] : '');
      const [time, setTime] = useState(event.dateISO ? event.dateISO.split('T')[1] : '');
      const [location, setLocation] = useState(event.location || '');

      function save(){
        if(!title.trim() || !date) return;
        const showTime = !!time;
        const dateISO = `${date}T${ showTime ? time : '12:00' }`;
        onSave({ ...event, title: title.trim(), dateISO, showTime, location: location.trim() });
      }

      return (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <label style={{ fontSize:13, color:'#666' }}>Event name</label>
          <input className="text-input" value={title} onChange={e=>setTitle(e.target.value)} />

          <label style={{ fontSize:13, color:'#666' }}>Date</label>
          <input className="text-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />

          <label style={{ fontSize:13, color:'#666' }}>Time (optional)</label>
          <input className="text-input" type="time" value={time} onChange={e=>setTime(e.target.value)} />

          <label style={{ fontSize:13, color:'#666' }}>Location</label>
          <input className="text-input" value={location} onChange={e=>setLocation(e.target.value)} />

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="nav-btn" onClick={()=>{ setTitle(event.title); setDate(event.dateISO?.split('T')[0]||''); setTime(event.dateISO?.split('T')[1]||''); setLocation(event.location||''); }}>Reset</button>
            <button className="join" onClick={save}>Save</button>
          </div>
        </div>
      );
    }

    function InvitePanel({ event, onInvite }){
      const [text, setText] = useState('');
      function send(){
        const names = text.split(',').map(s=>s.trim()).filter(Boolean);
        if(names.length) onInvite(names);
        setText('');
      }
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <label style={{ fontSize:13, color:'#666' }}>Invite friends (comma-separated names)</label>
          <input className="text-input" value={text} onChange={e=>setText(e.target.value)} placeholder="Invite friends by name, separated with commas" />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="join" onClick={send}>Send Invites</button>
          </div>
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:13, color:'#666', marginBottom:6 }}>Current attendees</div>
            {event.attendees && event.attendees.length ? (
              event.attendees.map((a,i)=>(<div key={i} style={{ padding:'6px 0' }}>{a.name}</div>))
            ) : (
              <div style={{ color:'#666' }}>No attendees yet</div>
            )}
          </div>
        </div>
      );
    }
