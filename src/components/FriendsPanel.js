import React, { useState, useEffect, useCallback } from 'react';
import {
  searchUsersByUsername, sendFriendRequest, getFriendships,
  getIncomingFriendRequests, getOutgoingFriendRequests,
  acceptFriendRequest, declineFriendRequest, removeFriend,
} from '../lib/supabaseClient';
import './HomeFeed.css';

const AVATAR_COLORS = ['#534AB7', '#D4537E', '#1D9E75', '#EF9F27', '#667EEA', '#9B59B6'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="avatar" style={{ backgroundColor: avatarColor(name), color: '#fff', marginLeft: 0, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function FriendsPanel({ user }) {
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

  // Debounced search
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

  async function handleSend(addresseeId) {
    await sendFriendRequest(addresseeId);
    loadAll();
  }

  async function handleAccept(id) {
    await acceptFriendRequest(id);
    loadAll();
  }

  async function handleDecline(id) {
    await declineFriendRequest(id);
    loadAll();
  }

  async function handleRemove(id) {
    await removeFriend(id);
    loadAll();
  }

  if (!user) return <div style={{ color: '#888', fontSize: 14 }}>Sign in to manage friends.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Search */}
      <div>
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 14 }}>@</span>
          <input
            className="text-input"
            placeholder="Search by username"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: 26, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {searching && <div style={{ fontSize: 12, color: '#999', paddingLeft: 4 }}>Searching...</div>}

        {!searching && query.length >= 2 && searchResults.length === 0 && (
          <div style={{ fontSize: 13, color: '#888', paddingLeft: 4 }}>No users found for "@{query}"</div>
        )}

        {searchResults.map(result => {
          const status = relationshipStatus(result.id);
          return (
            <div key={result.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F0F0F0' }}>
              <Avatar name={result.name || result.username} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{result.name || result.username}</div>
                <div style={{ fontSize: 12, color: '#888' }}>@{result.username}</div>
              </div>
              {status === 'none' && (
                <button className="join" style={{ borderRadius: 8, padding: '6px 14px', fontSize: 13 }} onClick={() => handleSend(result.id)}>Add</button>
              )}
              {status === 'sent' && (
                <span style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>Requested</span>
              )}
              {status === 'received' && (
                <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700 }}>Wants to add you</span>
              )}
              {status === 'friends' && (
                <span style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 700 }}>Friends</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Requests <span style={{ background: 'var(--pink)', color: '#fff', borderRadius: 999, padding: '2px 7px', fontSize: 11 }}>{incoming.length}</span>
          </div>
          {incoming.map(req => (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F0F0F0' }}>
              <Avatar name={req.requester?.name || req.requester?.username} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{req.requester?.name || req.requester?.username}</div>
                <div style={{ fontSize: 12, color: '#888' }}>@{req.requester?.username}</div>
              </div>
              <button className="join" style={{ borderRadius: 8, padding: '6px 12px', fontSize: 13 }} onClick={() => handleAccept(req.id)}>Accept</button>
              <button className="nav-btn" style={{ borderRadius: 8, padding: '6px 12px', fontSize: 13 }} onClick={() => handleDecline(req.id)}>Decline</button>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {loading ? 'Loading...' : `Friends · ${friends.length}`}
        </div>
        {!loading && friends.length === 0 && (
          <div style={{ fontSize: 13, color: '#aaa' }}>No friends yet — search by username above.</div>
        )}
        {friends.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F0F0F0' }}>
            <Avatar name={f.other?.name || f.other?.username} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{f.other?.name || f.other?.username}</div>
              <div style={{ fontSize: 12, color: '#888' }}>@{f.other?.username}</div>
            </div>
            <button className="nav-btn" style={{ borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#999' }} onClick={() => handleRemove(f.id)}>Remove</button>
          </div>
        ))}
      </div>

      {/* Outgoing requests */}
      {outgoing.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sent</div>
          {outgoing.map(req => (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F0F0F0' }}>
              <Avatar name={req.addressee?.name || req.addressee?.username} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{req.addressee?.name || req.addressee?.username}</div>
                <div style={{ fontSize: 12, color: '#888' }}>@{req.addressee?.username}</div>
              </div>
              <button className="nav-btn" style={{ borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#999' }} onClick={() => handleDecline(req.id)}>Cancel</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
