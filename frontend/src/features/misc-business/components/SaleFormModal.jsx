import { useState, useEffect } from 'react';
import miscBusinessService from '../services/miscBusinessService';
import { ActivityFormModal } from './ActivityFormModal';
import { Dropdown, DatePicker } from '../../../components/common';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Card', label: 'Card' },
  { value: 'Other', label: 'Other' },
];

function getTodayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SaleFormModal({
  isOpen,
  onClose,
  onSuccess,
  sale = null, // null for create, object for edit
  initialActivityId = '',
}) {
  const [activities, setActivities] = useState([]);
  const [activityId, setActivityId] = useState('');
  const [salesDate, setSalesDate] = useState(getTodayIso());
  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  const loadActivities = async (selectedIdToKeep) => {
    try {
      const list = await miscBusinessService.fetchActiveActivities();
      setActivities(list);
      if (selectedIdToKeep) {
        setActivityId(selectedIdToKeep);
      } else if (!activityId && list.length > 0) {
        setActivityId(list[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (sale) {
        setActivityId(sale.activityId || '');
        setSalesDate(
          sale.salesDate
            ? new Date(sale.salesDate).toISOString().split('T')[0]
            : getTodayIso(),
        );
        setCustomerName(sale.customerName || '');
        setInvoiceNumber(sale.invoiceNumber || '');
        setDescription(sale.description || '');
        setAmount(sale.amount !== undefined ? String(sale.amount) : '');
        setPaymentMethod(sale.paymentMethod || 'Cash');
        setNotes(sale.notes || '');
      } else {
        setActivityId(initialActivityId || '');
        setSalesDate(getTodayIso());
        setCustomerName('');
        setInvoiceNumber('');
        setDescription('');
        setAmount('');
        setPaymentMethod('Cash');
        setNotes('');
      }
      setErrors({});
      loadActivities(sale?.activityId || initialActivityId);
    }
  }, [isOpen, sale, initialActivityId]);

  if (!isOpen) return null;

  const handleInlineActivityCreated = (newAct) => {
    if (newAct?.id) {
      loadActivities(newAct.id);
    }
    setIsAddingActivity(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!activityId) {
      newErrors.activityId = 'Please select a business activity.';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required.';
    }
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than zero.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        activityId,
        salesDate: new Date(salesDate),
        customerName: customerName.trim(),
        invoiceNumber: invoiceNumber.trim(),
        description: description.trim(),
        amount: parsedAmount,
        paymentMethod,
        notes: notes.trim(),
      };

      let saved;
      if (sale?.id) {
        saved = await miscBusinessService.updateSale(sale.id, payload);
      } else {
        saved = await miscBusinessService.createSale(payload);
      }

      onSuccess?.(saved);
      onClose();
    } catch (err) {
      if (err.fieldErrors) {
        setErrors(err.fieldErrors);
      } else {
        setErrors({ general: err.message || 'Failed to save sales transaction.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-modal-overlay" onClick={onClose}>
        <div
          className="mb-modal-card mb-modal-card--lg"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mb-modal-header">
            <h3 className="mb-modal-header__title">
              {sale ? `Edit Sale (${sale.referenceNumber})` : 'Record Miscellaneous Sale'}
            </h3>
            <button
              type="button"
              className="mb-modal-close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-modal-body">
              {errors.general ? (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--sts-error-bg)',
                    border: '1px solid var(--sts-error-border)',
                    borderRadius: '8px',
                    color: 'var(--sts-error-text)',
                    fontSize: '0.84rem',
                  }}
                >
                  {errors.general}
                </div>
              ) : null}

              {/* Row 1: Activity selection with inline add button */}
              <div className="mb-form-group">
                <label className="mb-form-label">
                  Business Activity <span className="req">*</span>
                </label>
                <div className="mb-activity-select-row">
                  <Dropdown
                    variant="form"
                    value={activityId}
                    options={activities.map((a) => ({
                      value: a.id,
                      label: a.name,
                    }))}
                    onChange={(val) => {
                      setActivityId(val);
                      if (errors.activityId) {
                        setErrors((prev) => ({ ...prev, activityId: '' }));
                      }
                    }}
                    placeholder="— Select an Activity —"
                    searchable
                    searchPlaceholder="Search activity..."
                    error={Boolean(errors.activityId)}
                  />
                  <button
                    type="button"
                    className="mb-btn-add-inline"
                    onClick={() => setIsAddingActivity(true)}
                    title="Add new business activity directly"
                  >
                    + Add Activity
                  </button>
                </div>
                {errors.activityId ? (
                  <span className="mb-form-error">{errors.activityId}</span>
                ) : null}
              </div>

              {/* Row 2: Sales Date and Amount */}
              <div className="mb-form-row">
                <div className="mb-form-group">
                  <label className="mb-form-label">
                    Date <span className="req">*</span>
                  </label>
                  <DatePicker
                    variant="form"
                    value={salesDate}
                    onChange={(val) => {
                      setSalesDate(val);
                      if (errors.salesDate) {
                        setErrors((prev) => ({ ...prev, salesDate: '' }));
                      }
                    }}
                    required
                    error={Boolean(errors.salesDate)}
                  />
                  {errors.salesDate ? (
                    <span className="mb-form-error">{errors.salesDate}</span>
                  ) : null}
                </div>

                <div className="mb-form-group">
                  <label className="mb-form-label">
                    Amount (₹) <span className="req">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="mb-form-input"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                  {errors.amount ? (
                    <span className="mb-form-error">{errors.amount}</span>
                  ) : null}
                </div>
              </div>

              {/* Row 3: Customer and Invoice Ref */}
              <div className="mb-form-row">
                <div className="mb-form-group">
                  <label className="mb-form-label">Customer Name</label>
                  <input
                    type="text"
                    className="mb-form-input"
                    placeholder="e.g. John Doe / Client Company"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="mb-form-group">
                  <label className="mb-form-label">Invoice / Receipt Ref</label>
                  <input
                    type="text"
                    className="mb-form-input"
                    placeholder="e.g. INV-2026-001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 4: Payment Method */}
              <div className="mb-form-group">
                <label className="mb-form-label">Payment Method</label>
                <Dropdown
                  variant="form"
                  value={paymentMethod}
                  options={PAYMENT_METHOD_OPTIONS}
                  onChange={setPaymentMethod}
                  placeholder="Select payment method"
                />
              </div>

              {/* Row 5: Description */}
              <div className="mb-form-group">
                <label className="mb-form-label">
                  Description <span className="req">*</span>
                </label>
                <textarea
                  className="mb-form-textarea"
                  rows={2}
                  placeholder="Details of the secondary business goods or service provided..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                {errors.description ? (
                  <span className="mb-form-error">{errors.description}</span>
                ) : null}
              </div>

              {/* Row 6: Notes */}
              <div className="mb-form-group">
                <label className="mb-form-label">Additional Notes</label>
                <input
                  type="text"
                  className="mb-form-input"
                  placeholder="Optional internal remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-modal-footer">
              <button
                type="button"
                className="mb-btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="mb-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Saving...'
                  : sale
                  ? 'Update Sale'
                  : 'Record Sale'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Inline Activity Creation Modal */}
      <ActivityFormModal
        isOpen={isAddingActivity}
        onClose={() => setIsAddingActivity(false)}
        onSuccess={handleInlineActivityCreated}
      />
    </>
  );
}

export default SaleFormModal;
