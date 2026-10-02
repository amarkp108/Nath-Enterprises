import { useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { assetUrl } from '../api';
import { formatTime } from '../utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const dayClass = (entry) => {
  if (!entry) return 'attn-cal-empty';
  if (entry.status === 'A') return 'attn-cal-absent';
  if (entry.isLate) return 'attn-cal-late';
  if (entry.status === 'P') return 'attn-cal-present';
  return 'attn-cal-empty';
};

function MonthGrid({ year, monthIndex, days }) {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <div className="attn-cal-month">
      <div className="attn-cal-month-title">{MONTHS[monthIndex]}</div>
      <div className="attn-cal-weekdays">
        {WEEKDAYS.map((w, i) => (
          <span key={`${w}-${i}`}>{w}</span>
        ))}
      </div>
      <div className="attn-cal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={`e-${i}`} className="attn-cal-cell attn-cal-pad" />;
          const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const entry = days[key];
          const title = entry
            ? `${key}: ${entry.status === 'A' ? 'Absent' : entry.isLate ? 'Late' : 'Present'}${
                entry.markedAt ? ` · ${formatTime(entry.markedAt)}` : ''
              }`
            : key;
          return (
            <span key={key} className={`attn-cal-cell ${dayClass(entry)}`} title={title}>
              {d}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Person attendance profile: stats + full-year calendar
 * data: { person, type, year, days, stats }
 */
export default function AttendancePersonProfile({ data, onBack, onYearChange, loading }) {
  const year = data?.year || new Date().getFullYear();
  const person = data?.person || {};
  const stats = data?.stats || { present: 0, absent: 0, late: 0, total: 0, percent: 0 };
  const days = data?.days || {};
  const isStudent = data?.type === 'student';

  const initials = useMemo(
    () =>
      (person.name || '?')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [person.name]
  );

  return (
    <div className="attn-person-profile">
      <div className="toolbar">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back to report
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onYearChange(year - 1)} disabled={loading}>
            <ChevronLeft size={18} />
          </button>
          <strong style={{ minWidth: 64, textAlign: 'center' }}>{year}</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onYearChange(year + 1)} disabled={loading}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {person.avatar ? (
            <img src={assetUrl(person.avatar)} alt="" className="avatar" style={{ width: 56, height: 56, objectFit: 'cover' }} />
          ) : (
            <div className="avatar" style={{ width: 56, height: 56, fontSize: '1rem' }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 180 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{person.name}</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {isStudent ? (
                <>
                  <span className="badge badge-info">{person.course}</span>
                  {person.batch && <span className="badge badge-muted">{person.batch}</span>}
                </>
              ) : (
                <>
                  <span className="badge badge-info">{person.department}</span>
                  {person.designation && <span className="badge badge-muted">{person.designation}</span>}
                  {person.employeeId && <span className="badge badge-muted">{person.employeeId}</span>}
                </>
              )}
              {person.status && (
                <span className={`badge ${person.status === 'Active' ? 'badge-success' : 'badge-muted'}`}>{person.status}</span>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: 6 }}>{person.phone}</div>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card" style={{ '--accent-color': '#0f766e', '--icon-bg': '#ccfbf1' }}>
          <div className="stat-label">Total Days</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#059669', '--icon-bg': '#d1fae5' }}>
          <div className="stat-label">Present</div>
          <div className="stat-value">{stats.present}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#d97706', '--icon-bg': '#fef3c7' }}>
          <div className="stat-label">Late</div>
          <div className="stat-value">{stats.late}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#dc2626', '--icon-bg': '#fee2e2' }}>
          <div className="stat-label">Absent</div>
          <div className="stat-value">{stats.absent}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#0284c7', '--icon-bg': '#e0f2fe' }}>
          <div className="stat-label">Attendance %</div>
          <div className="stat-value">{stats.percent}%</div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="card">
          <div className="card-header">
            <h3>Year Calendar — {year}</h3>
          </div>
          <div className="card-body">
            <div className="attn-cal-year">
              {MONTHS.map((_, mi) => (
                <MonthGrid key={mi} year={year} monthIndex={mi} days={days} />
              ))}
            </div>

            <div className="attn-cal-legend">
              <div className="attn-cal-legend-item">
                <span className="attn-cal-dot attn-cal-present" /> Present (on time)
              </div>
              <div className="attn-cal-legend-item">
                <span className="attn-cal-dot attn-cal-late" /> Late
              </div>
              <div className="attn-cal-legend-item">
                <span className="attn-cal-dot attn-cal-absent" /> Absent
              </div>
              <div className="attn-cal-legend-item">
                <span className="attn-cal-dot attn-cal-empty" /> No record
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
              Note: Green = present on time, Yellow = present but late (after batch start), Red = absent. Hover a date for
              time details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
