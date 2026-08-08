const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

const router = express.Router();

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Admin login
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

// Student login (phone + password)
router.post('/student/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }
    const student = await Student.findOne({ phone: phone.trim() });
    if (!student || !(await student.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }
    if (student.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Contact admin.' });
    }
    res.json({
      success: true,
      token: generateToken(student._id, 'student'),
      user: student,
      role: 'student',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user profile
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user, role: req.role });
});

// Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const Model = req.role === 'admin' ? Admin : Student;
    const user = await Model.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const Model = req.role === 'admin' ? Admin : Student;
    const allowed =
      req.role === 'admin'
        ? ['name', 'phone', 'email']
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

// Upload profile photo (max 50 KB)
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
      const Model = req.role === 'admin' ? Admin : Student;
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
