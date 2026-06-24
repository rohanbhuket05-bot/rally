import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://zjjeybrtumbdwwhxatgm.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqamV5YnJ0dW1iZHd3aHhhdGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODc2NzksImV4cCI6MjA5Nzc2MzY3OX0.UL0uKAGzsaU4z2xwWOvZ6lduhccgyGUqwhrN4QTbeKw';

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

export async function updateEvent(event) {
  try {
    const { id, ...rest } = event;
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

export async function getGroups() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from('groups').select('*').eq('created_by', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('getGroups error', e.message || e);
    return [];
  }
}

export async function insertGroup(group) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('groups').insert({ ...group, created_by: user?.id }).select();
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    console.warn('insertGroup error', e.message || e);
    return null;
  }
}

export async function updateGroup(id, payload) {
  try {
    const { data, error } = await supabase.from('groups').update(payload).eq('id', id).select();
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    console.warn('updateGroup error', e.message || e);
    return null;
  }
}

export async function deleteGroup(id) {
  try {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('deleteGroup error', e.message || e);
    return false;
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

export async function upsertProfile(userId, { name, bio, username, friends }) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, name, bio, username, friends: friends || [], updated_at: new Date().toISOString() })
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
      .select('id, username, name')
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
      .select('id, requester_id, addressee_id, requester:profiles!requester_id(id, username, name), addressee:profiles!addressee_id(id, username, name)')
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
      .select('id, requester_id, requester:profiles!requester_id(id, username, name)')
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
      .select('id, addressee_id, addressee:profiles!addressee_id(id, username, name)')
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

export async function signInWithProvider(provider) {
  try {
    return await supabase.auth.signInWithOAuth({ provider });
  } catch (e) {
    console.warn('signInWithProvider error', e.message || e);
    return { error: e };
  }
}
