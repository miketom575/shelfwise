/**
 * Acceptance tests T01–T10 from the proposal (section VII), run against an in-memory MongoDB.
 * Run:  cd server && npm test
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { connectDB, disconnectDB, User, Book, BorrowingRecord: Borrowing } = require('lms-database');

let mongod;
const H = { 'X-Requested-With': 'XMLHttpRequest' };
const agent = () => {
  const a = request.agent(app);
  const wrap = (m) => (url) => a[m](url).set(H);
  return { raw: a, get: wrap('get'), post: wrap('post'), put: wrap('put'), patch: wrap('patch'), delete: wrap('delete') };
};

async function signUp(name, email) {
  const a = agent();
  const res = await a.post('/api/auth/register').send({ name, email, password: 'Passw0rdOK' });
  expect(res.status).toBe(201);
  return a;
}
async function adminAgent() {
  await User.create({ name: 'Admin', email: 'admin@t.test', role: 'admin', passwordHash: await User.hashPassword('Admin@12345') });
  const a = agent();
  const res = await a.post('/api/auth/login').send({ email: 'admin@t.test', password: 'Admin@12345' });
  expect(res.status).toBe(200);
  return a;
}
const makeBook = (over = {}) => Book.create({ title: 'Test Book', author: 'Tester', category: 'Fiction', totalCopies: 1, ...over });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
  await Promise.all([User.syncIndexes(), Book.syncIndexes(), Borrowing.syncIndexes()]);
});
afterAll(async () => {
  await disconnectDB();
  await mongod.stop();
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Book.deleteMany({}), Borrowing.deleteMany({})]);
});

describe('Accounts', () => {
  test('T01 register, read session, sign out', async () => {
    const a = await signUp('Test User', 'T@Example.com');
    const me = await a.get('/api/auth/me');
    expect(me.body.user.email).toBe('t@example.com');
    expect(me.body.user.passwordHash).toBeUndefined();
    expect((await a.post('/api/auth/logout')).status).toBe(200);
    expect((await a.get('/api/auth/me')).status).toBe(401);
  });

  test('T01 public registration can never grant admin', async () => {
    const a = agent();
    const res = await a.post('/api/auth/register').send({ name: 'Sneaky', email: 's@x.com', password: 'Passw0rdOK', role: 'admin' });
    expect(res.body.user.role).toBe('user');
  });

  test('T02 duplicate email and invalid form are rejected safely', async () => {
    await signUp('A User', 'dup@x.com');
    const dup = await agent().post('/api/auth/register').send({ name: 'B User', email: 'dup@x.com', password: 'Passw0rdOK' });
    expect(dup.status).toBe(409);
    const bad = await agent().post('/api/auth/register').send({ name: 'x', email: 'nope', password: 'short' });
    expect(bad.status).toBe(422);
    expect(bad.body.errors.length).toBeGreaterThan(0);
    expect(JSON.stringify(bad.body)).not.toMatch(/stack/i);
  });

  test('state-changing requests without the CSRF header are blocked', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'x' });
    expect(res.status).toBe(403);
  });
});

describe('Catalog and permissions', () => {
  test('T03 regular user cannot call admin book API', async () => {
    const user = await signUp('Reader', 'r@x.com');
    const res = await user.post('/api/books').send({ title: 'X', author: 'Y', category: 'Z', totalCopies: 1 });
    expect(res.status).toBe(403);
    expect(await Book.countDocuments()).toBe(0);
  });

  test('T04 admin adds and edits a book; ISBN is validated', async () => {
    const admin = await adminAgent();
    const bad = await admin.post('/api/books').send({ title: 'A', author: 'B', category: 'C', totalCopies: 2, isbn: '123' });
    expect(bad.status).toBe(422);
    const ok = await admin.post('/api/books').send({ title: 'A', author: 'B', category: 'C', totalCopies: 2, isbn: '978-0-306-40615-7' });
    expect(ok.status).toBe(201);
    expect(ok.body.book.availableCopies).toBe(2);
    const edit = await admin.put(`/api/books/${ok.body.book.id}`).send({ title: 'A2', totalCopies: 3 });
    expect(edit.body.book.title).toBe('A2');
    expect(edit.body.book.availableCopies).toBe(3);
  });

  test('T05 search by author/category with pagination', async () => {
    await Book.insertMany(Array.from({ length: 15 }, (_, i) => ({ title: `Vol ${i}`, author: 'Ada Lovelace', category: 'Science', totalCopies: 1, availableCopies: 1 })));
    await makeBook({ title: 'Other', author: 'Someone', category: 'Art' });
    const res = await request(app).get('/api/books').query({ q: 'lovelace', limit: 10, page: 2 });
    expect(res.body.total).toBe(15);
    expect(res.body.data).toHaveLength(5);
    const cat = await request(app).get('/api/books').query({ category: 'Art' });
    expect(cat.body.total).toBe(1);
  });

  test('archived books are hidden from the public catalog', async () => {
    const book = await makeBook({ isArchived: true });
    expect((await request(app).get('/api/books')).body.total).toBe(0);
    expect((await request(app).get(`/api/books/${book.id}`)).status).toBe(404);
  });
});

describe('Borrowing lifecycle', () => {
  test('T06 borrowing creates a loan and decrements availability', async () => {
    const user = await signUp('Reader', 'r@x.com');
    const book = await makeBook({ totalCopies: 2 });
    const res = await user.post('/api/borrowings').send({ bookId: book.id });
    expect(res.status).toBe(201);
    expect(res.body.book.availableCopies).toBe(1);
    expect(new Date(res.body.loan.dueDate) > new Date(res.body.loan.borrowDate)).toBe(true);
  });

  test('T06 borrower identity comes from the session, not the body', async () => {
    const mallory = await signUp('Mallory', 'm@x.com');
    const victim = await signUp('Victim', 'v@x.com');
    const victimId = (await victim.get('/api/auth/me')).body.user.id;
    const book = await makeBook();
    const res = await mallory.post('/api/borrowings').send({ bookId: book.id, userId: victimId });
    expect(res.body.loan.userId.email).toBe('m@x.com');
  });

  test('T07 unavailable book is denied and counts stay unchanged', async () => {
    const a = await signUp('A', 'a@x.com');
    const b = await signUp('B', 'b@x.com');
    const book = await makeBook({ totalCopies: 1 });
    expect((await a.post('/api/borrowings').send({ bookId: book.id })).status).toBe(201);
    const res = await b.post('/api/borrowings').send({ bookId: book.id });
    expect(res.status).toBe(409);
    expect((await Book.findById(book.id)).availableCopies).toBe(0);
  });

  test('concurrent borrows of the last copy: exactly one wins, stock never negative', async () => {
    const book = await makeBook({ totalCopies: 1 });
    const users = await Promise.all(Array.from({ length: 6 }, (_, i) => signUp(`U${i}`, `u${i}@x.com`)));
    const results = await Promise.all(users.map((u) => u.post('/api/borrowings').send({ bookId: book.id })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect((await Book.findById(book.id)).availableCopies).toBe(0);
    expect(await Borrowing.countDocuments({ bookId: book.id })).toBe(1);
  });

  test('a user cannot hold two copies of the same book', async () => {
    const a = await signUp('A', 'a@x.com');
    const book = await makeBook({ totalCopies: 3 });
    await a.post('/api/borrowings').send({ bookId: book.id });
    const again = await a.post('/api/borrowings').send({ bookId: book.id });
    expect(again.status).toBe(409);
    expect((await Book.findById(book.id)).availableCopies).toBe(2);
  });

  test('T08/T09 admin returns once; repeat return is rejected without adding copies', async () => {
    const admin = await adminAgent();
    const user = await signUp('Reader', 'r@x.com');
    const book = await makeBook({ totalCopies: 2 });
    const loan = (await user.post('/api/borrowings').send({ bookId: book.id })).body.loan;

    const denied = await user.put(`/api/borrowings/${loan.id}`).send({ status: 'returned' });
    expect(denied.status).toBe(403);

    const first = await admin.put(`/api/borrowings/${loan.id}`).send({ status: 'returned' });
    expect(first.status).toBe(200);
    expect(first.body.loan.status).toBe('returned');
    expect((await Book.findById(book.id)).availableCopies).toBe(2);

    const second = await admin.put(`/api/borrowings/${loan.id}`).send({ status: 'returned' });
    expect(second.status).toBe(409);
    expect((await Book.findById(book.id)).availableCopies).toBe(2);

    const junk = await admin.put('/api/borrowings/not-an-id').send({ status: 'returned' });
    expect(junk.status).toBe(422);
  });

  test('overdue = active loan with a due date before today', async () => {
    const admin = await adminAgent();
    const user = await signUp('Reader', 'r@x.com');
    const uid = (await user.get('/api/auth/me')).body.user.id;
    const book = await makeBook();
    await Borrowing.create({ userId: uid, bookId: book.id, borrowDate: new Date(Date.now() - 20 * 864e5), dueDate: new Date(Date.now() - 6 * 864e5) });
    const res = await admin.get('/api/borrowings?status=overdue');
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].displayStatus).toBe('overdue');
    // overdue users must return books before borrowing more
    const other = await makeBook({ title: 'Another' });
    expect((await user.post('/api/borrowings').send({ bookId: other.id })).status).toBe(409);
  });

  test('T10 users only see their own history', async () => {
    const a = await signUp('A', 'a@x.com');
    const b = await signUp('B', 'b@x.com');
    const book = await makeBook({ totalCopies: 2 });
    await a.post('/api/borrowings').send({ bookId: book.id });
    const aId = (await a.get('/api/auth/me')).body.user.id;
    expect((await b.get('/api/borrowings')).body.total).toBe(0);
    expect((await b.get(`/api/borrowings?userId=${aId}`)).status).toBe(403);
    expect((await a.get('/api/borrowings')).body.total).toBe(1);
  });
});

describe('Admin workspace', () => {
  test('dashboard and user list are admin-only', async () => {
    const user = await signUp('Reader', 'r@x.com');
    expect((await user.get('/api/admin/dashboard')).status).toBe(403);
    expect((await user.get('/api/users')).status).toBe(403);
    const admin = await adminAgent();
    const dash = await admin.get('/api/admin/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.body.activity).toHaveLength(14);
  });

  test('role changes are off by default; suspending blocks sign-in', async () => {
    const admin = await adminAgent();
    const victim = await signUp('Victim', 'v@x.com');
    const id = (await victim.get('/api/auth/me')).body.user.id;
    expect((await admin.patch(`/api/users/${id}/status`).send({ role: 'admin' })).status).toBe(403);
    expect((await admin.patch(`/api/users/${id}/status`).send({ accountStatus: 'suspended' })).status).toBe(200);
    expect((await victim.get('/api/auth/me')).status).toBe(403);
  });
});
