import { useEffect, useId, useRef, useState } from 'react'
import { fetchStockMovements, submitStockAdjustment } from '../services/stockMovementService'
import {
  formatMaterialDateTime,
  formatMaterialQuantityOnHand,
  formatMaterialUnit,
  formatMaterialUnitOptionLabel,
} from '../services/rawMaterialService'
import {
  RawMaterialCategoryTag,
  RawMaterialStatusBadge,
} from './RawMaterialStatusBadge'

export function RawMaterialDetailsModal({
  isOpen,
  material,
  isLoading = false,
  error = '',
  adminAccess = false,
  canManageStock = false,
  onClose,
  onRetry,
  onEdit,
  onToggleStatus,
}) {
  const closeBtnRef = useRef(null)
  const backdropMouseDownRef = useRef(false)
  const titleId = useId()
  const [movementPage, setMovementPage] = useState(1)
  const [movementType, setMovementType] = useState('')
  const [movementFrom, setMovementFrom] = useState('')
  const [movementTo, setMovementTo] = useState('')
  const [movementTotalPages, setMovementTotalPages] = useState(1)
  const [movements, setMovements] = useState([])
  const [adjustment, setAdjustment] = useState({ direction: 'increase', quantity: '', reason: 'physical_count', notes: '' })
  const [movementError, setMovementError] = useState('')
  const [savingAdjustment, setSavingAdjustment] = useState(false)

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.requestAnimationFrame(() => {
      closeBtnRef.current?.focus()
    })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !material?.id) return
    let cancelled = false
    fetchStockMovements(material.id, { page: movementPage, limit: 10, type: movementType, from: movementFrom, to: movementTo })
      .then(result => { if (!cancelled) { setMovements(result.items || []); setMovementTotalPages(result.totalPages || 1) } })
      .catch(error => { if (!cancelled) setMovementError(error instanceof Error ? error.message : 'Unable to load stock history.') })
    return () => { cancelled = true }
  }, [isOpen, material?.id, movementPage, movementType, movementFrom, movementTo])

  const saveAdjustment = async () => {
    setMovementError('')
    const quantity = Number(adjustment.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) { setMovementError('Enter a positive adjustment quantity.'); return }
    setSavingAdjustment(true)
    try {
      await submitStockAdjustment(material.id, { ...adjustment, quantity })
      setAdjustment(current => ({ ...current, quantity: '', notes: '' }))
      setMovementPage(1)
      onRetry?.()
    } catch (error) { setMovementError(error instanceof Error ? error.message : 'Unable to adjust stock.') }
    finally { setSavingAdjustment(false) }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="admin-modal-backdrop rm-modal-backdrop"
      onMouseDown={(event) => {
        backdropMouseDownRef.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (
          backdropMouseDownRef.current &&
          event.target === event.currentTarget
        ) {
          onClose?.()
        }
        backdropMouseDownRef.current = false
      }}
    >
      <div
        className="admin-modal rm-modal rm-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="admin-modal__header rm-modal__header">
          <div className="rm-modal__heading">
            <h2 id={titleId} className="admin-modal__title">
              Material Details
            </h2>
            <p className="admin-modal__subtitle">
              Saved specifications, stock on hand, and purchase unit details.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="admin-modal__close rm-modal__close"
            onClick={onClose}
            aria-label="Close material details"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="admin-modal__body rm-modal__body rm-details-modal__body">
          {error ? (
            <div className="rm-details-state" role="alert">
              <p className="rm-details-state__msg">{error}</p>
              {typeof onRetry === 'function' ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={onRetry}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : !material && isLoading ? (
            <div className="rm-details-loading" role="status" aria-busy="true">
              <div className="rm-skeleton-line rm-skeleton-line--title" />
              <div className="rm-skeleton-line rm-skeleton-line--sub" />
              <div className="rm-skeleton-line rm-skeleton-line--sub" />
            </div>
          ) : material ? (
            <>
              <div className="rm-details-hero">
                <h3 className="rm-details-hero__name">{material.name}</h3>
                <div className="rm-details-hero__badges">
                  <RawMaterialStatusBadge isActive={material.isActive} />
                  <RawMaterialCategoryTag category={material.category} />
                  <span
                    className="rm-unit-pill"
                    title={material.unit || undefined}
                  >
                    {formatMaterialUnit(material.unit) || '—'}
                  </span>
                  <span className="rm-qty-badge">
                    {formatMaterialQuantityOnHand(
                      material.quantityOnHand,
                      material.unit,
                    )}
                  </span>
                </div>
              </div>

              <dl className="profile-details rm-details-list">
                <div className="profile-details__row">
                  <dt>Quantity on Hand</dt>
                  <dd>
                    <strong>
                      {formatMaterialQuantityOnHand(
                        material.quantityOnHand,
                        material.unit,
                      )}
                    </strong>
                  </dd>
                </div>
                <div className="profile-details__row">
                  <dt>Minimum Stock Level</dt>
                  <dd>
                    {typeof material.minStockLevel === 'number' &&
                    Number.isFinite(material.minStockLevel)
                      ? formatMaterialQuantityOnHand(
                          material.minStockLevel,
                          material.unit,
                        )
                      : 'Not configured'}
                  </dd>
                </div>
                <div className="profile-details__row">
                  <dt>Unit</dt>
                  <dd>{formatMaterialUnitOptionLabel(material.unit) || '—'}</dd>
                </div>
                <div className="profile-details__row">
                  <dt>Category</dt>
                  <dd>{material.category || 'Uncategorized'}</dd>
                </div>
                <div className="profile-details__row">
                  <dt>Status</dt>
                  <dd>{material.isActive ? 'Active' : 'Inactive'}</dd>
                </div>
                <div className="profile-details__row">
                  <dt>Last Updated</dt>
                  <dd>{formatMaterialDateTime(material.updatedAt)}</dd>
                </div>
                <div className="profile-details__row">
                  <dt>Created</dt>
                  <dd>{formatMaterialDateTime(material.createdAt)}</dd>
                </div>
              </dl>

              <div className="rm-details-description">
                <span className="rm-details-description__label">
                  Description
                </span>
                <p className="rm-details-description__body">
                  {material.description || 'No description provided.'}
                </p>
              </div>
              {canManageStock ? <section className="rm-stock-adjustment"><h3>Adjust Stock</h3><div className="rm-stock-adjustment__form"><select value={adjustment.direction} onChange={event => setAdjustment(current => ({ ...current, direction: event.target.value }))}><option value="increase">Increase stock</option><option value="decrease">Decrease stock</option></select><input type="number" min="0.001" step="0.001" placeholder={`Quantity (${material.unit})`} value={adjustment.quantity} onChange={event => setAdjustment(current => ({ ...current, quantity: event.target.value }))} /><select value={adjustment.reason} onChange={event => setAdjustment(current => ({ ...current, reason: event.target.value }))}><option value="physical_count">Physical count correction</option><option value="damaged_material">Damaged material</option><option value="supplier_return">Supplier return</option><option value="correction">Inventory correction</option><option value="other">Other</option></select><input maxLength={1000} placeholder="Optional notes" value={adjustment.notes} onChange={event => setAdjustment(current => ({ ...current, notes: event.target.value }))} /><button type="button" className="admin-btn admin-btn--primary" disabled={savingAdjustment} onClick={saveAdjustment}>{savingAdjustment ? 'Saving…' : 'Record adjustment'}</button></div></section> : null}
              <section className="rm-stock-history"><div className="rm-stock-history__heading"><h3>Stock Movement History</h3><div className="rm-stock-history__filters"><select aria-label="Filter movement type" value={movementType} onChange={event => { setMovementType(event.target.value); setMovementPage(1) }}><option value="">All movement types</option><option value="purchase_created">Purchase posted</option><option value="purchase_revised">Purchase revised</option><option value="purchase_cancelled">Purchase cancelled</option><option value="project_consumption">Project consumption</option><option value="stock_adjustment_increase">Adjustment increase</option><option value="stock_adjustment_decrease">Adjustment decrease</option></select><input aria-label="Movement from date" type="date" value={movementFrom} onChange={event => { setMovementFrom(event.target.value); setMovementPage(1) }} /><input aria-label="Movement to date" type="date" value={movementTo} onChange={event => { setMovementTo(event.target.value); setMovementPage(1) }} /></div></div>{movementError ? <p role="alert">{movementError}</p> : null}{movements.length ? <div className="rm-stock-history__list">{movements.map(item => <article key={item.id}><div><strong>{String(item.movementType).replaceAll('_', ' ')}</strong><small>{formatMaterialDateTime(item.createdAt)} · {item.performedBy}</small><small>{item.reason}{item.projectId ? ` · ${item.projectId}` : ''}{item.voucherNumber ? ` · ${item.voucherNumber}` : ''}</small>{item.notes ? <small>{item.notes}</small> : null}</div><span>{item.previousQuantity} → {item.newQuantity} {material.unit}</span></article>)}</div> : <p>No stock movements recorded.</p>}<div className="rm-stock-history__pagination"><button type="button" className="admin-btn admin-btn--secondary" disabled={movementPage <= 1} onClick={() => setMovementPage(page => Math.max(1, page - 1))}>Previous</button><span>Page {movementPage} of {movementTotalPages}</span><button type="button" className="admin-btn admin-btn--secondary" disabled={movementPage >= movementTotalPages} onClick={() => setMovementPage(page => page + 1)}>Next</button></div></section>
            </>
          ) : null}
        </div>

        <div className="admin-modal__footer rm-modal__footer rm-details-modal__footer">
          {adminAccess && material && !error ? (
            <>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => {
                  const target = material
                  onClose?.()
                  onToggleStatus?.(target, !target.isActive)
                }}
              >
                {material.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => {
                  const target = material
                  onClose?.()
                  onEdit?.(target)
                }}
              >
                Edit Material
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
