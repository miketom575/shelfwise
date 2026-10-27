import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, LayoutDashboard, LibraryBig, LogOut, Menu, Moon, Sun, Users, X, BookMarked } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { initials } from '../utils/format';

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('lms-theme', next); } catch { /* storage can be unavailable */ }
    setTheme(next);
  };
  return (
    <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
      {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

function Topbar() {
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const signOut = async () => {
    await logout();
    toast.success('You’re signed out.');
    navigate('/');
  };

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link to="/" className="brand" aria-label="Minerva home">
          <span className="brand-mark"><LibraryBig size={19} color="#fff" strokeWidth={2.2} /></span>
          Minerva
        </Link>

        <nav className={`nav ${open ? 'open' : ''}`} aria-label="Main">
          <NavLink to="/catalog"><BookOpen size={17} /> Catalog</NavLink>
          {user && !isAdmin && <NavLink to="/my-borrowings"><BookMarked size={17} /> My borrowings</NavLink>}
          {isAdmin && <NavLink to="/admin"><LayoutDashboard size={17} /> Admin workspace</NavLink>}
        </nav>

        <div className="topbar-actions">
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/account" className="user-chip" aria-label="Your account">
                <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
                <span>{user.name.split(' ')[0]}</span>
              </Link>
              <button className="btn btn-ghost btn-icon hide-sm" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost hide-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Create account</Link>
            </>
          )}
          <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <span>Minerva · Library Management System</span>
        <span>Group 6, BSCS C3A · MongoDB, Express, React, Node.js</span>
      </div>
    </footer>
  );
}

/** Shell: top bar + footer around every page */
export function Shell() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Topbar />
      <Outlet />
      <Footer />
    </>
  );
}

/** Reader-facing pages: centred container */
export function Page() {
  return (
    <main id="main" className="main">
      <div className="container"><Outlet /></div>
    </main>
  );
}

/** Librarian workspace: dark sidebar makes it visibly distinct from the reader portal */
export function AdminLayout() {
  const { user } = useAuth();
  const items = [
    { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/books', icon: BookOpen, label: 'Books' },
    { to: '/admin/borrowings', icon: ClipboardList, label: 'Borrowings' },
    { to: '/admin/users', icon: Users, label: 'Users' },
  ];
  return (
    <div className="admin">
      <aside className="side" aria-label="Admin navigation">
        <h2>Librarian workspace</h2>
        {items.map(({ to, end, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={end}><Icon size={18} /> {label}</NavLink>
        ))}
        <div className="side-note">Signed in as<br /><strong style={{ color: '#fff' }}>{user?.name}</strong></div>
      </aside>
      <main id="main" className="admin-main"><Outlet /></main>
    </div>
  );
}

