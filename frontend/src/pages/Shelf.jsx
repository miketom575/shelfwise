import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';
import { ErrorState, TableSkeleton } from '../components/Ui';
import { fmtDate, hash, plural } from '../utils/format';
import { LETTERS, SPINES, floorOf, letterOf } from '../utils/library';

const out = (b) => b.availableCopies === 0;
const pad = (n) => String(n).padStart(2, '0');

/** Short label for the spine: 3d, 5h, 12m. */
const shortLeft = (date) => {
  if (!date) return '?';
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return 'due';
  if (ms >= 864e5) return `${Math.floor(ms / 864e5)}d`;
  if (ms >= 36e5) return `${Math.floor(ms / 36e5)}h`;
  return `${Math.max(1, Math.floor(ms / 6e4))}m`;
};

/** A book on the shelf. Select it to open its details in a new tab. */
function Spine({ book }) {
  const h = hash(book.title);
  const [bg, ink] = SPINES[h % SPINES.length];
  const tip = `${book.title}, ${book.author}${out(book) ? ` · on loan, back ${book.nextAvailableDate ? fmtDate(book.nextAvailableDate) : 'date unknown'}` : ''}`;
  return (
    <a
      href={`/books/${book.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`sp ${out(book) ? 'out' : ''}`}
      style={{ '--c': bg, '--ink': ink, '--h': `${160 + (h % 40)}px`, '--w': `${30 + ((h >> 4) % 14)}px` }}
      data-tip={tip}
      aria-label={`${book.title} by ${book.author}. ${out(book) ? 'On loan.' : 'Available.'} Opens in a new tab.`}
    >
      <span>{book.title}</span>
      {out(book) && <em className="tag">{shortLeft(book.nextAvailableDate)}</em>}
    </a>
  );
}

/** Everything from this shelf that is out, with a live countdown to the next return. */
function OnLoan({ books }) {
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
    <section className="loans" aria-label="Books on loan from this shelf">
      <h2>On loan from this shelf</h2>
      <ul>
        {sorted.map((b) => (
          <li key={b.id}>
            <a href={`/books/${b.id}`} target="_blank" rel="noopener noreferrer"><strong>{b.title}</strong></a>
            <span className="by">{b.author}</span>
            <span className="when">{b.nextAvailableDate ? `Back ${fmtDate(b.nextAvailableDate)}` : ''}<b>{left(b.nextAvailableDate)}</b></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Shelf() {
  const { letter: raw } = useParams();
  const L = (decodeURIComponent(raw || '')[0] || '#').toUpperCase();
  const letter = /^[A-Z#]$/.test(L) ? L : '#';
  const { data, error, loading, retry } = useLibrary();

  const bay = useRef(null);
  const [per, setPer] = useState(10);
  useEffect(() => {
    const el = bay.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPer(Math.max(3, Math.floor((e.contentRect.width - 56) / 50))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const books = useMemo(() => (data || []).filter((b) => letterOf(b.title) === letter), [data, letter]);
  const loans = books.filter(out);
  const rows = [];
  for (let i = 0; i < books.length; i += per) rows.push(books.slice(i, i + per));
  while (rows.length < 3) rows.push([]);

  const i = LETTERS.indexOf(letter);
  const prev = LETTERS[i - 1], next = LETTERS[i + 1];
  const nav = (l) => `/catalog/shelf/${encodeURIComponent(l)}`;
  const fl = floorOf(letter);

  return (
    <>
      <div className="lib-head">
        <div>
          <Link to={fl === 1 ? '/catalog' : `/catalog?floor=${fl}`} className="back"><ArrowLeft size={16} /> Back to floor {fl}</Link>
          <h1>Bookcase {letter}</h1>
          <p>
            {loading && !data ? 'Opening the bookcase…' : `${plural(books.length, 'title')}${loans.length ? `, ${loans.length} on loan` : ''}. Hover a book for its title, or select it to open its details in a new tab. Gray books are on loan and show how long until they’re back.`}
          </p>
        </div>
        <div className="letter-nav">
          {prev ? <Link className="btn btn-sm" to={nav(prev)} aria-label={`Bookcase ${prev}`}><ChevronLeft size={16} /> {prev}</Link> : <span />}
          {next ? <Link className="btn btn-sm" to={nav(next)} aria-label={`Bookcase ${next}`}>{next} <ChevronRight size={16} /></Link> : <span />}
        </div>
      </div>

      <div className="bay" ref={bay}>
        {error && !data ? <ErrorState error={error} onRetry={retry} title="This bookcase didn’t load" /> : loading && !data ? <TableSkeleton rows={3} /> : (
          <div className="bay-frame">
            {books.length === 0 && <p className="bay-note">Nothing is shelved under {letter} yet.</p>}
            {rows.map((row, r) => (
              <div className="bay-row" key={r}>
                <div className="books">{row.map((b) => <Spine key={b.id} book={b} />)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <OnLoan books={loans} />
    </>
  );
}
