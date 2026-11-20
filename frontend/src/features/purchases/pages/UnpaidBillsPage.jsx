import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchPurchaseVouchers,
  fetchUnpaidBillsSummary,
  formatInrCurrency,
  formatPurchaseDate,
  hasActiveAuthToken,
  updatePurchasePaymentStatus,
} from '../services/purchaseService'
import { fetchProjects } from '../../projects'
import { fetchSuppliers } from '../../suppliers/services/supplierService'
import { PurchasesTable } from '../components/PurchasesTable'
import { PurchasesMobileList } from '../components/PurchasesMobileList'
import { hasPermission } from '../../permissions/constants/permissionsCatalog'
import { DatePicker, Dropdown } from '../../../components/common'
import { Pagination } from '../../../components/common/Pagination'
import { calculatePreservedPage } from '../../../components/common/paginationUtils'
import '../styles/purchases.css'

const DEFAULT_PAGE_SIZE = 10

export function UnpaidBillsPage({ currentUser, onNavigate }) {
  const canEditVoucher = hasPermission(currentUser, 'purchases.edit')
  const canViewProjects = hasPermission(currentUser, 'projects.view')

  const [bills, setBills] = useState([])
  const [totalBills, setTotalBills] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [summary, setSummary] = useState({
    totalUnpaidBills: 0,
    totalOutstandingAmount: 0,
    supplierCountWithOutstanding: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [projects, setProjects] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [toastMessage, setToastMessage] = useState(null)
  const [actionInProgressId, setActionInProgressId] = useState(null)
  const hasLoadedOnceRef = useRef(false)

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ text: msg, type })
    window.setTimeout(() => setToastMessage(null), 3500)
  }, [])

  // Load project & supplier options for filters
  useEffect(() => {
    let cancelled = false
    fetchProjects({ page: 1, limit: 100 })
      .then((res) => {
        if (!cancelled) setProjects(res.projects || [])
      })
      .catch(() => {})
    fetchSuppliers({ page: 1, limit: 100 })
      .then((res) => {
        if (!cancelled) setSuppliers(res.items || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Debounced search input
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

  const projectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Projects' },
      { value: 'none', label: 'General Stock (No Project)' },
      ...projects.map((p) => ({
        value: p.id,
        label: `${p.projectId} — ${p.projectName}`,
      })),
    ]
  }, [projects])

  const supplierOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Suppliers' },
      ...suppliers.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    ]
  }, [suppliers])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [vouchersRes, summaryRes] = await Promise.all([
        fetchPurchaseVouchers({
          page: currentPage,
          limit: pageSize,
          search: appliedSearch,
          projectId: projectFilter !== 'all' ? projectFilter : undefined,
          supplierId: supplierFilter !== 'all' ? supplierFilter : undefined,
          paymentStatus: 'Unpaid',
          fromDate,
          toDate,
          status: 'active',
        }),
        fetchUnpaidBillsSummary().catch(() => null),
      ])

      const unpaidVouchers = (vouchersRes.vouchers || []).filter(
        (v) => (v.paymentStatus || 'Unpaid') === 'Unpaid' && v.status === 'active',
      )
      setBills(unpaidVouchers)
      const totalCount = Number(vouchersRes.total ?? unpaidVouchers.length) || 0
      setTotalBills(totalCount)
      const calcTotalPages = Math.max(1, Number(vouchersRes.totalPages || Math.ceil(totalCount / pageSize) || 1))
      setTotalPages(calcTotalPages)

      if (calcTotalPages >= 1 && currentPage > calcTotalPages) {
        setCurrentPage(calcTotalPages)
      }

      if (summaryRes) {
        setSummary(summaryRes)
      } else {
        const totalOutstanding = unpaidVouchers.reduce(
          (sum, v) => sum + Number(v.finalTotal || 0),
          0,
        )
        const uniqueSuppliers = new Set(
          unpaidVouchers.map((v) => v.supplierId || v.supplierName),
        )
        setSummary({
          totalUnpaidBills: totalCount,
          totalOutstandingAmount: totalOutstanding,
          supplierCountWithOutstanding: uniqueSuppliers.size,
        })
      }
      setError('')
    } catch (err) {
      setError(err?.message || 'Unable to load unpaid bills.')
    } finally {
      setIsLoading(false)
      hasLoadedOnceRef.current = true
    }
  }, [currentPage, pageSize, appliedSearch, projectFilter, supplierFilter, fromDate, toDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage)
  }

  const handlePageSizeChange = (nextLimit) => {
    const newPage = calculatePreservedPage(
      currentPage,
      pageSize,
      nextLimit,
      totalBills,
    )
    setPageSize(nextLimit)
    setCurrentPage(newPage)
  }

  const handleProjectFilterChange = (val) => {
    setProjectFilter(val)
    setCurrentPage(1)
  }

  const handleSupplierFilterChange = (val) => {
    setSupplierFilter(val)
    setCurrentPage(1)
  }

  const handleFromDateChange = (val) => {
    setFromDate(val)
    setCurrentPage(1)
  }

  const handleToDateChange = (val) => {
    setToDate(val)
    setCurrentPage(1)
  }

  const handleMarkPaid = async (voucherId) => {
    if (actionInProgressId === voucherId) return
    const targetBill = bills.find((b) => b.id === voucherId)
    if (!targetBill) return

    // Optimistically update
    const billAmount = Number(targetBill.finalTotal || 0)
    setBills((prev) => prev.filter((b) => b.id !== voucherId))
    setTotalBills((prev) => Math.max(0, prev - 1))
    setSummary((prev) => ({
      ...prev,
      totalUnpaidBills: Math.max(0, prev.totalUnpaidBills - 1),
      totalOutstandingAmount: Math.max(
        0,
        Math.round((prev.totalOutstandingAmount - billAmount) * 100) / 100,
      ),
    }))

    setActionInProgressId(voucherId)
    try {
      await updatePurchasePaymentStatus(voucherId, 'Paid')
      showToast(
        `Voucher ${targetBill.voucherNumber} marked as Paid. Outstanding updated.`,
        'success',
      )
      loadData()
    } catch (err) {
      showToast(err?.message || 'Failed to update payment status.', 'error')
      loadData()
    } finally {
      setActionInProgressId(null)
    }
  }

  const handleResetFilters = () => {
    setSearchInput('')
    setAppliedSearch('')
    setProjectFilter('all')
    setSupplierFilter('all')
    setFromDate('')
    setToDate('')
    setCurrentPage(1)
  }

  const hasActiveFilters = Boolean(
    appliedSearch ||
      searchInput.trim() ||
      (projectFilter && projectFilter !== 'all') ||
      (supplierFilter && supplierFilter !== 'all') ||
      fromDate ||
      toDate,
  )

  return (
    <div className="pv-page">
      {toastMessage ? (
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
      ) : null}

      <header className="pv-header">
        <div className="pv-header__text">
          <h1 className="pv-header__title">Unpaid Bills</h1>
          <p className="pv-header__subtitle" style={{ margin: '0.25rem 0 0', color: '#6b584c', fontSize: '0.9rem' }}>
            Manage outstanding supplier payments.
          </p>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="pv-summary-grid pv-summary-grid--3" aria-label="Unpaid bills summary metrics">
        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Total Unpaid Bills</span>
          <strong className="pv-summary-card__value pv-summary-card__value--warning">
            {summary.totalUnpaidBills}
          </strong>
          <span className="pv-summary-card__hint">Awaiting supplier settlement</span>
        </article>

        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Total Outstanding Amount</span>
          <strong className="pv-summary-card__value pv-summary-card__value--warning">
            {formatInrCurrency(summary.totalOutstandingAmount)}
          </strong>
          <span className="pv-summary-card__hint">Calculated across active unpaid vouchers</span>
        </article>

        <article className="pv-summary-card">
          <span className="pv-summary-card__label">Suppliers with Outstanding Bills</span>
          <strong className="pv-summary-card__value">
            {summary.supplierCountWithOutstanding}
          </strong>
          <span className="pv-summary-card__hint">Vendors requiring payment</span>
        </article>
      </section>

      {/* Search and Filters Container matching Purchases */}
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
                  placeholder="Search by Voucher Number, Supplier Name, Invoice Number and Materials..."
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
            </div>

            <div className="pv-filters__desktop-controls">
              <div className="pv-filters__control pv-filters__control--project" style={{ minWidth: '180px' }}>
                <Dropdown
                  value={projectFilter}
                  options={projectOptions}
                  onChange={handleProjectFilterChange}
                  placeholder="All Projects"
                  ariaLabel="Filter by project"
                />
              </div>

              <div className="pv-filters__control pv-filters__control--supplier" style={{ minWidth: '180px' }}>
                <Dropdown
                  value={supplierFilter}
                  options={supplierOptions}
                  onChange={handleSupplierFilterChange}
                  placeholder="All Suppliers"
                  ariaLabel="Filter by supplier"
                />
              </div>

              <div className="pv-filters__date-pair">
                <DatePicker
                  prefix="From"
                  value={fromDate}
                  onChange={handleFromDateChange}
                  maxDate={toDate || undefined}
                  variant="filter"
                  ariaLabel="Filter from purchase date"
                  placeholder="From"
                />
                <DatePicker
                  prefix="To"
                  value={toDate}
                  onChange={handleToDateChange}
                  minDate={fromDate || undefined}
                  variant="filter"
                  ariaLabel="Filter to purchase date"
                  placeholder="To"
                />
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  className="pv-filters__reset-btn"
                  onClick={handleResetFilters}
                >
                  Reset filters
                </button>
              ) : null}
            </div>

            <div className="pv-filters__meta-row">
              <span className="pv-filters__count">
                <strong>{totalBills}</strong> unpaid bill{totalBills === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Unpaid Bills Table */}
      {isLoading ? (
        <div className="pv-state pv-state--loading">
          <div className="pv-spinner" aria-hidden="true" />
          <p className="pv-state__message">Loading unpaid bills...</p>
        </div>
      ) : error ? (
        <div className="pv-state pv-state--error">
          <p className="pv-state__message">{error}</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={loadData}
          >
            Retry
          </button>
        </div>
      ) : bills.length === 0 ? (
        <div className="pv-state pv-state--empty">
          <h2 className="pv-state__title">No Outstanding Bills</h2>
          <p className="pv-state__message">
            {hasActiveFilters
              ? 'No unpaid bills match your current filters.'
              : 'All supplier purchase vouchers have been settled! Great job.'}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={handleResetFilters}
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="pv-surface">
          <PurchasesTable
            vouchers={bills}
            canEditVoucher={canEditVoucher}
            onViewVoucher={(id) =>
              onNavigate?.(`/purchases/${encodeURIComponent(id)}`)
            }
            onEditVoucher={
              canEditVoucher
                ? (id) => onNavigate?.(`/purchases/${encodeURIComponent(id)}/edit`)
                : null
            }
            onMarkPaid={canEditVoucher ? handleMarkPaid : null}
            onViewSupplier={(supplierKey) =>
              onNavigate?.(
                /^[a-f\d]{24}$/i.test(supplierKey)
                  ? `/suppliers/${encodeURIComponent(supplierKey)}`
                  : `/suppliers?search=${encodeURIComponent(supplierKey)}`,
              )
            }
            onViewProject={
              canViewProjects
                ? (projId) =>
                    onNavigate?.(`/projects/${encodeURIComponent(projId)}`)
                : null
            }
          />

          <PurchasesMobileList
            vouchers={bills}
            canEditVoucher={canEditVoucher}
            onViewVoucher={(id) =>
              onNavigate?.(`/purchases/${encodeURIComponent(id)}`)
            }
            onEditVoucher={
              canEditVoucher
                ? (id) => onNavigate?.(`/purchases/${encodeURIComponent(id)}/edit`)
                : null
            }
            onMarkPaid={canEditVoucher ? handleMarkPaid : null}
            onViewSupplier={(supplierKey) =>
              onNavigate?.(
                /^[a-f\d]{24}$/i.test(supplierKey)
                  ? `/suppliers/${encodeURIComponent(supplierKey)}`
                  : `/suppliers?search=${encodeURIComponent(supplierKey)}`,
              )
            }
          />

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={totalBills}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            itemName="unpaid bill"
            itemsName="unpaid bills"
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  )
}
