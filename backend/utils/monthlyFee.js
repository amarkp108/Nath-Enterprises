/** Start of local calendar day */
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Add calendar months without day overflow (Jan 31 + 1mo → Feb 28/29) */
const addCalendarMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Billing bump date for period n (n >= 1):
 * admission + n months, then +1 day.
 * e.g. admitted 16 Sep → first bump 17 Oct; admitted 19 Sep → first bump 20 Oct.
 */
const billingDateForPeriod = (admissionDate, periodIndex) => {
  const d = addCalendarMonths(startOfDay(admissionDate), periodIndex);
  d.setDate(d.getDate() + 1);
  return d;
};

/**
 * How many monthly fee periods are due as of `asOf`.
 * Always at least 1 on/after admission day.
 */
const monthlyPeriodsDue = (admissionDate, asOf = new Date()) => {
  if (!admissionDate) return 1;
  const adm = startOfDay(admissionDate);
  const today = startOfDay(asOf);
  if (today < adm) return 0;

  let periods = 1;
  for (let n = 1; n < 600; n += 1) {
    if (billingDateForPeriod(adm, n) <= today) periods += 1;
    else break;
  }
  return periods;
};

/**
 * Recalculate totalFee for a monthly student. Saves if increased.
 * Returns the student (possibly modified).
 */
const applyMonthlyAccrual = async (student) => {
  if (!student || student.feeType !== 'monthly') return student;
  const monthly = Number(student.monthlyFee) || 0;
  if (monthly <= 0) return student;

  const periods = monthlyPeriodsDue(student.admissionDate || student.createdAt, new Date());
  const expected = monthly * periods;
  if (expected > (student.totalFee || 0)) {
    student.totalFee = expected;
    await student.save();
  }
  return student;
};

/** Accrue for many students (list / dashboard). Saves only when needed. */
const applyMonthlyAccrualMany = async (students) => {
  if (!Array.isArray(students) || students.length === 0) return students;
  await Promise.all(students.map((s) => applyMonthlyAccrual(s)));
  return students;
};

module.exports = {
  startOfDay,
  addCalendarMonths,
  billingDateForPeriod,
  monthlyPeriodsDue,
  applyMonthlyAccrual,
  applyMonthlyAccrualMany,
};
