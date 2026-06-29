import React, { useState, useEffect, useCallback } from 'react';
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

export default function FriendsPanel({ user, onViewFriend = () => {} }) {
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
            <PersonRow
              key={f.id}
              name={f.other?.name || f.other?.username}
              username={f.other?.username}
              avatarUrl={f.other?.avatar_url}
              onClick={() => f.other?.id && onViewFriend(f.other.id)}
              actions={
                <button
                  style={{ borderRadius: 8, padding: '5px 12px', fontSize: 12, background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)', color: '#E74C3C', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => handleRemove(f.id)}
                >Remove</button>
              }
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
