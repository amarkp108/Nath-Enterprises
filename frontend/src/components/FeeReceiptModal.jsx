import { Printer, X } from 'lucide-react';
import FeeReceipt from './FeeReceipt';
import { printFeeReceipt } from '../utils/printFeeReceipt';
import { useToast } from './Toast';

export default function FeeReceiptModal({ payment, onClose }) {
  const toast = useToast();

  const handlePrint = () => {
    const ok = printFeeReceipt(payment);
    if (!ok) toast.warning('Please allow pop-ups to print the receipt');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fee-receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Payment Receipt</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body fee-receipt-modal-body">
          <FeeReceipt payment={payment} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
