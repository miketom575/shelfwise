import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useMatch, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ListFilter, SearchX } from 'lucide-react';
import { EmptyState, ErrorState, TableSkeleton } from '../components/Ui';
import { fmtDate, hash, plural } from '../utils/format';
import { NO_FILTER, SHELF_CAP, SPINES, filterActive, findShelf, floorOfKey, floorPath, letterName, parseKey, passes, shelfLabel, shelfPath } from '../utils/library';

const BOOKS_PER_ROW = 10;
const out = (b) => b.availableCopies === 0;
const pad = (n) => String(n).padStart(2, '0');

/** Splits a number of milliseconds into days, hours, minutes and seconds. */
const parts = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};
/** Short live label on a spine: 3d, 5h, 12m, 45s (or "due" / "?"). */
const shortLeft = (date, now) => {
  if (!date) return '?';
  const ms = new Date(date).getTime() - now;
  if (ms <= 0) return 'due';
  const { d, h, m, s } = parts(ms);
  return d ? `${d}d` : h ? `${h}h` : m ? `${m}m` : `${s}s`;
};
/** Full countdown used in the hover tip: 3d 05:12:09. */
const fullLeft = (date, now) => {
  if (!date) return 'return date unknown';
  const ms = new Date(date).getTime() - now;
  if (ms <= 0) return 'due back any day now';
  const { d, h, m, s } = parts(ms);
  return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
};

/** One shared clock for every timer on the page (ticks once a second). */
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** A book on the shelf. Selecting it opens its details in this same tab (the Back link returns to the bookcase). */
function Spine({ book, now }) {
  const loc = useLocation();
  const h = hash(book.title);
  const [bg, ink] = SPINES[h % SPINES.length];
  const timer = out(book)
    ? `On loan, back in ${fullLeft(book.nextAvailableDate, now)}`
    : `Available now, ${book.availableCopies} of ${book.totalCopies} ${book.totalCopies === 1 ? 'copy' : 'copies'} on the shelf`;
  const tip = `${book.title}, ${book.author} · ${timer}${out(book) && book.nextAvailableDate ? ` (${fmtDate(book.nextAvailableDate)})` : ''}`;
  return (
    <Link
      to={`/books/${book.id}`}
      state={{ from: `${loc.pathname}${loc.search}` }}
      className={`sp ${out(book) ? 'out' : ''}`}
      style={{ '--c': bg, '--ink': ink, '--h': `${170 + (h % 40)}px`, '--w': `${34 + ((h >> 4) % 14)}px` }}
      data-tip={tip}
      aria-label={`${book.title} by ${book.author}. ${timer}.`}
    >
      <span>{book.title}</span>
      <em className={`tag ${out(book) ? '' : 'ok'}`}>{out(book) ? shortLeft(book.nextAvailableDate, now) : 'now'}</em>
    </Link>
  );
}

/** Everything shown on this bookcase that is out, with a live countdown to the next return. */
function OnLoan({ books }) {
  const loc = useLocation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!books.length) return null;
  const left = (date) => {
    if (!date) return 'No return date yet';
    const s = Math.floor((new Date(date).getTime() - now) / 1000);
    if (s <= 0) return 'Due back any day now';
    return `${Math.floor(s / 86400)}d ${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  };
  const sorted = [...books].sort((a, b) => new Date(a.nextAvailableDate || 8.64e15) - new Date(b.nextAvailableDate || 8.64e15));
  return (
    <section className="loans" aria-label="Books on loan from this bookcase">
      <h2>On loan from this bookcase</h2>
      <ul>
        {sorted.map((b) => (
          <li key={b.id}>
            <span><Link to={`/books/${b.id}`} state={{ from: `${loc.pathname}${loc.search}` }}><strong>{b.title}</strong></Link><span className="by">{b.author}</span></span>
            <span className="when">{b.nextAvailableDate ? `Back ${fmtDate(b.nextAvailableDate)}` : ''}<b>{left(b.nextAvailableDate)}</b></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Works out what to show: a lettered bookcase (/catalog/shelf/A-2) or a search bookshelf (/catalog/find?q=anr). */
function useView() {
  const { shelves, floors, books } = useOutletContext();
  const find = useMatch('/catalog/find');
  const { key } = useParams();
  const [sp] = useSearchParams();
  const spKey = sp.toString();

  return useMemo(() => {
    if (find) {
      const r = findShelf(books, sp);
      return { search: true, title: `“${r.name}”`, plate: r.name, n: r.n, of: r.of, books: r.books, total: r.total, prev: r.prev, next: r.next, prevLabel: `Shelf ${r.n - 1}`, nextLabel: `Shelf ${r.n + 1}`, back: '/catalog', backLabel: 'Back to the floors',
        blurb: `${plural(r.total, 'book')} match “${r.name}”${r.of > 1 ? `, spread over ${r.of} bookcases of up to ${SHELF_CAP}` : ''}.` };
    }
    const k = parseKey(key);
    const i = shelves.findIndex((s) => s.key === k);
    if (i < 0) return null;
    const s = shelves[i], fl = floorOfKey(floors, s.key);
    return { search: false, shelfKey: s.key, title: `Bookcase ${letterName(s.letter)}`, plate: letterName(s.letter), n: s.n, of: s.of, books: s.books, total: s.books.length,
      prev: shelves[i - 1] ? shelfPath(shelves[i - 1]) : null, next: shelves[i + 1] ? shelfPath(shelves[i + 1]) : null,
      prevLabel: shelves[i - 1] && shelfLabel(shelves[i - 1]), nextLabel: shelves[i + 1] && shelfLabel(shelves[i + 1]),
      back: floorPath(fl), backLabel: `Back to floor ${fl}`, blurb: `${plural(s.books.length, 'book')} on this bookcase${s.of > 1 ? ` (${s.n} of ${s.of} for ${letterName(s.letter)})` : ''}.` };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [find, key, books, shelves, floors, spKey]);
}

export default function Shelf() {
  const { ready, error, retry, setSpot, filter, setFilter } = useOutletContext();
  const view = useView();
  const now = useNow();
  const active = filterActive(filter);

  // Whichever bookcase you are at is where your visitor is standing when you head back to the floor.
  const shelfKey = view?.shelfKey;
  useEffect(() => { if (shelfKey) setSpot({ type: 'shelf', key: shelfKey }); }, [shelfKey, setSpot]);

  const per = BOOKS_PER_ROW; // fixed, so resizing the window never reflows the bookcase

  const shown = view ? view.books.filter((b) => passes(b, filter)) : [];
  const rows = [];
  for (let i = 0; i < shown.length; i += per) rows.push(shown.slice(i, i + per));
  while (rows.length < 2) rows.push([]);
  const loans = shown.filter(out);

  return (
    <div className="shelf-page">
      <div className="lib-head">
        <div>
          {view && <Link to={view.back} className="back"><ArrowLeft size={16} /> {view.backLabel}</Link>}
          <h1>{view ? view.title : 'Bookcase'}</h1>
          <p>
            {view ? <>{view.blurb}{active ? ` Your filter shows ${shown.length} of ${view.books.length} here.` : ''} Hover a book for its title, or select it to see its details. Every book has a timer: gray books are on loan ({loans.length} here) and count down to their return, and “now” means you can borrow it today.</> : ready ? 'We can’t find that bookcase.' : 'Opening the bookcase…'}
          </p>
        </div>
        {view && (view.prev || view.next) && (
          <div className="letter-nav">
            {view.prev ? <Link className="btn btn-sm" to={view.prev} aria-label={`Previous bookcase ${view.prevLabel}`}><ChevronLeft size={16} /> {view.prevLabel}</Link> : <span />}
            {view.next ? <Link className="btn btn-sm" to={view.next} aria-label={`Next bookcase ${view.nextLabel}`}>{view.nextLabel} <ChevronRight size={16} /></Link> : <span />}
          </div>
        )}
      </div>

      <div className="bay">
        {error && !ready ? <ErrorState error={error} onRetry={retry} title="This bookcase didn’t load" /> : !ready ? <TableSkeleton rows={3} /> : !view ? (
          <EmptyState icon={SearchX} title="That bookcase isn’t on this floor plan" action={<Link className="btn btn-primary" to="/catalog">Back to the floors</Link>}>The shelves are rearranged as books are added, so an old link may point nowhere.</EmptyState>
        ) : view.total === 0 ? (
          <EmptyState icon={SearchX} title={`No books match ${view.title}`} action={<Link className="btn btn-primary" to="/catalog">Back to the floors</Link>}>Try fewer letters, or search by author, category or ISBN.</EmptyState>
        ) : active && shown.length === 0 ? (
          <EmptyState icon={ListFilter} title="Nothing here matches your filter" action={<button className="btn btn-primary" onClick={() => setFilter(NO_FILTER)}>Clear the filter</button>}>This bookcase has {plural(view.books.length, 'book')}, but none of them are {filter.avail === 'in' ? 'available now' : filter.avail === 'out' ? 'on loan' : 'in that category'}{filter.category && filter.avail !== 'any' ? ` in ${filter.category}` : ''}.</EmptyState>
        ) : (
          <div className="case-frame">
            <div className="case-top">
              <span className="case-name">{view.plate}</span>
              <span className="case-meta">{view.of > 1 ? `${view.n} of ${view.of} · ` : ''}{active ? `${shown.length} of ${view.books.length} shown` : `${view.books.length} / ${SHELF_CAP} books`}</span>
            </div>
            {rows.map((row, r) => (
              <div className="bay-row" key={r}>
                <div className="books">{row.map((b) => <Spine key={b.id} book={b} now={now} />)}</div>
              </div>
            ))}
            <div className="case-base" />
          </div>
        )}
      </div>

      <OnLoan books={loans} />
    </div>
  );
}