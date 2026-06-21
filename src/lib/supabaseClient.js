// Supabase client wrapper with simple helpers.
// Configure via environment variables in .env:
// REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY, REACT_APP_SUPABASE_USER_ID (dev helper)

let supabase = null;
let configured = false;

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const DEV_USER = process.env.REACT_APP_SUPABASE_USER_ID || null;

if (URL && KEY) {
  try {
    // import dynamically to avoid breaking builds when package not installed
    // but createClient must be available at build time; since we added dependency it's fine.
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(URL, KEY);
    configured = true;
  } catch (e) {
    // keep configured false
    console.warn('Supabase client could not be initialized', e);
  }
}

export function isSupabaseConfigured() {
  return configured;
}

export async function getEvents() {
  if (!configured) return null;
  try {
    const userId = DEV_USER || (supabase.auth && (await supabase.auth.getUser()).data?.user?.id);
    const { data, error } = await supabase.from('events').select('*').eq('user_id', userId).order('date_iso', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('getEvents error', e.message || e);
    return null;
  }
}

export async function insertEvent(event) {
  if (!configured) return null;
  try {
    const userId = DEV_USER || (supabase.auth && (await supabase.auth.getUser()).data?.user?.id);
    const payload = { ...event, user_id: userId };
    const { data, error } = await supabase.from('events').insert(payload).select();
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    console.warn('insertEvent error', e.message || e);
    return null;
  }
}

export async function updateEvent(event) {
  if (!configured) return null;
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
  if (!configured) return false;
  try {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('deleteEvent error', e.message || e);
    return false;
  }
}

// Auth helpers
export async function signInWithOtp(email) {
  if (!configured) return { error: 'supabase not configured' };
  try {
    const resp = await supabase.auth.signInWithOtp({ email });
    return resp;
  } catch (e) {
    console.warn('signInWithOtp error', e.message || e);
    return { error: e };
  }
}

export async function signOut() {
  if (!configured) return { error: 'supabase not configured' };
  try {
    return await supabase.auth.signOut();
  } catch (e) {
    console.warn('signOut error', e.message || e);
    return { error: e };
  }
}

export async function getUser() {
  if (!configured) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
  } catch (e) {
    console.warn('getUser error', e.message || e);
    return null;
  }
}

export function onAuthStateChange(cb) {
  if (!configured) return () => {};
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    try { cb(event, session); } catch (e) { console.warn(e); }
  });
  return () => { try { sub.subscription.unsubscribe(); } catch(e){} };
}

export async function signInWithProvider(provider) {
  if (!configured) return { error: 'supabase not configured' };
  try {
    // provider: 'google', 'github', etc.
    const resp = await supabase.auth.signInWithOAuth({ provider });
    return resp;
  } catch (e) {
    console.warn('signInWithProvider error', e.message || e);
    return { error: e };
  }
}
