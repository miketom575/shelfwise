import { Link, useNavigate } from 'react-router-dom';
import { openBook } from '../utils/bookOpen';
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

/** A book standing on the shelf: height and width vary per title. Selecting it takes it off the shelf and opens it. */
export function Spine({ book, index = 0 }) {
  const navigate = useNavigate();
  const h = hash(book.title);
  const color = coverColor(book.title);
  const to = `/books/${book.id}`;
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openBook({ el: e.currentTarget, color, ink: '#fff', title: book.title, author: book.author, category: book.category, go: () => navigate(to) });
  };
  return (
    <Link
      to={to}
      onClick={onClick}
      className="spine"
      style={{ '--c': color, '--h': `${150 + (h % 95)}px`, '--w': `${36 + ((h >> 4) % 16)}px`, '--i': index }}
      title={`${book.title}, ${book.author}`}
    >
      <span>{book.title}</span>
    </Link>
  );
}