import React, { useState, useEffect, useRef } from 'react';
import { getEventMessages, subscribeToEventMessages, getEventAttendees, subscribeToEventAttendees, isSupabaseConfigured, getProfilesByIds, uploadEventCover } from '../lib/supabaseClient';
import { avatarColor } from '../lib/avatarColor';
import { getInitials } from '../lib/utils';
import './HomeFeed.css';

const TAGS = [
  { id: 'On Campus', color: '#FFB420', bg: 'rgba(255,180,32,0.12)' },
  { id: 'Social',    color: '#FF6BA8', bg: 'rgba(255,107,168,0.15)' },
  { id: 'Sports',    color: '#00E5A8', bg: 'rgba(0,229,168,0.15)' },
  { id: 'Arts',      color: '#9B59B6', bg: 'rgba(155,89,182,0.15)' },
  { id: 'Music',     color: '#9D8FFF', bg: 'rgba(157,143,255,0.15)' },
  { id: 'Food',      color: '#FF6BA8', bg: 'rgba(255,107,168,0.15)' },
  { id: 'Gaming',    color: '#667EEA', bg: 'rgba(102,126,234,0.15)' },
  { id: 'Outdoors',  color: '#00E5A8', bg: 'rgba(0,229,168,0.15)' },
  { id: 'Other',     color: '#999999', bg: 'rgba(153,153,153,0.15)' },
];

export default function EventDetails({ event, onBack, onUpdateEvent, activeTab, onNavigate, onCreateGroup = () => {}, onOpenChat = () => {}, user = null, profile = null, onAuthRequired = () => {} }) {
  const [liveMessages, setLiveMessages] = useState([]);
  const [lastReadCount, setLastReadCount] = useState(0);
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [hostProfile, setHostProfile] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef(null);

  const eventId = event?.id ?? null;
  const eventRef = useRef(event);
  useEffect(() => { eventRef.current = event; }, [event]);

  useEffect(() => {
    if (!event?.user_id || !isSupabaseConfigured()) return;
    getProfilesByIds([event.user_id]).then(map => {
      const p = map[event.user_id];
      if (p) setHostProfile(p);
    });
  }, [event?.user_id]);

  useEffect(() => {
    if (!eventId || !isSupabaseConfigured()) return;
    let cancelled = false;
    const unsub = subscribeToEventAttendees(eventId, async () => {
      const attendees = await getEventAttendees(eventId);
      if (!cancelled) onUpdateEvent({ ...eventRef.current, attendees });
    });
    return () => { cancelled = true; unsub(); };
  }, [eventId, onUpdateEvent]);

  useEffect(() => {
    if (!eventId || !isSupabaseConfigured()) return;
    const readKey = `sphera_chat_read_event_${eventId}`;
    setLastReadCount(parseInt(localStorage.getItem(readKey) || '0'));
    let cancelled = false;
    getEventMessages(eventId).then(msgs => { if (!cancelled) setLiveMessages(msgs); });
    const interval = setInterval(() => {
      getEventMessages(eventId).then(msgs => { if (!cancelled) setLiveMessages(msgs); });
    }, 5000);
    const unsub = subscribeToEventMessages(eventId, msg => {
      if (!cancelled) setLiveMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    });
    return () => { cancelled = true; clearInterval(interval); unsub(); };
  }, [eventId]);

  if (!event) return null;

  const currentUserName = localStorage.getItem('sphera_name') || localStorage.getItem('sphera_username') || '';
  const { title, dateISO, showTime, location, attendees = [], trending, category, tags = [] } = event;

  const dateDisplay = dateISO
    ? showTime
      ? new Date(dateISO).toLocaleString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      : new Date(dateISO).toLocaleDateString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric',
        })
    : 'Date TBD';

  const isHost = user?.id ? event.user_id === user.id : event.host === currentUserName;
  const joined = isHost || (user?.id
    ? attendees.some(a => a.user_id === user.id)
    : (currentUserName && attendees.some(a => a.name === currentUserName)));

  const unreadCount = Math.max(0, liveMessages.length - lastReadCount);
  const displayTags = tags.length > 0 ? tags : (category ? [category] : []);
  const hostName = hostProfile?.name || hostProfile?.username || event.host || '';
  const hostInitials = getInitials(hostName || 'H');
  const hostAvatarColor = avatarColor(hostName || 'host');

  function openChat() {
    if (!user) { onAuthRequired('Sign in to access the chat'); return; }
    if (!joined) { setShowJoinPrompt(true); return; }
    localStorage.setItem(`sphera_chat_read_event_${eventId}`, String(liveMessages.length));
    setLastReadCount(liveMessages.length);
    onOpenChat(event);
  }

  function openEdit() {
    const d = event.dateISO ? new Date(event.dateISO) : null;
    setEditForm({
      title: event.title || '',
      date: d ? d.toISOString().slice(0, 10) : '',
      time: d && event.showTime ? d.toTimeString().slice(0, 5) : '',
      showTime: !!event.showTime,
      location: event.location || '',
      tags: event.tags || [],
      visibility: event.visibility || 'public',
      coverUrl: event.coverUrl || '',
      description: event.description || '',
    });
    setShowEdit(true);
  }

  function handleEditSave() {
    const iso = editForm.date
      ? editForm.showTime && editForm.time
        ? new Date(`${editForm.date}T${editForm.time}`).toISOString()
        : new Date(`${editForm.date}T00:00:00`).toISOString()
      : event.dateISO;
    onUpdateEvent && onUpdateEvent({
      ...event,
      title: editForm.title,
      dateISO: iso,
      showTime: editForm.showTime && !!editForm.time,
      location: editForm.location,
      tags: editForm.tags,
      visibility: editForm.visibility,
      coverUrl: editForm.coverUrl || null,
      description: editForm.description,
    });
    setShowEdit(false);
  }

  function handleJoin() {
    if (!user) { onAuthRequired('Sign in to join this event'); return; }
    const name = currentUserName;
    const initials = getInitials(name || 'You');
    const exists = attendees.some(a => a.name === name);
    const next = exists
      ? attendees.filter(a => a.name !== name)
      : [{ name, initials, color: '#FFFFFF', user_id: user?.id, avatar_url: profile?.avatar_url || '' }, ...attendees];
    onUpdateEvent && onUpdateEvent({ ...event, attendees: next });
  }

  const Divider = () => <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '24px 0' }} />;

  return (
    <main className="event-details-scroller" style={{
      position: 'fixed', top: 0, bottom: 0, zIndex: 5,
      width: '100%', maxWidth: 520, left: '50%', transform: 'translateX(-50%)',
      overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
      background: '#08080E',
    }}>

      {/* Hero image */}
      <div style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
        {event.coverUrl ? (
          <img
            src={event.coverUrl}
            alt=""
            onClick={() => setShowFullscreen(true)}
            style={{ width: '100%', height: 'auto', display: 'block', cursor: 'zoom-in' }}
          />
        ) : (
          <div style={{
            width: '100%', height: 280,
            background: 'linear-gradient(135deg, #1c1840 0%, #2d2260 50%, #1a1435 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 96, fontWeight: 900, color: 'rgba(255,255,255,0.06)', lineHeight: 1, userSelect: 'none', letterSpacing: '-0.04em' }}>
              {title?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        )}

        {/* Bottom fade to page bg — only shown when there's a real cover photo */}
        {event.coverUrl && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
            background: 'linear-gradient(to top, #08080E 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />
        )}

        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: 16, left: 16,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 120px' }}>

        {/* Title */}
        <h1 style={{ margin: '0 0 10px', fontSize: 27, fontWeight: 800, color: '#EEEEFF', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
          {title}
        </h1>

        {/* Tags */}
        {(displayTags.length > 0 || trending) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
            {displayTags.map(tag => {
              const tagDef = TAGS.find(t => t.id === tag);
              const col = tagDef?.color || '#9D8FFF';
              const bg = tagDef?.bg || 'rgba(157,143,255,0.15)';
              return (
                <span key={tag} className="category-pill" style={{ color: col, background: bg }}>
                  {tag}
                </span>
              );
            })}
            {trending && <span className="badge">Trending</span>}
          </div>
        )}

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(83,74,183,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, color: '#CCCCEE', fontWeight: 500 }}>{dateDisplay}</span>
        </div>

        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(83,74,183,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div style={{ paddingTop: 4 }}>
            <div style={{ fontSize: 15, color: '#CCCCEE', fontWeight: 500, lineHeight: 1.3 }}>
              {location || 'Location TBD'}
            </div>
          </div>
        </div>

        {/* Map placeholder */}
        <div style={{
          borderRadius: 14, overflow: 'hidden', marginBottom: 24, height: 120,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative' }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', position: 'relative' }}>
            Map coming soon
          </span>
        </div>

        {/* Action tile row — RSVP · Chat · Edit/Contact */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>

          {/* RSVP / Going tile */}
          <button
            onClick={isHost ? undefined : handleJoin}
            style={{
              flex: 1,
              padding: '13px 0', borderRadius: 14, cursor: isHost ? 'default' : 'pointer',
              background: 'rgba(255,255,255,0.05)',
              border: joined || isHost ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.09)',
              color: joined || isHost ? '#EEEEFF' : '#AAAACC',
              fontWeight: 700, fontSize: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 180ms ease',
              minWidth: 0,
            }}
          >
            {isHost ? (
              <>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span style={{ fontSize: 12 }}>Hosting</span>
              </>
            ) : joined ? (
              <>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: 12 }}>Going</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                <span style={{ fontSize: 12 }}>RSVP</span>
              </>
            )}
          </button>

          {/* Chat tile */}
          <button
            onClick={openChat}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              color: '#AAAACC', fontWeight: 700, fontSize: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
              position: 'relative',
            }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" style={{ color: '#AAAACC' }}>
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <span style={{ fontSize: 12 }}>Chat</span>
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 8, right: 10,
                background: '#FF6BA8', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>

          {/* Edit (host) or Contact tile */}
          <button
            onClick={isHost ? openEdit : undefined}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 14, cursor: isHost ? 'pointer' : 'default',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              color: '#AAAACC', fontWeight: 700, fontSize: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
              opacity: isHost ? 1 : 0.45,
            }}
          >
            {isHost ? (
              <>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span style={{ fontSize: 12 }}>Edit</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span style={{ fontSize: 12 }}>Contact</span>
              </>
            )}
          </button>
        </div>

        <Divider />

        {/* Host */}
        <div style={{ marginBottom: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Hosted by
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {hostProfile?.avatar_url ? (
              <img src={hostProfile.avatar_url} alt={hostName} referrerPolicy="no-referrer" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: hostAvatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {hostInitials}
              </div>
            )}
            <span style={{ fontSize: 16, fontWeight: 700, color: '#EEEEFF' }}>{hostName || 'Unknown'}</span>
          </div>
        </div>

        <Divider />

        {/* Going */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            {attendees.length > 0 ? `${attendees.length} Going` : 'Going'}
          </div>
          {attendees.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                {attendees.slice(0, 5).map((a, i) => {
                  const color = a.color && a.color !== '#FFFFFF' ? a.color : avatarColor(a.name);
                  const initials = a.initials || getInitials(a.name);
                  return (
                    <div key={i} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i, position: 'relative' }}>
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt={a.name} referrerPolicy="no-referrer" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #2f3138', display: 'block' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', border: '2.5px solid #2f3138' }}>
                          {initials}
                        </div>
                      )}
                    </div>
                  );
                })}
                {attendees.length > 5 && (
                  <div style={{ marginLeft: -10, zIndex: 0, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#BBBBDD', border: '2.5px solid #2f3138' }}>
                    +{attendees.length - 5}
                  </div>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#777799', lineHeight: 1.5 }}>
                {attendees.slice(0, 3).map(a => a.name).filter(Boolean).join(', ')}
                {attendees.length > 3 && `, and ${attendees.length - 3} more`}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: '#555577' }}>No one yet — be the first!</p>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <>
            <Divider />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                About Event
              </div>
              <p style={{ margin: 0, fontSize: 15, color: '#AAAACC', lineHeight: 1.75 }}>
                {event.description}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowEdit(false)}>
          <div className="hide-scrollbar" style={{ background: '#1C1C22', borderRadius: '20px 20px 0 0', padding: '28px 20px 40px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />
            <h3 style={{ margin: '0 0 22px', fontSize: 18, fontWeight: 800, color: '#EEEEFF' }}>Edit Event</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Cover photo */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Cover Photo</label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  style={{ position: 'relative', width: '100%', height: 130, borderRadius: 12, background: editForm.coverUrl ? 'none' : 'rgba(255,255,255,0.04)', border: editForm.coverUrl ? 'none' : '1.5px dashed rgba(255,255,255,0.12)', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {editForm.coverUrl ? (
                    <img src={editForm.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#555577' }}>
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" style={{ display: 'block', margin: '0 auto 6px' }}>
                        <path d="M12 15.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/>
                      </svg>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Add cover photo</span>
                    </div>
                  )}
                  {editForm.coverUrl && (
                    <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {uploadingCover
                        ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        : <svg viewBox="0 0 24 24" width="12" height="12" fill="white"><path d="M12 15.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/></svg>
                      }
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>Change</span>
                    </div>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingCover(true);
                    const url = await uploadEventCover(event.id, file);
                    setUploadingCover(false);
                    if (url) setEditForm(f => ({ ...f, coverUrl: url }));
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Title</label>
                <input className="text-input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>

              {/* Date + time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Date</label>
                  <input type="date" className="text-input" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Time</label>
                  <input type="time" className="text-input" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value, showTime: !!e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }} />
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Location</label>
                <input className="text-input" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea
                  className="text-input textarea"
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What's this event about?"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Tags */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Tags</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {TAGS.map(tag => {
                    const selected = (editForm.tags || []).includes(tag.id);
                    return (
                      <button key={tag.id} onClick={() => setEditForm(f => ({ ...f, tags: selected ? f.tags.filter(t => t !== tag.id) : [...(f.tags || []), tag.id] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: `1px solid ${selected ? tag.color : 'rgba(255,255,255,0.08)'}`, background: selected ? tag.bg : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: selected ? tag.color : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: selected ? tag.color : '#AAAACC' }}>{tag.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Visibility</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[{ id: 'public', label: 'Public' }, { id: 'friends', label: 'Friends' }, { id: 'private', label: 'Private' }].map(v => (
                    <button key={v.id} onClick={() => setEditForm(f => ({ ...f, visibility: v.id }))}
                      style={{ padding: '9px 0', borderRadius: 10, border: `1px solid ${editForm.visibility === v.id ? 'var(--purple)' : 'rgba(255,255,255,0.08)'}`, background: editForm.visibility === v.id ? 'rgba(83,74,183,0.15)' : 'rgba(255,255,255,0.03)', color: editForm.visibility === v.id ? 'var(--purple)' : '#AAAACC', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowEdit(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#8888AA', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleEditSave}
                className="join"
                style={{
                  flex: 2, padding: '13px', borderRadius: 12, fontSize: 15,
                  letterSpacing: '0.02em', cursor: 'pointer',
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen image lightbox */}
      {showFullscreen && event.coverUrl && (
        <div
          onClick={() => setShowFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <img
            src={event.coverUrl}
            alt={event.title}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '100%',
              borderRadius: 12,
              objectFit: 'contain',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      )}

      {/* Join prompt */}
      {showJoinPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowJoinPrompt(false)}>
          <div style={{ background: '#1C1C22', borderRadius: '20px 20px 0 0', padding: '28px 24px 44px', width: '100%', maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 24px' }} />
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(83,74,183,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, textAlign: 'center', color: '#EEEEFF' }}>Members only</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#8888AA', textAlign: 'center', lineHeight: 1.65 }}>
              Join this event to access the group chat and coordinate with everyone going.
            </p>
            <button
              className="join"
              style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 16, fontWeight: 700 }}
              onClick={() => { setShowJoinPrompt(false); handleJoin(); }}
            >
              Join Event
            </button>
            <button onClick={() => setShowJoinPrompt(false)} style={{ width: '100%', padding: '12px', marginTop: 10, background: 'none', border: 'none', color: '#8888AA', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
              Not now
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
