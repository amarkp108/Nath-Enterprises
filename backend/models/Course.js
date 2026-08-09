const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  startTime: { type: String, default: '', trim: true },
  endTime: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true },
});

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    defaultFee: { type: Number, default: 0 },
    duration: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    shifts: { type: [shiftSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
