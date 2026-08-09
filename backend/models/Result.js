const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    phone: { type: String, required: true, trim: true },
    studentName: { type: String, default: '' },
    course: { type: String, default: '' },
    batch: { type: String, default: '' },
    batchId: { type: mongoose.Schema.Types.ObjectId, default: null },
    subject: { type: String, required: true, trim: true },
    fullMarks: { type: Number, required: true, min: 0 },
    obtainedMarks: { type: Number, required: true, min: 0 },
    examDate: { type: Date, required: true },
    remark: { type: String, default: '' },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    publishedByRole: { type: String, enum: ['admin', 'employee'], required: true },
    publishedByName: { type: String, default: '' },
  },
  { timestamps: true }
);

resultSchema.index({ student: 1, examDate: -1 });
resultSchema.index({ phone: 1 });
resultSchema.index({ course: 1, batchId: 1 });

resultSchema.virtual('percent').get(function () {
  if (!this.fullMarks) return 0;
  return Math.round((this.obtainedMarks / this.fullMarks) * 1000) / 10;
});

resultSchema.set('toJSON', { virtuals: true });
resultSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Result', resultSchema);
