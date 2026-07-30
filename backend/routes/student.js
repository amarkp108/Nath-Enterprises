const express = require('express');
const Student = require('../models/Student');
const FeePayment = require('../models/FeePayment');
const { protect, studentOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(protect, studentOnly);

// Student dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    const payments = await FeePayment.find({ student: student._id }).sort({ paymentDate: -1 });
    const pendingFee = Math.max(0, student.totalFee - student.paidFee);
    const percentPaid = student.totalFee > 0 ? Math.round((student.paidFee / student.totalFee) * 100) : 0;

    res.json({
      success: true,
      data: {
        student,
        payments,
        pendingFee,
        percentPaid,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update own profile (no fee fields)
router.put('/profile', async (req, res) => {
  try {
    const allowed = ['name', 'email', 'address', 'fatherName', 'motherName', 'dateOfBirth', 'gender'];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const student = await Student.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user: student, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload documents (max 100 KB each)
router.post('/documents', (req, res) => {
  upload.array('documents', 5)(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Each document must be 100 KB or less'
          : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    try {
      if (!req.files?.length) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
      }
      const student = await Student.findById(req.user._id);
      const newDocs = req.files.map((f) => ({ name: f.originalname, url: `/uploads/${f.filename}` }));
      student.documents = [...student.documents, ...newDocs];
      await student.save();
      res.json({ success: true, data: student.documents, message: 'Documents uploaded successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Delete own document
router.delete('/documents/:docId', async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    student.documents = student.documents.filter((d) => d._id.toString() !== req.params.docId);
    await student.save();
    res.json({ success: true, data: student.documents, message: 'Document removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fee history
router.get('/fees', async (req, res) => {
  try {
    const payments = await FeePayment.find({ student: req.user._id }).sort({ paymentDate: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
