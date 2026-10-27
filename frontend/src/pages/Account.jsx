import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, LogOut } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AccountBadge, Field } from '../components/Ui';
import { fmtDate } from '../utils/format';

export default function Account() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');

  const saveName = async (e) => {
    e.preventDefault();
    setBusy('name'); setErrors({});
    try {
      const r = await api.put('/users/me', { name });
      setUser(r.user);
      toast.success('Profile saved.');
    } catch (err) { setErrors({ name: err.fields?.name || err.message }); } finally { setBusy(''); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setBusy('pw'); setErrors({});
    try {
      await api.put('/users/me', pw);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed.');
    } catch (err) { setErrors({ pw: err.fields?.newPassword || err.message }); } finally { setBusy(''); }
  };

  const signOut = async () => { await logout(); toast.success('You’re signed out.'); navigate('/'); };

  return (
    <>
      <div className="page-head">
        <div><h1>Your account</h1><p>Update your details and keep your sign-in secure.</p></div>
        <button className="btn" onClick={signOut}><LogOut size={16} /> Sign out</button>
      </div>

      <div className="account-grid">
        <section className="panel panel-pad">
          <div className="panel-head"><h2>Profile</h2><AccountBadge status={user.accountStatus} /></div>
          <dl className="kv" style={{ marginBottom: 20 }}>
            <dt>Email</dt><dd>{user.email}</dd>
            <dt>Role</dt><dd>{user.role === 'admin' ? 'Librarian (admin)' : 'Reader'}</dd>
            <dt>Member since</dt><dd>{fmtDate(user.createdAt)}</dd>
          </dl>
          <form onSubmit={saveName} className="stack">
            <Field label="Full name" htmlFor="acc-name" error={errors.name}>
              <input id="acc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name || undefined} />
            </Field>
            <button className="btn btn-primary" disabled={busy === 'name' || name.trim() === user.name}>{busy === 'name' && <Loader2 size={16} className="spin" />} Save profile</button>
          </form>
        </section>

        <section className="panel panel-pad">
          <div className="panel-head"><h2>Change password</h2></div>
          <form onSubmit={savePassword} className="stack">
            {errors.pw && <div className="alert alert-error" role="alert"><AlertCircle size={18} /> {errors.pw}</div>}
            <Field label="Current password" htmlFor="cur"><input id="cur" type="password" autoComplete="current-password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
            <Field label="New password" htmlFor="new" hint="8 or more characters with a letter and a number."><input id="new" type="password" autoComplete="new-password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <button className="btn btn-primary" disabled={busy === 'pw' || !pw.currentPassword || !pw.newPassword}>{busy === 'pw' && <Loader2 size={16} className="spin" />} Change password</button>
          </form>
        </section>
      </div>
    </>
  );
}
