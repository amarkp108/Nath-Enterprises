require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const Course = require('./models/Course');

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/student', require('./routes/student'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/hrm', require('./routes/hrm'));
app.use('/api/homework', require('./routes/homework'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/settings', require('./routes/settings'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Nath Enterprises API is running' });
});

// Seed admin & default courses on startup
const seedData = async () => {
  try {
    const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      await Admin.create({
        name: process.env.ADMIN_NAME || 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@nathenterprises.com',
        phone: process.env.ADMIN_PHONE || '9999999999',
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
      });
      console.log('Default admin created');
    }

    const courseCount = await Course.countDocuments();
    if (courseCount === 0) {
      await Course.insertMany([
        { name: 'JEE', description: 'Joint Entrance Examination', defaultFee: 50000, duration: '1 Year' },
        { name: 'NEET', description: 'Medical Entrance', defaultFee: 45000, duration: '1 Year' },
        { name: 'Class 11', description: 'Science / Commerce / Arts', defaultFee: 25000, duration: '1 Year' },
        { name: 'Class 12', description: 'Science / Commerce / Arts', defaultFee: 28000, duration: '1 Year' },
        { name: 'Foundation', description: 'Class 8-10 Foundation', defaultFee: 15000, duration: '1 Year' },
      ]);
      console.log('Default courses seeded');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

seedData();

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
