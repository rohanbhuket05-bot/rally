import React, { useState, useEffect, useRef } from 'react';
import EventCard from './EventCard';
import './HomeFeed.css';

import { getSchoolFromEmail, SCHOOLS, getDomainsForSchool } from '../data/schools';
import SchoolLogo from './SchoolLogo';
import FriendsPanel from './FriendsPanel';
import { isSupabaseConfigured, signInWithOtp, signInWithProvider, checkUsernameAvailable, getFriendNotifications, uploadAvatarImage, sendEduVerification, verifyEduCode } from '../lib/supabaseClient';
import { validateUsername } from '../lib/usernameValidation';
import { CITIES, formatDate, getInitials } from '../lib/utils';

const EV_DELETE_WIDTH = 160;
const EV_SWIPE_THRESHOLD = 140;

function SwipeableEventRow({ ev, onOpen, onDelete }) {
  const [offset, setOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isScrolling = useRef(false);
  const offsetRef = useRef(0);
  const didDrag = useRef(false);

  function onDragStart(clientX, clientY) {
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    isScrolling.current = false;
    didDrag.current = false;
    setTransitioning(false);
  }

  function onDragMove(clientX, clientY) {
    if (touchStartX.current === null) return;
    const dx = clientX - touchStartX.current;
    const dy = clientY - touchStartY.current;
    if (isScrolling.current) return;
    if (Math.abs(dy) > Math.abs(dx)) { isScrolling.current = true; return; }
    if (Math.abs(dx) > 5) didDrag.current = true;
    const newOffset = Math.max(-EV_DELETE_WIDTH, Math.min(0, dx));
    offsetRef.current = newOffset;
    setOffset(newOffset);
  }

  function onDragEnd() {
    setTransitioning(true);
    if (offsetRef.current <= -EV_SWIPE_THRESHOLD) {
      setOffset(0);
      offsetRef.current = 0;
      setShowConfirm(true);
    } else {
      setOffset(0);
      offsetRef.current = 0;
    }
    touchStartX.current = null;
  }

  return (
    <div style={{ overflow: 'hidden', borderRadius: 16 }}>
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1A1A2E', borderRadius: 16, padding: 24, maxWidth: 300, width: '85%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, color: '#EEEEFF' }}>Delete event?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#888', lineHeight: 1.5 }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#EEEEFF', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { setShowConfirm(false); onDelete(ev.id); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#E74C3C', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Flex row: card + delete button side by side. Outer overflow:hidden reveals delete on swipe. */}
      <div
        onTouchStart={e => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => { if (!isScrolling.current) e.preventDefault(); onDragMove(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={onDragEnd}
        onMouseDown={e => onDragStart(e.clientX, e.clientY)}
        onMouseMove={e => { if (touchStartX.current !== null) onDragMove(e.clientX, e.clientY); }}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        style={{
          display: 'flex',
          width: `calc(100% + ${EV_DELETE_WIDTH}px)`,
          transform: `translateX(${offset}px)`,
          transition: transitioning ? 'transform 250ms ease' : 'none',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        <div className="card event-card" style={{ flex: 1, margin: 0, borderRadius: 16, minWidth: 0 }}>
          <div
            onClick={() => { if (!didDrag.current) onOpen(ev); }}
            style={{ fontWeight: 700, fontSize: 14, textAlign: 'left', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
          >{ev.title}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span
              onClick={() => { if (!didDrag.current) onOpen(ev); }}
              style={{ fontSize: 12, color: '#aaa', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
            >{[ev.location, ev.city].filter(Boolean).join(', ')}</span>
            <span style={{ fontSize: 12, color: '#888', flexShrink: 0, userSelect: 'none', WebkitUserSelect: 'none' }}>{formatDate(ev.dateISO, ev.showTime)}</span>
          </div>
        </div>

        <div
          onClick={() => setShowConfirm(true)}
          style={{ flex: `0 0 ${EV_DELETE_WIDTH}px`, background: '#E74C3C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Delete</span>
        </div>
      </div>
    </div>
  );
}

export default function Profile({ user, profile = {}, onUpdateProfile = () => {}, activeTab = 'profile', onNavigate = () => {}, onOpenGroup = () => {}, events = [], groups: allGroups = [], onAddEvent = () => {}, onUpdateEvent = () => {}, onDeleteEvent = () => {}, onSignOut = () => {}, onSwitchAccount = () => {}, onAuthRequired = () => {}, darkMode = false, onToggleDark = () => {}, onViewFriend = () => {}, onOpenDm = () => {} }) {
  const [name, setName] = useState(() => profile.name || localStorage.getItem('sphera_name') || '');
  const [bio, setBio] = useState(() => profile.bio || localStorage.getItem('sphera_bio') || '');
  const [username, setUsername] = useState(() => profile.username || localStorage.getItem('sphera_username') || '');
  const [pronouns, setPronouns] = useState(() => profile.pronouns || localStorage.getItem('sphera_pronouns') || '');
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [usernameError, setUsernameError] = useState(null);

  const getStoredCheers = () => {
    try {
      const stored = Number(localStorage.getItem('sphera_cheers'));
      if (Number.isNaN(stored) || stored < 0 || stored === 12) {
        localStorage.setItem('sphera_cheers', '0');
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
    if (profile.school) { setSchool(profile.school); localStorage.setItem('sphera_school', profile.school); }
    if (profile.school_verified) { localStorage.setItem('sphera_school_verified', profile.school); }
  }, [profile]);

  // Live username validation + availability check while editing
  useEffect(() => {
    if (!editingProfile) return;
    const original = (profile.username || localStorage.getItem('sphera_username') || '').toLowerCase();
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
    localStorage.setItem('sphera_name', newName);
    localStorage.setItem('sphera_bio', newBio);
    localStorage.setItem('sphera_username', finalUsername);
    localStorage.setItem('sphera_pronouns', pronouns);
    setEditingProfile(false);
    onUpdateProfile({ name: newName, bio: newBio, username: finalUsername, friends: profile.friends || [], pronouns, avatar_url: profile.avatar_url || '' });
  };
  // `events` and handlers are provided by App (single source of truth)
  const [showGeneralSettings, setShowGeneralSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
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
      const seenAccepted = parseInt(localStorage.getItem('sphera_seen_accepted') || '0');
      setFriendNotifCount(incoming + Math.max(0, acceptedTotal - seenAccepted));
    });
  }, [user]);

  function handleToggleFriendsPanel() {
    const opening = !showFriendsPanel;
    setShowFriendsPanel(opening);
    if (opening && user) {
      getFriendNotifications(user.id).then(({ acceptedTotal }) => {
        localStorage.setItem('sphera_seen_accepted', String(acceptedTotal));
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

  async function handleVerifyStudent() {
    const expectedDomains = getDomainsForSchool(school);
    const domain = expectedDomains[0] || '';
    const prefix = verifyEmail.trim().toLowerCase();
    if (!prefix) { setVerifyError('Enter your email prefix.'); return; }
    if (!domain) { setVerifyError('No known domain for your school.'); return; }
    const fullEmail = `${prefix}@${domain}`;
    setVerifyLoading(true);
    setVerifyError(null);
    const { success, error } = await sendEduVerification(fullEmail, school);
    setVerifyLoading(false);
    if (!success) { setVerifyError(error || 'Failed to send code. Try again.'); return; }
    setVerifyStep('code');
  }

  async function handleVerifyCode() {
    const expectedDomains = getDomainsForSchool(school);
    const domain = expectedDomains[0] || '';
    const fullEmail = `${verifyEmail.trim().toLowerCase()}@${domain}`;
    const code = verifyCode.trim();
    if (!code) { setVerifyError('Enter the 6-digit code.'); return; }
    setVerifyLoading(true);
    setVerifyError(null);
    const { success, error } = await verifyEduCode(fullEmail, code);
    if (!success) { setVerifyLoading(false); setVerifyError(error || 'Incorrect code. Try again.'); return; }
    await onUpdateProfile({ name, bio, username, friends: profile.friends || [], school, school_verified: true, edu_email: fullEmail });
    setVerifyLoading(false);
    setVerifyStep('success');
  }


  useEffect(() => {
    const syncCheers = () => setCheers((current) => ({ ...current, count: getStoredCheers() }));
    syncCheers();

    const handleCheersUpdated = () => syncCheers();
    const handleStorage = (event) => {
      if (event.key === 'sphera_cheers') {
        syncCheers();
      }
    };

    window.addEventListener('sphera-cheers-updated', handleCheersUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('sphera-cheers-updated', handleCheersUpdated);
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
  const [school, setSchool] = useState(() => localStorage.getItem('sphera_school') || detectedSchool || '');
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');

  // Verified if the sign-in email's .edu domain auto-maps to the current school,
  // or if a previous OTP verification was completed (future flow).
  const schoolVerified = !!school && (
    detectedSchool === school ||
    localStorage.getItem('sphera_school_verified') === school
  );

  // ── Logged-out state ─────────────────────────────────────────────────────────
  if (!user) {
    return <ProfileSignIn activeTab={activeTab} onNavigate={onNavigate} />;
  }

  if (showGeneralSettings && !showSettings) {
    const SettingsRow = ({ icon, label, sub, onClick, chevron = true, color, iconBg }) => (
      <button
        onClick={onClick}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'none', border: 'none', cursor: onClick ? 'pointer' : 'default', textAlign: 'left' }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg || 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: color || 'var(--purple)', overflow: 'hidden' }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: color || '#EEEEFF' }}>{label}</div>
          {sub && <div style={{ fontSize: 12, color: '#8888AA', marginTop: 1 }}>{sub}</div>}
        </div>
        {chevron && (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        )}
      </button>
    );

    const Divider = () => <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 18px' }} />;

    return (
      <main className="feed-root" style={{ height: '100vh', overflow: 'hidden', paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <button
              onClick={() => setShowGeneralSettings(false)}
              style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EEEEFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Settings</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>

            {/* Section 1 */}
            <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: '#8888AA', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Account</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <SettingsRow
                onClick={() => { setShowGeneralSettings(false); setShowSettings(true); }}
                label="Settings and Privacy"
                color="#9CA3AF"
                iconBg="rgba(156,163,175,0.15)"
                icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm7.43-2.44c.04-.32.07-.64.07-.96s-.03-.64-.07-.97l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.63c-.04.33-.07.65-.07.97s.03.64.07.97l-2.11 1.63c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.63z"/></svg>}
              />
              <Divider />
              <SettingsRow
                onClick={() => {}}
                label="Help Center"
                color="#F59E0B"
                iconBg="rgba(245,158,11,0.15)"
                icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>}
              />
            </div>

            {/* Section 2 */}
            <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: '#8888AA', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Payments</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <SettingsRow
                onClick={null}
                label="Wallet"
                sub="Coming soon"
                chevron={false}
                icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>}
              />
              <Divider />
              <SettingsRow
                onClick={null}
                label="Account Balance"
                sub="Coming soon"
                chevron={false}
                color="#22C55E"
                iconBg="rgba(34,197,94,0.15)"
                icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
              />
            </div>

            {/* Section 3 */}
            <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: '#8888AA', letterSpacing: '0.08em', textTransform: 'uppercase' }}>About</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <SettingsRow
                onClick={() => {}}
                label="Rate the app"
                icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              />
              <Divider />
              <SettingsRow
                onClick={() => window.open('mailto:support@joinsphera.com')}
                label="Contact us"
                icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
              />
              <Divider />
              <SettingsRow
                onClick={() => window.open('https://www.instagram.com/joinsphera', '_blank')}
                label="Follow @joinsphera"
                sub="Instagram"
                iconBg="transparent"
                icon={<img src={require('../assets/instagram app icon.png')} alt="Instagram" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              />
              <Divider />
              <SettingsRow
                onClick={() => window.open('https://www.tiktok.com/@joinsphera', '_blank')}
                label="Follow @joinsphera"
                sub="TikTok"
                iconBg="transparent"
                icon={<img src={require('../assets/tiktok app icon.png')} alt="TikTok" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              />
            </div>

          </div>
        </div>
      </main>
    );
  }

  if (showSettings) {
    return (
      <main className="feed-root" style={{ height: '100vh', overflow: 'hidden', paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <button
              onClick={() => { setShowSettings(false); setShowGeneralSettings(true); }}
              style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EEEEFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Settings and Privacy</span>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>
            <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: '#8888AA', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Appearance</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Dark mode</div>
                  <div style={{ fontSize: 12, color: '#8888AA', marginTop: 2 }}>Easier on the eyes at night</div>
                </div>
                <button
                  onClick={onToggleDark}
                  aria-label="Toggle dark mode"
                  style={{ width: 48, height: 26, borderRadius: 13, background: darkMode ? 'var(--purple)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 3, left: darkMode ? 25 : 3, transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: '#8888AA', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Account</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
              <button
                onClick={() => { setShowSettings(false); onSwitchAccount(); }}
                style={{ width: '100%', textAlign: 'left', padding: '16px 18px', background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: 'currentColor', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span>Switch account</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3l4 4-4 4"/><path d="M21 7H9"/><path d="M7 21l-4-4 4-4"/><path d="M3 17h12"/>
                </svg>
              </button>
              <button
                onClick={() => setShowSignOutConfirm(true)}
                style={{ width: '100%', textAlign: 'left', padding: '16px 18px', background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#E74C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>Sign out</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ width: '100%', textAlign: 'left', padding: '16px 18px', background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#E74C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>Delete account</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {showSignOutConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ textAlign: 'center', padding: 24, maxWidth: 320 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 16 }}>Sign out?</p>
              <p style={{ margin: '0 0 20px', color: '#666', fontSize: 14 }}>You'll need to sign back in to join events or create groups.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="nav-btn" style={{ flex: 1 }} onClick={() => setShowSignOutConfirm(false)}>Cancel</button>
                <button className="join" style={{ flex: 1, borderRadius: 10 }} onClick={() => { setShowSignOutConfirm(false); setShowSettings(false); onSignOut(); }}>Sign out</button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ padding: 24, maxWidth: 320 }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 16, color: '#E74C3C', textAlign: 'center' }}>Delete account?</p>
              <p style={{ margin: '0 0 16px', color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>This permanently deletes your profile, events, and all your data. This cannot be undone.</p>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#888' }}>Type <span style={{ color: '#E74C3C', fontFamily: 'monospace' }}>Delete my account</span> to confirm</p>
              <input
                className="text-input"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Delete my account"
                style={{ marginBottom: 16 }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="nav-btn" style={{ flex: 1 }} onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>Cancel</button>
                <button
                  disabled={deleteConfirmText !== 'Delete my account'}
                  style={{ flex: 1, borderRadius: 10, padding: '10px', background: deleteConfirmText === 'Delete my account' ? '#E74C3C' : 'rgba(231,76,60,0.3)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: deleteConfirmText === 'Delete my account' ? 'pointer' : 'not-allowed', transition: 'background 150ms' }}
                  onClick={async () => {
                    setShowDeleteConfirm(false);
                    setShowSettings(false);
                    setDeleteConfirmText('');
                    try {
                      const { supabase } = await import('../lib/supabaseClient');
                      await supabase.from('profiles').delete().eq('id', user.id);
                    } catch (e) {}
                    onSignOut();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="feed-root" style={{ height: '100vh', overflow: 'hidden', paddingBottom: 0 }}>
      <header className="feed-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ margin: 0 }}>Profile</h1>
          <p className="tagline" style={{ margin: 0 }}>{name || 'Set up your profile'}</p>
        </div>
        <button
          onClick={() => setShowGeneralSettings(true)}
          aria-label="Settings"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', color: '#EEEEFF', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

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
              {(() => {
                const avatarSrc = profile?.avatar_url || user?.user_metadata?.avatar_url;
                return avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={name}
                    referrerPolicy="no-referrer"
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}
                  />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(180deg,var(--light-purple),#fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--purple)', fontWeight: 800, flexShrink: 0 }}>
                    {getInitials(name)}
                  </div>
                );
              })()}
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
                  title={school}
                  style={{ background:'none', border:'none', padding:0, cursor:'pointer', position:'relative', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}
                >
                  <SchoolLogo school={school} size={36} style={{ borderRadius:'50%' }} />
                  {schoolVerified && (
                    <div style={{ position:'absolute', bottom:-2, right:-2, width:14, height:14, borderRadius:'50%', background:'rgba(29,158,117,0.55)', border:'2px solid #0A0A0F', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg viewBox="0 0 24 24" width="8" height="8" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    </div>
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
              {profile.grad_year && (
                <span className="category-pill" style={{ background:'rgba(255,255,255,0.06)', color:'#8888AA', fontSize:11, padding:'6px 10px' }}>Class of {profile.grad_year}</span>
              )}
              <span className="category-pill" style={{ background:'var(--light-teal)', color:'var(--teal)', fontSize:12, padding:'6px 10px' }}>{cheers.count} cheers</span>
              <span className="category-pill" style={{ background:'var(--light-purple)', color:'var(--purple)', fontSize:12, padding:'6px 10px' }}>{events.filter(e => !e.personal && e.dateISO && new Date(e.dateISO) < new Date()).length} hosted</span>
              <span className="category-pill" style={{ background:'var(--light-pink)', color:'var(--pink)', fontSize:12, padding:'6px 10px' }}>{events.filter(e => e.dateISO && new Date(e.dateISO) < new Date()).length} attended</span>
            </div>

            {bio && <p style={{ margin: '10px 0 0', color: '#EEEEFF', textAlign: 'left', fontSize: 14, lineHeight: 1.5 }}>{bio}</p>}

          {/* .edu Verification modal */}
          {showVerifyModal && (() => {
            const expectedDomains = getDomainsForSchool(school);
            const domain = expectedDomains[0] || '';
            return (
              <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
                <div className="modal" style={{ padding: 24 }} onClick={e => e.stopPropagation()}>

                  {verifyStep === 'email' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 17 }}>Verify student status</h3>
                        <button onClick={() => setShowVerifyModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1, padding: '0 2px' }}>×</button>
                      </div>
                      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#8888AA', lineHeight: 1.5 }}>
                        Enter your <strong style={{ color: 'var(--text-primary)' }}>{school}</strong> email to confirm you're a student.
                      </p>
                      <div style={{ marginBottom: verifyError ? 8 : 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>School email</div>
                        <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <input
                            className="text-input"
                            type="text"
                            placeholder="yourname"
                            value={verifyEmail}
                            onChange={e => { setVerifyEmail(e.target.value.replace(/[@\s]/g, '')); setVerifyError(null); }}
                            onKeyDown={e => { if (e.key === 'Enter' && verifyEmail.trim() && !verifyLoading) handleVerifyStudent(); }}
                            autoFocus
                            autoCapitalize="none"
                            autoCorrect="off"
                            style={{ flex: 1, border: 'none', borderRadius: 0, marginBottom: 0, background: 'rgba(255,255,255,0.05)' }}
                          />
                          <div style={{
                            padding: '0 16px', fontSize: 14, fontWeight: 600,
                            color: 'var(--purple)', background: 'rgba(83,74,183,0.12)',
                            borderLeft: '1px solid rgba(83,74,183,0.25)',
                            display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
                          }}>
                            @{domain || 'university.edu'}
                          </div>
                        </div>
                      </div>
                      {verifyError && <div style={{ fontSize: 12, color: '#E74C3C', marginBottom: 12 }}>{verifyError}</div>}
                      <button
                        className="join"
                        style={{ width: '100%', padding: 13, fontSize: 15 }}
                        disabled={verifyLoading || !verifyEmail.trim()}
                        onClick={handleVerifyStudent}
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
                      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#8888AA', lineHeight: 1.5 }}>
                        We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{verifyEmail}@{getDomainsForSchool(school)[0]}</strong>
                      </p>
                      <div style={{ marginBottom: verifyError ? 8 : 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Verification code</div>
                        <input
                          className="text-input"
                          type="text"
                          inputMode="numeric"
                          placeholder="123456"
                          value={verifyCode}
                          onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyError(null); }}
                          onKeyDown={e => { if (e.key === 'Enter' && verifyCode.trim() && !verifyLoading) handleVerifyCode(); }}
                          autoFocus
                          style={{ width: '100%', boxSizing: 'border-box', letterSpacing: '0.2em', fontSize: 20, textAlign: 'center' }}
                        />
                      </div>
                      {verifyError && <div style={{ fontSize: 12, color: '#E74C3C', marginBottom: 12 }}>{verifyError}</div>}
                      <button
                        className="join"
                        style={{ width: '100%', padding: 13, fontSize: 15, marginBottom: 10 }}
                        disabled={verifyLoading || verifyCode.length < 6}
                        onClick={handleVerifyCode}
                      >
                        {verifyLoading ? 'Verifying…' : 'Verify'}
                      </button>
                      <button
                        onClick={() => { setVerifyStep('email'); setVerifyCode(''); setVerifyError(null); }}
                        style={{ background: 'none', border: 'none', color: '#8888AA', fontSize: 13, cursor: 'pointer', width: '100%', padding: '6px' }}
                      >
                        Resend code
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
                          localStorage.setItem('sphera_school', s);
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
                      onClick={() => { setSchool(''); localStorage.removeItem('sphera_school'); localStorage.removeItem('sphera_school_verified'); setShowSchoolPicker(false); setSchoolSearch(''); onUpdateProfile({ name, bio, username, friends: [], school: '', school_verified: false }); }}
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
            {/* Avatar picker */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <div style={{ position: 'relative', width: 72, height: 72 }}>
                {(() => {
                  const avatarSrc = profile?.avatar_url || user?.user_metadata?.avatar_url;
                  return avatarSrc ? (
                    <img src={avatarSrc} alt={name} referrerPolicy="no-referrer" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(180deg,var(--light-purple),#fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: 'var(--purple)', fontWeight: 800 }}>
                      {getInitials(name)}
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--purple)', border: '2.5px solid var(--card-bg, #1a1a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                >
                  {uploadingAvatar ? (
                    <div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="white" aria-hidden="true">
                      <path d="M12 15.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/>
                    </svg>
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    setUploadingAvatar(true);
                    const url = await uploadAvatarImage(user.id, file);
                    setUploadingAvatar(false);
                    if (url) onUpdateProfile({ ...profile, avatar_url: url });
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
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
              <button className="nav-btn" onClick={()=>{ setUsername(localStorage.getItem('sphera_username')||''); setName(localStorage.getItem('sphera_name')||''); setBio(localStorage.getItem('sphera_bio')||''); setPronouns(localStorage.getItem('sphera_pronouns')||''); setEditingProfile(false); }}>Cancel</button>
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
            <FriendsPanel user={user} onViewFriend={onViewFriend} onOpenDm={onOpenDm} />
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
            style={{ margin: '6px 0', cursor: upcomingEvents.length > 4 ? 'pointer' : undefined, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => upcomingEvents.length > 4 && setShowAllEvents(s => !s)}
          >
            Upcoming
            {upcomingEvents.length > 4 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--purple)', fontSize: 11, fontWeight: 600 }}>
                {!showAllEvents && `+${upcomingEvents.length - 4}`}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 8 }}>
          {(showAllEvents ? upcomingEvents : upcomingEvents.slice(0, 4)).map((ev) => (
            <EventCard key={ev.id} event={ev} compact onOpenDetails={openEvent} currentUserId={user?.id} currentUserName={profile?.name || ''} />
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
              <p style={{ margin: 0, fontWeight: 700 }}>Are you sure you want to delete this spherapoint?</p>
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
                  {formatDate(ev.dateISO, ev.showTime)}
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
            <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--purple)', letterSpacing: '-1px', lineHeight: 1 }}>Sphera</div>
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
