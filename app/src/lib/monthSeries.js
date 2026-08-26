// Buckets a list of items into a 12-length Jan–Dec array for the given year —
// used to feed the dashboard chart from real Convex records (pitches, contracts,
// fee_records) instead of the mock month-by-month numbers.
export function bucketByMonth(items, getDate, getValue, year = new Date().getFullYear()) {
  const totals = new Array(12).fill(0);
  for (const item of items) {
    const d = getDate(item);
    if (!d || Number.isNaN(d.getTime()) || d.getFullYear() !== year) continue;
    totals[d.getMonth()] += getValue(item);
  }
  return totals;
}

export const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toMonthSeries(totals) {
  return totals.map((value, i) => ({ month: MONTH_ABBR[i], value }));
}

export function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
