import { Link } from 'react-router-dom';
import { callNumber, coverColor, hash } from '../utils/format';

/** Generated cover: colour is derived from the title, so no image files are needed. */
export function BookCover({ book, small = false }) {
  return (
    <div className={`cover-wrap ${small ? 'cover-sm' : ''}`} aria-hidden="true">
      <div className="cover" style={{ '--c': coverColor(book.title) }}>
        <span className="cover-cat">{book.category}</span>
        <span className="cover-title">{book.title}</span>
        <span className="cover-foot">
          <span className="cover-author">{book.author}</span>
          <span className="cover-call">{callNumber(book.category, book.title)}</span>
        </span>
      </div>
    </div>
  );
}

export function MiniCover({ title }) {
  return <span className="mini-cover" style={{ '--c': coverColor(title) }} aria-hidden="true" />;
}

/** A book standing on the shelf: height and width vary per title. */
export function Spine({ book, index = 0 }) {
  const h = hash(book.title);
  return (
    <Link
      to={`/books/${book.id}`}
      className="spine"
      style={{ '--c': coverColor(book.title), '--h': `${150 + (h % 95)}px`, '--w': `${36 + ((h >> 4) % 16)}px`, '--i': index }}
      title={`${book.title}, ${book.author}`}
    >
      <span>{book.title}</span>
    </Link>
  );
}
