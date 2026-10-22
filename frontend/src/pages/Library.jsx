import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';
import Catalog from './Catalog';
import { ErrorState, TableSkeleton } from '../components/Ui';
import { plural } from '../utils/format';
import { FLOORS, SCENE, SLOTS, clampFloor, floorLabel, letterOf } from '../utils/library';

const { w: W, h: H } = SCENE;
const box = ([x, y, w, h]) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` });

function StairsArt() {
  return (
    <svg viewBox="0 0 180 150" aria-hidden="true">
      <rect x="0" y="110" width="180" height="40" fill="#f0c8c0" stroke="#d29a90" strokeWidth="2" />
      <rect x="60" y="80" width="120" height="30" fill="#f0c8c0" stroke="#d29a90" strokeWidth="2" />
      <rect x="110" y="50" width="70" height="30" fill="#f0c8c0" stroke="#d29a90" strokeWidth="2" />
      <path d="M0 110h180M60 80h120M110 50h70" stroke="#e3a89d" strokeWidth="4" />
      {[20, 55, 90, 125, 160].map((x) => {
        const rail = 70 - (70 * x) / 180;
        const step = x < 60 ? 110 : x < 110 ? 80 : 50;
        return <line key={x} x1={x} x2={x} y1={rail} y2={step} stroke="#d9822b" strokeWidth="4" />;
      })}
      <line x1="0" y1="70" x2="180" y2="0" stroke="#d9822b" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function ElevatorArt() {
  return (
    <svg viewBox="0 0 140 150" aria-hidden="true">
      <rect x="26" y="2" width="76" height="12" rx="3" fill="#3b3b3b" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <circle key={i} cx={34 + i * 8.5} cy="8" r="2.4" fill={i === 4 ? '#fff' : '#9aa3ad'} />)}
      <rect x="4" y="16" width="118" height="132" rx="4" fill="#a9a9a9" stroke="#555" strokeWidth="3" />
      <rect x="14" y="26" width="98" height="122" fill="#b8b8b8" stroke="#3b4a5a" strokeWidth="2" />
      <line x1="63" y1="26" x2="63" y2="148" stroke="#3b4a5a" strokeWidth="3" />
      <rect x="126" y="98" width="12" height="28" rx="2" fill="#e5e5e5" stroke="#555" />
      <path d="M129 108l3-4 3 4zM129 116l3 4 3-4z" fill="#d9453f" />
    </svg>
  );
}

function Walker({ x, y }) {
  return (
    <i className="walker" style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }} aria-hidden="true">
      <svg viewBox="0 0 20 34"><circle cx="10" cy="7" r="6" fill="#f2c9a0" stroke="#2a2a2a" strokeWidth="1.5" /><rect x="3" y="14" width="14" height="18" rx="6" fill="var(--primary, #1f3a5f)" stroke="#2a2a2a" strokeWidth="1.5" /></svg>
    </i>
  );
}

function Floor() {
  const { travel } = useOutletContext();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const floorNo = clampFloor(params.get('floor'));
  const floor = FLOORS[floorNo - 1];
  const { data, error, loading, retry } = useLibrary();
  const [walk, setWalk] = useState({ x: 321, y: 540 });
  const [walking, setWalking] = useState(false);
  const [liftOpen, setLiftOpen] = useState(false);

  const byLetter = useMemo(() => {
    const m = {};
    (data || []).forEach((b) => { (m[letterOf(b.title)] ||= []).push(b); });
    return m;
  }, [data]);

  /** Walk up the aisle, step over to the bookcase, then open it. */
  const visit = (letter, [x, y, w, h]) => {
    if (walking) return;
    const to = `/catalog/shelf/${encodeURIComponent(letter)}`;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return navigate(to);
    const tall = h > w * 2;
    const tx = tall ? (x < 300 ? x + w + 14 : x - 14) : x + w / 2;
    const ty = tall ? y + h / 2 : y + h + 14;
    setWalking(true);
    setWalk({ x: 321, y: ty });
    setTimeout(() => setWalk({ x: tx, y: ty }), 450);
    setTimeout(() => navigate(to), 950);
  };

  return (
    <>
      <div className="lib-head">
        <div>
          <h1>Floor {floor.n}: {floorLabel(floor)}</h1>
          <p>Walk the floor and select a bookcase to open it. Take the stairs or the elevator to change floors.</p>
        </div>
        <Link to="/catalog?view=search" className="btn"><Search size={16} /> Search all books</Link>
      </div>

      {error && !data ? <ErrorState error={error} onRetry={retry} title="The shelves didn’t load" /> : loading && !data ? <TableSkeleton rows={5} /> : (
        <div className="scene" role="group" aria-label={`Floor ${floor.n} of the library`}>
          <div className="band" />
          <div className="room" />

          {SLOTS.map((slot, i) => {
            const letter = floor.letters[i];
            const [, , w, h] = slot;
            const cls = `slot ${h > w * 2 ? 'tall' : ''} ${h > 40 && w > h ? 'dbl' : ''}`;
            return letter ? (
              <button key={i} className={cls} style={box(slot)} onClick={() => visit(letter, slot)} aria-label={`Bookcase ${letter}, ${plural((byLetter[letter] || []).length, 'title')}`} title={`${letter}: ${plural((byLetter[letter] || []).length, 'title')}`}>
                <b>{letter}</b>
              </button>
            ) : <div key={i} className={`${cls} decor`} style={box(slot)} aria-hidden="true" />;
          })}

          <button className="stairs" style={{ left: '1.2%', top: '78%', width: '23%' }} onClick={() => travel(floorNo + 1)} disabled={floorNo >= FLOORS.length}>
            <StairsArt /><span>Stairs up</span>
          </button>
          <button className="stairs" style={{ left: '70%', top: '67%', width: '26%' }} onClick={() => travel(floorNo - 1)} disabled={floorNo <= 1}>
            <StairsArt /><span>Stairs down</span>
          </button>

          <div className="lift" style={{ left: '38.5%', top: '78%', width: '20.5%' }}>
            {liftOpen && (
              <div className="dock-panel" role="group" aria-label="Elevator: choose a floor">
                {[...FLOORS].reverse().map((f) => (
                  <button key={f.n} className="floor-btn" aria-current={f.n === floorNo ? 'true' : undefined} onClick={() => { setLiftOpen(false); travel(f.n, true); }}>
                    <b>{f.n}</b><span>Floor {f.n}<small>{floorLabel(f)}</small></span>
                  </button>
                ))}
              </div>
            )}
            <button className="stairs" onClick={() => setLiftOpen((o) => !o)} aria-expanded={liftOpen}>
              <ElevatorArt /><span>Elevator</span>
            </button>
          </div>

          <Walker x={walk.x} y={walk.y} />
        </div>
      )}
    </>
  );
}

/** /catalog shows the floors. Searches and category links from the rest of the app still open the old list. */
export default function LibraryEntry() {
  const [params] = useSearchParams();
  const searching = params.get('q') || params.get('category') || params.get('view') === 'search';
  return searching ? <Catalog /> : <Floor />;
}
