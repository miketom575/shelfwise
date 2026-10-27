import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SearchX } from 'lucide-react';
import { api, qs } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { BookCover } from '../components/BookCover';
import { Availability, BookGridSkeleton, EmptyState, ErrorState, Pagination } from '../components/Ui';
import { plural } from '../utils/format';

export function BookCard({ book }) {
  return (
    <Link to={`/books/${book.id}`} className="book-card">
      <BookCover book={book} />
      <div>
        <h3>{book.title}</h3>
        <p className="by">{book.author}</p>
        <Availability book={book} />
      </div>
    </Link>
  );
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'title';
  const available = params.get('available') === 'true';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [text, setText] = useState(q);
  const debounced = useDebounce(text, 300); // wait for a pause in typing before querying

  const patch = (changes) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(changes).forEach(([k, v]) => (v === '' || v === false || v == null ? next.delete(k) : next.set(k, String(v))));
      return next;
    }, { replace: true });

  useEffect(() => {
    if (debounced !== q) patch({ q: debounced, page: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  useEffect(() => { if (text === debounced) setText(q); /* external navigation */ }, [q]); // eslint-disable-line

  const cats = useAsync((signal) => api.get('/books/categories', { signal }), []);
  const list = useAsync((signal) => api.get(`/books${qs({ q, category, sort, available, page, limit: 12 })}`, { signal }), [q, category, sort, available, page]);
  const total = list.data?.total ?? 0;
  const dim = list.loading && list.data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Catalog</h1>
          <p>Search the collection and see which copies are on the shelf.</p>
        </div>
      </div>

      <div className="filters">
        <div className="filter-bar" role="search">
          <div className="input-icon">
            <Search size={18} />
            <input className="input" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search title, author, category or ISBN" aria-label="Search books" />
          </div>
          <select className="select" value={sort} onChange={(e) => patch({ sort: e.target.value, page: '' })} aria-label="Sort books">
            <option value="title">Title A to Z</option>
            <option value="author">Author A to Z</option>
            <option value="newest">Newest additions</option>
            <option value="year">Publication year</option>
            <option value="available">Most available</option>
          </select>
          <label className="check"><input type="checkbox" checked={available} onChange={(e) => patch({ available: e.target.checked, page: '' })} /> Available now</label>
        </div>
        <div className="chips" role="group" aria-label="Filter by category">
          <button className="chip" aria-pressed={!category} onClick={() => patch({ category: '', page: '' })}>All</button>
          {(cats.data?.data || []).map((c) => (
            <button key={c.name} className="chip" aria-pressed={category === c.name} onClick={() => patch({ category: category === c.name ? '' : c.name, page: '' })}>
              {c.name} <span className="faint">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      {list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.retry} title="The catalog didn’t load" />
      ) : list.loading && !list.data ? (
        <BookGridSkeleton />
      ) : total === 0 ? (
        <EmptyState icon={SearchX} title="No books match your search" action={<button className="btn" onClick={() => { setText(''); setParams({}, { replace: true }); }}>Clear filters</button>}>
          Try a different spelling, or remove a filter to see more of the collection.
        </EmptyState>
      ) : (
        <div style={{ opacity: dim ? 0.6 : 1, transition: 'opacity 160ms' }} aria-live="polite">
          <p className="result-meta">{plural(total, 'book')}{q && <> matching “{q}”</>}{category && <> in {category}</>}</p>
          <div className="book-grid">{list.data.data.map((b) => <BookCard key={b.id} book={b} />)}</div>
          <Pagination page={list.data.page} pages={list.data.pages} onChange={(p) => { patch({ page: p === 1 ? '' : p }); window.scrollTo({ top: 0 }); }} />
        </div>
      )}
    </>
  );
}
