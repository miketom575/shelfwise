# Backend (Express REST API)

Business rules, authentication, authorization and validation. It never touches MongoDB directly:
all data access goes through `lms-database` (the `../database` folder).

```
src/
  app.js            Express setup: Helmet, CORS, CSRF guard, rate limits, routes
  server.js         Connects through the database layer, then starts listening
  config/env.js     Port, JWT secret, loan policy (LOAN_DAYS, MAX_ACTIVE_LOANS, ...)
  routes/           URL maps and input validation
  controllers/      Request handlers
  services/         loanService.js: the borrow / return rules
  middleware/       auth + roles, CSRF, validation, error handling
  utils/            helpers
tests/api.test.js   Jest + Supertest acceptance tests
```

Settings live in `backend/.env` (copy of `.env.example`). Runs on http://localhost:5000.
