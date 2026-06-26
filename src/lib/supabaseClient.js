import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function isSupabaseConfigured() {
  return true;
}

export async function getEvents() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from('events').select('*').eq('user_id', user.id).order('date_iso', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('getEvents error', e.message || e);
    return [];
  }
}

export async function getPublicEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('personal', false)
      .order('date_iso', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('getPublicEvents error', e.message || e);
    return [];
  }
}

export async function getEventsByUserId(userId) {
  try {
    const { data, error } = await supabase.from('events').select('*').eq('user_id', userId).order('date_iso', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('getEventsByUserId error', e.message || e);
    return [];
  }
}

export async function insertEvent(event) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...event, user_id: user?.id };
    const { data, error } = await supabase.from('events').insert(payload).select();
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    console.warn('insertEvent error', e.message || e);
    return null;
  }
}

export async function updateEvent({ id, ...rest }) {
  try {
    const { data, error } = await supabase.from('events').update(rest).eq('id', id).select();
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    console.warn('updateEvent error', e.message || e);
    return null;
  }
}

export async function deleteEvent(id) {
  try {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('deleteEvent error', e.message || e);
    return false;
  }
}

export function mapGroupRow(r) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type || 'club',
    privacy: r.privacy || 'public',
    members: r.members || [],
    icebreaker: r.icebreaker,
    eventTitle: r.event_title,
    events: r.events || [],
    createdBy: r.created_by,
  };
}

export async function getGroups() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const [{ data: created, error: e1 }, { data: member, error: e2 }] = await Promise.all([
      supabase.from('groups').select('*').eq('created_by', user.id),
      supabase.from('groups').select('*').contains('members', [{ user_id: user.id }]),
    ]);
    if (e1) throw e1;
    const all = [...(created || []), ...(e2 ? [] : (member || []))];
    const seen = new Set();
    return all
      .filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(mapGroupRow);
  } catch (e) {
    console.warn('getGroups error', e.message || e);
    return [];
  }
}

export async function insertGroup(group) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const payload = {
      name: group.name,
      description: group.description || null,
      type: group.type || 'club',
      privacy: group.privacy || 'public',
      members: group.members || [],
      icebreaker: group.icebreaker || null,
      event_title: group.eventTitle || null,
      events: group.events || [],
      created_by: user.id,
    };
    const { data, error } = await supabase.from('groups').insert(payload).select();
    if (error) throw error;
    return data?.[0] ? mapGroupRow(data[0]) : null;
  } catch (e) {
    console.warn('insertGroup error', e.message || e);
    return null;
  }
}

export async function updateGroup(id, payload) {
  try {
    const { data, error } = await supabase.from('groups').update(payload).eq('id', id).select();
    if (error) throw error;
    return data?.[0] ? mapGroupRow(data[0]) : null;
  } catch (e) {
    console.warn('updateGroup error', e.message || e);
    return null;
  }
}

export async function leaveGroup(groupId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: group, error: fetchError } = await supabase
      .from('groups').select('members').eq('id', groupId).single();
    if (fetchError) throw fetchError;
    const updatedMembers = (group.members || []).filter(m => m.user_id !== user.id);
    const { error } = await supabase
      .from('groups').update({ members: updatedMembers }).eq('id', groupId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('leaveGroup error', e.message || e);
    return false;
  }
}

export async function deleteGroup(id) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('members, created_by')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const isAdmin = group.created_by === user.id ||
      (group.members || []).some(m => m.user_id === user.id && m.role === 'admin');
    if (!isAdmin) throw new Error('Only group admins can delete a group');

    // Delete pending invites first (in case FK cascade isn't set)
    await supabase.from('group_invites').delete().eq('group_id', id);

    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('deleteGroup error', e.message || e);
    return false;
  }
}

export async function sendGroupInvite(groupId, inviteeId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase.from('group_invites').insert({
    group_id: groupId,
    inviter_id: user.id,
    invitee_id: inviteeId,
    status: 'pending',
  }).select();
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getGroupInvites(userId) {
  try {
    const { data, error } = await supabase
      .from('group_invites')
      .select('*')
      .eq('invitee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const groupIds = [...new Set(data.map(i => i.group_id))];
    const { data: groupRows } = await supabase
      .from('groups')
      .select('id, name, type, description, members, privacy, icebreaker, event_title, events, created_by')
      .in('id', groupIds);
    const groupMap = Object.fromEntries((groupRows || []).map(g => [g.id, mapGroupRow(g)]));

    const inviterIds = [...new Set(data.map(i => i.inviter_id))];
    const { data: inviterProfiles } = await supabase
      .from('profiles').select('id, name, username').in('id', inviterIds);
    const profileMap = Object.fromEntries((inviterProfiles || []).map(p => [p.id, p]));

    return data.map(inv => ({
      ...inv,
      group: groupMap[inv.group_id] || null,
      inviter: profileMap[inv.inviter_id] || null,
    }));
  } catch (e) {
    console.warn('getGroupInvites error', e.message || e);
    return [];
  }
}

export async function acceptGroupInvite(inviteId, memberEntry) {
  const { data, error } = await supabase.rpc('accept_group_invite', {
    p_invite_id: inviteId,
    p_member_entry: memberEntry,
  });
  if (error) throw error;
  return data ? mapGroupRow(data) : null;
}

export async function declineGroupInvite(inviteId) {
  try {
    const { error } = await supabase.from('group_invites').delete().eq('id', inviteId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('declineGroupInvite error', e.message || e);
    return false;
  }
}

export async function getOutgoingGroupInvites(groupId) {
  try {
    const { data, error } = await supabase
      .from('group_invites')
      .select('invitee_id')
      .eq('group_id', groupId)
      .eq('status', 'pending');
    if (error) throw error;
    return (data || []).map(r => r.invitee_id);
  } catch (e) {
    console.warn('getOutgoingGroupInvites error', e.message || e);
    return [];
  }
}

export async function checkUsernameAvailable(username, currentUserId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();
    if (error && error.code === 'PGRST116') return true; // no rows = available
    if (error) throw error;
    return data?.id === currentUserId; // available if it's their own username
  } catch (e) {
    console.warn('checkUsernameAvailable error', e.message || e);
    return true;
  }
}

export async function getProfile(userId) {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (e) {
    console.warn('getProfile error', e.message || e);
    return null;
  }
}

export async function upsertProfile(userId, { name, bio, username, friends, school, school_verified, avatar_url, pronouns }) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, name, bio, username, friends: friends || [], school: school || '', school_verified: !!school_verified, avatar_url: avatar_url || '', pronouns: pronouns || '', updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('upsertProfile error', e.message || e);
    return null;
  }
}

export async function getFriendNotifications(userId) {
  try {
    const [{ count: incoming }, { count: acceptedTotal }] = await Promise.all([
      supabase.from('friendships').select('id', { count: 'exact', head: true })
        .eq('addressee_id', userId).eq('status', 'pending'),
      supabase.from('friendships').select('id', { count: 'exact', head: true })
        .eq('requester_id', userId).eq('status', 'accepted'),
    ]);
    return { incoming: incoming || 0, acceptedTotal: acceptedTotal || 0 };
  } catch (e) {
    return { incoming: 0, acceptedTotal: 0 };
  }
}

export async function searchUsersByUsername(query, currentUserId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, name, avatar_url')
      .ilike('username', `${query}%`)
      .neq('id', currentUserId)
      .limit(8);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('searchUsersByUsername error', e.message || e);
    return [];
  }
}

export async function sendFriendRequest(addresseeId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: 'pending',
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('sendFriendRequest error', e.message || e);
    return false;
  }
}

export async function getFriendships(userId) {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, requester:profiles!requester_id(id, username, name, avatar_url), addressee:profiles!addressee_id(id, username, name, avatar_url)')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');
    if (error) throw error;
    return (data || []).map(f => ({
      id: f.id,
      other: f.requester_id === userId ? f.addressee : f.requester,
    }));
  } catch (e) {
    console.warn('getFriendships error', e.message || e);
    return [];
  }
}

export async function getIncomingFriendRequests(userId) {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('id, requester_id, requester:profiles!requester_id(id, username, name, avatar_url)')
      .eq('addressee_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('getIncomingFriendRequests error', e.message || e);
    return [];
  }
}

export async function getOutgoingFriendRequests(userId) {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('id, addressee_id, addressee:profiles!addressee_id(id, username, name, avatar_url)')
      .eq('requester_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('getOutgoingFriendRequests error', e.message || e);
    return [];
  }
}

export async function acceptFriendRequest(friendshipId) {
  try {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('acceptFriendRequest error', e.message || e);
    return false;
  }
}

export async function declineFriendRequest(friendshipId) {
  try {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('declineFriendRequest error', e.message || e);
    return false;
  }
}

export async function removeFriend(friendshipId) {
  try {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('removeFriend error', e.message || e);
    return false;
  }
}

export async function signInWithOtp(email) {
  try {
    return await supabase.auth.signInWithOtp({ email });
  } catch (e) {
    console.warn('signInWithOtp error', e.message || e);
    return { error: e };
  }
}

export async function signOut() {
  try {
    return await supabase.auth.signOut();
  } catch (e) {
    console.warn('signOut error', e.message || e);
    return { error: e };
  }
}

export async function getUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
  } catch (e) {
    console.warn('getUser error', e.message || e);
    return null;
  }
}

export function onAuthStateChange(cb) {
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    try { cb(event, session); } catch (e) { console.warn(e); }
  });
  return () => { try { sub.subscription.unsubscribe(); } catch(e){} };
}

function mapMessageRow(r) {
  return {
    id: r.id,
    groupId: r.group_id,
    userId: r.user_id,
    sender: r.sender_name,
    text: r.text,
    createdAt: r.created_at,
    time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export async function getGroupMessages(groupId) {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', String(groupId))
      .order('created_at', { ascending: true });
    if (error) { console.error('getGroupMessages error', error); return []; }
    return (data || []).map(mapMessageRow);
  } catch (e) {
    console.error('getGroupMessages exception', e.message || e);
    return [];
  }
}

export async function sendGroupMessage(groupId, text, senderName) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('group_messages')
      .insert({ group_id: String(groupId), user_id: user.id, sender_name: senderName, text })
      .select()
      .single();
    if (error) { console.error('sendGroupMessage error', error); return null; }
    return mapMessageRow(data);
  } catch (e) {
    console.error('sendGroupMessage exception', e.message || e);
    return null;
  }
}

export function subscribeToGroupMessages(groupId, onMessage) {
  const channel = supabase
    .channel(`group-messages-${groupId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'group_messages',
      filter: `group_id=eq.${groupId}`,
    }, (payload) => onMessage(mapMessageRow(payload.new)))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function signInWithProvider(provider) {
  try {
    return await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
  } catch (e) {
    console.warn('signInWithProvider error', e.message || e);
    return { error: e };
  }
}
