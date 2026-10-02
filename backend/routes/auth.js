const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { MODULES } = require('../constants/modules');

const router = express.Router();

const generateToken = (id, role) => {
  const expire = process.env.JWT_EXPIRE;
  // "never" / empty → no expiry (token stays valid until logout / secret change)
  if (!expire || expire === 'never' || expire === '0') {
    return jwt.sign({ id, role }, process.env.JWT_SECRET);
  }
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: expire });
};

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    res.json({
      success: true,
      token: generateToken(admin._id, 'admin'),
      user: admin,
      role: 'admin',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/employee/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }
    const employee = await Employee.findOne({ phone: phone.trim() }).select('+password');
    if (!employee || !(await employee.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }
    if (employee.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Contact admin.' });
    }
    res.json({
      success: true,
      token: generateToken(employee._id, 'employee'),
      user: employee,
      role: 'employee',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/student/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }
    const phoneKey = String(phone).trim();
    const students = await Student.find({ phone: phoneKey }).select('+password');
    if (!students.length) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    // Shared family password — verify against any sibling
    let matched = null;
    for (const s of students) {
      if (await s.matchPassword(password)) {
        matched = s;
        break;
      }
    }
    if (!matched) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    const active = students.filter((s) => s.status !== 'Inactive');
    if (active.length === 0) {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Contact admin.' });
    }

    const publicStudents = active.map((s) => ({
      _id: s._id,
      name: s.name,
      course: s.course,
      batch: s.batch || '',
      status: s.status,
      avatar: s.avatar || '',
    }));

    // Multiple children → choose after login credentials verified
    if (publicStudents.length > 1) {
      const selectionToken = jwt.sign(
        { phone: phoneKey, purpose: 'student-select' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      return res.json({
        success: true,
        needsSelection: true,
        selectionToken,
        students: publicStudents,
        role: 'student',
        message: 'Select a student to continue',
      });
    }

    const student = active[0];
    const siblings = await Student.find({ phone: phoneKey, status: { $ne: 'Inactive' } })
      .select('name course batch status avatar')
      .lean();

    res.json({
      success: true,
      token: generateToken(student._id, 'student'),
      user: student,
      siblings,
      role: 'student',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/** After multi-student login — pick which child to open */
router.post('/student/select', async (req, res) => {
  try {
    const { selectionToken, studentId } = req.body;
    if (!selectionToken || !studentId) {
      return res.status(400).json({ success: false, message: 'Selection token and student are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(selectionToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Selection expired. Please login again.' });
    }
    if (decoded.purpose !== 'student-select' || !decoded.phone) {
      return res.status(401).json({ success: false, message: 'Invalid selection token' });
    }

    const student = await Student.findById(studentId);
    if (!student || student.phone !== decoded.phone) {
      return res.status(403).json({ success: false, message: 'Invalid student selection' });
    }
    if (student.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'This student account is inactive' });
    }

    const siblings = await Student.find({ phone: decoded.phone, status: { $ne: 'Inactive' } })
      .select('name course batch status avatar')
      .lean();

    res.json({
      success: true,
      token: generateToken(student._id, 'student'),
      user: student,
      siblings,
      role: 'student',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/** Switch to another sibling (same phone) while logged in */
router.post('/student/switch', protect, async (req, res) => {
  try {
    if (req.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Student access only' });
    }
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student id is required' });
    }
    const target = await Student.findById(studentId);
    if (!target || target.phone !== req.user.phone) {
      return res.status(403).json({ success: false, message: 'Cannot switch to this student' });
    }
    if (target.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'This student account is inactive' });
    }
    const siblings = await Student.find({ phone: req.user.phone, status: { $ne: 'Inactive' } })
      .select('name course batch status avatar')
      .lean();
    res.json({
      success: true,
      token: generateToken(target._id, 'student'),
      user: target,
      siblings,
      role: 'student',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  let siblings;
  if (req.role === 'student' && req.user?.phone) {
    siblings = await Student.find({ phone: req.user.phone, status: { $ne: 'Inactive' } })
      .select('name course batch status avatar')
      .lean();
  }
  res.json({
    success: true,
    user: req.user,
    role: req.role,
    siblings,
    modules: req.role === 'admin' ? MODULES : undefined,
  });
});

router.get('/modules', protect, async (req, res) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access only' });
  }
  res.json({ success: true, data: MODULES });
});

router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const Model = req.role === 'admin' ? Admin : req.role === 'employee' ? Employee : Student;
    const user = await Model.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();

    // Keep shared password in sync for all students on the same phone
    if (req.role === 'student' && user.phone) {
      const siblings = await Student.find({ phone: user.phone, _id: { $ne: user._id } }).select('+password');
      for (const sib of siblings) {
        sib.password = user.password;
        sib._skipPasswordHash = true;
        await sib.save();
      }
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const Model = req.role === 'admin' ? Admin : req.role === 'employee' ? Employee : Student;
    const allowed =
      req.role === 'admin'
        ? ['name', 'phone', 'email']
        : req.role === 'employee'
          ? ['name', 'email', 'address']
          : ['name', 'email', 'address', 'fatherName', 'motherName', 'dateOfBirth', 'gender'];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const user = await Model.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/avatar', protect, (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Profile photo must be 50 KB or less'
          : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please select an image (max 50 KB)' });
      }
      const Model = req.role === 'admin' ? Admin : req.role === 'employee' ? Employee : Student;
      const user = await Model.findById(req.user._id);
      if (user.avatar) {
        const oldPath = path.join(__dirname, '..', user.avatar.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.avatar = `/uploads/${req.file.filename}`;
      await user.save();
      res.json({ success: true, user, message: 'Profile photo updated' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

module.exports = router;
