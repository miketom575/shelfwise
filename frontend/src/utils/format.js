export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtShort = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—');

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Whole days from today until `date` (negative = already past). */
export const daysFromToday = (date) => Math.round((startOfDay(date) - startOfDay(new Date())) / 864e5);

export function relativeDay(date) {
  const n = daysFromToday(date);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* Generated cover colours: deterministic per title so each book keeps its look */
const PALETTE = ['#1f3a5f', '#7a2e3a', '#2f5d50', '#5b3f8c', '#a4561a', '#2b2d42', '#386641', '#8a4a86', '#0b6e6e', '#9c3b45', '#3d5a80', '#5f6650', '#6b3e26', '#244b6b'];

export function hash(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export const coverColor = (title) => PALETTE[hash(title) % PALETTE.length];
export const callNumber = (category = '', title = '') => `${category.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN'} ${100 + (hash(title) % 900)}`;
