const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Employee = require('../models/Employee');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'admin') {
      req.user = await Admin.findById(decoded.id);
    } else if (decoded.role === 'employee') {
      req.user = await Employee.findById(decoded.id);
    } else {
      req.user = await Student.findById(decoded.id);
    }
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.role = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access only' });
  }
  next();
};

const studentOnly = (req, res, next) => {
  if (req.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Student access only' });
  }
  next();
};

const employeeOnly = (req, res, next) => {
  if (req.role !== 'employee') {
    return res.status(403).json({ success: false, message: 'Employee access only' });
  }
  next();
};

/** Admin or employee with module permission */
const adminOrEmployee = (req, res, next) => {
  if (req.role === 'admin' || req.role === 'employee') return next();
  return res.status(403).json({ success: false, message: 'Access denied' });
};

const requirePerm = (module, action = 'view') => (req, res, next) => {
  if (req.role === 'admin') return next();
  if (req.role === 'employee' && req.user?.permissions?.[module]?.[action]) return next();
  return res.status(403).json({ success: false, message: 'You do not have permission for this action' });
};

module.exports = {
  protect,
  adminOnly,
  studentOnly,
  employeeOnly,
  adminOrEmployee,
  requirePerm,
};
