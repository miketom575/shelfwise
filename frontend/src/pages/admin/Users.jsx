import { useEffect, useState } from 'react';
import { Check, MessageSquareWarning, Search, UserCheck, UserX, UsersRound, X } from 'lucide-react';
import { api, qs } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AccountBadge, ConfirmDialog, EmptyState, ErrorState, Pagination, TableSkeleton } from '../../components/Ui';
import { fmtDate, initials } from '../../utils/format';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 300);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [appeal, setAppeal] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(1), [dq, role, status, appeal]);
  const { data, error, loading, retry } = useAsync((signal) => api.get(`/users${qs({ q: dq, role, status, appeal, page, limit: 10 })}`, { signal }), [dq, role, status, appeal, page]);

  const update = async (u, changes, okMessage) => {
    setBusy(true);
    try { await api.patch(`/users/${u.id}/status`, changes); toast.success(okMessage); setConfirm(null); }
    catch (err) { toast.error(err.message); setConfirm(null); } finally { setBusy(false); retry(); }
  };

  const decide = async (u, decision) => {
    setBusy(true);
    try {
      await api.patch(`/users/${u.id}/appeal`, { decision });
      toast.success(decision === 'approve' ? 'Appeal approved. The account is active again.' : 'Appeal declined.');
    } catch (err) { toast.error(err.message); } finally { setBusy(false); retry(); }
  };

  return (
    <>
      <div className="page-head"><div><h1>Users</h1><p>Registered readers and librarians. Suspended accounts can’t sign in or borrow. Readers with 5 overdue books are suspended automatically and can send an appeal.</p></div></div>

      <div className="toolbar">
        <div className="input-icon"><Search size={18} /><input className="input" type="search" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" /></div>
        <select className="select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role"><option value="">All roles</option><option value="user">Readers</option><option value="admin">Librarians</option></select>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
        <select className="select" value={appeal} onChange={(e) => setAppeal(e.target.value)} aria-label="Filter by appeal"><option value="">Any appeal</option><option value="pending">Appeal waiting</option></select>
      </div>

      {error && !data ? <ErrorState error={error} onRetry={retry} /> : loading && !data ? <TableSkeleton /> : data.total === 0 ? (
        <EmptyState icon={UsersRound} title="No users found">Try a different search or filter.</EmptyState>
      ) : (
        <>
          <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="table">
              <caption className="sr-only">Users</caption>
              <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Loans</th><th>Joined</th><th className="actions"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.data.map((u) => {
                  const self = u.id === me.id;
                  return (
                    <tr key={u.id}>
                      <td><div className="cell-flex"><span className="avatar" aria-hidden="true">{initials(u.name)}</span><div><div style={{ fontWeight: 600 }}>{u.name}{self && <span className="faint"> (you)</span>}</div><div className="sub">{u.email}</div></div></div></td>
                      <td>
                        {data.canChangeRoles && !self ? (
                          <select className="select" style={{ minHeight: 34, width: 'auto', padding: '4px 10px' }} value={u.role} onChange={(e) => update(u, { role: e.target.value }, 'Role updated.')} aria-label={`Role for ${u.name}`}>
                            <option value="user">Reader</option><option value="admin">Librarian</option>
                          </select>
                        ) : <span className="badge badge-plain">{u.role === 'admin' ? 'Librarian' : 'Reader'}</span>}
                      </td>
                      <td>
                        <AccountBadge status={u.accountStatus} />
                        {u.accountStatus === 'suspended' && <div className="sub">{u.suspensionReason === 'overdue' ? 'Overdue books' : 'By a librarian'}</div>}
                        {u.accountStatus === 'suspended' && u.appeal?.status === 'pending' && (
                          <div className="sub" style={{ maxWidth: 280, marginTop: 6 }}>
                            <span className="badge badge-warn"><MessageSquareWarning size={13} /> Appeal waiting</span>
                            <div style={{ marginTop: 4 }}>“{u.appeal.message}”</div>
                          </div>
                        )}
                        {u.accountStatus === 'suspended' && u.appeal?.status === 'denied' && <div className="sub">Appeal declined</div>}
                      </td>
                      <td className="num">{u.activeLoans} active{u.overdueLoans > 0 && <span style={{ color: 'var(--stamp)', fontWeight: 600 }}>, {u.overdueLoans} overdue</span>}</td>
                      <td className="num">{fmtDate(u.createdAt)}</td>
                      <td className="actions">
                        {!self && u.accountStatus === 'suspended' && u.appeal?.status === 'pending' && (
                          <span style={{ display: 'inline-flex', gap: 6, marginRight: 6 }}>
                            <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => decide(u, 'approve')}><Check size={15} /> Approve</button>
                            <button className="btn btn-sm" disabled={busy} onClick={() => decide(u, 'deny')}><X size={15} /> Decline</button>
                          </span>
                        )}
                        {!self && (u.accountStatus === 'active'
                          ? <button className="btn btn-sm" onClick={() => setConfirm(u)}><UserX size={15} /> Suspend</button>
                          : <button className="btn btn-sm" onClick={() => update(u, { accountStatus: 'active' }, 'Account reactivated.')}><UserCheck size={15} /> Reactivate</button>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!data.canChangeRoles && <p className="hint" style={{ marginTop: 12 }}>Role changes are turned off by library policy. Set ALLOW_ROLE_CHANGES=true on the server to enable them.</p>}
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}

      {confirm && (
        <ConfirmDialog title="Suspend this account?" confirmLabel="Suspend account" danger busy={busy} onConfirm={() => update(confirm, { accountStatus: 'suspended' }, 'Account suspended.')} onCancel={() => setConfirm(null)}>
          {confirm.name} won’t be able to sign in or borrow until you reactivate the account. Their loan history is kept.
        </ConfirmDialog>
      )}
    </>
  );
}
