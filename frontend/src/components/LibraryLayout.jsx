import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, DoorOpen, Filter, Search, X } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';
import { ElevatorPanel } from './ElevatorPanel';
import { NO_FILTER, buildFloors, buildShelves, categoriesOf, clampFloor, filterActive, floorLabel, floorOfKey, floorPath, parseKey, passes } from '../utils/library';

const StairsIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M3 20h5v-5h5v-5h5V5h3" /></svg>
);
const ElevatorIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 3v18M7 11l2-2 2 2M13 13l2 2 2-2" /></svg>
);

/** Stairs (one floor up or down) and elevator (pick or type a floor), shown while you're at a bookcase. */
function FloorDock({ floor, floors, counts, onTravel }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="dock">
      {open && <ElevatorPanel floors={floors} current={floor} counts={counts} onPick={(n) => { setOpen(false); onTravel(n, true); }} />}
      <div className="dock-bar">
        <div className="dock-group" role="group" aria-label="Stairs">
          <StairsIcon />
          <div className="dock-stack">
            <button onClick={() => onTravel(floor + 1)} disabled={floor >= floors.length} aria-label="Take the stairs up"><ArrowUp size={15} /></button>
            <button onClick={() => onTravel(floor - 1)} disabled={floor <= 1} aria-label="Take the stairs down"><ArrowDown size={15} /></button>
          </div>
          <span className="dock-label">Stairs</span>
        </div>
        <button className="dock-group dock-elev" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <ElevatorIcon />
          <span className="dock-label">Elevator · Floor {floor}</span>
        </button>
      </div>
    </div>
  );
}

/** Narrow the library: only books that are available (or on loan), and/or from one category. */
function FilterBar({ filter, setFilter, categories }) {
  return (
    <div className="lib-filter" role="group" aria-label="Filter books">
      <Filter size={16} aria-hidden="true" />
      <select className="select" value={filter.avail} onChange={(e) => setFilter({ ...filter, avail: e.target.value })} aria-label="Availability">
        <option value="any">All books</option>
        <option value="in">Available now</option>
        <option value="out">On loan</option>
      </select>
      <select className="select" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} aria-label="Category">
        <option value="">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {filterActive(filter) && <button className="btn btn-sm" type="button" onClick={() => setFilter(NO_FILTER)}><X size={14} /> Clear</button>}
    </div>
  );
}

/** A normal search bar. Searching makes a bookshelf named after what you typed. */
function Finder() {
  const navigate = useNavigate();
  const onFind = useMatch('/catalog/find');
  const [sp] = useSearchParams();
  const current = onFind ? sp.get('q') || sp.get('category') || '' : '';
  const [text, setText] = useState(current);
  useEffect(() => setText(current), [current]);

  const submit = (e) => {
    e.preventDefault();
    const q = text.trim();
    navigate(q ? `/catalog/find?q=${encodeURIComponent(q)}` : '/catalog');
  };
  return (
    <form className="finder" role="search" onSubmit={submit}>
      <div className="input-icon">
        <Search size={18} />
        <input className="input" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search books" aria-label="Search books by title, author, category or ISBN" />
      </div>
    </form>
  );
}

const readSpot = () => {
  try { return JSON.parse(sessionStorage.getItem('lms-spot')) || { type: 'lift' }; } catch { return { type: 'lift' }; }
};
const readFilter = () => {
  try { return { ...NO_FILTER, ...JSON.parse(sessionStorage.getItem('lms-filter')) }; } catch { return NO_FILTER; }
};

/** Fills the screen under the site's top bar. Loads the books once; remembers where the visitor stands and the filter. */
export function LibraryLayout() {
  const navigate = useNavigate();
  const match = useMatch('/catalog/shelf/:key');
  const onFind = useMatch('/catalog/find');
  const [sp] = useSearchParams();
  const lib = useLibrary();
  const stage = useRef(null);
  const [shut, setShut] = useState(false);
  const [spot, setSpotState] = useState(readSpot);
  const [filter, setFilterState] = useState(readFilter);
  const setSpot = useCallback((s) => {
    setSpotState(s);
    try { sessionStorage.setItem('lms-spot', JSON.stringify(s)); } catch { /* storage can be unavailable */ }
  }, []);
  const setFilter = useCallback((f) => {
    setFilterState(f);
    try { sessionStorage.setItem('lms-filter', JSON.stringify(f)); } catch { /* storage can be unavailable */ }
  }, []);

  // Sit just under the site's top bar and stop the page behind from scrolling.
  useEffect(() => {
    const bar = document.querySelector('.topbar');
    const fit = () => document.documentElement.style.setProperty('--lib-top', `${bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0}px`);
    window.scrollTo(0, 0);
    fit();
    const ro = bar ? new ResizeObserver(fit) : null;
    if (bar) ro.observe(bar);
    window.addEventListener('resize', fit);
    document.body.style.overflow = 'hidden';
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', fit);
      document.body.style.overflow = '';
    };
  }, []);

  const books = useMemo(() => lib.data || [], [lib.data]);
  const shelves = useMemo(() => buildShelves(books), [books]);
  const floors = useMemo(() => buildFloors(shelves), [shelves]);
  const categories = useMemo(() => categoriesOf(books), [books]);
  const floor = match ? floorOfKey(floors, parseKey(match.params.key)) : clampFloor(sp.get('floor'), floors.length);
  // With a filter on, the elevator shows how many matching books each floor holds.
  const counts = useMemo(
    () => (filterActive(filter) ? floors.map((f) => f.shelves.reduce((n, s) => n + s.books.filter((b) => passes(b, filter)).length, 0)) : null),
    [floors, filter],
  );

  const travel = (n, elevator = false) => {
    const target = clampFloor(n, floors.length);
    const go = () => {
      setSpot(elevator ? { type: 'lift' } : { type: target > floor ? 'down' : 'up' }); // arrive at the matching staircase
      navigate(floorPath(target));
      stage.current?.scrollTo?.({ top: 0 });
    };
    if (!elevator || (target === floor && !match)) return go();
    setShut(true); // doors close, the floor changes behind them, then they open
    setTimeout(go, 500);
    setTimeout(() => setShut(false), 1100);
  };

  const ctx = { travel, books, shelves, floors, spot, setSpot, filter, setFilter, counts, ready: !!lib.data, error: lib.error, retry: lib.retry };
  return (
    <div className={`lib ${match || onFind ? 'at-shelf' : 'at-floor'}`}>
      <header className="lib-hud">
        <Link to="/" className="hud-exit"><DoorOpen size={17} /> Leave library</Link>
        <span className="hud-floor">{onFind ? 'Search results' : `Floor ${floor} · ${floorLabel(floors[floor - 1] || floors[0])}`}</span>
        <FilterBar filter={filter} setFilter={setFilter} categories={categories} />
        <Finder />
      </header>
      <div className="lib-stage" ref={stage}>
        <Outlet context={ctx} />
      </div>
      {match && <FloorDock floor={floor} floors={floors} counts={counts} onTravel={travel} />}
      <div className={`doors ${shut ? 'shut' : ''}`} aria-hidden="true"><i /><i /></div>
    </div>
  );
}