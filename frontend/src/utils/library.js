/** Floors and which shelf letters live on each. Edit this to add floors or move letters. */
export const FLOORS = [
  { n: 1, letters: 'ABCDEFGHIJKLM'.split('') },
  { n: 2, letters: [...'NOPQRSTUVWXYZ', '#'] }, // '#' = titles that start with a digit or symbol
];

export const LETTERS = FLOORS.flatMap((f) => f.letters);

/** First letter of a title, accents removed. Anything outside A-Z goes on the '#' shelf. */
export const letterOf = (title = '') => {
  const c = title.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
};

export const floorOf = (letter) => FLOORS.find((f) => f.letters.includes(letter))?.n ?? 1;

export const clampFloor = (n) => Math.min(FLOORS.length, Math.max(1, Math.trunc(Number(n)) || 1));

export const floorLabel = (f) => {
  const az = f.letters.filter((l) => l !== '#');
  const range = az.length === 1 ? az[0] : `${az[0]}–${az[az.length - 1]}`;
  return f.letters.includes('#') ? `${range} and 0–9` : range;
};

/** Spine colours [background, text], taken from the bright shelf illustration. */
export const SPINES = [
  ['#9bc9de', '#12324a'], ['#f7a07f', '#4a1d0f'], ['#f23f3a', '#ffffff'], ['#1f5878', '#ffffff'],
  ['#ffd04d', '#4a3400'], ['#7b8429', '#ffffff'], ['#f9b79c', '#4a1d0f'],
];

/** Floor scene: 662 x 727 drawing units. Each slot is a bookcase [x, y, width, height]. */
export const SCENE = { w: 662, h: 727 };
export const SLOTS = [
  [38, 70, 130, 26], [171, 70, 128, 26], [344, 70, 127, 26], [475, 70, 127, 26], // top wall
  [13, 100, 24, 128], [606, 100, 24, 128],                                       // side walls
  [40, 233, 128, 48], [171, 233, 128, 48], [344, 233, 127, 48], [475, 233, 127, 48], // middle aisle
  [40, 462, 128, 26], [171, 462, 128, 26], [344, 462, 127, 26], [475, 462, 127, 26], // front row
  [13, 290, 24, 166], [606, 290, 24, 166],                                       // decorative side shelves
];
