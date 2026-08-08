const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { protect, adminOrEmployee, requirePerm, studentOnly } = require('../middleware/auth');

const router = express.Router();

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// ─── Admin: get students for a class/course on a date (with existing attendance) ───
router.get('/admin/sheet', protect, adminOrEmployee, requirePerm('attendance', 'create'), async (req, res) => {
  try {
    const { course, date, batch } = req.query;
    if (!course || !date) {
      return res.status(400).json({ success: false, message: 'Course and date are required' });
    }

    const filter = { course, status: 'Active' };
    if (batch) filter.batch = batch;

    const students = await Student.find(filter).select('name phone course batch avatar').sort({ name: 1 });
    const day = startOfDay(date);

    const existing = await Attendance.find({
      course,
      date: day,
      student: { $in: students.map((s) => s._id) },
    });

    const map = {};
    existing.forEach((a) => {
      map[a.student.toString()] = a;
    });

    const sheet = students.map((s) => ({
      student: s,
      status: map[s._id.toString()]?.status || '',
      remark: map[s._id.toString()]?.remark || '',
      attendanceId: map[s._id.toString()]?._id || null,
    }));

    res.json({
      success: true,
      data: {
        course,
        date: day,
        total: sheet.length,
        present: sheet.filter((r) => r.status === 'P').length,
        absent: sheet.filter((r) => r.status === 'A').length,
        unmarked: sheet.filter((r) => !r.status).length,
        sheet,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Admin: mark / bulk save attendance ───
router.post('/admin/mark', protect, adminOrEmployee, requirePerm('attendance', 'create'), async (req, res) => {
  try {
    const { course, date, records } = req.body;
    // records: [{ studentId, status: 'P'|'A', remark? }]
    if (!course || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Course, date and attendance records are required' });
    }

    const day = startOfDay(date);
    let saved = 0;

    for (const rec of records) {
      if (!rec.studentId || !['P', 'A'].includes(rec.status)) continue;

      await Attendance.findOneAndUpdate(
        { student: rec.studentId, date: day },
        {
          student: rec.studentId,
          course,
          date: day,
          status: rec.status,
          remark: rec.remark || '',
          markedBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      saved += 1;
    }

    res.json({ success: true, message: `Attendance saved for ${saved} student(s)`, saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Admin: attendance report ───
router.get('/admin/report', protect, adminOrEmployee, requirePerm('attendance', 'view'), async (req, res) => {
  try {
    const { course, from, to, studentId } = req.query;
    const filter = {};

    if (course && course !== 'all') filter.course = course;
    if (studentId) filter.student = studentId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    }

    const records = await Attendance.find(filter)
      .populate('student', 'name phone course batch avatar')
      .populate('markedBy', 'name')
      .sort({ date: -1, 'student.name': 1 });

    // Summary per student
    const summaryMap = {};
    records.forEach((r) => {
      if (!r.student) return;
      const id = r.student._id.toString();
      if (!summaryMap[id]) {
        summaryMap[id] = {
          student: r.student,
          present: 0,
          absent: 0,
          total: 0,
        };
      }
      summaryMap[id].total += 1;
      if (r.status === 'P') summaryMap[id].present += 1;
      else summaryMap[id].absent += 1;
    });

    const summary = Object.values(summaryMap).map((s) => ({
      ...s,
      percent: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    }));

    const totals = {
      present: records.filter((r) => r.status === 'P').length,
      absent: records.filter((r) => r.status === 'A').length,
      total: records.length,
    };

    res.json({
      success: true,
      data: { records, summary, totals },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Admin: daily overview by course ───
router.get('/admin/daily', protect, adminOrEmployee, requirePerm('attendance', 'view'), async (req, res) => {
  try {
    const date = req.query.date ? startOfDay(req.query.date) : startOfDay(new Date());
    const courses = await Student.distinct('course', { status: 'Active' });

    const overview = await Promise.all(
      courses.map(async (course) => {
        const totalStudents = await Student.countDocuments({ course, status: 'Active' });
        const marked = await Attendance.find({ course, date });
        return {
          course,
          totalStudents,
          present: marked.filter((m) => m.status === 'P').length,
          absent: marked.filter((m) => m.status === 'A').length,
          unmarked: totalStudents - marked.length,
        };
      })
    );

    res.json({ success: true, data: { date, overview } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Student: own attendance ───
router.get('/student/my', protect, studentOnly, async (req, res) => {
  try {
    const { from, to, month } = req.query;
    const filter = { student: req.user._id };

    if (month) {
      // month = YYYY-MM
      const [y, m] = month.split('-').map(Number);
      filter.date = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0, 23, 59, 59, 999),
      };
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    }

    const records = await Attendance.find(filter).sort({ date: -1 });
    const present = records.filter((r) => r.status === 'P').length;
    const absent = records.filter((r) => r.status === 'A').length;
    const total = records.length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        records,
        stats: { present, absent, total, percent },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
