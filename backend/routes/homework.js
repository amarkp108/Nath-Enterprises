const express = require('express');
const Homework = require('../models/Homework');
const Student = require('../models/Student');
const { protect, adminOrEmployee, requirePerm, studentOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ─── Admin: send homework ───
router.post('/admin', protect, adminOrEmployee, requirePerm('homework', 'create'), (req, res) => {
  upload.single('attachment')(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Attachment must be 100 KB or less'
          : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }

    try {
      const { title, description, subject, sendType, dueDate } = req.body;
      let { courses, studentIds } = req.body;

      if (!title || !sendType) {
        return res.status(400).json({ success: false, message: 'Title and send type are required' });
      }

      // Parse JSON arrays if sent as strings (multipart)
      if (typeof courses === 'string') {
        try {
          courses = JSON.parse(courses);
        } catch {
          courses = courses ? [courses] : [];
        }
      }
      if (typeof studentIds === 'string') {
        try {
          studentIds = JSON.parse(studentIds);
        } catch {
          studentIds = studentIds ? [studentIds] : [];
        }
      }
      courses = Array.isArray(courses) ? courses : [];
      studentIds = Array.isArray(studentIds) ? studentIds : [];

      let recipients = [];

      if (sendType === 'class') {
        if (!courses.length) {
          return res.status(400).json({ success: false, message: 'Select at least one class/course' });
        }
        const students = await Student.find({
          course: { $in: courses },
          status: 'Active',
        }).select('_id');
        recipients = students.map((s) => s._id);
        if (recipients.length === 0) {
          return res.status(400).json({ success: false, message: 'No active students found in selected class(es)' });
        }
      } else if (sendType === 'students') {
        if (!studentIds.length) {
          return res.status(400).json({ success: false, message: 'Select at least one student' });
        }
        recipients = studentIds;
        courses = [];
      } else {
        return res.status(400).json({ success: false, message: 'Invalid send type' });
      }

      const homework = await Homework.create({
        title,
        description: description || '',
        subject: subject || '',
        sendType,
        courses,
        recipients,
        dueDate: dueDate || undefined,
        attachment: req.file
          ? { name: req.file.originalname, url: `/uploads/${req.file.filename}` }
          : undefined,
        sentBy: req.user._id,
        sentAt: new Date(),
      });

      const populated = await Homework.findById(homework._id)
        .populate('recipients', 'name phone course')
        .populate('sentBy', 'name');

      res.status(201).json({
        success: true,
        data: populated,
        message: `Homework sent to ${recipients.length} student(s)`,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// ─── Admin: list / report ───
router.get('/admin', protect, adminOrEmployee, requirePerm('homework', 'view'), async (req, res) => {
  try {
    const { sendType, course, from, to, search } = req.query;
    const filter = {};

    if (sendType && sendType !== 'all') filter.sendType = sendType;
    if (course && course !== 'all') filter.courses = course;
    if (from || to) {
      filter.sentAt = {};
      if (from) {
        const d = new Date(from);
        d.setHours(0, 0, 0, 0);
        filter.sentAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.sentAt.$lte = d;
      }
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const list = await Homework.find(filter)
      .populate('recipients', 'name phone course')
      .populate('sentBy', 'name')
      .sort({ sentAt: -1 });

    res.json({
      success: true,
      data: list,
      stats: {
        total: list.length,
        classWise: list.filter((h) => h.sendType === 'class').length,
        studentWise: list.filter((h) => h.sendType === 'students').length,
        totalRecipients: list.reduce((s, h) => s + (h.recipients?.length || 0), 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Admin: get one ───
router.get('/admin/:id', protect, adminOrEmployee, requirePerm('homework', 'view'), async (req, res) => {
  try {
    const hw = await Homework.findById(req.params.id)
      .populate('recipients', 'name phone course batch')
      .populate('sentBy', 'name');
    if (!hw) return res.status(404).json({ success: false, message: 'Homework not found' });
    res.json({ success: true, data: hw });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Admin: delete ───
router.delete('/admin/:id', protect, adminOrEmployee, requirePerm('homework', 'delete'), async (req, res) => {
  try {
    const hw = await Homework.findById(req.params.id);
    if (!hw) return res.status(404).json({ success: false, message: 'Homework not found' });
    await hw.deleteOne();
    res.json({ success: true, message: 'Homework deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Student: my homework ───
router.get('/student/my', protect, studentOnly, async (req, res) => {
  try {
    const list = await Homework.find({ recipients: req.user._id })
      .populate('sentBy', 'name')
      .sort({ sentAt: -1 });

    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
