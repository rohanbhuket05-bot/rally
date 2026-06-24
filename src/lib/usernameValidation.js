// Normalizes a string to catch common leetspeak substitutions before blocklist check
function normalize(str) {
  return str.toLowerCase()
    .replace(/3/g, 'e').replace(/0/g, 'o').replace(/1/g, 'l')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
}

// Racial and sexist slurs — used strictly for content moderation
const BLOCKED = new Set([
  'nigger','nigga','chink','gook','spic','wetback','kike','beaner',
  'coon','towelhead','raghead','zipperhead','jap','cracker','honky',
  'faggot','tranny','cunt','whore','slut','dyke','retard','spastic',
]);

export function validateUsername(username) {
  if (!username || username.length < 3) {
    return { valid: false, error: 'Must be at least 3 characters' };
  }

  const letters = username.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 3) {
    return { valid: false, error: 'Must contain at least 3 letters' };
  }

  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    return { valid: false, error: 'Only letters, numbers, periods, and underscores allowed' };
  }

  if (/^[._]|[._]$/.test(username)) {
    return { valid: false, error: 'Cannot start or end with a period or underscore' };
  }

  if (/[._]{2,}/.test(username)) {
    return { valid: false, error: 'No consecutive periods or underscores' };
  }

  const normalized = normalize(username);
  for (const term of BLOCKED) {
    if (normalized.includes(term)) {
      return { valid: false, error: 'Username contains disallowed content' };
    }
  }

  return { valid: true, error: null };
}
