import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Info, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../context/ToastContext';
import { BookCover } from '../components/BookCover';
import { ErrorState } from '../components/Ui';
import { fmtDate } from '../utils/format';
import { NextAvailable } from '../components/NextAvailable';

function Copies({ book }) {
  const shown = Math.min(book.totalCopies, 14);
  const open = book.totalCopies > 14 ? Math.round((book.availableCopies / book.totalCopies) * 14) : book.availableCopies;
  return (
    <div className="copies" aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => <span key={i} className={`copy ${i < open ? '' : 'out'}`} />)}
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const from = useLocation().state?.from; // set when the book was opened from a bookcase
  const toast = useToast();
  const { data, error, loading, retry } = useAsync((signal) => api.get(`/books/${id}`, { signal }), [id]);
  const [busy, setBusy] = useState(false);
  const [borrowed, setBorrowed] = useState(null);

  if (loading && !data) return <div className="detail" aria-busy="true"><div className="skeleton sk-cover" /><div className="stack"><div className="skeleton" style={{ height: 52, width: '70%' }} /><div className="skeleton" style={{ height: 24, width: '40%' }} /><div className="skeleton" style={{ height: 120 }} /></div></div>;
  if (error && !data) {
    return error.status === 404
      ? <ErrorState title="That book isn’t in the catalog" error={{ message: 'It may have been archived or the link is wrong.' }} />
      : <ErrorState error={error} onRetry={retry} />;
  }

  const { book, eligibility } = data;

  const borrow = async () => {
    setBusy(true);
    try {
      const r = await api.post('/borrowings', { bookId: book.id });
      setBorrowed(r.loan);
      toast.success(`Borrowed. Due ${fmtDate(r.loan.dueDate)}.`);
      retry();
    } catch (err) {
      toast.error(err.message);
      retry(); // refresh counts: someone may have taken the last copy
    } finally {
      setBusy(false);
    }
  };

  const none = book.availableCopies === 0;

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        {from && <><Link to={from}>← Back to the bookcase</Link> / </>}
        <Link to="/catalog">Catalog</Link> / <Link to={`/catalog?category=${encodeURIComponent(book.category)}`}>{book.category}</Link>
      </nav>
      <div className="detail">
        <div className={none ? 'is-out' : ''}><BookCover book={book} /></div>
        <div>
          <h1>{book.title}</h1>
          <p className="by">by {book.author}</p>
          {book.description && <p className="desc">{book.description}</p>}

          <dl className="meta-list">
            <div><dt>Category</dt><dd>{book.category}</dd></div>
            <div><dt>Published</dt><dd>{book.publicationYear || '—'}</dd></div>
            <div><dt>ISBN</dt><dd>{book.isbn || '—'}</dd></div>
          </dl>

          <section className="borrow-box" aria-label="Borrow this book">
            <div className="row">
              <strong>{none ? 'No copies on the shelf' : `${book.availableCopies} of ${book.totalCopies} ${book.totalCopies === 1 ? 'copy' : 'copies'} on the shelf`}</strong>
            </div>
            <Copies book={book} />
            {none && <NextAvailable date={book.nextAvailableDate} />}

            <div style={{ marginTop: 18 }}>
              {eligibility.code === 'AUTH' ? (
                <Link to="/login" state={{ from: `/books/${book.id}` }} className="btn btn-primary btn-lg"><LogIn size={18} /> Sign in to borrow</Link>
              ) : eligibility.code === 'ADMIN' ? (
                <Link to="/admin/books" className="btn btn-lg"><ShieldCheck size={18} /> Manage in the workspace</Link>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={borrow} disabled={!eligibility.canBorrow || busy} aria-describedby={eligibility.reason ? 'borrow-reason' : undefined}>
                  {busy && <Loader2 size={18} className="spin" />} Borrow this book
                </button>
              )}
            </div>

            {eligibility.reason && eligibility.code !== 'AUTH' && eligibility.code !== 'ADMIN' && (
              <p className="reason" id="borrow-reason"><Info size={18} /> {eligibility.reason}</p>
            )}
            {borrowed && (
              <div style={{ marginTop: 16 }}>
                <span className="stamp stamp-in">Due {fmtDate(borrowed.dueDate)}</span>
                <p className="muted" style={{ marginTop: 10, fontSize: '0.9375rem' }}>Find this loan under <Link to="/my-borrowings">My borrowings</Link>.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
