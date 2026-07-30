const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'],
      default: 'Cash',
    },
    remark: { type: String, default: '' },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    receiptNo: { type: String, unique: true },
    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

feePaymentSchema.pre('save', async function () {
  if (!this.receiptNo) {
    const count = await mongoose.model('FeePayment').countDocuments();
    this.receiptNo = `RCP${Date.now().toString().slice(-8)}${(count + 1).toString().padStart(3, '0')}`;
  }
});

module.exports = mongoose.model('FeePayment', feePaymentSchema);
