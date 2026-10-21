import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, BookCopy, Clock3, Library, TriangleAlert } from 'lucide-react';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState, TableSkeleton } from '../../components/Ui';
import { coverColor, fmtDateTime, plural } from '../../utils/format';

function ActivityChart({ data }) {
  const W = 620, H = 220, P = { t: 12, r: 8, b: 26, l: 30 };
  const max = Math.max(3, ...data.flatMap((d) => [d.borrowed, d.returned]));
  const iw = W - P.l - P.r, ih = H - P.t - P.b, step = iw / data.length, bw = Math.min(14, step / 2 - 2);
  const y = (v) => P.t + ih - (v / max) * ih;
  const ticks = [0, Math.ceil(max / 2), max];
  const sumB = data.reduce((a, d) => a + d.borrowed, 0), sumR = data.reduce((a, d) => a + d.returned, 0);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Loans over the last 14 days: ${sumB} borrowed and ${sumR} returned`} preserveAspectRatio="none" style={{ height: 220 }}>
      {ticks.map((t) => (
        <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} /><text x={P.l - 8} y={y(t) + 4} textAnchor="end">{t}</text></g>
      ))}
      {data.map((d, i) => {
        const cx = P.l + i * step + step / 2;
        return (
          <g key={d.date}>
            <rect className="bar-b" x={cx - bw - 1} y={y(d.borrowed)} width={bw} height={ih - (y(d.borrowed) - P.t)} rx="2"><title>{`${d.date}: ${d.borrowed} borrowed`}</title></rect>
            <rect className="bar-r" x={cx + 1} y={y(d.returned)} width={bw} height={ih - (y(d.returned) - P.t)} rx="2"><title>{`${d.date}: ${d.returned} returned`}</title></rect>
            {i % 2 === 0 && <text x={cx} y={H - 8} textAnchor="middle">{Number(d.date.slice(8))}</text>}
          </g>
        );
      })}
    </svg>
  );
}

const EVENT = {
  borrowed: { icon: ArrowUpFromLine, text: 'borrowed' },
  returned: { icon: ArrowDownToLine, text: 'returned' },
  overdue: { icon: TriangleAlert, text: 'is overdue on' },
};

export default function Dashboard() {
  const { data, error, loading, retry } = useAsync((signal) => api.get('/admin/dashboard', { signal }), []);

  return (
    <>
      <div className="page-head">
        <div><h1>Dashboard</h1><p>Inventory, loans and recent activity at a glance.</p></div>
        <Link to="/admin/borrowings" className="btn">Manage borrowings</Link>
      </div>

      {error && !data ? <ErrorState error={error} onRetry={retry} /> : loading && !data ? <TableSkeleton rows={5} /> : (() => {
        const { totals: t, activity, categories, popular, recent } = data;
        const maxCat = Math.max(1, ...categories.map((c) => c.titles));
        const onShelf = t.copies ? Math.round((t.availableCopies / t.copies) * 100) : 0;
        return (
          <>
            <div className="stats">
              <div className="stat"><span className="k"><Library size={16} /> Titles</span><span className="v">{t.titles}</span><span className="s">{plural(t.copies, 'copy', 'copies')} in total</span></div>
              <div className="stat"><span className="k"><BookCopy size={16} /> Available copies</span><span className="v">{t.availableCopies}</span><span className="s">{onShelf}% of copies on the shelf</span></div>
              <div className="stat"><span className="k"><Clock3 size={16} /> Active loans</span><span className="v">{t.activeLoans}</span><span className="s">across {plural(t.members, 'member')}</span></div>
              <div className={`stat ${t.overdueLoans ? 'late' : ''}`}><span className="k"><TriangleAlert size={16} /> Overdue loans</span><span className="v">{t.overdueLoans}</span><span className="s">{t.overdueLoans ? 'Needs follow-up' : 'Everything is on time'}</span></div>
            </div>

            <div className="dash-grid">
              <section className="panel panel-pad">
                <div className="panel-head"><h2>Loans, last 14 days</h2><div className="legend"><span><i style={{ background: 'var(--primary)' }} />Borrowed</span><span><i style={{ background: 'var(--highlight)' }} />Returned</span></div></div>
                <ActivityChart data={activity} />
              </section>
              <section className="panel panel-pad">
                <div className="panel-head"><h2>Titles by category</h2></div>
                {categories.map((c) => (
                  <div className="hbar" key={c.name} style={{ '--c': coverColor(c.name) }}>
                    <span title={c.name}>{c.name}</span>
                    <span className="track"><span className="fill" style={{ display: 'block', width: `${(c.titles / maxCat) * 100}%` }} /></span>
                    <span>{c.titles}</span>
                  </div>
                ))}
              </section>
            </div>

            <div className="dash-grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
              <section className="panel panel-pad">
                <div className="panel-head"><h2>Recent activity</h2></div>
                {recent.length === 0 ? <p className="muted">No loans yet. Activity appears once readers start borrowing.</p> : (
                  <ul className="feed">
                    {recent.map((r) => {
                      const E = EVENT[r.event]; const Icon = E.icon;
                      return (
                        <li key={r.id}>
                          <span className={`dot ${r.event}`}><Icon size={15} /></span>
                          <span><strong>{r.user}</strong> {E.text} <em className="read">{r.book}</em><small>{fmtDateTime(r.at)}</small></span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              <section className="panel panel-pad">
                <div className="panel-head"><h2>Most borrowed</h2></div>
                {popular.length === 0 ? <p className="muted">Nothing borrowed yet.</p> : (
                  <ul className="feed">
                    {popular.map((p, i) => (
                      <li key={p.id}><span className="dot">{i + 1}</span><span><Link to={`/books/${p.id}`} className="read" style={{ fontWeight: 600, color: 'inherit' }}>{p.title}</Link><small>{p.author} · {plural(p.loans, 'loan')}</small></span></li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        );
      })()}
    </>
  );
}
