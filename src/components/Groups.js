import React, { useState, useEffect } from 'react';
import { isSupabaseConfigured, getGroupInvites, acceptGroupInvite, declineGroupInvite } from '../lib/supabaseClient';
import { avatarColor } from '../lib/avatarColor';
import { getInitials } from '../lib/utils';
import { TYPE_COLORS, TYPE_LABELS } from '../lib/groupTypes';
import './HomeFeed.css';

export default function Groups({
  onNavigate = () => {},
  onOpenGroup = () => {},
  onOpenDm = () => {},
  onCreateGroup = () => {},
  onGroupJoined = () => {},
  onViewGroup = () => {},
  onLeaveGroup = () => {},
  groups = [],
  dms = [],
  user,
  profile = {},
}) {
  const myName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';
  const [invites, setInvites] = useState([]);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    getGroupInvites(user.id).then(setInvites);
  }, [user]);

  const myGroups = groups.filter(g =>
    g.members && (
      g.members.some(m => m.user_id && user ? m.user_id === user.id : m.name === myName)
    )
  );
  const recommended = groups.filter(g =>
    g.privacy === 'public' && !g.members?.some(m => m.user_id && user ? m.user_id === user.id : m.name === myName)
  );

  async function handleAccept(invite) {
    if (!user) return;
    const displayName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || 'You';
    const initials = getInitials(displayName);
    const memberEntry = {
      name: displayName,
      initials,
      color: avatarColor(displayName),
      role: 'member',
      user_id: user.id,
      avatar_url: profile?.avatar_url || '',
    };
    setAcceptError('');
    try {
      const group = await acceptGroupInvite(invite.id, memberEntry);
      if (group) {
        setInvites(s => s.filter(i => i.id !== invite.id));
        onGroupJoined(group);
      }
    } catch (e) {
      setAcceptError(e.message || 'Failed to accept invite.');
    }
  }

  async function handleDecline(invite) {
    const ok = await declineGroupInvite(invite.id);
    if (ok) setInvites(s => s.filter(i => i.id !== invite.id));
  }

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Groups</h1>
        <p className="tagline">Clubs, crews, and rallies</p>
      </header>
      <div className="scroll-area">

      {/* Create CTA */}
      <section style={{ marginTop: 8, marginBottom: 8 }}>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Create a group</div>
            <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Club, friend group, or event rally.</div>
          </div>
          <button className="join" style={{ borderRadius: 10, padding: '8px 16px', flexShrink: 0 }} onClick={() => onCreateGroup({})}>
            + New
          </button>
        </div>
      </section>

      {/* Your groups */}
      <section style={{ marginTop: 8 }}>
        <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Your groups</h3>
        {myGroups.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {myGroups.map(g => (
              <GroupRow key={g.id} group={g} user={user} compact onOpen={() => onOpenGroup(g.id)} onLeave={() => onLeaveGroup(g.id)} />
            ))}
          </div>
        ) : (
          <div className="card" style={{ color: '#888', fontSize: 14, textAlign: 'left' }}>
            No groups yet. Create one or join a public group below.
          </div>
        )}
      </section>

      {/* DMs */}
      <section style={{ marginTop: 14 }}>
        <h3 style={{ margin: '0 0 8px', textAlign: 'left' }}>DMs</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dms.length > 0 ? dms.map(dm => {
            const other = dm.participants?.find(p => p.user_id !== user?.id) || {};
            const initials = getInitials(other.name);
            const col = avatarColor(other.name || '');
            return (
              <div
                key={dm.id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 14px' }}
                onClick={() => onOpenDm(dm.id)}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{other.name || 'Unknown'}</div>
                  {dm.lastMessage && (
                    <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {dm.lastMessage}
                    </div>
                  )}
                </div>
                {dm.lastAt && (
                  <div style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>
                    {new Date(dm.lastAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="card" style={{ color: '#888', fontSize: 14, textAlign: 'left' }}>
              No DMs yet. Message a friend from their profile.
            </div>
          )}
        </div>
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section style={{ marginTop: 8 }}>
          <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Invites</h3>
          {acceptError && (
            <div style={{ fontSize: 12, color: '#E74C3C', background: 'rgba(231,76,60,0.08)', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
              ⚠ {acceptError}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invites.map(inv => {
              const g = inv.group;
              if (!g) return null;
              const { color, bg } = TYPE_COLORS[g.type] || TYPE_COLORS.club;
              return (
                <div key={inv.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    {g.logoUrl
                      ? <img src={g.logoUrl} alt={g.name} style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0, marginTop: 2 }} />
                      : <div style={{ width: 42, height: 42, borderRadius: 10, background: g.logoColor || avatarColor(g.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0, marginTop: 2 }}>{getInitials(g.name)}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{g.name}</div>
                      {g.description && <div style={{ color: '#666', fontSize: 13, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description}</div>}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="category-pill" style={{ background: bg, color, fontSize: 11 }}>{TYPE_LABELS[g.type] || g.type}</span>
                        <span style={{ color: '#888', fontSize: 12 }}>{(g.members || []).length} members</span>
                      </div>
                    </div>
                  </div>
                  {inv.inviter && (
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
                      Invited by <strong>{inv.inviter.name || inv.inviter.username}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="join"
                      style={{ flex: 1, borderRadius: 8, padding: '7px 0', fontSize: 13 }}
                      onClick={() => handleAccept(inv)}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onViewGroup(g)}
                      style={{ flex: 1, borderRadius: 8, padding: '7px 0', fontSize: 13, background: 'none', border: '1px solid var(--purple)', color: 'var(--purple)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDecline(inv)}
                      style={{ flex: 1, borderRadius: 8, padding: '7px 0', fontSize: 13, background: 'none', border: '1px solid #E74C3C', color: '#E74C3C', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommended / Discover */}
      {recommended.length > 0 && (
        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: '6px 0', textAlign: 'left' }}>Discover</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommended.map(g => (
              <GroupRow key={g.id} group={g} onOpen={() => onOpenGroup(g.id)} />
            ))}
          </div>
        </section>
      )}
      </div>
    </main>
  );
}

function GroupRow({ group, user, onOpen, onLeave, compact = false }) {
  const { type = 'club', privacy = 'public', members = [], name, description, eventTitle } = group;
  const { color, bg } = TYPE_COLORS[type] || TYPE_COLORS.club;
  const [showConfirm, setShowConfirm] = useState(false);

  const isAdmin = user && (
    group.createdBy === user.id ||
    members.some(m => m.user_id === user.id && m.role === 'admin')
  );
  const isMember = user && members.some(m => m.user_id === user.id);
  const goldStyle = isAdmin ? { border: '1px solid rgba(255,185,0,0.5)', boxShadow: '0 0 10px rgba(255,185,0,0.15), inset 0 0 10px rgba(255,185,0,0.03)' } : {};

  if (compact) {
    return (
      <>
        <div
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 14px', ...goldStyle }}
          onClick={onOpen}
        >
          {group.logoUrl
            ? <img src={group.logoUrl} alt={name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 40, height: 40, borderRadius: 10, background: group.logoColor || avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{getInitials(name)}</div>
          }
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{members.length} {members.length === 1 ? 'member' : 'members'}</div>
          </div>
        </div>
        {showConfirm && <LeaveConfirmDialog name={name} onCancel={() => setShowConfirm(false)} onConfirm={() => { setShowConfirm(false); onLeave(); }} />}
      </>
    );
  }

  return (
    <>
      <div
        className="card"
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', ...goldStyle }}
        onClick={onOpen}
      >
        {group.logoUrl
          ? <img src={group.logoUrl} alt={name} style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 42, height: 42, borderRadius: 10, background: group.logoColor || avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{getInitials(name)}</div>
        }
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{name}</div>
          {description && <div style={{ color: '#666', fontSize: 13, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</div>}
          {eventTitle && <div style={{ color: 'var(--teal)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>🎯 {eventTitle}</div>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="category-pill" style={{ background: bg, color, fontSize: 11 }}>{TYPE_LABELS[type]}</span>
            <span style={{ color: '#888', fontSize: 12 }}>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
            {privacy !== 'public' && <span className="category-pill" style={{ background: '#F5F5F5', color: '#777', fontSize: 11 }}>{privacy === 'private' ? 'Private' : 'Friends Only'}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isMember && !isAdmin && (
            <button
              onClick={e => { e.stopPropagation(); setShowConfirm(true); }}
              style={{ background: 'none', border: '1px solid #E74C3C', color: '#E74C3C', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Leave
            </button>
          )}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      {showConfirm && <LeaveConfirmDialog name={name} onCancel={() => setShowConfirm(false)} onConfirm={() => { setShowConfirm(false); onLeave(); }} />}
    </>
  );
}

function LeaveConfirmDialog({ name, onCancel, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 320, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 18 }}>Leave "{name}"?</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#555', lineHeight: 1.5 }}>You'll be removed from this group and will need an invite to rejoin.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #ddd', background: '#fff', color: '#444', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#E74C3C', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
