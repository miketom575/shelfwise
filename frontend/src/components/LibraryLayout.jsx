import { useEffect, useState } from 'react';
import { Outlet, useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { FLOORS, clampFloor, floorLabel, floorOf } from '../utils/library';

const Stairs = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M3 20h5v-5h5v-5h5V5h3" /></svg>
);
const Elevator = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 3v18M7 11l2-2 2 2M13 13l2 2 2-2" /></svg>
);

function FloorDock({ floor, onTravel }) {
  const [open, setOpen] = useState(false);
  const top = FLOORS.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="dock">
      {open && (
        <div className="dock-panel" role="group" aria-label="Elevator: choose a floor">
          {[...FLOORS].reverse().map((f) => (
            <button key={f.n} className="floor-btn" aria-current={f.n === floor ? 'true' : undefined} onClick={() => { setOpen(false); onTravel(f.n, true); }}>
              <b>{f.n}</b><span>Floor {f.n}<small>{floorLabel(f)}</small></span>
            </button>
          ))}
        </div>
      )}
      <div className="dock-bar">
        <div className="dock-group" role="group" aria-label="Stairs">
          <Stairs />
          <div className="dock-stack">
            <button onClick={() => onTravel(floor + 1)} disabled={floor >= top} aria-label="Take the stairs up"><ArrowUp size={15} /></button>
            <button onClick={() => onTravel(floor - 1)} disabled={floor <= 1} aria-label="Take the stairs down"><ArrowDown size={15} /></button>
          </div>
          <span className="dock-label">Stairs</span>
        </div>
        <button className="dock-group dock-elev" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Elevator />
          <span className="dock-label">Elevator · Floor {floor}</span>
        </button>
      </div>
    </div>
  );
}

/** Wraps /catalog and /catalog/shelf/:letter so the dock stays mounted while you change floors. */
export function LibraryLayout() {
  const navigate = useNavigate();
  const match = useMatch('/catalog/shelf/:letter');
  const [sp] = useSearchParams();
  const [shut, setShut] = useState(false);
  const searching = !!(sp.get('q') || sp.get('category') || sp.get('view') === 'search');
  const floor = match ? floorOf(decodeURIComponent(match.params.letter).toUpperCase()) : clampFloor(sp.get('floor'));

  const travel = (n, elevator = false) => {
    const target = clampFloor(n);
    const go = () => { navigate(target === 1 ? '/catalog' : `/catalog?floor=${target}`); window.scrollTo({ top: 0 }); };
    if (!elevator || (target === floor && !match)) return go();
    setShut(true); // doors close, the page changes behind them, then they open
    setTimeout(go, 500);
    setTimeout(() => setShut(false), 1100);
  };

  return (
    <div className="lib">
      <Outlet context={{ travel }} />
      {match && !searching && <FloorDock floor={floor} onTravel={travel} />}
      <div className={`doors ${shut ? 'shut' : ''}`} aria-hidden="true"><i /><i /></div>
    </div>
  );
}
