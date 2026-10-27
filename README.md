# Shelfwise: Library Management System

**Group 6 · BSCS C3A** · Ocampo, Quinn Laurence M. (Leader) · Diño, Michael Gabriel A. · Perez, Richard Lorenz S.

The project is split into three sections:

| Section | Folder | Responsibility | Runs on |
| --- | --- | --- | --- |
| **Frontend** | `frontend/` | React interface: catalog, borrowing pages, admin workspace | http://localhost:5173 |
| **Backend** | `backend/` | Express API: login, roles, borrowing rules, validation | http://localhost:5000 |
| **Database** | `database/` | MongoDB connection, Mongoose schemas, seed data | MongoDB on port 27017 |

```
Browser ─▶ frontend (React) ──/api──▶ backend (Express) ──lms-database──▶ database (Mongoose ▶ MongoDB)
```

The three folders are npm *workspaces*, so one `npm install` at the root installs everything.
Each folder has its own `package.json`, its own README and its own `.env` where needed.
The backend imports the database layer as a workspace package (`lms-database`), so the backend contains no schema or connection code.

## Run it

Requirements: Node.js 18+ and MongoDB running locally (or a MongoDB Atlas URI in `database/.env`).

```bash
npm run setup   # installs all three sections and creates backend/.env and database/.env
npm run seed    # loads 40 books, 6 users and sample loans (wipes existing data)
npm run dev     # starts backend and frontend together
```

Open **http://localhost:5173**.

| Role | Email | Password |
| --- | --- | --- |
| Librarian (admin) | `admin@library.test` | `Admin@12345` |
| Reader | `reader@library.test` | `Reader@12345` |

Run one section on its own: `npm run dev:backend` or `npm run dev:frontend`.
Run the tests: `npm test` (Jest + Supertest against an in-memory MongoDB; needs internet once to download it).

## Deploying

See **DEPLOY.md** for the step-by-step Vercel + MongoDB Atlas guide (`vercel.json` and `api/index.js` are the only deployment files).

## Which folder do I edit?

| I want to change... | Go to |
| --- | --- |
| How a page looks, colors, layout, text | `frontend/src/pages`, `frontend/src/index.css` |
| Borrowing rules, loan days, permissions, API routes | `backend/src` and `backend/.env` |
| What a book or user stores, indexes, sample data | `database/models`, `database/seed/seed.js` |
| Which MongoDB it connects to | `database/.env` |

## Features and rules

See the proposal mapping and API table below.

- Accounts: register, sign in/out, hashed passwords, HttpOnly cookie sessions, Admin and Regular roles (`backend/src/controllers/auth.controller.js`).
- Catalog: search, category filter, sort, pagination, availability (`backend/src/controllers/books.controller.js`, `frontend/src/pages/Catalog.jsx`).
- Admin books: add/edit/archive/restore with ISBN checksum validation (`database/models/Book.js`, `frontend/src/pages/admin/Books.jsx`).
- Borrowing lifecycle: atomic borrow and return with rollback, due dates, overdue calculation (`backend/src/services/loanService.js`).
- Admin workspace: dashboard, all borrowings with filters, user management, CSV export.
- Security: bcrypt, Helmet, CSRF guard, rate limiting, input validation, NoSQL-injection sanitising, server-side role checks.

Policy settings in `backend/.env`: `LOAN_DAYS=14`, `MAX_ACTIVE_LOANS=5`, `ADMIN_CAN_BORROW=false`, `ALLOW_ROLE_CHANGES=false`.

### API

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/register` · `login` · `logout` · `GET /api/auth/me` |
| Books | `GET /api/books` (public) · `/categories` · `/:id` · `POST` · `PUT /:id` · `DELETE /:id` (archives) · `PATCH /:id/restore` |
| Users | `GET /api/users` (admin) · `GET/PUT /api/users/me` · `PATCH /api/users/:id/status` (admin) |
| Borrowings | `GET /api/borrowings` · `POST` · `PUT /:id` (admin return) · `DELETE /:id` · `GET /export` (admin CSV) |
| Dashboard | `GET /api/admin/dashboard` (admin) |

## Known limitations
- Book covers are generated, not uploaded images.
- No email reminders, reservations or audit trail (optional items in the proposal).
- Seeded ISBNs are synthetic sample values with valid checksums.
