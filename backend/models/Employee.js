const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { emptyPermissions } = require('../constants/modules');

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    department: { type: String, required: true, trim: true },
    designation: { type: String, default: '', trim: true },
    salary: { type: Number, default: 0, min: 0 },
    joinDate: { type: Date, default: Date.now },
    address: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    dateOfBirth: { type: Date },
    status: { type: String, enum: ['Active', 'Inactive', 'Resigned'], default: 'Active' },
    employeeId: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: '' },
    notes: { type: String, default: '' },
    permissions: { type: mongoose.Schema.Types.Mixed, default: emptyPermissions },
    assignedBatches: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        courseName: { type: String, default: '' },
        batchId: { type: mongoose.Schema.Types.ObjectId },
        batchName: { type: String, default: '' },
        startTime: { type: String, default: '' },
        endTime: { type: String, default: '' },
      },
    ],
    role: { type: String, default: 'employee' },
  },
  { timestamps: true }
);

employeeSchema.pre('save', async function () {
  if (!this.employeeId) {
    const count = await mongoose.model('Employee').countDocuments();
    this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

employeeSchema.methods.matchPassword = async function (entered) {
  if (!this.password) return false;
  return bcrypt.compare(entered, this.password);
};

employeeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

employeeSchema.methods.hasPermission = function (module, action = 'view') {
  return !!(this.permissions?.[module]?.[action]);
};

module.exports = mongoose.model('Employee', employeeSchema);
