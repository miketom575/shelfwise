import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { fmtDate } from '../utils/format';

const pad = (n) => String(n).padStart(2, '0');

/** Counts down to the earliest due date of the copies on loan (book.nextAvailableDate). */
export function NextAvailable({ date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!date) return <div className="na"><Clock3 size={16} /> No return date yet. Ask at the library desk.</div>;

  const ms = new Date(date).getTime() - now;
  if (ms <= 0) return <div className="na"><Clock3 size={16} /> The due date has passed. A copy should be back any day now.</div>;

  const s = Math.floor(ms / 1000);
  const parts = [['days', Math.floor(s / 86400)], ['hrs', Math.floor((s % 86400) / 3600)], ['min', Math.floor((s % 3600) / 60)], ['sec', s % 60]];
  return (
    <div className="na" role="timer">
      <strong><Clock3 size={16} /> Next copy due back {fmtDate(date)}</strong>
      <div className="na-grid">
        {parts.map(([label, v]) => <div key={label}><b>{pad(v)}</b><small>{label}</small></div>)}
      </div>
    </div>
  );
}