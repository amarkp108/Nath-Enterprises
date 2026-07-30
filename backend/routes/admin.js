const express = require('express');
const Student = require('../models/Student');
const FeePayment = require('../models/FeePayment');
const Course = require('../models/Course');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(protect, adminOnly);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalStudents,
      activeStudents,
      admissionsThisMonth,
      dailyFees,
      weeklyFees,
      monthlyFees,
      students,
      recentPayments,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'Active' }),
      Student.countDocuments({ admissionDate: { $gte: startOfMonth } }),
      FeePayment.aggregate([
        { $match: { paymentDate: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      FeePayment.aggregate([
        { $match: { paymentDate: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      FeePayment.aggregate([
        { $match: { paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Student.find({ status: 'Active' }).select('name phone course totalFee paidFee'),
      FeePayment.find()
        .populate('student', 'name phone course')
        .sort({ paymentDate: -1 })
        .limit(8),
    ]);

    const pendingStudents = students
      .filter((s) => s.totalFee - s.paidFee > 0)
      .map((s) => ({
        _id: s._id,
        name: s.name,
        phone: s.phone,
        course: s.course,
        pendingFee: s.totalFee - s.paidFee,
        totalFee: s.totalFee,
        paidFee: s.paidFee,
      }))
      .sort((a, b) => b.pendingFee - a.pendingFee);

    const totalPendingFee = pendingStudents.reduce((sum, s) => sum + s.pendingFee, 0);
    const totalCollected = students.reduce((sum, s) => sum + s.paidFee, 0);

    // Last 7 days fee chart
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      last7Days.push({ date: d, next });
    }
    const chartData = await Promise.all(
      last7Days.map(async ({ date, next }) => {
        const result = await FeePayment.aggregate([
          { $match: { paymentDate: { $gte: date, $lt: next } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        return {
          date: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
          amount: result[0]?.total || 0,
        };
      })
    );

    // Course-wise student count
    const courseStats = await Student.aggregate([
      { $match: { status: 'Active' } },
      { $group: { _id: '$course', count: { $sum: 1 }, pending: { $sum: { $subtract: ['$totalFee', '$paidFee'] } } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        admissionsThisMonth,
        dailyFeeCollection: dailyFees[0]?.total || 0,
        dailyFeeCount: dailyFees[0]?.count || 0,
        weeklyFeeCollection: weeklyFees[0]?.total || 0,
        weeklyFeeCount: weeklyFees[0]?.count || 0,
        monthlyFeeCollection: monthlyFees[0]?.total || 0,
        monthlyFeeCount: monthlyFees[0]?.count || 0,
        totalPendingFee,
        pendingStudentsCount: pendingStudents.length,
        pendingStudents: pendingStudents.slice(0, 10),
        totalCollected,
        recentPayments,
        chartData,
        courseStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all students with filters
router.get('/students', async (req, res) => {
  try {
    const { course, pending, search, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (course && course !== 'all') filter.course = course;
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    let students = await Student.find(filter).sort({ createdAt: -1 });

    if (pending === 'true') {
      students = students.filter((s) => s.totalFee - s.paidFee > 0);
    }

    const total = students.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = students.slice(start, start + Number(limit));

    const courses = await Student.distinct('course');

    res.json({
      success: true,
      data: paginated,
      courses,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single student with payments
router.get('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const payments = await FeePayment.find({ student: student._id }).sort({ paymentDate: -1 });
    res.json({ success: true, data: { student, payments } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add student
router.post('/students', (req, res) => {
  upload.fields([
    { name: 'documents', maxCount: 5 },
    { name: 'avatar', maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Documents must be 100 KB or less; profile photo max 50 KB'
          : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    try {
      const { name, phone, password, course, totalFee, email, address, fatherName, motherName, dateOfBirth, gender, batch, notes, admissionDate } = req.body;

      if (!name || !phone || !password || !course || totalFee === undefined || totalFee === '') {
        return res.status(400).json({ success: false, message: 'Name, phone, password, course and fee are required' });
      }

      const exists = await Student.findOne({ phone: phone.trim() });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Student with this phone number already exists' });
      }

      const avatarFile = req.files?.avatar?.[0];
      if (avatarFile && avatarFile.size > 50 * 1024) {
        return res.status(400).json({ success: false, message: 'Profile photo must be 50 KB or less' });
      }

      const documents = (req.files?.documents || []).map((f) => ({
        name: f.originalname,
        url: `/uploads/${f.filename}`,
      }));

      const student = await Student.create({
        name,
        phone: phone.trim(),
        password,
        course,
        totalFee: Number(totalFee),
        email: email || '',
        address: address || '',
        fatherName: fatherName || '',
        motherName: motherName || '',
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || '',
        batch: batch || '',
        notes: notes || '',
        admissionDate: admissionDate || Date.now(),
        documents,
        avatar: avatarFile ? `/uploads/${avatarFile.filename}` : '',
      });

      res.status(201).json({ success: true, data: student, message: 'Student added successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Update student
router.put('/students/:id', (req, res) => {
  upload.fields([
    { name: 'documents', maxCount: 5 },
    { name: 'avatar', maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Documents must be 100 KB or less; profile photo max 50 KB'
          : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    try {
      const student = await Student.findById(req.params.id);
      if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

      const fields = ['name', 'phone', 'email', 'course', 'totalFee', 'address', 'fatherName', 'motherName', 'dateOfBirth', 'gender', 'batch', 'notes', 'status', 'admissionDate'];
      fields.forEach((f) => {
        if (req.body[f] !== undefined && req.body[f] !== '') {
          student[f] = f === 'totalFee' ? Number(req.body[f]) : req.body[f];
        }
      });

      if (req.body.password && req.body.password.length >= 6) {
        student.password = req.body.password;
      }

      const avatarFile = req.files?.avatar?.[0];
      if (avatarFile) {
        if (avatarFile.size > 50 * 1024) {
          return res.status(400).json({ success: false, message: 'Profile photo must be 50 KB or less' });
        }
        student.avatar = `/uploads/${avatarFile.filename}`;
      }

      if (req.files?.documents?.length) {
        const newDocs = req.files.documents.map((f) => ({ name: f.originalname, url: `/uploads/${f.filename}` }));
        student.documents = [...student.documents, ...newDocs];
      }

      await student.save();
      res.json({ success: true, data: student, message: 'Student updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Delete student
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    await FeePayment.deleteMany({ student: student._id });
    await student.deleteOne();
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Collect fee
router.post('/fees', async (req, res) => {
  try {
    const { studentId, amount, paymentMode, remark, paymentDate } = req.body;
    if (!studentId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Student and valid amount are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const pending = student.totalFee - student.paidFee;
    if (Number(amount) > pending) {
      return res.status(400).json({ success: false, message: `Amount exceeds pending fee (₹${pending})` });
    }

    const payment = await FeePayment.create({
      student: studentId,
      amount: Number(amount),
      paymentMode: paymentMode || 'Cash',
      remark: remark || '',
      collectedBy: req.user._id,
      paymentDate: paymentDate || Date.now(),
    });

    student.paidFee += Number(amount);
    await student.save();

    const populated = await FeePayment.findById(payment._id).populate('student', 'name phone course');
    res.status(201).json({ success: true, data: populated, message: 'Fee collected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fee history
router.get('/fees', async (req, res) => {
  try {
    const { from, to, studentId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (studentId) filter.student = studentId;
    if (from || to) {
      filter.paymentDate = {};
      if (from) filter.paymentDate.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = end;
      }
    }

    const total = await FeePayment.countDocuments(filter);
    const payments = await FeePayment.find(filter)
      .populate('student', 'name phone course')
      .populate('collectedBy', 'name')
      .sort({ paymentDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: payments,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Courses CRUD
router.get('/courses', async (req, res) => {
  try {
    let courses = await Course.find().sort({ name: 1 });
    if (courses.length === 0) {
      const defaults = [
        { name: 'JEE', description: 'Joint Entrance Examination', defaultFee: 50000, duration: '1 Year' },
        { name: 'NEET', description: 'Medical Entrance', defaultFee: 45000, duration: '1 Year' },
        { name: 'Class 11', description: 'Science / Commerce / Arts', defaultFee: 25000, duration: '1 Year' },
        { name: 'Class 12', description: 'Science / Commerce / Arts', defaultFee: 28000, duration: '1 Year' },
        { name: 'Foundation', description: 'Class 8-10 Foundation', defaultFee: 15000, duration: '1 Year' },
      ];
      courses = await Course.insertMany(defaults);
    }
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/courses', async (req, res) => {
  try {
    const { name, description, defaultFee, duration, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Course name is required' });
    const exists = await Course.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ success: false, message: 'Course with this name already exists' });
    const course = await Course.create({
      name: name.trim(),
      description,
      defaultFee: Number(defaultFee) || 0,
      duration,
      isActive: isActive !== false && isActive !== 'false',
    });
    res.status(201).json({ success: true, data: course, message: 'Course added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const { name, description, defaultFee, duration, isActive } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (name && name.trim() !== course.name) {
      const exists = await Course.findOne({ name: name.trim(), _id: { $ne: course._id } });
      if (exists) return res.status(400).json({ success: false, message: 'Course with this name already exists' });
      course.name = name.trim();
    }
    if (description !== undefined) course.description = description;
    if (defaultFee !== undefined) course.defaultFee = Number(defaultFee) || 0;
    if (duration !== undefined) course.duration = duration;
    if (isActive !== undefined) course.isActive = isActive === true || isActive === 'true';

    await course.save();
    res.json({ success: true, data: course, message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const inUse = await Student.countDocuments({ course: course.name });
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${course.name}" — ${inUse} student(s) are enrolled. Edit or reassign them first.`,
      });
    }

    await course.deleteOne();
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
