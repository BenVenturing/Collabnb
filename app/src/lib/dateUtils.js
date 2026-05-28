const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseToDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    // ISO YYYY-MM-DD — parse as local date to avoid UTC timezone shift
    const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  return null;
}

/**
 * Format a date range for display.
 *
 * Same year as current year → omit year:
 *   "Jul 7–10"  |  "Jul 7–Aug 3"
 *
 * Different year → include year:
 *   "Jul 7–10, 2027"  |  "Dec 28, 2026–Jan 3, 2027"
 *
 * Gracefully passes through already-formatted strings ("Feb–Apr 2026")
 * that can't be parsed as ISO dates.
 */
export function formatDateRange(startValue, endValue = null) {
  const start = parseToDate(startValue);
  if (!start) return String(startValue ?? '');

  const thisYear = new Date().getFullYear();
  const sm = SHORT_MONTHS[start.getMonth()];
  const sd = start.getDate();
  const sy = start.getFullYear();

  if (!endValue) {
    return sy !== thisYear ? `${sm} ${sd}, ${sy}` : `${sm} ${sd}`;
  }

  const end = parseToDate(endValue);
  if (!end) return String(startValue ?? '');

  const em = SHORT_MONTHS[end.getMonth()];
  const ed = end.getDate();
  const ey = end.getFullYear();

  // Years cross a boundary
  if (sy !== ey) {
    return `${sm} ${sd}, ${sy}–${em} ${ed}, ${ey}`;
  }

  const showYear = sy !== thisYear;
  const sameMonth = start.getMonth() === end.getMonth();

  if (sameMonth) {
    return showYear ? `${sm} ${sd}–${ed}, ${sy}` : `${sm} ${sd}–${ed}`;
  }
  return showYear ? `${sm} ${sd}–${em} ${ed}, ${sy}` : `${sm} ${sd}–${em} ${ed}`;
}

/** Format a single date value. Accepts ISO string, Date, or Unix timestamp. */
export function formatDate(value) {
  return formatDateRange(value, null);
}
