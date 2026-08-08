const express = require('express');
const Leave = require('../models/Leave');
const { protect, adminOrEmployee, requirePerm, studentOnly } = require('../middleware/auth');

const router = express.Router();

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// ─── Student: apply leave ───
router.post('/student', protect, studentOnly, async (req, res) => {
  try {
    const { fromDate, toDate, reason, leaveType } = req.body;
    if (!fromDate || !toDate || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'From date, to date and reason are required' });
    }

    const from = startOfDay(fromDate);
    const to = startOfDay(toDate);
    if (to < from) {
      return res.status(400).json({ success: false, message: 'To date cannot be before from date' });
    }

    const leave = await Leave.create({
      student: req.user._id,
      fromDate: from,
      toDate: to,
      reason: reason.trim(),
      leaveType: leaveType || 'Personal',
      status: 'Pending',
    });

    res.status(201).json({ success: true, data: leave, message: 'Leave application submitted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Student: my leaves ───
router.get('/student/my', protect, studentOnly, async (req, res) => {
  try {
    const leaves = await Leave.find({ student: req.user._id })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    const stats = {
      total: leaves.length,
      pending: leaves.filter((l) => l.status === 'Pending').length,
      accepted: leaves.filter((l) => l.status === 'Accepted').length,
      rejected: leaves.filter((l) => l.status === 'Rejected').length,
    };

    res.json({ success: true, data: leaves, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Student: cancel pending leave ───
router.delete('/student/:id', protect, studentOnly, async (req, res) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, student: req.user._id });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Only pending leaves can be cancelled' });
    }
    await leave.deleteOne();
    res.json({ success: true, message: 'Leave application cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Admin: list leaves ───
router.get('/admin', protect, adminOrEmployee, requirePerm('leaves', 'view'), async (req, res) => {
  try {
    const { status, course, search } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    let leaves = await Leave.find(filter)
      .populate('student', 'name phone course batch avatar')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    if (course && course !== 'all') {
      leaves = leaves.filter((l) => l.student?.course === course);
    }
    if (search) {
      const q = search.toLowerCase();
      leaves = leaves.filter(
        (l) =>
          l.student?.name?.toLowerCase().includes(q) ||
          l.student?.phone?.includes(q) ||
          l.reason?.toLowerCase().includes(q)
      );
    }

    const stats = {
      total: leaves.length,
      pending: leaves.filter((l) => l.status === 'Pending').length,
      accepted: leaves.filter((l) => l.status === 'Accepted').length,
      rejected: leaves.filter((l) => l.status === 'Rejected').length,
    };

    res.json({ success: true, data: leaves, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Admin: accept / reject ───
router.put('/admin/:id/review', protect, adminOrEmployee, requirePerm('leaves', 'edit'), async (req, res) => {
  try {
    const { status, adminRemark } = req.body;
    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Accepted or Rejected' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Leave already ${leave.status.toLowerCase()}` });
    }

    leave.status = status;
    leave.adminRemark = adminRemark || '';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    const populated = await Leave.findById(leave._id)
      .populate('student', 'name phone course')
      .populate('reviewedBy', 'name');

    res.json({
      success: true,
      data: populated,
      message: status === 'Accepted' ? 'Leave accepted' : 'Leave rejected',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
