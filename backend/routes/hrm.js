const express = require('express');
const Employee = require('../models/Employee');
const EmployeeAttendance = require('../models/EmployeeAttendance');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

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

// ─── Employees CRUD ───
router.get('/employees', async (req, res) => {
  try {
    const { department, status, search } = req.query;
    const filter = {};
    if (department && department !== 'all') filter.department = department;
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    const Department = require('../models/Department');
    let departments = await Department.find({ isActive: true }).sort({ name: 1 }).then((d) => d.map((x) => x.name));
    if (departments.length === 0) {
      departments = await Employee.distinct('department');
    }

    res.json({ success: true, data: employees, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const { name, phone, email, password, department, designation, salary, joinDate, address, gender, dateOfBirth, notes, status, permissions } = req.body;
    if (!name || !phone || !department || !password) {
      return res.status(400).json({ success: false, message: 'Name, phone, department and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const exists = await Employee.findOne({ phone: phone.trim() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Employee with this phone already exists' });
    }

    const employee = await Employee.create({
      name,
      phone: phone.trim(),
      email: email || '',
      password,
      department,
      designation: designation || '',
      salary: Number(salary) || 0,
      joinDate: joinDate || Date.now(),
      address: address || '',
      gender: gender || '',
      dateOfBirth: dateOfBirth || undefined,
      notes: notes || '',
      status: status || 'Active',
      permissions: permissions || undefined,
    });

    res.status(201).json({ success: true, data: employee, message: 'Employee added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const fields = ['name', 'phone', 'email', 'department', 'designation', 'salary', 'joinDate', 'address', 'gender', 'dateOfBirth', 'notes', 'status'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined && req.body[f] !== '') {
        employee[f] = f === 'salary' ? Number(req.body[f]) : req.body[f];
      }
    });

    if (req.body.password && req.body.password.length >= 6) {
      employee.password = req.body.password;
    }

    if (req.body.permissions && typeof req.body.permissions === 'object') {
      employee.permissions = req.body.permissions;
    }

    if (req.body.phone) {
      const exists = await Employee.findOne({ phone: req.body.phone.trim(), _id: { $ne: employee._id } });
      if (exists) return res.status(400).json({ success: false, message: 'Phone already used by another employee' });
      employee.phone = req.body.phone.trim();
    }

    await employee.save();
    res.json({ success: true, data: employee, message: 'Employee updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    await EmployeeAttendance.deleteMany({ employee: employee._id });
    await employee.deleteOne();
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Attendance sheet ───
router.get('/attendance/sheet', async (req, res) => {
  try {
    const { department, date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

    const filter = { status: 'Active' };
    if (department && department !== 'all') filter.department = department;

    const employees = await Employee.find(filter).select('name phone department designation employeeId avatar').sort({ name: 1 });
    const day = startOfDay(date);

    const existing = await EmployeeAttendance.find({
      date: day,
      employee: { $in: employees.map((e) => e._id) },
    });

    const map = {};
    existing.forEach((a) => {
      map[a.employee.toString()] = a;
    });

    const sheet = employees.map((e) => ({
      employee: e,
      status: map[e._id.toString()]?.status || '',
      remark: map[e._id.toString()]?.remark || '',
      attendanceId: map[e._id.toString()]?._id || null,
    }));

    res.json({
      success: true,
      data: {
        department: department || 'all',
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

// ─── Mark attendance ───
router.post('/attendance/mark', async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Date and attendance records are required' });
    }

    const day = startOfDay(date);
    let saved = 0;

    for (const rec of records) {
      if (!rec.employeeId || !['P', 'A'].includes(rec.status)) continue;
      const emp = await Employee.findById(rec.employeeId);
      if (!emp) continue;

      await EmployeeAttendance.findOneAndUpdate(
        { employee: rec.employeeId, date: day },
        {
          employee: rec.employeeId,
          department: emp.department,
          date: day,
          status: rec.status,
          remark: rec.remark || '',
          markedBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      saved += 1;
    }

    res.json({ success: true, message: `Attendance saved for ${saved} employee(s)`, saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Attendance report ───
router.get('/attendance/report', async (req, res) => {
  try {
    const { department, from, to, employeeId } = req.query;
    const filter = {};

    if (department && department !== 'all') filter.department = department;
    if (employeeId) filter.employee = employeeId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    }

    const records = await EmployeeAttendance.find(filter)
      .populate('employee', 'name phone department designation employeeId avatar')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    const summaryMap = {};
    records.forEach((r) => {
      if (!r.employee) return;
      const id = r.employee._id.toString();
      if (!summaryMap[id]) {
        summaryMap[id] = { employee: r.employee, present: 0, absent: 0, total: 0 };
      }
      summaryMap[id].total += 1;
      if (r.status === 'P') summaryMap[id].present += 1;
      else summaryMap[id].absent += 1;
    });

    const summary = Object.values(summaryMap).map((s) => ({
      ...s,
      percent: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        records,
        summary,
        totals: {
          present: records.filter((r) => r.status === 'P').length,
          absent: records.filter((r) => r.status === 'A').length,
          total: records.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
