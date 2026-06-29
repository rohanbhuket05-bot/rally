import React, { useState, useEffect, useRef } from 'react';
import { getFriendships, searchUsersByUsername, sendGroupInvite, getOutgoingGroupInvites, isSupabaseConfigured, getGroupMessages, subscribeToGroupMessages, getProfilesByIds, uploadGroupLogo, removeGroupMember } from '../lib/supabaseClient';
import { avatarColor, AVATAR_COLORS } from '../lib/avatarColor';
import { getInitials } from '../lib/utils';
import { TYPE_COLORS, TYPE_LABELS } from '../lib/groupTypes';
import './HomeFeed.css';

const LOGO_COLORS = [
  ...AVATAR_COLORS,
  '#E74C3C','#3498DB','#2ECC71','#F39C12','#1ABC9C','#E67E22',
];

function isUUID(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);
}

// Friend badge overlay for friend-members
function FriendBadge() {
  return (
    <span style={{
      position: 'absolute', bottom: -2, right: -2,
      width: 16, height: 16, borderRadius: '50%',
      background: 'var(--purple)', border: '2px solid #0F0F1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg viewBox="0 0 24 24" width="9" height="9" fill="white">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    </span>
  );
}

export default function GroupDetails({
  activeTab = 'group',
  onNavigate = () => {},
  group,
  isPreview = false,
  onUpdateGroup,
  onDeleteGroup,
  messages = [],
  onSendMessage,
  onOpenChat,
  onBack,
  user,
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pickingColor, setPickingColor] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);
  const [lastReadCount, setLastReadCount] = useState(0);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingInviteIds, setPendingInviteIds] = useState(new Set());
  const [inviting, setInviting] = useState(new Set());
  const [inviteError, setInviteError] = useState('');

  // Load friends on mount (for member checkmarks + invite panel)
  useEffect(() => {
    if (user) getFriendships(user.id).then(setFriends);
  }, [user]);

  // Backfill avatar_urls for members that are missing them
  const [memberAvatars, setMemberAvatars] = useState({});
  useEffect(() => {
    if (!group?.members) return;
    const missingIds = group.members
      .filter(m => m.user_id && !m.avatar_url)
      .map(m => m.user_id);
    if (missingIds.length === 0) return;
    getProfilesByIds(missingIds).then(profiles => setMemberAvatars(profiles));
  }, [group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load last-read count from localStorage when group changes
  useEffect(() => {
    if (!group?.id) return;
    setLastReadCount(parseInt(localStorage.getItem(`rally_chat_read_${group.id}`) || '0'));
  }, [group?.id]);

  // Fetch messages + subscribe for real-time new-message count
  const [liveMessages, setLiveMessages] = useState(messages);
  useEffect(() => {
    if (!group?.id || !isSupabaseConfigured()) return;
    let cancelled = false;
    getGroupMessages(group.id).then(msgs => { if (!cancelled) setLiveMessages(msgs); });
    const interval = setInterval(() => {
      getGroupMessages(group.id).then(msgs => { if (!cancelled) setLiveMessages(msgs); });
    }, 5000);
    const unsub = subscribeToGroupMessages(group.id, msg => {
      if (!cancelled) setLiveMessages(prev => [...prev, msg]);
    });
    return () => { cancelled = true; clearInterval(interval); unsub(); };
  }, [group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load outgoing invites when invite panel opens
  useEffect(() => {
    if (!showInvite || !group || !isUUID(group.id)) return;
    getOutgoingGroupInvites(group.id).then(ids => setPendingInviteIds(new Set(ids)));
    setSearchQuery('');
    setSearchResults([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInvite, group?.id]);

  // Debounced username search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const results = await searchUsersByUsername(searchQuery.trim(), user?.id);
      setSearchResults(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, user?.id]);

  if (!group) {
    return (
      <main className="feed-root">
        <header className="feed-header"><h1>Group not found</h1></header>
        <div className="card">This group could not be loaded.</div>
        <button className="nav-btn" onClick={onBack}>← Back</button>
      </main>
    );
  }

  const { name, description, type = 'club', privacy = 'public', members = [], icebreaker, eventTitle, events: groupEvents = [] } = group;
  const { color, bg } = TYPE_COLORS[type] || TYPE_COLORS.club;

  const isAdmin = !isPreview && !!user && (
    group.createdBy === user.id ||
    members.some(m => m.user_id === user.id && m.role === 'admin')
  );

  // Build sets for quick lookups
  const memberIds = new Set(members.map(m => m.user_id).filter(Boolean));
  const memberNames = new Set(members.map(m => m.name?.toLowerCase()).filter(Boolean));
  const friendIds = new Set(friends.map(f => f.other?.id).filter(Boolean));
  const friendNames = new Set(friends.map(f => (f.other?.name || f.other?.username || '').toLowerCase()).filter(Boolean));

  function isMemberFriend(member) {
    if (member.user_id) return friendIds.has(member.user_id);
    return friendNames.has(member.name?.toLowerCase() || '');
  }

  function isMember(profile) {
    if (profile.id && memberIds.size > 0) return memberIds.has(profile.id);
    const n = (profile.name || profile.username || '').toLowerCase();
    return memberNames.has(n);
  }

  async function handleSendInvite(profileId, displayName) {
    if (!group || !isUUID(group.id) || !profileId) return;
    setInviting(s => new Set([...s, profileId]));
    setInviteError('');
    try {
      await sendGroupInvite(group.id, profileId);
      setPendingInviteIds(s => new Set([...s, profileId]));
    } catch (e) {
      setInviteError(e.message || 'Failed to send invite. Check console for details.');
    }
    setInviting(s => { const next = new Set(s); next.delete(profileId); return next; });
  }

  function handleOpenChat() {
    localStorage.setItem(`rally_chat_read_${group.id}`, String(liveMessages.length));
    setLastReadCount(liveMessages.length);
    onOpenChat();
  }

  function handleRemoveMember(userId) {
    if (!isAdmin || !userId) return;
    removeGroupMember(group.id, userId);
    const updated = { ...group, members: members.filter(m => m.user_id !== userId) };
    onUpdateGroup && onUpdateGroup(updated);
  }

  // Filter non-member friends for the invite panel
  const nonMemberFriends = friends.filter(f => !isMember({ id: f.other?.id, name: f.other?.name, username: f.other?.username }));
  const nonMemberSearchResults = searchResults.filter(r => !isMember(r));
  const canInvite = !isPreview && isUUID(group.id) && isSupabaseConfigured();

  return (
    <main className="feed-root">
      <div className="scroll-area">
      {/* Header */}
      <header style={{ marginBottom: 16 }}>
        {/* Back + Delete row */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 40 }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10,
              padding: '8px 12px', color: 'var(--purple)', fontWeight: 700, cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          {isAdmin && onDeleteGroup && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ position: 'absolute', right: 6, background: 'rgba(231,76,60,0.1)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 6, color: '#E74C3C', display: 'flex', alignItems: 'center' }}
              aria-label="Delete group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 3v1H4v2h16V4h-5V3H9zm-2 4l1 13h8l1-13H7zm2 2h2l.5 9H9.5L9 9zm4 0h2l-.5 9h-2L13 9z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Logo + title + pills */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          {/* Logo */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Avatar display */}
            {group.logoUrl ? (
              <img
                src={group.logoUrl}
                alt={name}
                style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: group.logoColor || avatarColor(name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, color: '#fff',
              }}>
                {uploadingLogo ? (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                ) : getInitials(name)}
              </div>
            )}

            {/* Edit button (admin only) */}
            {isAdmin && (
              <button
                onClick={() => setPickingColor(p => !p)}
                aria-label="Edit logo"
                style={{
                  position: 'absolute', bottom: -6, right: -6,
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#2A2A3A', border: '2px solid #0F0F1A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#ccc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}

            {/* Hidden file input */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !isUUID(group.id)) return;
                setUploadingLogo(true);
                setPickingColor(false);
                const url = await uploadGroupLogo(group.id, file);
                if (url) onUpdateGroup && onUpdateGroup({ ...group, logoUrl: url });
                setUploadingLogo(false);
                e.target.value = '';
              }}
            />

            {/* Logo edit picker */}
            {pickingColor && (
              <div style={{
                position: 'absolute', top: 76, left: 0, zIndex: 100,
                background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                minWidth: 220,
              }}>
                {/* Upload option */}
                <button
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10,
                    padding: '10px 12px', color: '#eee', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', marginBottom: 12,
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Upload from photos / files
                </button>

                {/* Color swatches */}
                <div style={{ fontSize: 11, color: '#666', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or choose a color</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                  {LOGO_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        onUpdateGroup && onUpdateGroup({ ...group, logoColor: c, logoUrl: null });
                        setPickingColor(false);
                      }}
                      style={{
                        width: 28, height: 28, borderRadius: 8, background: c, padding: 0,
                        border: !group.logoUrl && c === (group.logoColor || avatarColor(name)) ? '2px solid #fff' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>{name}</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: description ? 10 : 0 }}>
              <span className="category-pill" style={{ background: bg, color }}>{TYPE_LABELS[type]}</span>
              {isPreview && (
                <span className="category-pill" style={{ background: 'var(--light-amber)', color: 'var(--amber)' }}>Preview</span>
              )}
              {privacy !== 'public' && (
                <span className="category-pill" style={{ background: 'rgba(255,255,255,0.08)', color: '#aaa' }}>{privacy === 'private' ? 'Private' : 'Friends Only'}</span>
              )}
            </div>
            {description && (
              <p style={{ margin: '10px 0 0', color: '#BBBBD0', fontSize: 14, lineHeight: 1.6 }}>{description}</p>
            )}
          </div>
        </div>
      </header>

      {/* About (eventTitle / icebreaker only) */}
      {(eventTitle || icebreaker) && (
        <div className="card" style={{ marginBottom: 12 }}>
          {eventTitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--light-teal)', borderRadius: 8, marginBottom: icebreaker ? 10 : 0 }}>
              <span>🎯</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>{eventTitle}</span>
            </div>
          )}
          {icebreaker && (
            <div style={{ padding: '10px', background: 'var(--light-purple)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Icebreaker</div>
              <div style={{ fontSize: 13, color: '#BBBBD0' }}>{icebreaker}</div>
            </div>
          )}
        </div>
      )}

      {/* Members */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Members</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge" style={{ background: color }}>{members.length}</span>
            {canInvite && (
              <button
                className="edit-btn"
                onClick={() => setShowInvite(s => !s)}
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                {showInvite ? 'Done' : '+ Invite'}
              </button>
            )}
          </div>
        </div>

        {showInvite && canInvite && (
          <div style={{ marginBottom: 14, padding: 12, background: 'rgba(83,74,183,0.05)', borderRadius: 10, border: '1px solid rgba(83,74,183,0.12)' }}>
            {/* Username search */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Search users</div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 14 }}>@</span>
              <input
                className="text-input"
                placeholder="Search by username"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 24 }}
                autoFocus
              />
            </div>
            {searching && <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Searching...</div>}
            {nonMemberSearchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {nonMemberSearchResults.map(result => {
                  const displayName = result.name || result.username;
                  const invited = pendingInviteIds.has(result.id);
                  const loading = inviting.has(result.id);
                  return (
                    <InviteRow
                      key={result.id}
                      displayName={displayName}
                      username={result.username}
                      invited={invited}
                      loading={loading}
                      onInvite={() => handleSendInvite(result.id, displayName)}
                    />
                  );
                })}
              </div>
            )}
            {/* Friends quick-invite */}
            {nonMemberFriends.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Your Friends</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nonMemberFriends.map(f => {
                    const displayName = f.other?.name || f.other?.username || '';
                    const invited = f.other?.id ? pendingInviteIds.has(f.other.id) : false;
                    const loading = f.other?.id ? inviting.has(f.other.id) : false;
                    return (
                      <InviteRow
                        key={f.id}
                        displayName={displayName}
                        username={f.other?.username}
                        invited={invited}
                        loading={loading}
                        onInvite={() => handleSendInvite(f.other?.id, displayName)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {inviteError && (
              <div style={{ fontSize: 12, color: '#E74C3C', background: 'rgba(231,76,60,0.08)', borderRadius: 8, padding: '8px 10px', marginTop: 8 }}>
                ⚠ {inviteError}
              </div>
            )}
            {nonMemberFriends.length === 0 && nonMemberSearchResults.length === 0 && !searching && !searchQuery && (
              <div style={{ fontSize: 13, color: '#999', textAlign: 'center', paddingTop: 4 }}>
                All your friends are already members.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((m, i) => {
            const mc = m.color && m.color !== '#FFFFFF' ? m.color : avatarColor(m.name);
            const isFriend = isMemberFriend(m);
            const initials = getInitials(m.name);
            const avatarUrl = m.avatar_url || (m.user_id && memberAvatars[m.user_id]?.avatar_url) || '';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={m.name} referrerPolicy="no-referrer"
                      style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: mc, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      {initials}
                    </div>
                  )}
                  {isFriend && <FriendBadge />}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                </div>
                {m.role === 'admin'
                  ? <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 11 }}>Admin</span>
                  : isAdmin && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      style={{ borderRadius: 8, padding: '5px 12px', fontSize: 12, background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)', color: '#E74C3C', fontWeight: 600, cursor: 'pointer' }}
                    >Remove</button>
                  )
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events (hosted by this group) */}
      {groupEvents.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>Upcoming events</h3>
          <div className="cards">
            {groupEvents.map((ev) => (
              <div key={ev.id} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700 }}>{ev.title}</div>
                <div style={{ color: '#666', fontSize: 13 }}>{ev.date} · {ev.location}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Group chat */}
      {!isPreview && (
        <>
          <div
            className="group-chat-panel group-chat-preview"
            onClick={handleOpenChat}
            style={{ marginBottom: 12, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: liveMessages.length > 0 ? 14 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ color: 'var(--purple)', flexShrink: 0 }}>
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Chat</span>
              </div>
              {(() => {
                const newCount = Math.max(0, liveMessages.length - lastReadCount);
                return newCount > 0
                  ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pink)', background: 'var(--light-pink)', borderRadius: 20, padding: '3px 9px', letterSpacing: '0.02em' }}>
                      {newCount} new
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>up to date</span>
                  );
              })()}
            </div>

            {liveMessages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(() => {
                  const recent = liveMessages.slice(-5);
                  const grps = [];
                  recent.forEach((msg) => {
                    const last = grps[grps.length - 1];
                    const lastMsg = last?.[last.length - 1];
                    const isCont = lastMsg &&
                      lastMsg.userId === msg.userId &&
                      msg.createdAt && lastMsg.createdAt &&
                      (new Date(msg.createdAt) - new Date(lastMsg.createdAt)) < 5 * 60 * 1000;
                    if (isCont) last.push(msg);
                    else grps.push([msg]);
                  });
                  return grps.map((grp) => {
                    const isMe = user && grp[0].userId === user.id;
                    const senderColor = isMe ? 'var(--purple)' : avatarColor(grp[0].sender || '');
                    const senderName = isMe ? 'You' : (grp[0].sender || 'Unknown');
                    const initials = getInitials(senderName);
                    const lastMsg = grp[grp.length - 1];
                    return (
                      <div key={grp[0].id} style={{ display: 'flex', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: senderColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, alignSelf: 'flex-start' }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: senderColor }}>{senderName}</span>
                            <span style={{ fontSize: 11, color: '#555577' }}>{lastMsg.time}</span>
                          </div>
                          {grp.map((msg) => (
                            <div key={msg.id} style={{ fontSize: 13, color: '#BBBBDD', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                              {msg.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div style={{ color: '#555577', fontSize: 13 }}>No messages yet — tap to start the conversation.</div>
            )}
          </div>
          <button className="join" onClick={handleOpenChat} style={{ width: '100%', padding: '12px', borderRadius: 12, marginBottom: 20, display: 'block', fontSize: 15 }}>
            Open group chat
          </button>
        </>
      )}

      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28, maxWidth: 320, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, color: '#111' }}>Delete "{name}"?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#555', lineHeight: 1.5 }}>
              This will permanently delete the group and all its data. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #ddd',
                  background: '#fff', color: '#444', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => onDeleteGroup(group.id)}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                  background: '#E74C3C', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      </div>{/* end scroll-area */}
    </main>
  );
}

function InviteRow({ displayName, username, invited, loading, onInvite }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="avatar" style={{ backgroundColor: avatarColor(displayName), color: '#fff', marginLeft: 0, flexShrink: 0, width: 34, height: 34, fontSize: 13 }}>
        {getInitials(displayName)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</div>
        {username && <div style={{ fontSize: 12, color: '#888' }}>@{username}</div>}
      </div>
      {invited
        ? <span style={{ fontSize: 12, color: '#2ECC71', fontWeight: 600 }}>✓ Invited</span>
        : (
          <button
            className="join"
            style={{ borderRadius: 8, padding: '5px 12px', fontSize: 13, opacity: loading ? 0.6 : 1 }}
            onClick={onInvite}
            disabled={loading}
          >
            {loading ? '...' : 'Invite'}
          </button>
        )
      }
    </div>
  );
}
