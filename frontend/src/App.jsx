import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout, Page, Shell } from './components/Layout';
import { LibraryLayout } from './components/LibraryLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';

const Library = lazy(() => import('./pages/Library'));
const Shelf = lazy(() => import('./pages/Shelf'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const MyBorrowings = lazy(() => import('./pages/MyBorrowings'));
const Account = lazy(() => import('./pages/Account'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminBooks = lazy(() => import('./pages/admin/Books'));
const AdminBorrowings = lazy(() => import('./pages/admin/Borrowings'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));

const Loading = () => <div className="container main"><div className="skeleton" style={{ height: 200 }} aria-busy="true" aria-label="Loading page" /></div>;

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Shell />}>
          <Route element={<Page />}>
            <Route index element={<Landing />} />
            <Route path="catalog" element={<LibraryLayout />}>
              <Route index element={<Library />} />
              <Route path="shelf/:key" element={<Shelf />} />
              <Route path="find" element={<Shelf />} />
            </Route>
            <Route path="books/:id" element={<BookDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="my-borrowings" element={<ProtectedRoute><MyBorrowings /></ProtectedRoute>} />
            <Route path="account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="books" element={<AdminBooks />} />
            <Route path="borrowings" element={<AdminBorrowings />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}