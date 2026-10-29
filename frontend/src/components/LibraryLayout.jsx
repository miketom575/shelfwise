import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, ChevronDown, DoorOpen, Filter, Search, X } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';
import { ElevatorPanel } from './ElevatorPanel';
import { NO_FILTER, buildFloors, buildShelves, categoriesOf, clampFloor, filterActive, floorOfKey, floorPath, parseKey, passes } from '../utils/library';

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

/** A dropdown in the site's colours (the browser's own list can't be styled to match). */
function Dropdown({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState(0);
  const box = useRef(null);
  const list = useRef(null);
  const current = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => { if (open) list.current?.children[hot]?.scrollIntoView({ block: 'nearest' }); }, [open, hot]);

  const show = () => { setHot(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); };
  const pick = (o) => { onChange(o.value); setOpen(false); };
  const onKey = (e) => {
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { show(); return; }
      setHot((h) => (e.key === 'ArrowDown' ? Math.min(options.length - 1, h + 1) : Math.max(0, h - 1)));
    } else if ((e.key === 'Enter' || e.key === ' ') && open) { e.preventDefault(); pick(options[hot]); }
  };

  return (
    <div className="dd" ref={box}>
      <button type="button" className="dd-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}>
        <span>{current.label}</span><ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <ul className="dd-list" role="listbox" aria-label={label} ref={list}>
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={`${i === hot ? 'hot' : ''} ${o.value === value ? 'sel' : ''}`} onMouseEnter={() => setHot(i)} onMouseDown={(e) => { e.preventDefault(); pick(o); }}>
              <span>{o.label}</span>{o.value === value && <Check size={15} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const AVAIL = [{ value: 'any', label: 'All books' }, { value: 'in', label: 'Available now' }, { value: 'out', label: 'On loan' }];

function FilterBar({ filter, setFilter, categories }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const on = filterActive(filter);
  const cats = [{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))];

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  return (
    <div className="lib-filter" ref={box}>
      <button type="button" className={`btn btn-sm filter-btn ${on ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true">
        <Filter size={15} aria-hidden="true" /> Filter {on && <span className="filter-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="filter-pop" role="group" aria-label="Filter books">
          <div className="fp-field">
            <span className="fp-label">Availability</span>
            <Dropdown label="Availability" value={filter.avail} onChange={(v) => setFilter({ ...filter, avail: v })} options={AVAIL} />
          </div>
          <div className="fp-field">
            <span className="fp-label">Category</span>
            <Dropdown label="Category" value={filter.category} onChange={(v) => setFilter({ ...filter, category: v })} options={cats} />
          </div>
          <div className="filter-actions">
            {on && <button className="btn btn-sm" type="button" onClick={() => setFilter(NO_FILTER)}><X size={14} /> Clear</button>}
            <button className="btn btn-primary btn-sm" type="button" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** "?" at the bottom left of a bookcase page: what the tags and ribbons on the books mean. */
function ShelfHelp() {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  return (
    <div className="help-wrap" ref={box}>
      {open && (
        <ul className="help-pop" id="shelf-help" aria-label="How to read the bookcase">
          <li><span className="hl-plain" /><span>No ribbon. It is on the shelf and you can borrow it today.</span></li>
          <li><span className="hl-book"><i>4d</i></span><span>On loan. The red ribbon counts the days until it is back. “due” means today or overdue.</span></li>
          <li className="tip">Hover a book for its title. Select one to take it off the shelf and open it.</li>
        </ul>
      )}
      <button type="button" className="key-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="shelf-help" aria-label={open ? 'Hide the help' : 'How to read the bookcase'} title="Help">
        {open ? '×' : '?'}
      </button>
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
      <div className="lib-tools">
        <Link to="/" className="hud-exit"><DoorOpen size={17} /> Leave library</Link>
        <div className="tools-right">
          <FilterBar filter={filter} setFilter={setFilter} categories={categories} />
          <Finder />
        </div>
      </div>
      <div className="lib-stage" ref={stage}>
        <Outlet context={ctx} />
      </div>
      {match && <FloorDock floor={floor} floors={floors} counts={counts} onTravel={travel} />}
      {(match || onFind) && <ShelfHelp />}
      <div className={`doors ${shut ? 'shut' : ''}`} aria-hidden="true"><i /><i /></div>
    </div>
  );
}