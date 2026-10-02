const mongoose = require('mongoose');

const empAttendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    department: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['P', 'A'], required: true },
    remark: { type: String, default: '' },
    batchId: { type: mongoose.Schema.Types.ObjectId, default: null },
    batchName: { type: String, default: '' },
    courseName: { type: String, default: '' },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    markedAt: { type: Date },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

empAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
empAttendanceSchema.index({ department: 1, date: 1 });

module.exports = mongoose.model('EmployeeAttendance', empAttendanceSchema);
