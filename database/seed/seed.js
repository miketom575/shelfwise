/* Seeds demo data. Usage:  npm run seed   (from the project root; wipes users, books and loans first)
 * Book metadata below is sample data for demonstration. ISBNs are synthetic (valid checksum, not real editions). */
const { connectDB, disconnectDB } = require('../connection');
const User = require('../models/User');
const Book = require('../models/Book');
const Borrowing = require('../models/BorrowingRecord');
const { addDays } = require('../utils');

const LOAN_DAYS = 14; // keep in sync with LOAN_DAYS in backend/.env

const isbn13 = (n) => {
  const base = `97819${String(n).padStart(7, '0')}`;
  const sum = [...base].reduce((a, ch, i) => a + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return base + ((10 - (sum % 10)) % 10);
};

const BOOKS = [
  ['Pride and Prejudice', 'Jane Austen', 'Fiction', 1813, 3, 'Elizabeth Bennet navigates manners, money and misjudgment in Regency England.'],
  ['Noli Me Tangere', 'José Rizal', 'Fiction', 1887, 5, 'A novel of colonial Philippines that helped ignite a national awakening.'],
  ['El Filibusterismo', 'José Rizal', 'Fiction', 1891, 4, 'The darker sequel: reform has failed and revolution looms.'],
  ['One Hundred Years of Solitude', 'Gabriel García Márquez', 'Fiction', 1967, 2, 'Seven generations of the Buendía family in the mythical town of Macondo.'],
  ['The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', 1925, 3, 'Wealth, longing and the American dream on Long Island.'],
  ['Frankenstein', 'Mary Shelley', 'Fiction', 1818, 2, 'A scientist creates life and cannot face what he has made.'],
  ['Dune', 'Frank Herbert', 'Science Fiction', 1965, 3, 'Politics, ecology and prophecy on the desert planet Arrakis.'],
  ['The Left Hand of Darkness', 'Ursula K. Le Guin', 'Science Fiction', 1969, 2, 'An envoy visits a world without fixed gender and learns what trust costs.'],
  ['Neuromancer', 'William Gibson', 'Science Fiction', 1984, 2, 'A washed-up hacker gets one last job in the matrix.'],
  ['A Brief History of Time', 'Stephen Hawking', 'Science', 1988, 4, 'From the Big Bang to black holes, explained for curious readers.'],
  ['The Selfish Gene', 'Richard Dawkins', 'Science', 1976, 2, 'Evolution seen from the gene’s point of view.'],
  ['Cosmos', 'Carl Sagan', 'Science', 1980, 3, 'A tour of the universe and humanity’s place in it.'],
  ['Silent Spring', 'Rachel Carson', 'Science', 1962, 2, 'The book that launched the modern environmental movement.'],
  ['The Pragmatic Programmer', 'Andrew Hunt & David Thomas', 'Technology', 1999, 4, 'Practical habits for writing flexible, maintainable software.'],
  ['Clean Code', 'Robert C. Martin', 'Technology', 2008, 5, 'A handbook of agile software craftsmanship.'],
  ['Designing Data-Intensive Applications', 'Martin Kleppmann', 'Technology', 2017, 3, 'The ideas behind reliable, scalable and maintainable systems.'],
  ['Introduction to Algorithms', 'Cormen, Leiserson, Rivest & Stein', 'Technology', 1990, 3, 'The standard reference on algorithms and their analysis.'],
  ['Eloquent JavaScript', 'Marijn Haverbeke', 'Technology', 2011, 4, 'A modern introduction to programming with JavaScript.'],
  ['You Don’t Know JS Yet', 'Kyle Simpson', 'Technology', 2020, 2, 'A deep dive into the core mechanisms of JavaScript.'],
  ['Sapiens', 'Yuval Noah Harari', 'History', 2011, 4, 'A brief history of humankind from the Stone Age to today.'],
  ['Guns, Germs, and Steel', 'Jared Diamond', 'History', 1997, 2, 'Why some societies came to dominate others.'],
  ['The Diary of a Young Girl', 'Anne Frank', 'Biography', 1947, 3, 'A teenager’s private account of hiding during the Second World War.'],
  ['Long Walk to Freedom', 'Nelson Mandela', 'Biography', 1994, 2, 'The autobiography of Nelson Mandela.'],
  ['Steve Jobs', 'Walter Isaacson', 'Biography', 2011, 2, 'The authorised biography of Apple’s co-founder.'],
  ['Meditations', 'Marcus Aurelius', 'Philosophy', 180, 3, 'Private notes on Stoic practice from a Roman emperor.'],
  ['The Republic', 'Plato', 'Philosophy', 375, 2, 'A dialogue on justice, the soul and the ideal city.'],
  ['Thus Spoke Zarathustra', 'Friedrich Nietzsche', 'Philosophy', 1883, 1, 'A philosophical novel on the Übermensch and eternal recurrence.'],
  ['The Elements of Style', 'William Strunk Jr. & E. B. White', 'Language', 1959, 3, 'A short guide to clear, forceful English prose.'],
  ['The Design of Everyday Things', 'Don Norman', 'Art & Design', 1988, 3, 'Why some products satisfy while others only frustrate.'],
  ['Thinking with Type', 'Ellen Lupton', 'Art & Design', 2004, 2, 'A critical guide for designers, writers and students.'],
  ['Ways of Seeing', 'John Berger', 'Art & Design', 1972, 2, 'A landmark essay on how we look at images.'],
  ['The Story of Art', 'E. H. Gombrich', 'Art & Design', 1950, 2, 'A sweeping survey of art from cave paintings to the modern era.'],
  ['Flatland', 'Edwin A. Abbott', 'Mathematics', 1884, 2, 'A two-dimensional world and a lesson in perspective.'],
  ['The Joy of x', 'Steven Strogatz', 'Mathematics', 2012, 2, 'A guided tour of math, from one to infinity.'],
  ['How to Solve It', 'George Pólya', 'Mathematics', 1945, 2, 'A classic of mathematical problem solving.'],
  ['The Wealth of Nations', 'Adam Smith', 'Economics', 1776, 1, 'The foundational text of classical economics.'],
  ['Thinking, Fast and Slow', 'Daniel Kahneman', 'Psychology', 2011, 3, 'Two systems of thought and the biases that shape our decisions.'],
  ['Man’s Search for Meaning', 'Viktor E. Frankl', 'Psychology', 1946, 3, 'Finding purpose in the most extreme circumstances.'],
  ['The Little Prince', 'Antoine de Saint-Exupéry', 'Children', 1943, 4, 'A pilot meets a small prince who has travelled from another planet.'],
  ['Charlotte’s Web', 'E. B. White', 'Children', 1952, 3, 'A pig, a spider and a friendship that saves a life.'],
];

const USERS = [
  ['Library Admin', 'admin@library.test', 'Admin@12345', 'admin'],
  ['Quinn Reader', 'reader@library.test', 'Reader@12345', 'user'],
  ['Mika Santos', 'mika@library.test', 'Reader@12345', 'user'],
  ['Paolo Reyes', 'paolo@library.test', 'Reader@12345', 'user'],
  ['Ana Villanueva', 'ana@library.test', 'Reader@12345', 'user'],
  ['Jon Cruz', 'jon@library.test', 'Reader@12345', 'user'],
];

(async () => {
  await connectDB();
  console.log('Resetting collections…');
  await Promise.all([User.deleteMany({}), Book.deleteMany({}), Borrowing.deleteMany({})]);
  await Promise.all([User.syncIndexes(), Book.syncIndexes(), Borrowing.syncIndexes()]);

  const users = [];
  for (const [name, email, password, role] of USERS) {
    users.push(await User.create({ name, email, role, passwordHash: await User.hashPassword(password) }));
  }
  const [admin, quinn, mika, paolo, ana, jon] = users;

  const books = await Book.insertMany(
    BOOKS.map(([title, author, category, publicationYear, totalCopies, description], i) => ({
      title, author, category, publicationYear, totalCopies, availableCopies: totalCopies, description, isbn: isbn13(i + 1),
    }))
  );
  const byTitle = Object.fromEntries(books.map((b) => [b.title, b]));

  const now = new Date();
  const loans = [
    // [user, book, daysAgoBorrowed, returned?]
    [quinn, 'Dune', 3, false],
    [quinn, 'The Design of Everyday Things', 9, false],
    [quinn, 'Cosmos', 40, true],
    [mika, 'Clean Code', 20, false], // overdue (14-day loan)
    [mika, 'Sapiens', 5, false],
    [paolo, 'Thus Spoke Zarathustra', 2, false], // only copy -> unavailable
    [paolo, 'Noli Me Tangere', 30, true],
    [ana, 'The Pragmatic Programmer', 11, false],
    [ana, 'Meditations', 25, true],
    [jon, 'Flatland', 16, false], // overdue
    [jon, 'The Little Prince', 8, true],
  ];
  for (const [user, title, ago, returned] of loans) {
    const book = byTitle[title];
    const borrowDate = addDays(now, -ago);
    const rec = { userId: user._id, bookId: book._id, borrowDate, dueDate: addDays(borrowDate, LOAN_DAYS) };
    if (returned) Object.assign(rec, { status: 'returned', returnDate: addDays(borrowDate, Math.min(ago - 1, 12)), returnedBy: admin._id });
    else await Book.updateOne({ _id: book._id }, { $inc: { availableCopies: -1 } });
    await Borrowing.create(rec);
  }

  console.log(`Seeded ${users.length} users, ${books.length} books, ${loans.length} loans.\n`);
  console.log('Demo accounts');
  console.log('  Admin : admin@library.test  / Admin@12345');
  console.log('  User  : reader@library.test / Reader@12345\n');
  await disconnectDB();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
