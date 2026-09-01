import { formatCurrency, formatDate } from '../utils';
import { amountInWords } from './amountInWords';

const INSTITUTE = {
  name: 'Nath Classes',
  tagline: 'Coaching Institute',
};

const receiptStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0c1f1c; padding: 24px; }
  .receipt { max-width: 480px; margin: 0 auto; border: 2px solid #0f766e; border-radius: 8px; overflow: hidden; }
  .head { display: flex; flex-direction: column; align-items: center; color: #fff; text-align: center; padding: 24px 16px; }
  .head h1 {
    display: inline-block;
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: yellow;
    background: linear-gradient(90deg, #fde68a, #fbbf24);
    padding: 8px 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .head p {
    display: inline-block;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 10px;
    padding: 5px 16px;
    border-radius: 999px;
    background: #fff;
    color: #0f766e;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  .title { text-align: center; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 12px; border-bottom: 1px dashed #b8c9c4; background: #f4f7f6; }
  .meta { display: flex; justify-content: space-between; padding: 12px 16px; font-size: 12px; border-bottom: 1px dashed #b8c9c4; }
  .meta strong { display: block; font-size: 13px; margin-top: 2px; }
  .section { padding: 12px 16px; border-bottom: 1px dashed #b8c9c4; }
  .section h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7f7a; margin-bottom: 8px; }
  .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; gap: 12px; }
  .row span:last-child { text-align: right; font-weight: 500; }
  .amount-box { background: #ccfbf1; padding: 16px; text-align: center; border-bottom: 1px dashed #b8c9c4; }
  .amount-box .label { font-size: 11px; color: #6b7f7a; text-transform: uppercase; letter-spacing: 1px; }
  .amount-box .value { font-size: 28px; font-weight: 800; color: #0f766e; margin: 4px 0; }
  .amount-box .words { font-size: 11px; color: #3d524e; font-style: italic; }
  .summary .row:last-child { margin-bottom: 0; font-weight: 700; }
  .summary .row.balance span:last-child { color: #dc2626; }
  .summary .row.balance.zero span:last-child { color: #059669; }
  .footer { padding: 16px; text-align: center; font-size: 11px; color: #6b7f7a; }
  .sign { margin-top: 24px; padding-top: 8px; border-top: 1px solid #d5e0dc; font-size: 12px; }
  @media print {
    body { padding: 0; }
    .receipt { border-width: 1px; }
  }
`;

const buildReceiptHtml = (payment) => {
  const student = payment.student || {};
  const pending = Math.max(0, (student.totalFee || 0) - (student.paidFee || 0));

  return `
    <div class="receipt">
      <div class="head">
        <h1>${INSTITUTE.name}</h1>
        <p>${INSTITUTE.tagline}</p>
      </div>
      <div class="title">Fee Receipt</div>
      <div class="meta">
        <div>
          <span>Receipt No.</span>
          <strong>${payment.receiptNo || '—'}</strong>
        </div>
        <div style="text-align:right">
          <span>Date</span>
          <strong>${formatDate(payment.paymentDate)}</strong>
        </div>
      </div>
      <div class="section">
        <h3>Student Details</h3>
        <div class="row"><span>Name</span><span>${student.name || '—'}</span></div>
        ${student.fatherName ? `<div class="row"><span>Father</span><span>${student.fatherName}</span></div>` : ''}
        <div class="row"><span>Phone</span><span>${student.phone || '—'}</span></div>
        <div class="row"><span>Course</span><span>${student.course || '—'}</span></div>
        ${student.batch ? `<div class="row"><span>Batch</span><span>${student.batch}</span></div>` : ''}
      </div>
      <div class="amount-box">
        <div class="label">Amount Received</div>
        <div class="value">${formatCurrency(payment.amount)}</div>
        <div class="words">${amountInWords(payment.amount)}</div>
      </div>
      <div class="section">
        <h3>Payment Details</h3>
        <div class="row"><span>Mode</span><span>${payment.paymentMode || 'Cash'}</span></div>
        ${payment.remark ? `<div class="row"><span>Remark</span><span>${payment.remark}</span></div>` : ''}
        ${payment.collectedByName ? `<div class="row"><span>Collected By</span><span>${payment.collectedByName}</span></div>` : ''}
      </div>
      <div class="section summary">
        <h3>Fee Summary</h3>
        <div class="row"><span>Total Fee</span><span>${formatCurrency(student.totalFee)}</span></div>
        <div class="row"><span>Total Paid</span><span>${formatCurrency(student.paidFee)}</span></div>
        <div class="row balance ${pending === 0 ? 'zero' : ''}"><span>Balance Due</span><span>${formatCurrency(pending)}</span></div>
      </div>
      <div class="footer">
        <div class="sign">Authorized Signature</div>
        <p style="margin-top:12px">Thank you for your payment!</p>
        <p style="margin-top:4px">This is a computer-generated receipt.</p>
      </div>
    </div>
  `;
};

export const printFeeReceipt = (payment) => {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${payment.receiptNo || ''}</title>
  <style>${receiptStyles}</style>
</head>
<body>${buildReceiptHtml(payment)}</body>
</html>`;

  const win = window.open('', '_blank', 'width=520,height=720');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
  return true;
};

export { buildReceiptHtml, receiptStyles, INSTITUTE };
