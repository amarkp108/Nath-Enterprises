const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    subject: { type: String, default: '', trim: true },
    sendType: { type: String, enum: ['class', 'students'], required: true },
    courses: [{ type: String, trim: true }],
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    dueDate: { type: Date },
    attachment: {
      name: String,
      url: String,
    },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

homeworkSchema.index({ recipients: 1, sentAt: -1 });
homeworkSchema.index({ sendType: 1, sentAt: -1 });

module.exports = mongoose.model('Homework', homeworkSchema);
