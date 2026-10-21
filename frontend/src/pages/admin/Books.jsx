import { useEffect, useState } from 'react';
import { Archive, ArchiveRestore, BookX, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { api, qs } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../context/ToastContext';
import { MiniCover } from '../../components/BookCover';
import { ConfirmDialog, EmptyState, ErrorState, Field, Modal, Pagination, TableSkeleton } from '../../components/Ui';

const BLANK = { title: '', author: '', category: '', isbn: '', publicationYear: '', totalCopies: 1, description: '' };

function BookForm({ book, categories, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!book;
  const [f, setF] = useState(editing ? { ...BLANK, ...book, isbn: book.isbn || '', publicationYear: book.publicationYear || '', description: book.description || '' } : BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onLoan = editing ? book.totalCopies - book.availableCopies : 0;

  const validate = () => {
    const e = {};
    if (!f.title.trim()) e.title = 'Title is required.';
    if (!f.author.trim()) e.author = 'Author is required.';
    if (!f.category.trim()) e.category = 'Category is required.';
    const n = Number(f.totalCopies);
    if (f.totalCopies === '' || !Number.isInteger(n) || n < 0) e.totalCopies = 'Enter a whole number, 0 or more.';
    else if (editing && n < onLoan) e.totalCopies = `${onLoan} on loan. Total can’t go below that.`;
    if (f.publicationYear !== '' && (!Number.isInteger(Number(f.publicationYear)) || Number(f.publicationYear) < 1 || Number(f.publicationYear) > new Date().getFullYear() + 1)) e.publicationYear = 'Enter a valid year.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body = {
      title: f.title.trim(), author: f.author.trim(), category: f.category.trim(),
      isbn: f.isbn.trim() || null, publicationYear: f.publicationYear === '' ? null : Number(f.publicationYear),
      totalCopies: Number(f.totalCopies), description: f.description.trim(),
    };
    try {
      if (editing) await api.put(`/books/${book.id}`, body); else await api.post('/books', body);
      toast.success(editing ? 'Changes saved.' : 'Book added.');
      onSaved();
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : { form: err.message });
    } finally { setBusy(false); }
  };

  return (
    <Modal
      title={editing ? 'Edit book' : 'Add a book'}
      onClose={onClose}
      footer={<>
        <button className="btn" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="book-form" disabled={busy}>{busy && <Loader2 size={16} className="spin" />} {editing ? 'Save changes' : 'Add book'}</button>
      </>}
    >
      <form id="book-form" onSubmit={submit} noValidate className="form-grid">
        {errors.form && <div className="alert alert-error full" role="alert">{errors.form}</div>}
        <Field full label="Title" htmlFor="b-title" error={errors.title}><input id="b-title" data-autofocus className="input" value={f.title} onChange={set('title')} aria-invalid={!!errors.title || undefined} /></Field>
        <Field label="Author" htmlFor="b-author" error={errors.author}><input id="b-author" className="input" value={f.author} onChange={set('author')} aria-invalid={!!errors.author || undefined} /></Field>
        <Field label="Category" htmlFor="b-cat" error={errors.category}>
          <input id="b-cat" className="input" list="cat-list" value={f.category} onChange={set('category')} aria-invalid={!!errors.category || undefined} />
          <datalist id="cat-list">{categories.map((c) => <option key={c.name} value={c.name} />)}</datalist>
        </Field>
        <Field label="ISBN (optional)" htmlFor="b-isbn" error={errors.isbn} hint="ISBN-10 or ISBN-13. Hyphens are fine."><input id="b-isbn" className="input" value={f.isbn} onChange={set('isbn')} aria-invalid={!!errors.isbn || undefined} /></Field>
        <Field label="Publication year" htmlFor="b-year" error={errors.publicationYear}><input id="b-year" className="input" inputMode="numeric" value={f.publicationYear} onChange={set('publicationYear')} aria-invalid={!!errors.publicationYear || undefined} /></Field>
        <Field label="Total copies" htmlFor="b-copies" error={errors.totalCopies} hint={editing ? `${onLoan} currently on loan.` : undefined}><input id="b-copies" className="input" type="number" min="0" value={f.totalCopies} onChange={set('totalCopies')} aria-invalid={!!errors.totalCopies || undefined} /></Field>
        <Field full label="Description" htmlFor="b-desc" error={errors.description}><textarea id="b-desc" className="textarea" value={f.description} onChange={set('description')} maxLength={1200} /></Field>
      </form>
    </Modal>
  );
}

export default function AdminBooks() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 300);
  const [category, setCategory] = useState('');
  const [archived, setArchived] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null | 'new' | book
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(1), [dq, category, archived]);
  const cats = useAsync((signal) => api.get('/books/categories', { signal }), []);
  const list = useAsync((signal) => api.get(`/books${qs({ q: dq, category, archived, page, limit: 10, sort: 'title' })}`, { signal }), [dq, category, archived, page]);

  const refresh = () => { list.retry(); cats.retry(); };

  const archive = async () => {
    setBusy(true);
    try { await api.del(`/books/${confirm.id}`); toast.success('Book archived.'); setConfirm(null); refresh(); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  const restore = async (b) => {
    try { await api.patch(`/books/${b.id}/restore`); toast.success('Book restored.'); refresh(); } catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Books</h1><p>Add, edit and archive titles. Archiving hides a book from readers but keeps its loan history.</p></div>
        <button className="btn btn-primary" onClick={() => setForm('new')}><Plus size={17} /> Add book</button>
      </div>

      <div className="toolbar">
        <div className="input-icon"><Search size={18} /><input className="input" type="search" placeholder="Search title, author or ISBN" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search books" /></div>
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {(cats.data?.data || []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select className="select" value={archived} onChange={(e) => setArchived(e.target.value)} aria-label="Archive filter">
          <option value="">Active books</option>
          <option value="only">Archived only</option>
          <option value="include">Active and archived</option>
        </select>
      </div>

      {list.error && !list.data ? <ErrorState error={list.error} onRetry={list.retry} /> : list.loading && !list.data ? <TableSkeleton /> : list.data.total === 0 ? (
        <EmptyState icon={BookX} title="No books found" action={<button className="btn btn-primary" onClick={() => setForm('new')}><Plus size={16} /> Add a book</button>}>
          Change the filters, or add a new title to the catalog.
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap" style={{ opacity: list.loading ? 0.6 : 1 }}>
            <table className="table">
              <caption className="sr-only">Books</caption>
              <thead><tr><th>Title</th><th>Category</th><th>ISBN</th><th>Copies</th><th>Status</th><th className="actions"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {list.data.data.map((b) => (
                  <tr key={b.id} className={b.isArchived ? 'archived' : ''}>
                    <td><div className="cell-flex"><MiniCover title={b.title} /><div><div className="title-cell">{b.title}</div><div className="sub">{b.author}{b.publicationYear ? `, ${b.publicationYear}` : ''}</div></div></div></td>
                    <td>{b.category}</td>
                    <td className="num">{b.isbn || '—'}</td>
                    <td className="num"><strong>{b.availableCopies}</strong> / {b.totalCopies}</td>
                    <td>{b.isArchived ? <span className="badge badge-warn">Archived</span> : b.availableCopies === 0 ? <span className="badge badge-late">All on loan</span> : <span className="badge badge-ok">In catalog</span>}</td>
                    <td className="actions">
                      <button className="btn btn-sm" onClick={() => setForm(b)}><Pencil size={15} /> Edit</button>
                      {b.isArchived
                        ? <button className="btn btn-sm" onClick={() => restore(b)}><ArchiveRestore size={15} /> Restore</button>
                        : <button className="btn btn-sm" onClick={() => setConfirm(b)}><Archive size={15} /> Archive</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={list.data.page} pages={list.data.pages} onChange={setPage} />
        </>
      )}

      {form && <BookForm book={form === 'new' ? null : form} categories={cats.data?.data || []} onClose={() => setForm(null)} onSaved={() => { setForm(null); refresh(); }} />}
      {confirm && (
        <ConfirmDialog title="Archive this book?" confirmLabel="Archive book" danger busy={busy} onConfirm={archive} onCancel={() => setConfirm(null)}>
          “{confirm.title}” will disappear from the public catalog. Existing loans and history are kept, and you can restore it any time.
        </ConfirmDialog>
      )}
    </>
  );
}
