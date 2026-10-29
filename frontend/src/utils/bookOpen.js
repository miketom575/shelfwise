/**
 * "Take the book off the shelf and open it": a copy of the spine lifts out, turns to show its cover,
 * then the cover swings open. The open book then zooms in and fades away, and only after it has
 * disappeared is `go()` called to show the details page. Click anywhere to skip.
 */
const W = 260; // cover size in pixels (scaled down on small screens)
const H = 380;

function div(cls, text) {
  const n = document.createElement('div');
  n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function lines(widths) {
  return widths.map((w) => {
    const l = div('bo-line');
    l.style.width = `${w}%`;
    return l;
  });
}

export function openBook({ el, color = '#2f5d46', ink = '#f4ead2', title = '', author = '', category = '', go }) {
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (calm || !el || !el.animate || document.querySelector('.bo')) { go(); return; }

  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const sc = Math.min(1, (vh * 0.72) / H, (vw * 0.44) / W); // the open book is two pages wide
  const s0 = r.height / H;                                    // scale at which the spine is as tall as on the shelf
  const D = Math.min(72, Math.max(24, r.width / s0));         // thickness, so the spine is as wide as on the shelf
  const dx = r.left + r.width / 2 - vw / 2;
  const dy = r.top + r.height / 2 - vh / 2;

  const root = div('bo');
  const scrim = div('bo-scrim');
  const book = div('bo-book');
  book.style.setProperty('--w', `${W}px`);
  book.style.setProperty('--h', `${H}px`);
  book.style.setProperty('--d', `${D}px`);
  book.style.setProperty('--c', color);
  book.style.setProperty('--ink', ink);

  const back = div('bo-face bo-back');
  const spine = div('bo-face bo-spine');
  spine.append(div('bo-spine-title', title));
  const pages = div('bo-face bo-pages');
  pages.append(div('bo-kicker', category), div('bo-pt', title), div('bo-pa', author), div('bo-rule'), ...lines([100, 94, 100, 88, 97, 70]));
  const cover = div('bo-cover');
  const front = div('bo-face bo-front');
  front.append(div('bo-kicker', category), div('bo-rule'), div('bo-title', title), div('bo-author', author));
  const inside = div('bo-face bo-inside');
  inside.append(div('bo-plate', 'Minerva Library'), ...lines([92, 100, 84, 100, 96, 100, 78, 90]));
  cover.append(front, inside);
  book.append(back, spine, pages, cover);
  root.append(scrim, book);
  document.body.append(root);
  el.style.visibility = 'hidden'; // the book has left the shelf

  const T = (x, y, s, z, ry) => `translate(${x}px, ${y}px) scale3d(${s}, ${s}, ${s}) translateZ(${z}px) rotateY(${ry}deg)`;
  const anim = book.animate(
    [
      { transform: T(dx, dy, s0, -W / 2, 90), offset: 0, easing: 'ease-out' },                                   // sitting on the shelf, spine out
      { transform: T(dx, dy - 28, s0 * 1.05, -W / 2, 90), offset: 0.16, easing: 'cubic-bezier(.35,.7,.2,1)' },   // pulled forward
      { transform: T(0, 0, sc, 0, 0), offset: 0.5, easing: 'cubic-bezier(.4,.1,.25,1)' },                        // turned to show the cover
      { transform: T((W * sc) / 2, 0, sc, 0, 0), offset: 1 },                                                    // slides over as it opens
    ],
    { duration: 1450, fill: 'both' }
  );
  cover.animate(
    [{ transform: `translateZ(${D / 2}px) rotateY(0deg)` }, { transform: `translateZ(${D / 2}px) rotateY(-168deg)` }],
    { duration: 640, delay: 720, easing: 'cubic-bezier(.4,.1,.2,1)', fill: 'both' }
  );
  scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'both' });

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    // The open book zooms toward the reader and melts away. Only once it is completely gone
    // do we load the details page, so the details never show up behind the animation.
    const away = root.animate(
      [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.35)' }],
      { duration: 480, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' }
    );
    away.onfinish = () => {
      root.remove();
      go();
    };
  };
  anim.onfinish = finish;
  root.addEventListener('click', finish);
}