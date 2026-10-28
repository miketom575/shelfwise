/** One bookcase holds at most this many books. A letter with more books gets several bookcases. */
export const SHELF_CAP = 20;
/** Bookcases drawn on one floor (matches SLOTS below). More bookcases than this means more floors. */
export const PER_FLOOR = 14;

/** Old-bookstore spine colours [background, text]. */
export const SPINES = [
  ['#7b2d26', '#f1e0c0'], ['#2f5d3a', '#f1e0c0'], ['#1f3a5f', '#f1e0c0'], ['#b8862b', '#2a1a05'],
  ['#e8d9b5', '#3b2a12'], ['#8a4b2a', '#f6e8cf'], ['#4a2f5a', '#f1e0c0'], ['#3a6b6b', '#f1e0c0'],
];

/** Floor scene: 1200 x 760 drawing units. */
export const SCENE = { w: 1200, h: 760 };

const slot = (x, y, w, h, kind, front) => ({ x, y, w, h, kind, front });
/** Bookcases in reading order. `front` is where a visitor stands to face the bookcase. */
export const SLOTS = [
  slot(140, 62, 200, 44, 'row', [240, 160]), slot(350, 62, 200, 44, 'row', [450, 160]),   // back wall
  slot(650, 62, 200, 44, 'row', [750, 160]), slot(860, 62, 200, 44, 'row', [960, 160]),
  slot(18, 170, 46, 140, 'col', [100, 240]), slot(18, 350, 46, 140, 'col', [100, 420]),    // left wall
  slot(1136, 170, 46, 140, 'col', [1100, 240]), slot(1136, 350, 46, 140, 'col', [1100, 420]), // right wall
  slot(330, 215, 210, 56, 'dbl', [435, 303]), slot(660, 215, 210, 56, 'dbl', [765, 303]),  // island, row 1
  slot(330, 335, 210, 56, 'dbl', [435, 423]), slot(660, 335, 210, 56, 'dbl', [765, 423]),  // island, row 2
  slot(330, 455, 210, 56, 'dbl', [435, 525]), slot(660, 455, 210, 56, 'dbl', [765, 525]),  // island, row 3
];

/** Carpeted walkways [x, y, w, h]. */
export const RUNNERS = [
  [548, 62, 104, 491], [145, 106, 104, 447], [951, 106, 104, 447],
  [70, 132, 1060, 56], [70, 275, 1060, 56], [70, 395, 1060, 56], [70, 497, 1060, 56],
];

/** Fallback stand-points for the stairs and elevator (the floor page measures the real ones from the screen). */
export const STOPS = { lift: [600, 528], up: [1092, 690], down: [108, 690] };

/** Where feet may go, and how far to keep from a bookcase (in drawing units; the floor page passes in sizes that fit the screen). */
const WALK = { x0: 24, x1: 1176, y0: 140, y1: 735 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const zones = (mx, my) => SLOTS.map((s) => ({ x0: s.x - mx, y0: s.y - my, x1: s.x + s.w + mx, y1: s.y + s.h + my }));
const inside = (p, r) => p[0] > r.x0 && p[0] < r.x1 && p[1] > r.y0 && p[1] < r.y1;

/** Does the straight line a-b pass through the inside of rectangle r? (Touching the edge is fine.) */
function crosses(a, b, r) {
  const e = 0.01, dx = b[0] - a[0], dy = b[1] - a[1];
  let t0 = 0, t1 = 1;
  const sides = [[-dx, a[0] - (r.x0 + e)], [dx, r.x1 - e - a[0]], [-dy, a[1] - (r.y0 + e)], [dy, r.y1 - e - a[1]]];
  for (const [p, q] of sides) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t0 < t1;
}

/** Nudges a point out of any bookcase's clear zone, and keeps it on the floor. */
function freed(p, boxes) {
  let x = clamp(p[0], WALK.x0, WALK.x1), y = clamp(p[1], WALK.y0, WALK.y1);
  for (let n = 0; n < 4; n++) {
    const r = boxes.find((b) => inside([x, y], b));
    if (!r) break;
    const side = [x - r.x0, r.x1 - x, y - r.y0, r.y1 - y];
    const k = side.indexOf(Math.min(...side));
    if (k === 0) x = r.x0; else if (k === 1) x = r.x1; else if (k === 2) y = r.y0; else y = r.y1;
  }
  return [x, y];
}

/**
 * Shortest walk from one spot to another that never goes through a bookcase.
 * It goes straight when it can and only bends around the corners of bookcases, so there are no detours.
 * mx / my = how far to stay from a bookcase sideways / up-down.
 */
export function route(from, to, mx = 16, my = 10) {
  const boxes = zones(mx, my);
  const clear = (p, q, list = boxes) => !list.some((r) => crosses(p, q, r));
  const a = freed(from, boxes), b = freed(to, boxes);
  const nodes = [a, b];
  boxes.forEach((r) => [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].forEach((c) => {
    if (c[0] >= WALK.x0 && c[0] <= WALK.x1 && c[1] >= WALK.y0 && c[1] <= WALK.y1 && !boxes.some((z) => inside(c, z))) nodes.push(c);
  }));

  // Dijkstra over the "who can see whom" graph.
  const n = nodes.length, dist = Array(n).fill(Infinity), prev = Array(n).fill(-1), done = Array(n).fill(false);
  dist[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity || u === 1) break;
    done[u] = true;
    for (let v = 0; v < n; v++) {
      if (done[v]) continue;
      const d = dist[u] + Math.hypot(nodes[u][0] - nodes[v][0], nodes[u][1] - nodes[v][1]);
      if (d < dist[v] && clear(nodes[u], nodes[v])) { dist[v] = d; prev[v] = u; }
    }
  }
  const mid = [];
  if (prev[1] >= 0) for (let i = prev[1]; i > 0; i = prev[i]) mid.unshift(nodes[i]);
  let pts = [...mid, b];

  // Round the corners a little (only where there is room), so turns look like a stride, not a snap.
  const soft = zones(mx * 0.4, my * 0.4);
  const out = [];
  let before = a;
  pts.forEach((c, i) => {
    const next = pts[i + 1];
    if (!next) { out.push(c); return; }
    const l1 = Math.hypot(c[0] - before[0], c[1] - before[1]), l2 = Math.hypot(next[0] - c[0], next[1] - c[1]);
    const k = Math.min(28, l1 / 2, l2 / 2);
    if (k < 2) { out.push(c); before = c; return; }
    const p1 = [c[0] + ((before[0] - c[0]) * k) / l1, c[1] + ((before[1] - c[1]) * k) / l1];
    const p2 = [c[0] + ((next[0] - c[0]) * k) / l2, c[1] + ((next[1] - c[1]) * k) / l2];
    const seq = [p1, ...[0.25, 0.5, 0.75].map((t) => [(1 - t) ** 2 * p1[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0], (1 - t) ** 2 * p1[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1]]), p2];
    if (seq.every((q, j) => j === 0 || clear(seq[j - 1], q, soft))) out.push(...seq); else out.push(c);
    before = c;
  });
  pts = out;
  if (a[0] !== from[0] || a[1] !== from[1]) pts.unshift(a);
  if (b[0] !== to[0] || b[1] !== to[1]) pts.push(to);
  return pts.filter((p, i) => (i === 0 ? p[0] !== from[0] || p[1] !== from[1] : p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]));
}

/** Where the visitor appears when a floor opens: beside the bookcase they just left, or where they arrived. */
export function spotPoint(spot, floor) {
  if (spot?.type === 'shelf') {
    const i = floor.shelves.findIndex((s) => s.key === spot.key);
    if (i >= 0) return SLOTS[i].front;
  }
  return STOPS[spot?.type] || STOPS.lift;
}

/** First letter of a title, accents removed. Anything outside A-Z goes on the '#' shelf. */
export const letterOf = (title = '') => {
  const c = title.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
};
export const letterName = (l) => (l === '#' ? '0–9' : l);

export const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

/** Every bookcase in the library, in order: A-1, A-2, B-1, ... Empty letters get no bookcase. */
export function buildShelves(books) {
  const by = {};
  books.forEach((b) => { (by[letterOf(b.title)] ||= []).push(b); });
  const letters = Object.keys(by).sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
  const shelves = [];
  letters.forEach((letter) => {
    const list = by[letter].sort(byTitle);
    const of = Math.ceil(list.length / SHELF_CAP);
    for (let i = 0; i < of; i++) shelves.push({ key: `${letter}-${i + 1}`, letter, n: i + 1, of, books: list.slice(i * SHELF_CAP, (i + 1) * SHELF_CAP) });
  });
  return shelves;
}

/** Splits the bookcases across floors. There is always at least one (empty) floor. */
export function buildFloors(shelves) {
  const floors = [];
  for (let i = 0; i < shelves.length; i += PER_FLOOR) floors.push({ n: floors.length + 1, shelves: shelves.slice(i, i + PER_FLOOR) });
  return floors.length ? floors : [{ n: 1, shelves: [] }];
}

export const floorLabel = (f) => {
  if (!f.shelves.length) return 'No books yet';
  const a = letterName(f.shelves[0].letter), z = letterName(f.shelves[f.shelves.length - 1].letter);
  return a === z ? a : `${a}–${z}`;
};
export const shelfLabel = (s) => (s.of > 1 ? `${letterName(s.letter)} ${s.n}` : letterName(s.letter));

export const floorOfKey = (floors, key) => Math.max(1, floors.findIndex((f) => f.shelves.some((s) => s.key === key)) + 1);
export const clampFloor = (n, max = 1) => Math.min(Math.max(1, max), Math.max(1, Math.trunc(Number(n)) || 1));
export const floorPath = (n) => (n <= 1 ? '/catalog' : `/catalog?floor=${n}`);
export const shelfPath = (s) => `/catalog/shelf/${encodeURIComponent(s.key)}`;
export const parseKey = (raw = '') => {
  const m = decodeURIComponent(raw).match(/^(.)-(\d+)$/);
  return m ? `${m[1].toUpperCase()}-${Number(m[2])}` : null;
};

/** A search becomes a bookshelf named after what you typed, holding the matching books (20 per bookcase). */
export function findShelf(books, params) {
  const q = (params.get('q') || '').trim();
  const cat = (params.get('category') || '').trim();
  let list = books;
  if (cat) list = list.filter((b) => (b.category || '').toLowerCase() === cat.toLowerCase());
  if (q) {
    const t = q.toLowerCase();
    list = list.filter((b) => [b.title, b.author, b.category, b.isbn].some((v) => String(v || '').toLowerCase().includes(t)));
  }
  list = [...list].sort(byTitle);
  const of = Math.max(1, Math.ceil(list.length / SHELF_CAP));
  const n = Math.min(of, Math.max(1, Number(params.get('page')) || 1));
  const to = (p) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (cat) sp.set('category', cat);
    if (p > 1) sp.set('page', p);
    return `/catalog/find?${sp}`;
  };
  return { name: q || cat, total: list.length, n, of, books: list.slice((n - 1) * SHELF_CAP, n * SHELF_CAP), prev: n > 1 ? to(n - 1) : null, next: n < of ? to(n + 1) : null };
}

/** Filters shared by the floors and the bookcases. */
export const NO_FILTER = { avail: 'any', category: '' };
export const filterActive = (f) => f.avail !== 'any' || !!f.category;
export const passes = (b, f) =>
  (f.avail === 'in' ? b.availableCopies > 0 : f.avail === 'out' ? b.availableCopies === 0 : true) && (!f.category || (b.category || '') === f.category);
export const categoriesOf = (books) => [...new Set(books.map((b) => b.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));