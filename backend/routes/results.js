const express = require('express');
const Result = require('../models/Result');
const Student = require('../models/Student');
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

/** Lookup student by mobile — used before publish */
router.get('/admin/lookup', protect, adminOrEmployee, requirePerm('results', 'create'), async (req, res) => {
  try {
    const phone = (req.query.phone || '').trim();
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });

    const student = await Student.findOne({ phone }).select('name phone course batch batchId status');
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student found with this mobile number' });
    }
    if (student.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Student account is not active' });
    }

    if (req.role === 'employee') {
      if (!student.batchId || !employeeHasBatch(req.user, student.course, student.batchId)) {
        return res.status(403).json({
          success: false,
          message: 'This student is not in your assigned batch',
        });
      }
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/** List results (admin: all / filters; employee: assigned batches only) */
router.get('/admin', protect, adminOrEmployee, requirePerm('results', 'view'), async (req, res) => {
  try {
    const { course, batchId, phone, from, to, search } = req.query;
    const and = [];

    if (course && course !== 'all') and.push({ course });
    if (batchId && batchId !== 'all') and.push({ batchId });
    if (phone) and.push({ phone: phone.trim() });
    if (from || to) {
      const date = {};
      if (from) date.$gte = startOfDay(from);
      if (to) date.$lte = endOfDay(to);
      and.push({ examDate: date });
    }
    if (search) {
      and.push({
        $or: [
          { studentName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (req.role === 'employee') {
      const assigned = req.user.assignedBatches || [];
      if (assigned.length === 0) {
        return res.json({ success: true, data: [] });
      }
      and.push({
        $or: assigned.map((b) => ({ course: b.courseName, batchId: b.batchId })),
      });
    }

    const filter = and.length ? { $and: and } : {};
    const data = await Result.find(filter).sort({ examDate: -1, createdAt: -1 }).limit(500);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/** Publish result */
router.post('/admin', protect, adminOrEmployee, requirePerm('results', 'create'), async (req, res) => {
  try {
    const { phone, subject, fullMarks, obtainedMarks, examDate, remark } = req.body;

    if (!phone || !subject || fullMarks === undefined || obtainedMarks === undefined || !examDate) {
      return res.status(400).json({
        success: false,
        message: 'Phone, subject, full marks, obtained marks and date are required',
      });
    }

    const full = Number(fullMarks);
    const obtained = Number(obtainedMarks);
    if (Number.isNaN(full) || full <= 0) {
      return res.status(400).json({ success: false, message: 'Full marks must be a positive number' });
    }
    if (Number.isNaN(obtained) || obtained < 0) {
      return res.status(400).json({ success: false, message: 'Obtained marks must be 0 or more' });
    }
    if (obtained > full) {
      return res.status(400).json({ success: false, message: 'Obtained marks cannot exceed full marks' });
    }

    const student = await Student.findOne({ phone: String(phone).trim() });
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student found with this mobile number' });
    }
    if (student.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Student account is not active' });
    }

    if (req.role === 'employee') {
      if (!student.batchId || !employeeHasBatch(req.user, student.course, student.batchId)) {
        return res.status(403).json({
          success: false,
          message: 'You can only publish results for students in your assigned batches',
        });
      }
    }

    const result = await Result.create({
      student: student._id,
      phone: student.phone,
      studentName: student.name,
      course: student.course,
      batch: student.batch || '',
      batchId: student.batchId || null,
      subject: String(subject).trim(),
      fullMarks: full,
      obtainedMarks: obtained,
      examDate: startOfDay(examDate),
      remark: remark || '',
      publishedBy: req.user._id,
      publishedByRole: req.role,
      publishedByName: req.user.name || '',
    });

    res.status(201).json({ success: true, data: result, message: 'Result published successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/** Update result */
router.put('/admin/:id', protect, adminOrEmployee, requirePerm('results', 'edit'), async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found' });

    if (req.role === 'employee') {
      if (!result.batchId || !employeeHasBatch(req.user, result.course, result.batchId)) {
        return res.status(403).json({ success: false, message: 'You do not have access to this result' });
      }
    }

    const { subject, fullMarks, obtainedMarks, examDate, remark } = req.body;
    if (subject !== undefined) result.subject = String(subject).trim();
    if (fullMarks !== undefined) result.fullMarks = Number(fullMarks);
    if (obtainedMarks !== undefined) result.obtainedMarks = Number(obtainedMarks);
    if (examDate !== undefined) result.examDate = startOfDay(examDate);
    if (remark !== undefined) result.remark = remark;

    if (result.obtainedMarks > result.fullMarks) {
      return res.status(400).json({ success: false, message: 'Obtained marks cannot exceed full marks' });
    }

    await result.save();
    res.json({ success: true, data: result, message: 'Result updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/** Delete result */
router.delete('/admin/:id', protect, adminOrEmployee, requirePerm('results', 'delete'), async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found' });

    if (req.role === 'employee') {
      if (!result.batchId || !employeeHasBatch(req.user, result.course, result.batchId)) {
        return res.status(403).json({ success: false, message: 'You do not have access to this result' });
      }
    }

    await result.deleteOne();
    res.json({ success: true, message: 'Result deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/** Student: own results only */
router.get('/student/my', protect, studentOnly, async (req, res) => {
  try {
    const data = await Result.find({ student: req.user._id }).sort({ examDate: -1, createdAt: -1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
