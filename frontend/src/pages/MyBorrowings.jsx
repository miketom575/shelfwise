import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookMarked, CheckCheck, Clock, History, RotateCcw } from 'lucide-react';
import { api, qs } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../context/ToastContext';
import { BookCover } from '../components/BookCover';
import { ConfirmDialog, EmptyState, ErrorState, LoanBadge, Pagination, TableSkeleton } from '../components/Ui';
import { daysFromToday, fmtDate, fmtShort, plural, relativeDay } from '../utils/format';

function stampFor(loan) {
  const n = daysFromToday(loan.dueDate);
  if (n < 0) return { cls: 'late', text: `Overdue ${plural(-n, 'day')}` };
  if (n === 0) return { cls: 'soon', text: 'Due today' };
  if (n <= 3) return { cls: 'soon', text: `Due in ${plural(n, 'day')}` };
  return { cls: '', text: `Due ${fmtShort(loan.dueDate)}` };
}

/** Styled like the date-due slip glued inside a library book */
function Slip({ loan, onReturn }) {
  const book = loan.bookId || {};
  const s = stampFor(loan);
  const pending = loan.returnRequestStatus === 'pending';
  const declined = loan.returnRequestStatus === 'declined';
  return (
    <article className={`slip ${s.cls === 'late' ? 'late' : ''} ${pending ? 'is-pending' : ''}`}>
      <BookCover book={{ title: book.title || 'Removed book', author: book.author || '', category: book.category || '' }} small />
      <div>
        <h3>{book.id ? <Link to={`/books/${book.id}`}>{book.title}</Link> : 'Removed book'}</h3>
        <p className="by">{book.author}</p>
        <dl className="slip-rows" style={{ margin: '12px 0 0' }}>
          <div><dt>Borrowed</dt><dd>{fmtDate(loan.borrowDate)}</dd></div>
          <div><dt>Due</dt><dd>{fmtDate(loan.dueDate)}</dd></div>
          <div><dt>Return to</dt><dd>Library desk</dd></div>
        </dl>
        <span className={`stamp ${s.cls}`} title={`Due ${relativeDay(loan.dueDate)}`}>{s.text}</span>

        {pending ? (
          <p className="return-note pending" role="status"><Clock size={16} /> Return requested{loan.returnRequestedAt ? ` ${fmtShort(loan.returnRequestedAt)}` : ''}. Waiting for a librarian to approve it.</p>
        ) : (
          <>
            {declined && <p className="return-note declined" role="status"><AlertTriangle size={16} /> A librarian declined your last return request. Check with the library desk, then try again.</p>}
            <button className="btn btn-primary return-btn" onClick={() => onReturn(loan)}>
              {declined ? <RotateCcw size={16} /> : <CheckCheck size={16} />} {declined ? 'Request return again' : 'Return book'}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default function MyBorrowings() {
  const toast = useToast();
  const [tab, setTab] = useState('borrowed');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, error, loading, retry } = useAsync(
    (signal) => api.get(`/borrowings${qs({ status: tab, page, limit: tab === 'borrowed' ? 50 : 10 })}`, { signal }),
    [tab, page]
  );
  const counts = data?.counts;
  const pick = (t) => { setTab(t); setPage(1); };

  const requestReturn = async () => {
    setBusy(true);
    try {
      await api.post(`/borrowings/${confirm.id}/return-request`);
      toast.success('Return requested. It moves to your history once a librarian approves it.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setConfirm(null);
      retry();
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My borrowings</h1>
          <p>Books you have right now, and everything you’ve returned.</p>
        </div>
        <div className="tabs" role="tablist" aria-label="Loan list">
          <button className="tab" role="tab" aria-selected={tab === 'borrowed'} onClick={() => pick('borrowed')}>On loan {counts && <small>{counts.borrowed}</small>}</button>
          <button className="tab" role="tab" aria-selected={tab === 'returned'} onClick={() => pick('returned')}>History {counts && <small>{counts.returned}</small>}</button>
        </div>
      </div>

      {counts?.overdue > 0 && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 8 }}>
          <AlertTriangle size={18} />
          <span>You have {plural(counts.overdue, 'overdue book')}. Return {counts.overdue === 1 ? 'it' : 'them'} to the library desk before borrowing again.</span>
        </div>
      )}

      {error && !data ? <ErrorState error={error} onRetry={retry} /> : loading && !data ? <TableSkeleton rows={3} /> : tab === 'borrowed' ? (
        data.data.length === 0 ? (
          <EmptyState icon={BookMarked} title="Nothing on loan" action={<Link to="/catalog" className="btn btn-primary">Browse the catalog</Link>}>
            When you borrow a book, its due date shows up here.
          </EmptyState>
        ) : (
          <div className="slips">{data.data.map((l) => <Slip key={l.id} loan={l} onReturn={setConfirm} />)}</div>
        )
      ) : data.data.length === 0 ? (
        <EmptyState icon={History} title="No returned books yet">Your history fills in once a librarian approves a return.</EmptyState>
      ) : (
        <>
          <div className="table-wrap" style={{ marginTop: 22 }}>
            <table className="table">
              <caption className="sr-only">Returned books</caption>
              <thead><tr><th>Book</th><th>Borrowed</th><th>Returned</th><th>Status</th></tr></thead>
              <tbody>
                {data.data.map((l) => (
                  <tr key={l.id}>
                    <td><div className="title-cell">{l.bookId?.title || 'Removed book'}</div><div className="sub">{l.bookId?.author}</div></td>
                    <td className="num">{fmtDate(l.borrowDate)}</td>
                    <td className="num">{fmtDate(l.returnDate)}</td>
                    <td><LoanBadge status="returned" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}

      {confirm && (
        <ConfirmDialog title="Return this book?" confirmLabel="Request return" busy={busy} onConfirm={requestReturn} onCancel={() => setConfirm(null)}>
          This sends “{confirm.bookId?.title}” back to the library desk. A librarian has to approve the return. Until then it stays on your list as pending.
        </ConfirmDialog>
      )}
    </>
  );
}