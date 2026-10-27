import { useState } from 'react';
import { floorLabel } from '../utils/library';

/** Elevator buttons: tap a floor, or type the floor number you want and press Go. */
export function ElevatorPanel({ floors, current, counts, onPick }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const go = (e) => {
    e.preventDefault();
    const n = Number(text);
    if (!text.trim() || !Number.isInteger(n) || n < 1 || n > floors.length) {
      setError(`Enter a floor from 1 to ${floors.length}.`);
      return;
    }
    setError('');
    setText('');
    onPick(n);
  };

  return (
    <div className="dock-panel" role="group" aria-label="Elevator: choose a floor">
      {[...floors].reverse().map((f) => (
        <button key={f.n} type="button" className="floor-btn" aria-current={f.n === current ? 'true' : undefined} onClick={() => onPick(f.n)}>
          <b>{f.n}</b>
          <span>Floor {f.n}<small>{floorLabel(f)}{counts ? ` · ${counts[f.n - 1]} ${counts[f.n - 1] === 1 ? 'match' : 'matches'}` : ''}</small></span>
        </button>
      ))}
      <form className="floor-go" onSubmit={go} noValidate>
        <label htmlFor="floor-go-input">Go to floor</label>
        <div>
          <input
            id="floor-go-input" className="input" type="number" inputMode="numeric" min="1" max={floors.length}
            value={text} placeholder={`1 to ${floors.length}`} aria-invalid={!!error || undefined} aria-describedby={error ? 'floor-go-err' : undefined}
            onChange={(e) => { setText(e.target.value); setError(''); }}
          />
          <button className="btn btn-primary btn-sm" type="submit">Go</button>
        </div>
        {error && <span className="floor-go-err" id="floor-go-err" role="alert">{error}</span>}
      </form>
    </div>
  );
}