import { formatCurrency, formatDate } from '../utils';
import { amountInWords } from '../utils/amountInWords';
import { INSTITUTE } from '../utils/printFeeReceipt';

export default function FeeReceipt({ payment }) {
  const student = payment?.student || {};
  const pending = Math.max(0, (student.totalFee || 0) - (student.paidFee || 0));

  return (
    <div className="fee-receipt">
      <div className="fee-receipt-head">
        <h2>{INSTITUTE.name}</h2>
        <p>{INSTITUTE.tagline}</p>
      </div>
      <div className="fee-receipt-title">Fee Receipt</div>

      <div className="fee-receipt-meta">
        <div>
          <span>Receipt No.</span>
          <strong>{payment.receiptNo || '—'}</strong>
        </div>
        <div>
          <span>Date</span>
          <strong>{formatDate(payment.paymentDate)}</strong>
        </div>
      </div>

      <div className="fee-receipt-section">
        <h4>Student Details</h4>
        <div className="fee-receipt-row">
          <span>Name</span>
          <span>{student.name || '—'}</span>
        </div>
        {student.fatherName && (
          <div className="fee-receipt-row">
            <span>Father</span>
            <span>{student.fatherName}</span>
          </div>
        )}
        <div className="fee-receipt-row">
          <span>Phone</span>
          <span>{student.phone || '—'}</span>
        </div>
        <div className="fee-receipt-row">
          <span>Course</span>
          <span>{student.course || '—'}</span>
        </div>
        {student.batch && (
          <div className="fee-receipt-row">
            <span>Batch</span>
            <span>{student.batch}</span>
          </div>
        )}
      </div>

      <div className="fee-receipt-amount">
        <div className="fee-receipt-amount-label">Amount Received</div>
        <div className="fee-receipt-amount-value">{formatCurrency(payment.amount)}</div>
        <div className="fee-receipt-amount-words">{amountInWords(payment.amount)}</div>
      </div>

      <div className="fee-receipt-section">
        <h4>Payment Details</h4>
        <div className="fee-receipt-row">
          <span>Mode</span>
          <span>{payment.paymentMode || 'Cash'}</span>
        </div>
        {payment.remark && (
          <div className="fee-receipt-row">
            <span>Remark</span>
            <span>{payment.remark}</span>
          </div>
        )}
        {payment.collectedByName && (
          <div className="fee-receipt-row">
            <span>Collected By</span>
            <span>{payment.collectedByName}</span>
          </div>
        )}
      </div>

      <div className="fee-receipt-section">
        <h4>Fee Summary</h4>
        <div className="fee-receipt-row">
          <span>Total Fee</span>
          <span>{formatCurrency(student.totalFee)}</span>
        </div>
        <div className="fee-receipt-row">
          <span>Total Paid</span>
          <span>{formatCurrency(student.paidFee)}</span>
        </div>
        <div className={`fee-receipt-row fee-receipt-balance ${pending === 0 ? 'cleared' : ''}`}>
          <span>Balance Due</span>
          <span>{formatCurrency(pending)}</span>
        </div>
      </div>

      <div className="fee-receipt-footer">
        <div className="fee-receipt-sign">Authorized Signature</div>
        <p>Thank you for your payment!</p>
        <small>This is a computer-generated receipt.</small>
      </div>
    </div>
  );
}
