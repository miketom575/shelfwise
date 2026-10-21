import { useEffect, useState } from 'react';
import { CheckCheck, Download, ClipboardX, Search } from 'lucide-react';
import { api, qs } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog, EmptyState, ErrorState, LoanBadge, Pagination, TableSkeleton } from '../../components/Ui';
import { fmtDate, relativeDay } from '../../utils/format';

const TABS = [['', 'All', 'all'], ['borrowed', 'On loan', 'borrowed'], ['overdue', 'Overdue', 'overdue'], ['returned', 'Returned', 'returned']];

export default function AdminBorrowings() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 300);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(1), [status, dq]);
  const { data, error, loading, retry } = useAsync((signal) => api.get(`/borrowings${qs({ status, q: dq, page, limit: 10 })}`, { signal }), [status, dq, page]);

  const markReturned = async () => {
    setBusy(true);
    try {
      await api.put(`/borrowings/${confirm.id}`, { status: 'returned' });
      toast.success('Return recorded. The copy is back on the shelf.');
      setConfirm(null);
    } catch (err) {
      toast.error(err.message);
      setConfirm(null);
    } finally { setBusy(false); retry(); }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Borrowings</h1><p>Every loan, who has it, and when it’s due back.</p></div>
        <a className="btn" href={`/api/borrowings/export${qs({ status, q: dq })}`} download><Download size={16} /> Export CSV</a>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Loan status">
          {TABS.map(([value, label, key]) => (
            <button key={key} className="tab" role="tab" aria-selected={status === value} onClick={() => setStatus(value)}>
              {label} {data?.counts && <small>{data.counts[key]}</small>}
            </button>
          ))}
        </div>
        <div className="input-icon"><Search size={18} /><input className="input" type="search" placeholder="Search borrower or book" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search borrowings" /></div>
      </div>

      {error && !data ? <ErrorState error={error} onRetry={retry} /> : loading && !data ? <TableSkeleton /> : data.total === 0 ? (
        <EmptyState icon={ClipboardX} title="No loans match">Try another status or search term.</EmptyState>
      ) : (
        <>
          <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="table">
              <caption className="sr-only">Borrowing records</caption>
              <thead><tr><th>Borrower</th><th>Book</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Status</th><th className="actions"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.data.map((l) => (
                  <tr key={l.id}>
                    <td><div style={{ fontWeight: 600 }}>{l.userId?.name || 'Deleted user'}</div><div className="sub">{l.userId?.email}</div></td>
                    <td><div className="title-cell">{l.bookId?.title || 'Deleted book'}</div><div className="sub">{l.bookId?.author}</div></td>
                    <td className="num">{fmtDate(l.borrowDate)}</td>
                    <td className="num">{fmtDate(l.dueDate)}{l.status === 'borrowed' && <div className="sub" style={{ color: l.isOverdue ? 'var(--stamp)' : undefined }}>{relativeDay(l.dueDate)}</div>}</td>
                    <td className="num">{fmtDate(l.returnDate)}</td>
                    <td><LoanBadge status={l.displayStatus} /></td>
                    <td className="actions">
                      {l.status === 'borrowed' && <button className="btn btn-sm btn-primary" onClick={() => setConfirm(l)}><CheckCheck size={15} /> Mark returned</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}

      {confirm && (
        <ConfirmDialog title="Record this return?" confirmLabel="Mark returned" busy={busy} onConfirm={markReturned} onCancel={() => setConfirm(null)}>
          {confirm.userId?.name} is returning “{confirm.bookId?.title}”. One copy goes back on the shelf, and the loan stays in the history.
        </ConfirmDialog>
      )}
    </>
  );
}
