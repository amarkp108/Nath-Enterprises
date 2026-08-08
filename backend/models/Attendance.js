const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    course: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['P', 'A'], required: true },
    remark: { type: String, default: '' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

// One attendance record per student per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ course: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
