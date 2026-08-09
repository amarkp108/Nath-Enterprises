const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    course: { type: String, required: true, trim: true },
    batch: { type: String, default: '' },
    batchId: { type: mongoose.Schema.Types.ObjectId, default: null },
    date: { type: Date, required: true },
    status: { type: String, enum: ['P', 'A'], required: true },
    remark: { type: String, default: '' },
    markedBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

// One attendance record per student per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ course: 1, date: 1 });
attendanceSchema.index({ batchId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
