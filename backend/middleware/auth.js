const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

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

module.exports = { protect, adminOnly, studentOnly };
