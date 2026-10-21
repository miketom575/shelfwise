/** Query-string values can be arrays/objects (?q[$ne]=x). Only accept plain strings. */
const str = (v) => (typeof v === 'string' ? v.trim() : '');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

function paginate(query, defaultLimit = 12, maxLimit = 50) {
  const page = Math.max(1, parseInt(str(query.page), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(str(query.limit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

const pageMeta = ({ page, limit }, total) => ({ page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });

/** Neutralise spreadsheet formula injection and quote CSV cells. */
const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

module.exports = { str, escapeRegex, startOfToday, addDays, paginate, pageMeta, csvCell };
