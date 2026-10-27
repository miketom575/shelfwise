import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field } from '../components/Ui';

function PasswordInput({ id, value, onChange, invalid, autoComplete, describedBy }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-icon" style={{ position: 'relative' }}>
      <input id={id} className="input" style={{ paddingLeft: 14, paddingRight: 48 }} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} aria-invalid={invalid || undefined} aria-describedby={describedBy} />
      <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', right: 4, top: 5 }} onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

/** Shown when a suspended reader tries to sign in: explains why and lets them appeal. */
function Suspended({ info, creds, onBack }) {
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(info.appealStatus); // null | pending | denied
  const pending = status === 'pending';

  const send = async (e) => {
    e.preventDefault();
    setError('');
    if (message.trim().length < 10) return setError('Please explain your situation in at least 10 characters.');
    setBusy(true);
    try {
      await api.post('/auth/appeal', { email: creds.email, password: creds.password, message: message.trim() });
      setStatus('pending');
      toast.success('Appeal sent. A librarian will review it.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card panel panel-pad">
        <h1>Account suspended</h1>
        <div className="alert alert-error" role="alert" style={{ marginTop: 14 }}><ShieldAlert size={18} /> {info.message}</div>
        {pending ? (
          <div className="alert alert-info" role="status" style={{ marginTop: 14 }}><CheckCircle2 size={18} /> Your appeal is waiting for a librarian. You’ll be able to sign in as soon as it is approved.</div>
        ) : (
          <form onSubmit={send} noValidate className="stack" style={{ '--gap': '14px', marginTop: 14 }}>
            {status === 'denied' && <div className="alert alert-warn" role="status"><AlertCircle size={18} /> Your last appeal was declined{info.appealMessage ? `: ${info.appealMessage}` : '.'} You can send a new one.</div>}
            {error && <div className="alert alert-error" role="alert"><AlertCircle size={18} /> {error}</div>}
            <Field label="Appeal to a librarian" htmlFor="appeal" hint="Say what happened and when the books will be back. Up to 1000 characters.">
              <textarea id="appeal" className="textarea" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>{busy && <Loader2 size={18} className="spin" />} Send appeal</button>
          </form>
        )}
        <p className="muted" style={{ marginTop: 18 }}><button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>Back to sign in</button></p>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [suspended, setSuspended] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setFields({});
    const f = {};
    if (!form.email.trim()) f.email = 'Enter your email address.';
    if (!form.password) f.password = 'Enter your password.';
    if (Object.keys(f).length) return setFields(f);
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(location.state?.from || (user.role === 'admin' ? '/admin' : '/catalog'), { replace: true });
    } catch (err) {
      if (err.data?.suspended) { setSuspended({ ...err.data, message: err.message }); return; }
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  };

  const fill = (email, password) => setForm({ email, password });

  if (suspended) return <Suspended info={suspended} creds={{ email: form.email.trim(), password: form.password }} onBack={() => setSuspended(null)} />;

  return (
    <div className="auth">
      <div className="auth-card panel panel-pad">
        <h1>Sign in</h1>
        <p className="sub">Pick up where you left off.</p>
        <form onSubmit={submit} noValidate className="stack" style={{ '--gap': '16px' }}>
          {error && <div className="alert alert-error" role="alert"><AlertCircle size={18} /> {error}</div>}
          <Field label="Email" htmlFor="email" error={fields.email}>
            <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!fields.email || undefined} />
          </Field>
          <Field label="Password" htmlFor="password" error={fields.password}>
            <PasswordInput id="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} invalid={!!fields.password} autoComplete="current-password" />
          </Field>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>
            {busy && <Loader2 size={18} className="spin" />} Sign in
          </button>
        </form>
        <p className="muted" style={{ marginTop: 18 }}>New here? <Link to="/register">Create an account</Link></p>
        <div className="demo-box">
          Demo accounts after seeding:{' '}
          <button type="button" onClick={() => fill('reader@library.test', 'Reader@12345')}>use the reader</button>{' or '}
          <button type="button" onClick={() => fill('admin@library.test', 'Admin@12345')}>use the librarian</button>{' or '}
          <button type="button" onClick={() => fill('overdue@library.test', 'Reader@12345')}>try the suspended reader</button>.
        </div>
      </div>
    </div>
  );
}

const RULES = [
  ['At least 8 characters', (p) => p.length >= 8],
  ['A letter', (p) => /[A-Za-z]/.test(p)],
  ['A number', (p) => /\d/.test(p)],
];

export function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const passed = RULES.filter(([, t]) => t(form.password)).length;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setFields({});
    const f = {};
    if (form.name.trim().length < 2) f.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) f.email = 'Enter a valid email address.';
    if (passed < RULES.length) f.password = 'Use at least 8 characters with a letter and a number.';
    if (form.confirm !== form.password) f.confirm = 'The passwords don’t match.';
    if (Object.keys(f).length) return setFields(f);
    setBusy(true);
    try {
      const user = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      toast.success(`Welcome to Minerva, ${user.name.split(' ')[0]}.`);
      navigate('/catalog', { replace: true });
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card panel panel-pad">
        <h1>Create your account</h1>
        <p className="sub">Borrow books and keep track of due dates.</p>
        <form onSubmit={submit} noValidate className="stack" style={{ '--gap': '16px' }}>
          {error && <div className="alert alert-error" role="alert"><AlertCircle size={18} /> {error}</div>}
          <Field label="Full name" htmlFor="name" error={fields.name}>
            <input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} aria-invalid={!!fields.name || undefined} />
          </Field>
          <Field label="Email" htmlFor="email" error={fields.email}>
            <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!fields.email || undefined} />
          </Field>
          <Field label="Password" htmlFor="password" error={fields.password}>
            <PasswordInput id="password" value={form.password} onChange={set('password')} invalid={!!fields.password} autoComplete="new-password" />
            <div className="pw-meter" aria-hidden="true">{RULES.map((_, i) => <i key={i} className={i < passed ? 'on' : ''} />)}</div>
            <span className="hint">{RULES.map(([l, t]) => `${t(form.password) ? '✓' : '○'} ${l}`).join('   ')}</span>
          </Field>
          <Field label="Confirm password" htmlFor="confirm" error={fields.confirm}>
            <PasswordInput id="confirm" value={form.confirm} onChange={set('confirm')} invalid={!!fields.confirm} autoComplete="new-password" />
          </Field>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>
            {busy && <Loader2 size={18} className="spin" />} Create account
          </button>
        </form>
        <p className="muted" style={{ marginTop: 18 }}>Already registered? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
