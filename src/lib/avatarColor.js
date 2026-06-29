export const AVATAR_COLORS = ['#534AB7','#D4537E','#1D9E75','#EF9F27','#667EEA','#9B59B6'];

export function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
