import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function isSupabaseConfigured() {
  return true;
}

const ATTENDEES_SELECT = 'event_attendees(id, user_id, name, initials, avatar_url)';
const MEMBERS_SELECT = 'group_members(id, user_id, role, profiles(id, name, username, avatar_url))';

function nameToInitials(name) {
  return (name || '').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function mapAttendees(rows) {
  return (rows || []).map(a => ({
    user_id: a.user_id,
    name: a.name || '',
    initials: a.initials || '',
    avatar_url: a.avatar_url || '',
    color: '#FFFFFF',
  }));
}

export async function getEvents() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('events')
      .select(`*, ${ATTENDEES_SELECT}`)
      .eq('user_id', user.id)
      .order('date_iso', { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data || []).map(r => ({ ...r, attendees: mapAttendees(r.event_attendees) }));
  } catch (e) {
    console.warn('getEvents error', e.message || e);
    return [];
  }
}

export async function getPublicEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`*, ${ATTENDEES_SELECT}`)
      .eq('personal', false)
      .eq('visibility', 'public')
      .order('date_iso', { ascending: true })
      .limit(100);
    if (error) throw error;
    return (data || []).map(r => ({ ...r, attendees: mapAttendees(r.event_attendees) }));
  } catch (e) {
    console.warn('getPublicEvents error', e.message || e);
    return [];
  }
}

export async function getEventsByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`*, ${ATTENDEES_SELECT}`)
      .eq('user_id', userId)
      .order('date_iso', { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data || []).map(r => ({ ...r, attendees: mapAttendees(r.event_attendees) }));
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

export async function joinEvent(eventId, { userId, name, initials, avatarUrl }) {
  try {
    const { error } = await supabase.from('event_attendees').upsert(
      { event_id: eventId, user_id: userId, name, initials, avatar_url: avatarUrl },
      { onConflict: 'event_id,user_id' }
    );
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('joinEvent error', e.message || e);
    return false;
  }
}

export async function leaveEvent(eventId, userId) {
  try {
    const { error } = await supabase.from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('leaveEvent error', e.message || e);
    return false;
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
    members: (r.group_members || []).map(m => ({
      user_id: m.user_id,
      role: m.role || 'member',
      name: m.profiles?.name || '',
      initials: nameToInitials(m.profiles?.name),
      avatar_url: m.profiles?.avatar_url || '',
      color: '#FFFFFF',
    })),
    icebreaker: r.icebreaker,
    eventTitle: r.event_title,
    events: r.events || [],
    createdBy: r.created_by,
    logoColor: r.logo_color || null,
    logoUrl: r.logo_url || null,
  };
}

export async function getGroups() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: membership } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);
    if (!membership?.length) return [];
    const groupIds = membership.map(m => m.group_id);
    const { data, error } = await supabase
      .from('groups')
      .select(`*, ${MEMBERS_SELECT}`)
      .in('id', groupIds)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []).map(mapGroupRow);
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
      icebreaker: group.icebreaker || null,
      event_title: group.eventTitle || null,
      events: group.events || [],
      created_by: user.id,
    };
    const { data, error } = await supabase.from('groups').insert(payload).select('id');
    if (error) throw error;
    const newGroupId = data?.[0]?.id;
    if (!newGroupId) return null;
    await supabase.from('group_members').insert({ group_id: newGroupId, user_id: user.id, role: 'admin' });
    const { data: fresh } = await supabase
      .from('groups')
      .select(`*, ${MEMBERS_SELECT}`)
      .eq('id', newGroupId)
      .single();
    return fresh ? mapGroupRow(fresh) : null;
  } catch (e) {
    console.warn('insertGroup error', e.message || e);
    return null;
  }
}

export async function uploadAvatarImage(userId, file) {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path, { transform: { width: 200, height: 200, resize: 'cover' } });
    return publicUrl;
  } catch (e) {
    console.warn('uploadAvatarImage error', e.message || e);
    return null;
  }
}

export async function uploadEventCover(eventId, file) {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${eventId}/cover.${ext}`;
    const { error } = await supabase.storage
      .from('event-covers')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('event-covers')
      .getPublicUrl(path, { transform: { width: 800, height: 480, resize: 'cover' } });
    return publicUrl;
  } catch (e) {
    console.warn('uploadEventCover error', e.message || e);
    return null;
  }
}

export async function uploadGroupLogo(groupId, file) {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${groupId}/logo.${ext}`;
    const { error } = await supabase.storage
      .from('group-logos')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('group-logos')
      .getPublicUrl(path, { transform: { width: 200, height: 200, resize: 'cover' } });
    return publicUrl;
  } catch (e) {
    console.warn('uploadGroupLogo error', e.message || e);
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
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('leaveGroup error', e.message || e);
    return false;
  }
}

export async function removeGroupMember(groupId, userId) {
  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('removeGroupMember error', e.message || e);
    return false;
  }
}

export async function deleteGroup(id) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    if (group.created_by !== user.id) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', id)
        .eq('user_id', user.id)
        .single();
      if (membership?.role !== 'admin') throw new Error('Only group admins can delete a group');
    }

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
      .select(`id, name, type, description, privacy, icebreaker, event_title, events, created_by, ${MEMBERS_SELECT}`)
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

export async function acceptGroupInvite(inviteId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: invite, error: invErr } = await supabase
    .from('group_invites')
    .select('group_id, invitee_id')
    .eq('id', inviteId)
    .single();
  if (invErr) throw invErr;
  if (invite.invitee_id !== user.id) throw new Error('Not your invite');
  const { error: joinErr } = await supabase
    .from('group_members')
    .upsert({ group_id: invite.group_id, user_id: user.id, role: 'member' }, { onConflict: 'group_id,user_id' });
  if (joinErr) throw joinErr;
  await supabase.from('group_invites').delete().eq('id', inviteId);
  const { data: groupData } = await supabase
    .from('groups')
    .select(`*, ${MEMBERS_SELECT}`)
    .eq('id', invite.group_id)
    .single();
  return groupData ? mapGroupRow(groupData) : null;
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

export async function upsertProfile(userId, { name, bio, username, friends, school, school_verified, avatar_url, pronouns, grad_year, email }) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, name, bio, username, friends: friends || [], school: school || '', school_verified: !!school_verified, avatar_url: avatar_url || '', pronouns: pronouns || '', ...(grad_year != null ? { grad_year } : {}), ...(email ? { email } : {}), updated_at: new Date().toISOString() })
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
    const { error } = await supabase.from('friendships').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', friendshipId);
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
      .order('created_at', { ascending: true })
      .limit(100);
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

export async function getEventAttendees(eventId) {
  try {
    const { data } = await supabase
      .from('event_attendees')
      .select('id, user_id, name, initials, avatar_url')
      .eq('event_id', eventId);
    return mapAttendees(data || []);
  } catch(e) {
    return [];
  }
}

export function subscribeToEventAttendees(eventId, onChange) {
  const channel = supabase
    .channel(`event-attendees-${eventId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'event_attendees',
      filter: `event_id=eq.${eventId}`,
    }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
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

function mapEventMessageRow(r) {
  return {
    id: r.id,
    sender: r.sender_name,
    text: r.text,
    userId: r.user_id,
    createdAt: r.created_at,
    time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export async function getEventMessages(eventId) {
  try {
    const { data, error } = await supabase
      .from('event_messages')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) { console.error('getEventMessages error', error); return []; }
    return (data || []).map(mapEventMessageRow);
  } catch (e) {
    console.error('getEventMessages exception', e.message || e);
    return [];
  }
}

export async function sendEventMessage(eventId, text, senderName) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('event_messages')
      .insert({ event_id: eventId, user_id: user.id, sender_name: senderName, text })
      .select()
      .single();
    if (error) { console.error('sendEventMessage error', error); return null; }
    return mapEventMessageRow(data);
  } catch (e) {
    console.error('sendEventMessage exception', e.message || e);
    return null;
  }
}

export function subscribeToEventMessages(eventId, onMessage) {
  const channel = supabase
    .channel(`event-messages-${eventId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'event_messages',
      filter: `event_id=eq.${eventId}`,
    }, (payload) => onMessage(mapEventMessageRow(payload.new)))
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

export async function createOrGetDm(otherUserId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const ids = [user.id, otherUserId].sort();
    const { data: existing } = await supabase
      .from('dm_channels')
      .select('id')
      .contains('member_ids', ids)
      .single();
    if (existing) return existing;
    const { data: created, error } = await supabase
      .from('dm_channels')
      .insert({ member_ids: ids })
      .select('id')
      .single();
    if (error) { console.error('createOrGetDm error', error); return null; }
    return created;
  } catch (e) {
    console.error('createOrGetDm exception', e.message || e);
    return null;
  }
}

export async function getSpontaneousPosts() {
  try {
    const { data, error } = await supabase
      .from('spontaneous_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data.map(r => ({
      id: r.id,
      userId: r.user_id,
      senderName: r.sender_name,
      avatarUrl: r.avatar_url,
      text: r.text,
      location: r.location,
      createdAt: r.created_at,
    }));
  } catch { return []; }
}

export function subscribeToSpontaneousPosts(onInsert, onDelete) {
  const channel = supabase
    .channel('spontaneous-posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spontaneous_posts' }, payload => {
      const r = payload.new;
      onInsert({ id: r.id, userId: r.user_id, senderName: r.sender_name, avatarUrl: r.avatar_url, text: r.text, location: r.location, createdAt: r.created_at });
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'spontaneous_posts' }, payload => {
      onDelete(payload.old.id);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function deleteSpontaneousPost(id) {
  try {
    await supabase.from('spontaneous_posts').delete().eq('id', id);
  } catch (e) {
    console.error('deleteSpontaneousPost error', e.message || e);
  }
}

export async function sendEduVerification(email, school) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${supabase.supabaseUrl}/functions/v1/send-edu-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ edu_email: email, school }),
    });
    const body = await res.json();
    if (!res.ok) return { success: false, error: body.error || 'Failed to send code' };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'Failed to send code' };
  }
}

export async function verifyEduCode(email, code) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not signed in' };
    const { data, error } = await supabase
      .from('edu_verifications')
      .select('code, expires_at')
      .eq('user_id', user.id)
      .eq('edu_email', email)
      .single();
    if (error || !data) return { success: false, error: 'No verification found. Request a new code.' };
    if (new Date(data.expires_at) < new Date()) return { success: false, error: 'Code expired. Request a new one.' };
    if (data.code !== code) return { success: false, error: 'Incorrect code. Try again.' };
    await supabase.from('edu_verifications').delete().eq('user_id', user.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'Invalid code' };
  }
}

const _profileCache = new Map();

export async function getProfilesByIds(ids) {
  if (!ids || ids.length === 0) return {};
  const uncached = ids.filter(id => !_profileCache.has(id));
  if (uncached.length > 0) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, avatar_url, name, username')
        .in('id', uncached);
      if (data) data.forEach(p => _profileCache.set(p.id, { avatar_url: p.avatar_url, name: p.name, username: p.username }));
    } catch {}
  }
  return Object.fromEntries(ids.filter(id => _profileCache.has(id)).map(id => [id, _profileCache.get(id)]));
}

export async function createSpontaneousPost({ text, location, senderName, avatarUrl, userId }) {
  try {
    const { data, error } = await supabase
      .from('spontaneous_posts')
      .insert({ text, location, sender_name: senderName, avatar_url: avatarUrl, user_id: userId })
      .select()
      .single();
    if (error) { console.error('createSpontaneousPost error', error); return null; }
    return { id: data.id, userId: data.user_id, senderName: data.sender_name, avatarUrl: data.avatar_url, text: data.text, location: data.location, createdAt: data.created_at };
  } catch (e) {
    console.error('createSpontaneousPost exception', e.message || e);
    return null;
  }
}

function mapDmMessageRow(r) {
  return { id: r.id, dmId: r.dm_id, userId: r.user_id, senderName: r.sender_name, avatarUrl: r.avatar_url, text: r.text, createdAt: r.created_at };
}

export async function getDmMessages(dmId) {
  try {
    const { data, error } = await supabase
      .from('dm_messages')
      .select('*')
      .eq('dm_id', dmId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data.map(mapDmMessageRow);
  } catch { return []; }
}

export async function sendDmMessage(dmId, text, senderName, avatarUrl) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('dm_messages')
      .insert({ dm_id: dmId, user_id: user.id, sender_name: senderName, avatar_url: avatarUrl, text })
      .select()
      .single();
    if (error) { console.error('sendDmMessage error', error); return null; }
    return mapDmMessageRow(data);
  } catch (e) {
    console.error('sendDmMessage exception', e.message || e);
    return null;
  }
}

export function subscribeToDmMessages(dmId, onMessage) {
  const channel = supabase
    .channel(`dm-messages-${dmId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'dm_messages',
      filter: `dm_id=eq.${dmId}`,
    }, payload => onMessage(mapDmMessageRow(payload.new)))
    .subscribe();
  return () => supabase.removeChannel(channel);
}
