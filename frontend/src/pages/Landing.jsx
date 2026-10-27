import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { api, qs } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Spine } from '../components/BookCover';
import { coverColor, plural } from '../utils/format';

export default function Landing() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const shelf = useAsync((signal) => api.get(`/books${qs({ limit: 14, sort: 'newest' })}`, { signal }), []);
  const cats = useAsync((signal) => api.get('/books/categories', { signal }), []);
  const cfg = useAsync((signal) => api.get('/config', { signal }), []);
  const loanDays = cfg.data?.loanDays ?? 14;

  const submit = (e) => {
    e.preventDefault();
    navigate(`/catalog${qs({ q: q.trim() })}`);
  };

  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div>
            <h1>Find the book. Borrow it. Know when it’s due.</h1>
            <p className="hero-lede">
              Search the catalog, see which copies are on the shelf right now, and keep every loan and due date in one place.
            </p>
            <form className="hero-search" onSubmit={submit} role="search">
              <div className="input-icon">
                <Search size={18} />
                <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, author or category" aria-label="Search the catalog" />
              </div>
              <button className="btn btn-primary btn-lg" type="submit">Search</button>
            </form>
            <div className="hero-cta">
              {user ? (
                <Link to={isAdmin ? '/admin' : '/my-borrowings'} className="btn">{isAdmin ? 'Open the admin workspace' : 'See my borrowings'} <ArrowRight size={16} /></Link>
              ) : (
                <>
                  <Link to="/register" className="btn">Create a free account</Link>
                  <span className="muted" style={{ fontSize: '0.9375rem' }}>No account needed to browse.</span>
                </>
              )}
            </div>
          </div>

          <div className="shelf-wrap">
            <div className="shelf" aria-label="Recently added books">
              {shelf.loading && !shelf.data
                ? Array.from({ length: 10 }, (_, i) => <div key={i} className="spine skeleton" style={{ '--h': `${150 + ((i * 37) % 90)}px`, '--w': '40px' }} />)
                : shelf.data?.data.map((b, i) => <Spine key={b.id} book={b} index={i} />)}
            </div>
            <div className="plank" />
            <p className="shelf-caption">
              {shelf.error ? 'The shelf is empty because the catalog couldn’t be reached.' : 'Recently added. Select a spine to open the book.'}
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="cats">
        <div className="section-head">
          <h2 id="cats">Browse by category</h2>
          <Link to="/catalog">View the whole catalog</Link>
        </div>
        <div className="cat-grid">
          {(cats.data?.data || []).map((c) => (
            <Link key={c.name} to={`/catalog${qs({ category: c.name })}`} className="cat-tile" style={{ '--c': coverColor(c.name) }}>
              <span>{c.name}</span>
              <small>{plural(c.count, 'title')}</small>
            </Link>
          ))}
          {cats.loading && !cats.data && Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      </section>

      <section className="section" aria-labelledby="how">
        <div className="section-head"><h2 id="how">How borrowing works</h2></div>
        <ol className="how" style={{ padding: 0, margin: 0 }}>
          <li>
            <h3>Find a book</h3>
            <p>Search by title, author or category. Each book shows how many copies are on the shelf.</p>
          </li>
          <li>
            <h3>Borrow a copy</h3>
            <p>Sign in and borrow an available copy. Your due date is set automatically for {loanDays} days.</p>
          </li>
          <li>
            <h3>Return it</h3>
            <p>Hand it back to a librarian, who records the return. Your history keeps every loan.</p>
          </li>
        </ol>
      </section>
    </>
  );
}
