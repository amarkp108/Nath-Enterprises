const express = require('express');
const Employee = require('../models/Employee');
const EmployeeAttendance = require('../models/EmployeeAttendance');
const { protect, adminOnly } = require('../middleware/auth');
const { resolveAssignedBatches, isAttendanceLate } = require('../utils/batches');

const router = express.Router();
router.use(protect);

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

const resolveEmpBatch = (emp, batchId) => {
  const list = emp.assignedBatches || [];
  if (!batchId) {
    if (list.length === 1) return list[0];
    return null;
  }
  return list.find((b) => String(b.batchId) === String(batchId)) || null;
};

const parseMarkedAt = (date, markedAt) => {
  if (markedAt) {
    const t = new Date(markedAt);
    if (!Number.isNaN(t.getTime())) return t;
  }
  return new Date();
};

// ─── Employee self attendance (always allowed, no module permission) ───
router.get('/attendance/my', async (req, res) => {
  try {
    if (req.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Employee access only' });
    }

    const { month, from, to } = req.query;
    const filter = { employee: req.user._id };

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

    const records = await EmployeeAttendance.find(filter).sort({ date: -1 });

    let present = 0;
    let absent = 0;
    let late = 0;
    const enriched = records.map((r) => {
      const isLate = r.status === 'P' && isAttendanceLate(r.markedAt, r.startTime);
      if (r.status === 'P') present += 1;
      else absent += 1;
      if (isLate) late += 1;
      return { ...r.toObject(), isLate };
    });

    const total = records.length;
    res.json({
      success: true,
      data: {
        records: enriched,
        stats: {
          present,
          absent,
          late,
          total,
          percent: total > 0 ? Math.round((present / total) * 100) : 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin-only HRM routes below
router.use(adminOnly);

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
    const { name, phone, email, password, department, designation, salary, joinDate, address, gender, dateOfBirth, notes, status, permissions, assignedBatches } = req.body;
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

    const batches = await resolveAssignedBatches(assignedBatches || []);

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
      assignedBatches: batches,
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

    if (req.body.assignedBatches !== undefined) {
      employee.assignedBatches = await resolveAssignedBatches(req.body.assignedBatches || []);
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
    const { department, date, batchId } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

    const filter = { status: 'Active' };
    if (department && department !== 'all') filter.department = department;

    let employees = await Employee.find(filter)
      .select('name phone department designation employeeId avatar assignedBatches')
      .sort({ name: 1 });

    if (batchId && batchId !== 'all') {
      employees = employees.filter((e) =>
        (e.assignedBatches || []).some((b) => String(b.batchId) === String(batchId))
      );
    }

    const day = startOfDay(date);

    const existing = await EmployeeAttendance.find({
      date: day,
      employee: { $in: employees.map((e) => e._id) },
    });

    const map = {};
    existing.forEach((a) => {
      map[a.employee.toString()] = a;
    });

    const sheet = employees.map((e) => {
      const att = map[e._id.toString()];
      const batches = e.assignedBatches || [];
      return {
        employee: e,
        status: att?.status || '',
        remark: att?.remark || '',
        markedAt: att?.markedAt || null,
        batchId: att?.batchId || (batches.length === 1 ? batches[0].batchId : null),
        batchName: att?.batchName || (batches.length === 1 ? batches[0].batchName : ''),
        courseName: att?.courseName || (batches.length === 1 ? batches[0].courseName : ''),
        startTime: att?.startTime || (batches.length === 1 ? batches[0].startTime : ''),
        endTime: att?.endTime || (batches.length === 1 ? batches[0].endTime : ''),
        assignedBatches: batches,
        attendanceId: att?._id || null,
      };
    });

    // Unique batches across active employees (for admin filter)
    const batchMap = {};
    (await Employee.find({ status: 'Active' }).select('assignedBatches')).forEach((e) => {
      (e.assignedBatches || []).forEach((b) => {
        if (b.batchId) batchMap[String(b.batchId)] = b;
      });
    });

    res.json({
      success: true,
      data: {
        department: department || 'all',
        date: day,
        total: sheet.length,
        present: sheet.filter((r) => r.status === 'P').length,
        absent: sheet.filter((r) => r.status === 'A').length,
        unmarked: sheet.filter((r) => !r.status).length,
        batches: Object.values(batchMap),
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
    const { date, markedAt, records } = req.body;
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Date and attendance records are required' });
    }

    const day = startOfDay(date);
    const stamp = parseMarkedAt(date, markedAt);
    let saved = 0;

    for (const rec of records) {
      if (!rec.employeeId || !['P', 'A'].includes(rec.status)) continue;
      const emp = await Employee.findById(rec.employeeId);
      if (!emp) continue;

      const batches = emp.assignedBatches || [];
      let batch = resolveEmpBatch(emp, rec.batchId);

      if (batches.length > 0 && !batch) {
        return res.status(400).json({
          success: false,
          message: `Select a batch for ${emp.name}`,
        });
      }

      const rowMarkedAt = rec.markedAt ? parseMarkedAt(date, rec.markedAt) : stamp;

      await EmployeeAttendance.findOneAndUpdate(
        { employee: rec.employeeId, date: day },
        {
          employee: rec.employeeId,
          department: emp.department,
          date: day,
          status: rec.status,
          remark: rec.remark || '',
          batchId: batch?.batchId || null,
          batchName: batch?.batchName || '',
          courseName: batch?.courseName || '',
          startTime: batch?.startTime || '',
          endTime: batch?.endTime || '',
          markedAt: rowMarkedAt,
          markedBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      saved += 1;
    }

    res.json({
      success: true,
      message: `Attendance saved for ${saved} employee(s)`,
      saved,
      markedAt: stamp,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Attendance report ───
router.get('/attendance/report', async (req, res) => {
  try {
    const { department, from, to, employeeId, batchId } = req.query;
    const filter = {};

    if (department && department !== 'all') filter.department = department;
    if (employeeId) filter.employee = employeeId;
    if (batchId && batchId !== 'all') filter.batchId = batchId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    }

    const recordsRaw = await EmployeeAttendance.find(filter)
      .populate('employee', 'name phone department designation employeeId avatar assignedBatches')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    const summaryMap = {};
    let lateTotal = 0;

    const records = recordsRaw.map((r) => {
      const obj = r.toObject();
      const isLate = obj.status === 'P' && isAttendanceLate(obj.markedAt, obj.startTime);
      if (isLate) lateTotal += 1;
      obj.isLate = isLate;

      if (r.employee) {
        const id = r.employee._id.toString();
        if (!summaryMap[id]) {
          summaryMap[id] = { employee: r.employee, present: 0, absent: 0, late: 0, total: 0 };
        }
        summaryMap[id].total += 1;
        if (obj.status === 'P') summaryMap[id].present += 1;
        else summaryMap[id].absent += 1;
        if (isLate) summaryMap[id].late += 1;
      }

      return obj;
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
          late: lateTotal,
          total: records.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
