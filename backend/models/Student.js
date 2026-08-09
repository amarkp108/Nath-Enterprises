const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const documentSchema = new mongoose.Schema({
  name: String,
  url: String,
  uploadedAt: { type: Date, default: Date.now },
});

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    email: { type: String, default: '', trim: true, lowercase: true },
    course: { type: String, required: true, trim: true },
    totalFee: { type: Number, required: true, min: 0 },
    paidFee: { type: Number, default: 0, min: 0 },
    address: { type: String, default: '' },
    fatherName: { type: String, default: '' },
    motherName: { type: String, default: '' },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    admissionDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Active', 'Inactive', 'Completed'], default: 'Active' },
    documents: [documentSchema],
    avatar: { type: String, default: '' },
    notes: { type: String, default: '' },
    batch: { type: String, default: '' },
    batchId: { type: mongoose.Schema.Types.ObjectId, default: null },
    role: { type: String, default: 'student' },
  },
  { timestamps: true }
);

studentSchema.virtual('pendingFee').get(function () {
  return Math.max(0, this.totalFee - this.paidFee);
});

studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

studentSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

studentSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

studentSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Student', studentSchema);
