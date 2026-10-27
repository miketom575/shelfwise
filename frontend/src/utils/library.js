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

/** Where visitors stand in the lobby, the three vertical walkways, and the open horizontal aisles between the bookcases. */
export const STOPS = { lift: [600, 525], up: [1092, 525], down: [108, 525] };
const CORRIDORS = [197, 600, 1003];
const AISLES = [160, 303, 423, 525];
const nearest = (list, v) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

/** Waypoints from one spot to another that stay on the walkways (never through a bookcase). */
export function route(from, to) {
  const cf = nearest(CORRIDORS, from[0]), ct = nearest(CORRIDORS, to[0]);
  const pts = [];
  if (from[0] !== cf) pts.push([cf, from[1]]);                 // step onto the nearest walkway
  if (cf === ct) pts.push([cf, to[1]]);                         // walk along it
  else {
    const a = nearest(AISLES, to[1]);                           // cross over on an open aisle
    pts.push([cf, a], [ct, a], [ct, to[1]]);
  }
  pts.push(to);
  return pts.filter((p, i) => i === 0 ? (p[0] !== from[0] || p[1] !== from[1]) : (p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]));
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