import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from './Ui';

/** UX guard only. The API enforces every permission again on the server. */
export default function ProtectedRoute({ children, admin = false }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="container main"><div className="skeleton" style={{ height: 180 }} aria-busy="true" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'admin') {
    return (
      <div className="container main">
        <EmptyState icon={ShieldAlert} title="This area is for librarians" action={<Link to="/catalog" className="btn btn-primary">Back to the catalog</Link>}>
          Your account doesn’t have permission to open this page.
        </EmptyState>
      </div>
    );
  }
  return children;
}
