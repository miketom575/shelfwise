# Frontend (React + Vite)

Everything the user sees. It talks to the backend only through `/api/...` (Vite proxies this to port 5000 in development).

```
src/
  main.jsx, App.jsx   Entry point and routes (lazy-loaded pages)
  index.css           The whole design system: tokens, type, components
  api/client.js       fetch wrapper: cookies, CSRF header, friendly errors
  context/            Auth + toast providers
  hooks/              useAsync, useDebounce
  components/         Layout, BookCover/Spine, Modal, Pagination, states
  pages/              Landing, Catalog, BookDetail, MyBorrowings, Account, Auth
  pages/admin/        Dashboard, Books, Borrowings, Users
```

Runs on http://localhost:5173.
