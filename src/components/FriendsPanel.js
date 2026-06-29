import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  searchUsersByUsername, sendFriendRequest, getFriendships,
  getIncomingFriendRequests, getOutgoingFriendRequests,
  acceptFriendRequest, declineFriendRequest, removeFriend,
} from '../lib/supabaseClient';
import { avatarColor } from '../lib/avatarColor';
import { getInitials } from '../lib/utils';
import './HomeFeed.css';

function Avatar({ name, avatarUrl, size = 38 }) {
  const initials = getInitials(name);
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarColor(name), color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.35, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontWeight: 700, fontSize: 15, textAlign: 'left', color: '#EEEEFF' }}>{children}</span>
      {count != null && (
        <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
          {count}
        </span>
      )}
    </div>
  );
}

function PersonRow({ name, username, avatarUrl, actions, onClick }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 12,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div
        onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: onClick ? 'pointer' : undefined }}
      >
        <Avatar name={name} avatarUrl={avatarUrl} />
        <div style={{ minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#EEEEFF' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>@{username}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {actions}
      </div>
    </div>
  );
}

const REMOVE_WIDTH = 120;
const SWIPE_THRESHOLD = 120;

function SwipeableFriendRow({ f, onViewFriend, onOpenDm, onRemove }) {
  const [offset, setOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isScrolling = useRef(false);
  const offsetRef = useRef(0);

  function onDragStart(clientX, clientY) {
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    isScrolling.current = false;
    setTransitioning(false);
  }

  function onDragMove(clientX, clientY) {
    if (touchStartX.current === null) return;
    const dx = clientX - touchStartX.current;
    const dy = clientY - touchStartY.current;
    if (isScrolling.current) return;
    if (Math.abs(dy) > Math.abs(dx)) { isScrolling.current = true; return; }
    const newOffset = Math.max(-REMOVE_WIDTH, Math.min(0, dx));
    offsetRef.current = newOffset;
    setOffset(newOffset);
  }

  function onDragEnd() {
    setTransitioning(true);
    const current = offsetRef.current;
    if (current <= -SWIPE_THRESHOLD) {
      setOffset(0);
      offsetRef.current = 0;
      setShowConfirm(true);
    } else {
      setOffset(0);
      offsetRef.current = 0;
    }
    touchStartX.current = null;
  }

  function handleRemoveClick() {
    setTransitioning(true);
    setOffset(0);
    setShowConfirm(true);
  }

  function onTouchStart(e) { onDragStart(e.touches[0].clientX, e.touches[0].clientY); }
  function onTouchMove(e) { if (!isScrolling.current) e.preventDefault(); onDragMove(e.touches[0].clientX, e.touches[0].clientY); }
  function onTouchEnd() { onDragEnd(); }

  function onMouseDown(e) { onDragStart(e.clientX, e.clientY); }
  function onMouseMove(e) { if (touchStartX.current !== null) onDragMove(e.clientX, e.clientY); }
  function onMouseUp() { if (touchStartX.current !== null) onDragEnd(); }

  const name = f.other?.name || f.other?.username;
  const username = f.other?.username;
  const avatarUrl = f.other?.avatar_url;

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      {/* Red remove button revealed on swipe */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: REMOVE_WIDTH, background: '#E74C3C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 12 }}
        onClick={handleRemoveClick}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Remove</span>
      </div>

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1A1A2E', borderRadius: 16, padding: 24, maxWidth: 300, width: '85%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, color: '#EEEEFF' }}>Remove {name}?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#888', lineHeight: 1.5 }}>They won't be notified, but you'll both lose the connection.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#EEEEFF', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { setShowConfirm(false); onRemove(); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#E74C3C', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Swipeable content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          transform: `translateX(${offset}px)`,
          transition: transitioning ? 'transform 250ms ease' : 'none',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', borderRadius: 12,
          background: 'var(--card-bg, #0F0F1A)',
          border: '1px solid rgba(255,255,255,0.07)',
          position: 'relative', zIndex: 1,
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div onClick={() => f.other?.id && onViewFriend(f.other.id)} style={{ cursor: 'pointer', flexShrink: 0 }}>
            <Avatar name={name} avatarUrl={avatarUrl} />
          </div>
          <div onClick={() => f.other?.id && onViewFriend(f.other.id)} style={{ minWidth: 0, textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#EEEEFF' }}>{name}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>@{username}</div>
          </div>
        </div>
        <button
          style={{ borderRadius: 8, padding: '6px 8px', background: 'rgba(83,74,183,0.1)', border: '1px solid rgba(83,74,183,0.2)', color: 'var(--purple)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); onOpenDm(f.other?.id, f.other); }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function FriendsPanel({ user, onViewFriend = () => {}, onOpenDm = () => {} }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [f, inc, out] = await Promise.all([
      getFriendships(user.id),
      getIncomingFriendRequests(user.id),
      getOutgoingFriendRequests(user.id),
    ]);
    setFriends(f);
    setIncoming(inc);
    setOutgoing(out);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchUsersByUsername(query.trim(), user?.id);
      setSearchResults(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, user?.id]);

  function relationshipStatus(userId) {
    if (friends.some(f => f.other?.id === userId)) return 'friends';
    if (outgoing.some(o => o.addressee_id === userId)) return 'sent';
    if (incoming.some(i => i.requester_id === userId)) return 'received';
    return 'none';
  }

  async function handleSend(addresseeId) { await sendFriendRequest(addresseeId); loadAll(); }
  async function handleAccept(id) { await acceptFriendRequest(id); loadAll(); }
  async function handleDecline(id) { await declineFriendRequest(id); loadAll(); }
  async function handleRemove(id) { await removeFriend(id); loadAll(); }

  const [requestsOpen, setRequestsOpen] = useState(false);

  // Auto-open if there are incoming requests
  useEffect(() => {
    if (incoming.length > 0) setRequestsOpen(true);
  }, [incoming.length]);

  if (!user) return <div style={{ color: '#888', fontSize: 14 }}>Sign in to manage friends.</div>;

  const activeSearch = query.length >= 2;
  const totalRequests = incoming.length + outgoing.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Search */}
      <div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: 14, fontWeight: 600 }}>@</span>
          <input
            className="text-input"
            placeholder="Search by username"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: 28, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {activeSearch && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {searching && <div style={{ fontSize: 13, color: '#888' }}>Searching...</div>}
            {!searching && searchResults.length === 0 && (
              <div style={{ fontSize: 13, color: '#888' }}>No users found for "@{query}"</div>
            )}
            {searchResults.map(result => {
              const status = relationshipStatus(result.id);
              return (
                <PersonRow
                  key={result.id}
                  name={result.name || result.username}
                  username={result.username}
                  avatarUrl={result.avatar_url}
                  actions={
                    status === 'none' ? (
                      <button className="join" style={{ borderRadius: 8, padding: '6px 14px', fontSize: 13 }} onClick={() => handleSend(result.id)}>Add</button>
                    ) : status === 'sent' ? (
                      <span className="category-pill" style={{ background: 'rgba(255,255,255,0.06)', color: '#888', fontSize: 12 }}>Requested</span>
                    ) : status === 'received' ? (
                      <span className="category-pill" style={{ background: 'var(--light-teal)', color: 'var(--teal)', fontSize: 12, fontWeight: 700 }}>Wants to add you</span>
                    ) : (
                      <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 12, fontWeight: 700 }}>Friends</span>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Friends list */}
      <div>
        <SectionLabel count={loading ? null : friends.length}>
          {loading ? 'Loading...' : 'Friends'}
        </SectionLabel>
        {!loading && friends.length === 0 && (
          <div style={{ fontSize: 13, color: '#888' }}>No friends yet — search by username above.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {friends.map(f => (
            <SwipeableFriendRow
              key={f.id}
              f={f}
              onViewFriend={onViewFriend}
              onOpenDm={onOpenDm}
              onRemove={() => handleRemove(f.id)}
            />
          ))}
        </div>
      </div>

      {/* Requests dropdown */}
      {totalRequests > 0 && (
        <div>
          <button
            onClick={() => setRequestsOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', marginBottom: requestsOpen ? 8 : 0 }}
          >
            <span style={{ fontWeight: 700, fontSize: 15, color: '#EEEEFF' }}>Requests</span>
            {incoming.length > 0 && (
              <span className="category-pill" style={{ background: 'var(--light-pink)', color: 'var(--pink)', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
                {incoming.length} new
              </span>
            )}
            {outgoing.length > 0 && incoming.length === 0 && (
              <span className="category-pill" style={{ background: 'rgba(255,255,255,0.06)', color: '#888', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
                {outgoing.length} sent
              </span>
            )}
            <svg
              viewBox="0 0 24 24" width="16" height="16" fill="none"
              stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ marginLeft: 'auto', transition: 'transform 200ms ease', transform: requestsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {requestsOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {incoming.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 6, textAlign: 'left' }}>Incoming</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {incoming.map(req => (
                      <PersonRow
                        key={req.id}
                        name={req.requester?.name || req.requester?.username}
                        username={req.requester?.username}
                        avatarUrl={req.requester?.avatar_url}
                        actions={<>
                          <button className="join" style={{ borderRadius: 8, padding: '6px 12px', fontSize: 13 }} onClick={() => handleAccept(req.id)}>Accept</button>
                          <button
                            style={{ borderRadius: 8, padding: '6px 12px', fontSize: 13, background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', color: '#E74C3C', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => handleDecline(req.id)}
                          >Decline</button>
                        </>}
                      />
                    ))}
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 6, textAlign: 'left' }}>Sent</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {outgoing.map(req => (
                      <PersonRow
                        key={req.id}
                        name={req.addressee?.name || req.addressee?.username}
                        username={req.addressee?.username}
                        avatarUrl={req.addressee?.avatar_url}
                        actions={
                          <button
                            style={{ borderRadius: 8, padding: '5px 12px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#888', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => handleDecline(req.id)}
                          >Cancel</button>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}


    </div>
  );
}
