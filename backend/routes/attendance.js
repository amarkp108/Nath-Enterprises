const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Course = require('../models/Course');
const { protect, adminOrEmployee, requirePerm, studentOnly } = require('../middleware/auth');
const { employeeHasBatch } = require('../utils/batches');

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

const assertEmployeeBatchAccess = (req, courseName, batchId) => {
  if (req.role !== 'employee') return null;
  if (!batchId) {
    return 'Select a batch assigned to you';
  }
  if (!employeeHasBatch(req.user, courseName, batchId)) {
    return 'You do not have access to this batch';
  }
  return null;
};

// ─── Available batches for attendance (admin = all, employee = assigned) ───
router.get('/admin/my-batches', protect, adminOrEmployee, async (req, res) => {
  try {
    if (req.role === 'employee') {
      const perms = req.user?.permissions?.attendance || {};
      if (!perms.view && !perms.create) {
        return res.status(403).json({ success: false, message: 'You do not have permission for this action' });
      }
      const list = (req.user.assignedBatches || []).map((b) => ({
        courseId: b.courseId,
        course: b.courseName,
        batchId: b.batchId,
        batchName: b.batchName,
        startTime: b.startTime || '',
        endTime: b.endTime || '',
      }));
      return res.json({ success: true, data: list });
    }

    const courses = await Course.find({ isActive: { $ne: false } }).sort({ name: 1 });
    const list = [];
    courses.forEach((c) => {
      (c.shifts || [])
        .filter((s) => s.isActive !== false)
        .forEach((s) => {
          list.push({
            courseId: c._id,
            course: c.name,
            batchId: s._id,
            batchName: s.name,
            startTime: s.startTime || '',
            endTime: s.endTime || '',
          });
        });
      if (!(c.shifts || []).some((s) => s.isActive !== false)) {
        list.push({
          courseId: c._id,
          course: c.name,
          batchId: null,
          batchName: '',
          startTime: '',
          endTime: '',
          noShifts: true,
        });
      }
    });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Admin: get students for a class/course on a date (with existing attendance) ───
router.get('/admin/sheet', protect, adminOrEmployee, requirePerm('attendance', 'create'), async (req, res) => {
  try {
    const { course, date, batch, batchId } = req.query;
    if (!course || !date) {
      return res.status(400).json({ success: false, message: 'Course and date are required' });
    }

    const courseDoc = await Course.findOne({ name: course });
    const activeShifts = (courseDoc?.shifts || []).filter((s) => s.isActive !== false);

    if (activeShifts.length > 0 && !batchId && !batch) {
      return res.status(400).json({ success: false, message: 'Please select a batch/shift' });
    }

    if (req.role === 'employee') {
      if (!batchId) {
        return res.status(403).json({ success: false, message: 'Select a batch assigned to you' });
      }
      const denied = assertEmployeeBatchAccess(req, course, batchId);
      if (denied) return res.status(403).json({ success: false, message: denied });
    }

    const filter = { course, status: 'Active' };
    if (batchId) filter.batchId = batchId;
    else if (batch) filter.batch = batch;

    const students = await Student.find(filter).select('name phone course batch batchId avatar').sort({ name: 1 });
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

    let batchName = batch || '';
    if (batchId && courseDoc) {
      const shift = courseDoc.shifts.id(batchId) || courseDoc.shifts.find((s) => String(s._id) === String(batchId));
      if (shift) batchName = shift.name;
    }

    res.json({
      success: true,
      data: {
        course,
        batch: batchName,
        batchId: batchId || null,
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
    const { course, date, records, batch, batchId } = req.body;
    if (!course || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Course, date and attendance records are required' });
    }

    const courseDoc = await Course.findOne({ name: course });
    const activeShifts = (courseDoc?.shifts || []).filter((s) => s.isActive !== false);

    if (activeShifts.length > 0 && !batchId) {
      return res.status(400).json({ success: false, message: 'Please select a batch/shift' });
    }

    if (req.role === 'employee') {
      const denied = assertEmployeeBatchAccess(req, course, batchId);
      if (denied) return res.status(403).json({ success: false, message: denied });
    }

    let batchName = batch || '';
    let resolvedBatchId = batchId || null;
    if (batchId && courseDoc) {
      const shift = courseDoc.shifts.id(batchId) || courseDoc.shifts.find((s) => String(s._id) === String(batchId));
      if (shift) {
        batchName = shift.name;
        resolvedBatchId = shift._id;
      }
    }

    // Only allow marking students that belong to this course (+ batch)
    const studentFilter = { course, status: 'Active', _id: { $in: records.map((r) => r.studentId) } };
    if (resolvedBatchId) studentFilter.batchId = resolvedBatchId;
    else if (batchName) studentFilter.batch = batchName;

    const allowedIds = new Set((await Student.find(studentFilter).select('_id')).map((s) => String(s._id)));

    const day = startOfDay(date);
    let saved = 0;

    for (const rec of records) {
      if (!rec.studentId || !['P', 'A'].includes(rec.status)) continue;
      if (!allowedIds.has(String(rec.studentId))) continue;

      await Attendance.findOneAndUpdate(
        { student: rec.studentId, date: day },
        {
          student: rec.studentId,
          course,
          batch: batchName,
          batchId: resolvedBatchId,
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
    const { course, from, to, studentId, batchId, batch } = req.query;
    const filter = {};

    if (course && course !== 'all') filter.course = course;
    if (studentId) filter.student = studentId;
    if (batchId) filter.batchId = batchId;
    else if (batch) filter.batch = batch;

    if (req.role === 'employee') {
      const assigned = req.user.assignedBatches || [];
      if (assigned.length === 0) {
        return res.json({ success: true, data: { records: [], summary: [], totals: { present: 0, absent: 0, total: 0 } } });
      }
      filter.$or = assigned.map((b) => ({ course: b.courseName, batchId: b.batchId }));
    }

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    }

    const records = await Attendance.find(filter)
      .populate('student', 'name phone course batch batchId avatar')
      .sort({ date: -1, 'student.name': 1 });

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
    let courses = await Student.distinct('course', { status: 'Active' });

    if (req.role === 'employee') {
      const names = [...new Set((req.user.assignedBatches || []).map((b) => b.courseName))];
      courses = courses.filter((c) => names.includes(c));
    }

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
