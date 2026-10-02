export const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Clock time when attendance was marked, e.g. 02:45 pm */
export const formatTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const formatDateTime = (d) => {
  if (!d) return '—';
  return `${formatDate(d)}, ${formatTime(d)}`;
};

const pad2 = (n) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD */
export const localDateStr = (d = new Date()) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

/** Local YYYY-MM-DDTHH:mm for datetime-local inputs */
export const localDateTimeStr = (d = new Date()) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${localDateStr(x)}T${pad2(x.getHours())}:${pad2(x.getMinutes())}`;
};

/** Keep current clock time but on the chosen attendance date (for backdating) */
export const dateWithCurrentTime = (dateStr) => {
  const now = new Date();
  return `${dateStr}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
};

export const shiftDateByDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDateStr(d);
};

export const isPastDate = (dateStr) => dateStr < localDateStr();

