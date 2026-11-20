import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchSupplierById,
  fetchSupplierPurchases,
  updateSupplier,
} from '../services/supplierService'
import {
  formatInrCurrency,
  formatPurchaseDate,
  updatePurchasePaymentStatus,
} from '../../purchases/services/purchaseService'
import { PurchasesTable } from '../../purchases/components/PurchasesTable'
import { PurchasesMobileList } from '../../purchases/components/PurchasesMobileList'
import { PurchasePaymentStatusBadge } from '../../purchases/components/PurchaseStatusBadge'
import { DatePicker, Dropdown } from '../../../components/common'
import '../../purchases/styles/purchases.css'

export function SupplierDetailsPage({ supplierId, onNavigate }) {
  const [supplier, setSupplier] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [totalPurchases, setTotalPurchases] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState(null)
  const [actionInProgressId, setActionInProgressId] = useState(null)

  // Filters for purchase history
  const [historySearch, setHistorySearch] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Edit Supplier Modal state
  const [isEditing, setIsEditing] = useState(false)
  const [formValues, setFormValues] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    notes: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ text: msg, type })
    window.setTimeout(() => setToastMessage(null), 3500)
  }, [])

  const loadSupplierData = useCallback(async () => {
    if (!supplierId) return
    try {
      setIsLoading(true)
      const [supData, purchData] = await Promise.all([
        fetchSupplierById(supplierId),
        fetchSupplierPurchases(supplierId, {
          page: 1,
          limit: 100,
          paymentStatus: paymentStatusFilter,
          fromDate,
          toDate,
        }),
      ])
      setSupplier(supData)
      setPurchases(purchData.items || [])
      setTotalPurchases(purchData.total || 0)
      setError('')
    } catch (err) {
      setError(err?.message || 'Unable to load supplier details.')
    } finally {
      setIsLoading(false)
    }
  }, [supplierId, paymentStatusFilter, fromDate, toDate])

  useEffect(() => {
    loadSupplierData()
  }, [loadSupplierData])

  const filteredPurchases = useMemo(() => {
    if (!historySearch.trim()) return purchases
    const q = historySearch.trim().toLowerCase()
    return purchases.filter(
      (v) =>
        v.voucherNumber?.toLowerCase().includes(q) ||
        v.supplierInvoiceNumber?.toLowerCase().includes(q) ||
        v.projectCode?.toLowerCase().includes(q) ||
        v.projectName?.toLowerCase().includes(q),
    )
  }, [purchases, historySearch])

  const handleOpenEdit = () => {
    if (!supplier) return
    setFormValues({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      notes: supplier.notes || '',
    })
    setFormErrors({})
    setIsEditing(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formValues.name.trim()) {
      setFormErrors({ name: 'Supplier name is required.' })
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await updateSupplier(supplier.id, formValues)
      setSupplier(updated)
      setIsEditing(false)
      showToast('Supplier information updated successfully.')
    } catch (err) {
      if (err?.fieldErrors) {
        setFormErrors(err.fieldErrors)
      } else {
        setFormErrors({ general: err?.message || 'An error occurred.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkPaid = async (voucherId) => {
    if (actionInProgressId === voucherId) return
    const targetBill = purchases.find((p) => p.id === voucherId)
    if (!targetBill) return

    const billAmount = Number(targetBill.finalTotal || 0)

    // Optimistically update purchase status and financial summary
    setPurchases((prev) =>
      prev.map((p) =>
        p.id === voucherId
          ? { ...p, paymentStatus: 'Paid', paidAt: new Date().toISOString() }
          : p,
      ),
    )

    if (supplier) {
      setSupplier((prev) => ({
        ...prev,
        financialSummary: {
          ...prev.financialSummary,
          totalPaidAmount: Math.round(((prev.financialSummary?.totalPaidAmount || 0) + billAmount) * 100) / 100,
          totalOutstandingAmount: Math.max(
            0,
            Math.round(((prev.financialSummary?.totalOutstandingAmount || 0) - billAmount) * 100) / 100,
          ),
          unpaidBillsCount: Math.max(0, (prev.financialSummary?.unpaidBillsCount || 0) - 1),
        },
      }))
    }

    setActionInProgressId(voucherId)
    try {
      await updatePurchasePaymentStatus(voucherId, 'Paid')
      showToast(
        `Voucher ${targetBill.voucherNumber} marked as Paid. Outstanding updated.`,
        'success',
      )
    } catch (err) {
      showToast(err?.message || 'Failed to update payment status.', 'error')
      loadSupplierData()
    } finally {
      setActionInProgressId(null)
    }
  }

  if (isLoading && !supplier) {
    return (
      <div className="pv-page">
        <div className="pv-state pv-state--loading">
          <div className="pv-spinner" aria-hidden="true" />
          <p className="pv-state__message">Loading supplier information...</p>
        </div>
      </div>
    )
  }

  if (error && !supplier) {
    return (
      <div className="pv-page">
        <div className="pv-state pv-state--error">
          <p className="pv-state__message">{error}</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => onNavigate?.('/suppliers')}
          >
            &larr; Back to Suppliers
          </button>
        </div>
      </div>
    )
  }

  const fin = supplier?.financialSummary || {}

  return (
    <div className="pv-page">
      {toastMessage && (
        <div
          className={`pv-toast pv-toast--${toastMessage.type}`}
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            backgroundColor:
              toastMessage.type === 'error' ? '#fde8e8' : '#e6f4ea',
            color: toastMessage.type === 'error' ? '#9b1c1c' : '#137333',
            border: `1px solid ${
              toastMessage.type === 'error' ? '#f8b4b4' : '#a8dab5'
            }`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 500,
          }}
          role="alert"
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.1rem',
              color: 'inherit',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Breadcrumb / Top nav */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className="pv-supplier-link"
          onClick={() => onNavigate?.('/suppliers')}
          style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          &larr; Back to Supplier Management
        </button>
      </div>

      <header className="pv-header" style={{ marginBottom: '1.5rem' }}>
        <div className="pv-header__text">
          <h1 className="pv-header__title">{supplier?.name}</h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', color: '#6b584c', fontSize: '0.875rem', flexWrap: 'wrap' }}>
            {supplier?.phone && <span>📞 {supplier.phone}</span>}
            {supplier?.email && <span>✉️ {supplier.email}</span>}
            {supplier?.gstNumber && <span>🏛️ GST: {supplier.gstNumber}</span>}
          </div>
        </div>

        <div className="pv-header__actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={handleOpenEdit}
          >
            Edit Profile
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => onNavigate?.('/purchases/new')}
          >
            + New Purchase
          </button>
        </div>
      </header>

      {/* Supplier Profile Info Card */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #ebd9c8',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#998675', fontWeight: 600 }}>
            Contact Person
          </span>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#3c2a21', marginTop: '0.2rem' }}>
            {supplier?.contactPerson || '—'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#998675', fontWeight: 600 }}>
            Phone Number
          </span>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#3c2a21', marginTop: '0.2rem' }}>
            {supplier?.phone || '—'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#998675', fontWeight: 600 }}>
            Email
          </span>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#3c2a21', marginTop: '0.2rem' }}>
            {supplier?.email || '—'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#998675', fontWeight: 600 }}>
            Address
          </span>
          <div style={{ fontSize: '0.9rem', color: '#524337', marginTop: '0.2rem' }}>
            {supplier?.address || '—'}
          </div>
        </div>

        {supplier?.notes && (
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#998675', fontWeight: 600 }}>
              Notes
            </span>
            <div style={{ fontSize: '0.875rem', color: '#524337', marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>
              {supplier.notes}
            </div>
          </div>
        )}
      </section>

      {/* Supplier Financial Summary Strip - 5 Cards */}
      <section className="pv-summary-grid pv-summary-grid--5" aria-label="Supplier financial summary" style={{ marginBottom: '1.5rem' }}>
        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Total Purchases</span>
          <strong className="pv-summary-card__value">
            {formatInrCurrency(fin.totalPurchaseValue || 0)}
          </strong>
          <span className="pv-summary-card__hint">
            Active purchase total
          </span>
        </article>

        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Total Paid</span>
          <strong className="pv-summary-card__value pv-summary-card__value--success">
            {formatInrCurrency(fin.totalPaidAmount || 0)}
          </strong>
          <span className="pv-summary-card__hint">Settled payments</span>
        </article>

        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Outstanding Amount</span>
          <strong
            className={`pv-summary-card__value${
              (fin.totalOutstandingAmount || 0) > 0 ? ' pv-summary-card__value--warning' : ''
            }`}
          >
            {formatInrCurrency(fin.totalOutstandingAmount || 0)}
          </strong>
          <span className="pv-summary-card__hint">
            {(fin.unpaidBillsCount || 0) > 0 ? 'Payment pending' : 'All bills settled'}
          </span>
        </article>

        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Total Purchase Vouchers</span>
          <strong className="pv-summary-card__value">
            {fin.totalVouchersCount || 0}
          </strong>
          <span className="pv-summary-card__hint">Recorded vouchers</span>
        </article>

        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Unpaid Bills</span>
          <strong
            className={`pv-summary-card__value${
              (fin.unpaidBillsCount || 0) > 0 ? ' pv-summary-card__value--warning' : ''
            }`}
          >
            {fin.unpaidBillsCount || 0}
          </strong>
          <span className="pv-summary-card__hint">
            {(fin.unpaidBillsCount || 0) > 0 ? 'Awaiting settlement' : 'Zero outstanding'}
          </span>
        </article>
      </section>

      {/* Purchase History Header & Filters */}
      <div className="pv-surface" style={{ marginBottom: '1.25rem' }}>
        <div className="pv-filters-wrap">
          <div className="pv-filters">
            <div className="pv-filters__search-row">
              <div className="pv-filters__search-box">
                <svg className="pv-filters__search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM17 17l-3.8-3.8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="search"
                  className="pv-filters__search-input"
                  placeholder="Search voucher number, invoice, project..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
                {historySearch ? (
                  <button
                    type="button"
                    className="pv-filters__clear-btn"
                    onClick={() => setHistorySearch('')}
                    title="Clear search"
                  >
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M4 4L12 12M12 4L4 12"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="pv-filters__desktop-controls">
              <div className="pv-filters__control" style={{ minWidth: '160px' }}>
                <Dropdown
                  value={paymentStatusFilter}
                  options={[
                    { value: 'all', label: 'All Payments' },
                    { value: 'Unpaid', label: 'Unpaid Only' },
                    { value: 'Paid', label: 'Paid Only' },
                  ]}
                  onChange={(val) => setPaymentStatusFilter(val)}
                  ariaLabel="Filter by payment status"
                />
              </div>

              <div className="pv-filters__date-pair">
                <DatePicker
                  prefix="From"
                  value={fromDate}
                  onChange={setFromDate}
                  maxDate={toDate || undefined}
                  variant="filter"
                  ariaLabel="Filter from purchase date"
                  placeholder="From"
                />
                <DatePicker
                  prefix="To"
                  value={toDate}
                  onChange={setToDate}
                  minDate={fromDate || undefined}
                  variant="filter"
                  ariaLabel="Filter to purchase date"
                  placeholder="To"
                />
              </div>

              {(paymentStatusFilter !== 'all' || fromDate || toDate || historySearch) && (
                <button
                  type="button"
                  className="pv-filters__reset-btn"
                  onClick={() => {
                    setPaymentStatusFilter('all')
                    setFromDate('')
                    setToDate('')
                    setHistorySearch('')
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>

            <div className="pv-filters__meta-row">
              <span className="pv-filters__count">
                <strong>{purchases.length}</strong> purchase voucher{purchases.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History Table */}
      {purchases.length === 0 ? (
        <div className="pv-state pv-state--empty">
          <h2 className="pv-state__title">No Purchase Vouchers</h2>
          <p className="pv-state__message">
            No purchase vouchers recorded for this supplier matching the filters.
          </p>
        </div>
      ) : (
        <div className="pv-surface">
          <PurchasesTable
            vouchers={filteredPurchases}
            canEditVoucher={false}
            onViewVoucher={(id) =>
              onNavigate?.(`/purchases/${encodeURIComponent(id)}`)
            }
            onMarkPaid={handleMarkPaid}
            onViewProject={(projId) =>
              onNavigate?.(`/projects/${encodeURIComponent(projId)}`)
            }
          />
          <PurchasesMobileList
            vouchers={filteredPurchases}
            canEditVoucher={false}
            onViewVoucher={(id) =>
              onNavigate?.(`/purchases/${encodeURIComponent(id)}`)
            }
            onMarkPaid={handleMarkPaid}
          />
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div
          className="admin-modal-backdrop"
          style={{ zIndex: 9999 }}
          role="presentation"
        >
          <div
            className="admin-modal"
            style={{ maxWidth: '520px', width: '92%' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal__header">
              <h2 className="admin-modal__title">Edit Supplier Profile</h2>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div
                className="admin-modal__body"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                }}
              >
                {formErrors.general && (
                  <p className="pv-field-error">{formErrors.general}</p>
                )}

                <div>
                  <label className="pv-form-label" htmlFor="edit-sup-name">
                    Supplier Name <span className="pv-req">*</span>
                  </label>
                  <input
                    id="edit-sup-name"
                    type="text"
                    className={`pv-input${formErrors.name ? ' pv-input--error' : ''}`}
                    value={formValues.name}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                  {formErrors.name && (
                    <p className="pv-field-error">{formErrors.name}</p>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="pv-form-label" htmlFor="edit-sup-contact">
                      Contact Person
                    </label>
                    <input
                      id="edit-sup-contact"
                      type="text"
                      className="pv-input"
                      value={formValues.contactPerson}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          contactPerson: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="pv-form-label" htmlFor="edit-sup-phone">
                      Phone Number
                    </label>
                    <input
                      id="edit-sup-phone"
                      type="text"
                      className="pv-input"
                      value={formValues.phone}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="pv-form-label" htmlFor="edit-sup-email">
                      Email Address
                    </label>
                    <input
                      id="edit-sup-email"
                      type="email"
                      className="pv-input"
                      value={formValues.email}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="pv-form-label" htmlFor="edit-sup-gst">
                      GST Number
                    </label>
                    <input
                      id="edit-sup-gst"
                      type="text"
                      className="pv-input"
                      value={formValues.gstNumber}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          gstNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="pv-form-label" htmlFor="edit-sup-address">
                    Physical Address
                  </label>
                  <textarea
                    id="edit-sup-address"
                    className="pv-input"
                    rows={2}
                    value={formValues.address}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="pv-form-label" htmlFor="edit-sup-notes">
                    Notes
                  </label>
                  <textarea
                    id="edit-sup-notes"
                    className="pv-input"
                    rows={2}
                    value={formValues.notes}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="admin-modal__footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
