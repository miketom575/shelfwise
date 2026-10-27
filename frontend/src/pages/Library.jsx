import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Library as LibraryIcon } from 'lucide-react';
import { ElevatorPanel } from '../components/ElevatorPanel';
import { EmptyState, ErrorState, TableSkeleton } from '../components/Ui';
import { hash, plural } from '../utils/format';
import { RUNNERS, SCENE, SHELF_CAP, SLOTS, SPINES, STOPS, clampFloor, filterActive, floorLabel, letterName, passes, route, shelfPath, spotPoint } from '../utils/library';

const { w: W, h: H } = SCENE;
const SPEED = 420;      // walking speed, pixels per second
const CLOSE = 70;       // closer than this many pixels counts as "already there"
const pct = ({ x, y, w, h }) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` });

/**
 * Moves the visitor along the walkways, one animation frame at a time.
 * Asking for a new destination mid-walk re-routes from wherever they are right now.
 */
function useWalker(start, sceneRef) {
  const el = useRef(null);
  const w = useRef({ x: start[0], y: start[1], path: [], then: null, dir: 1, raf: 0, last: 0 });

  const paint = () => {
    const n = el.current, s = w.current;
    if (!n) return;
    n.style.left = `${(s.x / W) * 100}%`;
    n.style.top = `${(s.y / H) * 100}%`;
    n.style.setProperty('--dir', s.dir);
    n.classList.toggle('go', s.path.length > 0);
  };
  const scale = () => [(sceneRef.current?.clientWidth || W) / W, (sceneRef.current?.clientHeight || H) / H];

  const tick = (t) => {
    const s = w.current, [sx, sy] = scale();
    let step = SPEED * Math.min(0.05, (t - s.last) / 1000);
    s.last = t;
    while (step > 0 && s.path.length) {
      const [px, py] = s.path[0];
      const dx = (px - s.x) * sx, dy = (py - s.y) * sy, d = Math.hypot(dx, dy);
      if (dx) s.dir = dx < 0 ? -1 : 1;
      if (d <= step) { s.x = px; s.y = py; s.path.shift(); step -= d; }
      else { s.x += (px - s.x) * (step / d); s.y += (py - s.y) * (step / d); step = 0; }
    }
    paint();
    if (s.path.length) { s.raf = requestAnimationFrame(tick); return; }
    s.raf = 0;
    const done = s.then;
    s.then = null;
    done?.();
  };

  useEffect(() => { paint(); return () => cancelAnimationFrame(w.current.raf); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    el,
    /** Head for `to`, replacing any walk already underway. `then` runs on arrival. */
    goTo(to, then) {
      const s = w.current;
      cancelAnimationFrame(s.raf);
      s.path = route([s.x, s.y], to);
      s.then = then;
      s.last = performance.now();
      s.raf = requestAnimationFrame(tick);
    },
    /** Already standing (almost) there? */
    isNear(to) {
      const s = w.current, [sx, sy] = scale();
      return Math.hypot((to[0] - s.x) * sx, (to[1] - s.y) * sy) < CLOSE;
    },
    /** Appear at `to` without walking (also cancels any walk underway). */
    jump(to) {
      const s = w.current;
      cancelAnimationFrame(s.raf);
      s.path = []; s.then = null; s.x = to[0]; s.y = to[1];
      paint();
    },
  };
}

/** A wooden staircase with a polished banister, brass-capped posts and a carpet runner. */
function StairsArt({ id, flip }) {
  const x0 = 20, run = 36, rise = 16;
  const top = (i) => 118 - rise * i;
  const rail = (x) => 118 - ((x - x0) * rise) / run - 54;
  return (
    <svg viewBox="0 -34 232 168" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <defs>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c58b52" /><stop offset="1" stopColor="#9a6636" /></linearGradient>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6e4222" /><stop offset="1" stopColor="#3d2410" /></linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={x0 + run * i} y={top(i)} width={212 - x0 - run * i} height={132 - top(i)} fill={`url(#r${id})`} stroke="#1d1005" strokeWidth="1.5" />
          <rect x={x0 + run * i} y={top(i)} width={212 - x0 - run * i} height="7" fill={`url(#t${id})`} stroke="#1d1005" strokeWidth="1.5" />
          <rect x={x0 + run * i + 5} y={top(i) - 1.5} width={run - 10} height="3.5" rx="1" fill="#8e2a2a" />
          <line x1={x0 + run * i} x2={x0 + run * i + run} y1={top(i) + 7} y2={top(i) + 7} stroke="#d9b25e" strokeWidth="1.5" />
        </g>
      ))}
      {[38, 74, 110, 146, 182].map((x) => (
        <line key={x} x1={x} x2={x} y1={rail(x)} y2={top(Math.floor((x - x0) / run))} stroke="#4a2a12" strokeWidth="3.5" />
      ))}
      <line x1={x0} y1={rail(x0)} x2="200" y2={rail(200)} stroke="#2b1709" strokeWidth="8" strokeLinecap="round" />
      <line x1={x0} y1={rail(x0) - 1.5} x2="200" y2={rail(200) - 1.5} stroke="#9a6636" strokeWidth="2" strokeLinecap="round" />
      {[x0, 200].map((x) => (
        <g key={x}>
          <rect x={x - 7} y={rail(x) - 8} width="14" height={(x === x0 ? 124 : top(4)) - rail(x) + 8} rx="2" fill="#4a2a12" stroke="#1d1005" strokeWidth="1.5" />
          <circle cx={x} cy={rail(x) - 13} r="6" fill="#d9b25e" stroke="#7a5a1c" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

/** A vintage brass elevator: wooden frame, arched dial that points at the current floor, brass doors. */
function ElevatorArt({ floor, total }) {
  const ang = -55 + (total > 1 ? ((floor - 1) / (total - 1)) * 110 : 55);
  return (
    <svg viewBox="0 0 160 170" aria-hidden="true">
      <defs>
        <linearGradient id="elBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0d58c" /><stop offset=".5" stopColor="#c9a24a" /><stop offset="1" stopColor="#8f6b22" /></linearGradient>
        <linearGradient id="elDoor" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#bd953f" /><stop offset=".5" stopColor="#efd890" /><stop offset="1" stopColor="#b08a36" /></linearGradient>
      </defs>
      <rect x="6" y="40" width="148" height="128" rx="6" fill="#4a2a12" stroke="#1d1005" strokeWidth="3" />
      <path d="M10 62 Q10 6 80 6 Q150 6 150 62 Z" fill="url(#elBrass)" stroke="#5c4210" strokeWidth="2.5" />
      <path d="M36 58 A44 44 0 0 1 124 58 Z" fill="#1d1005" />
      {[-55, -37, -18, 0, 18, 37, 55].map((a) => (
        <line key={a} x1="80" y1="58" x2="80" y2="19" stroke="#c9a24a" strokeWidth="1.6" transform={`rotate(${a} 80 58)`} strokeDasharray="0 33 6" />
      ))}
      <line x1="80" y1="58" x2="80" y2="22" stroke="#f0d58c" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${ang} 80 58)`} />
      <circle cx="80" cy="58" r="4.5" fill="url(#elBrass)" stroke="#5c4210" />
      <rect x="18" y="66" width="61" height="94" rx="2" fill="url(#elDoor)" stroke="#5c4210" strokeWidth="2" />
      <rect x="81" y="66" width="61" height="94" rx="2" fill="url(#elDoor)" stroke="#5c4210" strokeWidth="2" />
      {[30, 42, 54, 66, 94, 106, 118, 130].map((x) => <line key={x} x1={x} x2={x} y1="72" y2="154" stroke="#7a5a1c" strokeOpacity=".35" strokeWidth="1.5" />)}
      <path d="M48 113l11-14 11 14-11 14z M111 113l11-14 11 14-11 14z" fill="#8e2a2a" stroke="#5c4210" strokeWidth="1.5" />
      <rect x="72" y="104" width="3" height="18" rx="1.5" fill="#5c4210" />
      <rect x="85" y="104" width="3" height="18" rx="1.5" fill="#5c4210" />
    </svg>
  );
}

/** The bookcase face: one tiny spine per book. Gray = on loan, faded = filtered out, gaps = free space. */
function Minis({ shelf, kind, filter, active }) {
  const cells = Array.from({ length: SHELF_CAP }, (_, i) => shelf.books[i]);
  const cell = (b, i) => (b
    ? <i key={i} className={`${b.availableCopies === 0 ? 'out' : ''} ${active && !passes(b, filter) ? 'dim' : ''}`} style={{ '--c': SPINES[hash(b.title) % SPINES.length][0], '--s': `${55 + (hash(b.title) % 45)}%` }} />
    : <i key={i} className="blank" />);
  if (kind === 'dbl') return <div className="minis dbl"><div>{cells.slice(0, 10).map(cell)}</div><div>{cells.slice(10).map((b, i) => cell(b, i + 10))}</div></div>;
  return <div className={`minis ${kind}`}>{cells.map(cell)}</div>;
}

function Floor() {
  const { travel, floors, shelves, books, spot, setSpot, filter, counts, ready, error, retry } = useOutletContext();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const floorNo = clampFloor(params.get('floor'), floors.length);
  const floor = floors[floorNo - 1];
  const sceneRef = useRef(null);
  const [start] = useState(() => spotPoint(spot, floor));
  const walker = useWalker(start, sceneRef);
  const [liftOpen, setLiftOpen] = useState(false);

  /** Walk there, unless we're already close (or motion is turned down), then run `then`. */
  const walkTo = (to, then) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || walker.isNear(to)) { walker.jump(to); then(); return; }
    walker.goTo(to, then);
  };
  const openShelf = (shelf) => { setSpot({ type: 'shelf', key: shelf.key }); navigate(shelfPath(shelf)); };
  const visit = (shelf, slot) => walkTo(slot.front, () => openShelf(shelf));
  const takeStairs = (dir) => walkTo(STOPS[dir], () => travel(dir === 'up' ? floorNo + 1 : floorNo - 1));
  const callLift = () => walkTo(STOPS.lift, () => setLiftOpen((o) => !o));
  // Double-click skips the walking and goes straight there.
  const skipToShelf = (shelf, slot) => { walker.jump(slot.front); openShelf(shelf); };
  const skipToStairs = (dir) => { walker.jump(STOPS[dir]); travel(dir === 'up' ? floorNo + 1 : floorNo - 1); };
  const skipToLift = () => { walker.jump(STOPS.lift); setLiftOpen(true); };

  const active = filterActive(filter);
  const hitsOf = (shelf) => (active ? shelf.books.filter((b) => passes(b, filter)).length : shelf.books.length);
  const onLoan = books.filter((b) => b.availableCopies === 0).length;

  if (error && !ready) return <div className="lib-pad"><ErrorState error={error} onRetry={retry} title="The shelves didn’t load" /></div>;
  if (!ready) return <div className="lib-pad"><TableSkeleton rows={5} /></div>;
  if (books.length === 0) return <div className="lib-pad"><EmptyState icon={LibraryIcon} title="The shelves are empty">A librarian can add books from the admin workspace, and they will appear here.</EmptyState></div>;

  return (
    <div className="floor-wrap">
      <div className="scene" ref={sceneRef} role="group" aria-label={`Floor ${floor.n} of the library`}>
        <div className="s-floor" />
        {RUNNERS.map((r, i) => <div key={i} className="runner" style={pct({ x: r[0], y: r[1], w: r[2], h: r[3] })} />)}
        <div className="s-wall" />
        <div className="s-sign"><span>Floor {floor.n}<small>{floorLabel(floor)}</small></span></div>

        {SLOTS.map((slot, i) => {
          const shelf = floor.shelves[i];
          if (!shelf) return <div key={i} className="slot decor" style={pct(slot)} aria-hidden="true" />;
          const hits = hitsOf(shelf);
          const name = `${letterName(shelf.letter)}${shelf.of > 1 ? ` ${shelf.n} of ${shelf.of}` : ''}`;
          return (
            <button
              key={shelf.key}
              className={`slot ${active ? (hits ? 'hit' : 'dim') : ''}`}
              style={pct(slot)}
              onClick={() => visit(shelf, slot)}
              onDoubleClick={() => skipToShelf(shelf, slot)}
              aria-label={`Bookcase ${name}, ${plural(shelf.books.length, 'book')}${active ? `, ${plural(hits, 'match', 'matches')}` : ''}`}
              title={`${name} · ${active ? `${hits} of ${shelf.books.length} books match` : `${shelf.books.length} of ${SHELF_CAP} books`} (double-click to go straight there)`}
            >
              <Minis shelf={shelf} kind={slot.kind} filter={filter} active={active} />
              <span className="plate">{letterName(shelf.letter)}{shelf.of > 1 && <small>{shelf.n}/{shelf.of}</small>}</span>
              {active && hits > 0 && <span className="hits" aria-hidden="true">{hits}</span>}
            </button>
          );
        })}

        <button className="stairs s-up" onClick={() => takeStairs('up')} onDoubleClick={() => skipToStairs('up')} disabled={floorNo >= floors.length}>
          <StairsArt id="up" flip /><span className="tagplate">Stairs up</span>
        </button>
        <button className="stairs s-down" onClick={() => takeStairs('down')} onDoubleClick={() => skipToStairs('down')} disabled={floorNo <= 1}>
          <StairsArt id="down" /><span className="tagplate">Stairs down</span>
        </button>

        <div className="lift">
          {liftOpen && <ElevatorPanel floors={floors} current={floorNo} counts={counts} onPick={(n) => { setLiftOpen(false); travel(n, true); }} />}
          <button className="stairs" onClick={callLift} onDoubleClick={skipToLift} aria-expanded={liftOpen}>
            <ElevatorArt floor={floorNo} total={floors.length} /><span className="tagplate">Elevator</span>
          </button>
        </div>

        <i className="walker" ref={walker.el} style={{ left: `${(start[0] / W) * 100}%`, top: `${(start[1] / H) * 100}%` }} aria-hidden="true">
          <svg viewBox="0 0 24 44">
            <g className="leg-a"><rect x="7" y="29" width="4.5" height="13" rx="2" fill="#3b2a1a" /><rect x="6.5" y="40" width="6" height="3.5" rx="1.5" fill="#1d1005" /></g>
            <g className="leg-b"><rect x="12.5" y="29" width="4.5" height="13" rx="2" fill="#4a3522" /><rect x="12" y="40" width="6" height="3.5" rx="1.5" fill="#1d1005" /></g>
            <rect x="5.5" y="14" width="13" height="17" rx="4.5" fill="#2f5d3a" stroke="#1d1005" strokeWidth="1" />
            <path d="M10 14l2 6 2-6z" fill="#f1e0c0" />
            <rect x="15" y="20" width="7" height="5" rx="1" fill="#8e2a2a" stroke="#1d1005" strokeWidth=".8" />
            <circle cx="12" cy="8" r="6.2" fill="#f1c9a0" stroke="#1d1005" strokeWidth="1" />
            <path d="M5.8 8a6.2 6.2 0 0 1 12.4 0c-3-2.6-9.4-2.6-12.4 0z" fill="#3b2412" />
            <circle cx="14.6" cy="8.6" r=".9" fill="#1d1005" />
          </svg>
        </i>
        <div className="s-glow" />
        <div className="s-vig" />
      </div>

      <ul className="lib-key" aria-label="Key">
        <li><i /> On the shelf</li>
        <li><i className="out" /> On loan</li>
        <li><i className="gap" /> Free space</li>
        {active && <li><i className="faded" /> Doesn’t match your filter</li>}
        <li className="tip">Double-click a bookcase to skip the walk</li>
      </ul>
      <ul className="chips" aria-label="Library summary">
        {active ? (
          <>
            <li><b>{plural(floor.shelves.reduce((n, s) => n + hitsOf(s), 0), 'match', 'matches')}</b> on this floor</li>
            <li><b>{plural(counts.reduce((a, b) => a + b, 0), 'match', 'matches')}</b> in the library</li>
          </>
        ) : (
          <>
            <li><b>{plural(books.length, 'book')}</b></li>
            <li><b>{plural(shelves.length, 'bookcase')}</b></li>
            <li><b>{onLoan}</b> on loan</li>
          </>
        )}
      </ul>
    </div>
  );
}

/** /catalog shows the floors. Old links like /catalog?q=... or ?category=... now open a search bookshelf. */
export default function LibraryEntry() {
  const [params] = useSearchParams();
  const q = params.get('q'), category = params.get('category');
  if (q || category) {
    const next = new URLSearchParams();
    if (q) next.set('q', q); else next.set('category', category);
    return <Navigate to={`/catalog/find?${next}`} replace />;
  }
  return <Floor key={params.get('floor') || '1'} />;
}