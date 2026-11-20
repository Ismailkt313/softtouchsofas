import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
} from '../services/supplierService'
import { formatInrCurrency } from '../../purchases/utils/purchaseMath'
import { Pagination } from '../../../components/common/Pagination'
import { calculatePreservedPage } from '../../../components/common/paginationUtils'
import { SuppliersTable, SuppliersMobileList } from '../components'
import '../../purchases/styles/purchases.css'

const DEFAULT_PAGE_SIZE = 10

export function SuppliersPage({ currentUser, onNavigate }) {
  const [suppliers, setSuppliers] = useState([])
  const [totalSuppliers, setTotalSuppliers] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [summaryData, setSummaryData] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState(null)

  // Add / Edit Modal state
  const [modalMode, setModalMode] = useState(null) // 'create' | 'edit' | null
  const [editingSupplier, setEditingSupplier] = useState(null)
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

  // Debounced search
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim()
      setAppliedSearch((prev) => {
        if (prev !== next) {
          setCurrentPage(1)
        }
        return next
      })
    }, 280)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadSuppliers = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetchSuppliers({
        page: currentPage,
        limit: pageSize,
        search: appliedSearch,
      })
      setSuppliers(res.items || [])
      const total = Number(res.total ?? (res.items || []).length) || 0
      setTotalSuppliers(total)
      const calcTotalPages = Math.max(
        1,
        Number(res.totalPages || Math.ceil(total / pageSize) || 1),
      )
      setTotalPages(calcTotalPages)
      if (calcTotalPages >= 1 && currentPage > calcTotalPages) {
        setCurrentPage(calcTotalPages)
      }
      if (res.summary) {
        setSummaryData(res.summary)
      }
      setError('')
    } catch (err) {
      setError(err?.message || 'Unable to load suppliers.')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize, appliedSearch])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage)
  }

  const handlePageSizeChange = (nextLimit) => {
    const newPage = calculatePreservedPage(
      currentPage,
      pageSize,
      nextLimit,
      totalSuppliers,
    )
    setPageSize(nextLimit)
    setCurrentPage(newPage)
  }

  const openCreateModal = () => {
    setFormValues({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstNumber: '',
      notes: '',
    })
    setFormErrors({})
    setModalMode('create')
    setEditingSupplier(null)
  }

  const openEditModal = (supplier) => {
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
    setModalMode('edit')
    setEditingSupplier(supplier)
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingSupplier(null)
    setFormErrors({})
  }

  const handleFormChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!formValues.name.trim()) {
      errs.name = 'Supplier name is required.'
    }
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    setIsSubmitting(true)
    try {
      if (modalMode === 'create') {
        const created = await createSupplier(formValues)
        showToast(`Supplier '${created.name}' created successfully.`)
      } else if (modalMode === 'edit' && editingSupplier) {
        const updated = await updateSupplier(editingSupplier.id, formValues)
        showToast(`Supplier '${updated.name}' updated successfully.`)
      }
      closeModal()
      loadSuppliers()
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

  // Summary figures across all active suppliers & recorded vouchers
  const { activeCountAll, totalPurchasesAll, totalOutstandingAll, totalUnpaidBillsCount } = useMemo(() => {
    if (summaryData) {
      return {
        activeCountAll: summaryData.activeSuppliersCount ?? totalSuppliers,
        totalPurchasesAll: summaryData.totalPurchases ?? 0,
        totalOutstandingAll: summaryData.totalOutstandingCredit ?? 0,
        totalUnpaidBillsCount: summaryData.unpaidBillsCount ?? 0,
      }
    }
    let purchases = 0
    let outstanding = 0
    let unpaidCount = 0
    suppliers.forEach((s) => {
      purchases += s.financialSummary?.totalPurchaseValue || 0
      outstanding += s.financialSummary?.totalOutstandingAmount || 0
      unpaidCount += s.financialSummary?.unpaidBillsCount || 0
    })
    return {
      activeCountAll: totalSuppliers,
      totalPurchasesAll: purchases,
      totalOutstandingAll: outstanding,
      totalUnpaidBillsCount: unpaidCount,
    }
  }, [summaryData, totalSuppliers, suppliers])

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

      <header className="pv-header">
        <div className="pv-header__text">
          <h1 className="pv-header__title">Supplier Management</h1>
          <p className="pv-header__subtitle" style={{ margin: '0.25rem 0 0', color: '#6b584c', fontSize: '0.9rem' }}>
            Manage supplier profiles, purchase history, and outstanding credit balances.
          </p>
        </div>

        <div className="pv-header__actions">
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={openCreateModal}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 4.5V15.5M4.5 10H15.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>+ Add Supplier</span>
          </button>
        </div>
      </header>

      {/* Summary Stats Strip */}
      <section className="pv-summary-grid pv-summary-grid--3" aria-label="Supplier management summary">
        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Active Suppliers</span>
          <strong className="pv-summary-card__value">{activeCountAll}</strong>
          <span className="pv-summary-card__hint">Centralized directory</span>
        </article>

        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Total Purchases</span>
          <strong className="pv-summary-card__value">
            {formatInrCurrency(totalPurchasesAll)}
          </strong>
          <span className="pv-summary-card__hint">Across all recorded vouchers</span>
        </article>

        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Total Outstanding Credit</span>
          <strong
            className={`pv-summary-card__value${
              totalOutstandingAll > 0 ? ' pv-summary-card__value--warning' : ''
            }`}
          >
            {formatInrCurrency(totalOutstandingAll)}
          </strong>
          <span className="pv-summary-card__hint">
            {totalUnpaidBillsCount} unpaid bill{totalUnpaidBillsCount === 1 ? '' : 's'} across suppliers
          </span>
        </article>
      </section>

      {/* Search Bar matching Purchases filter container */}
      <div className="pv-surface" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
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
                  placeholder="Search suppliers by name, contact person, phone, email, or GST..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="pv-filters__clear-btn"
                    onClick={() => {
                      setSearchInput('')
                      setAppliedSearch('')
                      setCurrentPage(1)
                    }}
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

              {searchInput ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => {
                    setSearchInput('')
                    setAppliedSearch('')
                    setCurrentPage(1)
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="pv-filters__meta-row">
              <span className="pv-filters__count">
                <strong>{totalSuppliers}</strong> supplier{totalSuppliers === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      {isLoading ? (
        <div className="pv-state pv-state--loading">
          <div className="pv-spinner" aria-hidden="true" />
          <p className="pv-state__message">Loading suppliers...</p>
        </div>
      ) : error ? (
        <div className="pv-state pv-state--error">
          <p className="pv-state__message">{error}</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={loadSuppliers}
          >
            Retry
          </button>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="pv-state pv-state--empty">
          <h2 className="pv-state__title">No Suppliers Found</h2>
          <p className="pv-state__message">
            {appliedSearch || searchInput.trim()
              ? 'No suppliers match your search query.'
              : 'Add your first supplier to start managing supplier credits and purchases.'}
          </p>
          {appliedSearch || searchInput.trim() ? (
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => {
                setSearchInput('')
                setAppliedSearch('')
                setCurrentPage(1)
              }}
            >
              Clear Search
            </button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={openCreateModal}
            >
              + Add Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="pv-surface">
          <SuppliersTable
            suppliers={suppliers}
            onViewSupplier={(id) =>
              onNavigate?.(`/suppliers/${encodeURIComponent(id)}`)
            }
            onEditSupplier={openEditModal}
          />

          <SuppliersMobileList
            suppliers={suppliers}
            onViewSupplier={(id) =>
              onNavigate?.(`/suppliers/${encodeURIComponent(id)}`)
            }
            onEditSupplier={openEditModal}
          />

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={totalSuppliers}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            itemName="supplier"
            itemsName="suppliers"
            disabled={isLoading}
          />
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {modalMode && (
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
              <h2 className="admin-modal__title">
                {modalMode === 'create' ? 'Add New Supplier' : 'Edit Supplier'}
              </h2>
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
                  <label className="pv-form-label" htmlFor="sup-name">
                    Supplier Name <span className="pv-req">*</span>
                  </label>
                  <input
                    id="sup-name"
                    type="text"
                    className={`pv-input${formErrors.name ? ' pv-input--error' : ''}`}
                    placeholder="e.g. Royal Timber & Foams"
                    value={formValues.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    autoFocus
                  />
                  {formErrors.name && (
                    <p className="pv-field-error">{formErrors.name}</p>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="pv-form-label" htmlFor="sup-contact">
                      Contact Person
                    </label>
                    <input
                      id="sup-contact"
                      type="text"
                      className="pv-input"
                      placeholder="e.g. Haris Kumar"
                      value={formValues.contactPerson}
                      onChange={(e) =>
                        handleFormChange('contactPerson', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="pv-form-label" htmlFor="sup-phone">
                      Phone Number
                    </label>
                    <input
                      id="sup-phone"
                      type="text"
                      className="pv-input"
                      placeholder="+91 9876543210"
                      value={formValues.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="pv-form-label" htmlFor="sup-email">
                      Email Address
                    </label>
                    <input
                      id="sup-email"
                      type="email"
                      className="pv-input"
                      placeholder="supplier@domain.com"
                      value={formValues.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="pv-form-label" htmlFor="sup-gst">
                      GST Number
                    </label>
                    <input
                      id="sup-gst"
                      type="text"
                      className="pv-input"
                      placeholder="32ABCDE1234F1Z5"
                      value={formValues.gstNumber}
                      onChange={(e) => handleFormChange('gstNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="pv-form-label" htmlFor="sup-address">
                    Physical Address
                  </label>
                  <textarea
                    id="sup-address"
                    className="pv-input"
                    rows={2}
                    placeholder="Warehouse or office address"
                    value={formValues.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                  />
                </div>

                <div>
                  <label className="pv-form-label" htmlFor="sup-notes">
                    Notes
                  </label>
                  <textarea
                    id="sup-notes"
                    className="pv-input"
                    rows={2}
                    placeholder="Credit terms, bank details, delivery notes..."
                    value={formValues.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal__footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : modalMode === 'create'
                      ? 'Add Supplier'
                      : 'Update Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
