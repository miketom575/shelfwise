import { useEffect, useRef } from 'react';
import { AlertTriangle, BookOpen, ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react';

/* ---------- Modal with focus trap, Escape to close, and focus restore ---------- */
export function Modal({ title, onClose, children, footer, small = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement;
    const node = ref.current;
    const focusables = () => [...node.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
    (node.querySelector('[data-autofocus]') || focusables()[0])?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${small ? 'modal-sm' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, children, confirmLabel, danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Modal
      small
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy} data-autofocus>
            {busy && <Loader2 size={16} className="spin" />} {confirmLabel}
          </button>
        </>
      }
    >
      <div className="muted">{children}</div>
    </Modal>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) items.push('gap-' + n);
    items.push(n);
  });
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} /> Prev</button>
      {items.map((n) =>
        typeof n === 'string' ? (
          <span className="gap" key={n} aria-hidden="true">…</span>
        ) : (
          <button key={n} className="btn btn-sm btn-icon" aria-current={n === page ? 'page' : undefined} aria-label={`Page ${n}`} onClick={() => onChange(n)}>{n}</button>
        )
      )}
      <button className="btn btn-sm" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">Next <ChevronRight size={16} /></button>
    </nav>
  );
}

/* ---------- Badges ---------- */
const LOAN = {
  borrowed: ['badge badge-loan', 'On loan'],
  overdue: ['badge badge-late', 'Overdue'],
  returned: ['badge badge-ok', 'Returned'],
};
export function LoanBadge({ status }) {
  const [cls, label] = LOAN[status] || LOAN.borrowed;
  return <span className={cls}>{label}</span>;
}

export function AccountBadge({ status }) {
  return <span className={`badge ${status === 'active' ? 'badge-ok' : 'badge-late'}`}>{status === 'active' ? 'Active' : 'Suspended'}</span>;
}

export function Availability({ book }) {
  const { availableCopies: a, totalCopies: t } = book;
  const cls = a === 0 ? 'none' : a === 1 && t > 1 ? 'few' : '';
  return (
    <span className={`avail ${cls}`}>
      <i />
      {a === 0 ? (t === 0 ? 'No copies' : 'All on loan') : `${a} of ${t} available`}
    </span>
  );
}

/* ---------- Loading / empty / error ---------- */
export function BookGridSkeleton({ n = 8 }) {
  return (
    <div className="book-grid" aria-busy="true" aria-label="Loading books">
      {Array.from({ length: n }, (_, i) => (
        <div key={i}>
          <div className="skeleton sk-cover" />
          <div className="skeleton sk-line" style={{ width: '85%' }} />
          <div className="skeleton sk-line" style={{ width: '55%' }} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="panel panel-pad" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 22, marginBlock: 16, width: `${96 - (i % 3) * 9}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = BookOpen, title, children, action }) {
  return (
    <div className="state">
      <Icon size={36} strokeWidth={1.5} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'We couldn’t load this' }) {
  return (
    <div className="state error" role="alert">
      <AlertTriangle size={36} strokeWidth={1.5} />
      <h3>{title}</h3>
      <p>{error?.message || 'Something went wrong.'}</p>
      {onRetry && <button className="btn btn-primary" onClick={onRetry}><RefreshCw size={16} /> Try again</button>}
    </div>
  );
}

export function Field({ label, error, hint, children, full = false, htmlFor }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className="field-error" id={`${htmlFor}-err`} role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
