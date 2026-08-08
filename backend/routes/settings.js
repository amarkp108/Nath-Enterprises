const express = require('express');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { protect, adminOnly } = require('../middleware/auth');
const { MODULES, emptyPermissions } = require('../constants/modules');

const router = express.Router();
router.use(protect, adminOnly);

// Seed default departments if empty
const ensureDepartments = async () => {
  const count = await Department.countDocuments();
  if (count === 0) {
    await Department.insertMany([
      { name: 'Teaching', description: 'Teaching staff' },
      { name: 'Admin', description: 'Administration' },
      { name: 'Accounts', description: 'Accounts & finance' },
      { name: 'Support', description: 'Support staff' },
      { name: 'Management', description: 'Management' },
    ]);
  }
};

// ─── Departments ───
router.get('/departments', async (req, res) => {
  try {
    await ensureDepartments();
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    const data = await Department.find(filter).sort({ name: 1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Department name is required' });
    const exists = await Department.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ success: false, message: 'Department already exists' });
    const dept = await Department.create({ name: name.trim(), description: description || '' });
    res.status(201).json({ success: true, data: dept, message: 'Department added' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    const { name, description, isActive } = req.body;
    if (name && name.trim() !== dept.name) {
      const exists = await Department.findOne({ name: name.trim(), _id: { $ne: dept._id } });
      if (exists) return res.status(400).json({ success: false, message: 'Department name already exists' });
      const oldName = dept.name;
      dept.name = name.trim();
      await Employee.updateMany({ department: oldName }, { department: dept.name });
    }
    if (description !== undefined) dept.description = description;
    if (isActive !== undefined) dept.isActive = isActive === true || isActive === 'true';
    await dept.save();
    res.json({ success: true, data: dept, message: 'Department updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    const inUse = await Employee.countDocuments({ department: dept.name });
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${inUse} employee(s) are in this department`,
      });
    }
    await dept.deleteOne();
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Modules catalog ───
router.get('/modules', (req, res) => {
  res.json({ success: true, data: MODULES });
});

// ─── Employee permissions ───
router.get('/permissions/:employeeId', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({
      success: true,
      data: {
        employee: { _id: employee._id, name: employee.name, phone: employee.phone, department: employee.department },
        permissions: employee.permissions || emptyPermissions(),
        modules: MODULES,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/permissions/:employeeId', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, message: 'Permissions object is required' });
    }
    employee.permissions = permissions;
    await employee.save();
    res.json({ success: true, data: employee, message: 'Permissions updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
