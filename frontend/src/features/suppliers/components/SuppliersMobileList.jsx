import { formatInrCurrency } from '../../purchases/utils/purchaseMath'

export function SuppliersMobileList({
  suppliers,
  onViewSupplier,
  onEditSupplier,
}) {
  return (
    <div
      className="pv-mobile-list"
      role="list"
      aria-label="Suppliers directory mobile list"
    >
      {suppliers.map((sup) => {
        const fin = sup.financialSummary || {}
        const hasDue = fin.totalOutstandingAmount > 0
        const unpaidCount = Number(fin.unpaidBillsCount || 0)

        return (
          <article
            key={sup.id}
            className="pv-mobile-card"
            role="listitem"
          >
            <div className="pv-mobile-card__top">
              <div>
                <button
                  type="button"
                  className="pv-supplier-link"
                  style={{ fontWeight: 700, fontSize: '0.95rem' }}
                  onClick={() => onViewSupplier?.(sup.id)}
                >
                  {sup.name}
                </button>
                {sup.gstNumber ? (
                  <span
                    className="pv-mobile-card__date"
                    style={{ display: 'block', margin: '0.2rem 0 0' }}
                  >
                    GST: {sup.gstNumber}
                  </span>
                ) : null}
              </div>
              <div>
                {unpaidCount > 0 ? (
                  <span className="pv-badge pv-badge--pending">
                    <span className="pv-badge__dot" aria-hidden="true" />
                    {unpaidCount} Pending
                  </span>
                ) : (
                  <span className="pv-badge pv-badge--settled">
                    <span className="pv-badge__dot" aria-hidden="true" />
                    Settled
                  </span>
                )}
              </div>
            </div>

            {(sup.contactPerson || sup.phone) ? (
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#6b584c',
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                {sup.contactPerson ? (
                  <span>
                    Contact: <strong>{sup.contactPerson}</strong>
                  </span>
                ) : null}
                {sup.phone ? (
                  <span>
                    Tel: <strong>{sup.phone}</strong>
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="pv-mobile-card__meta-grid">
              <div>
                <span className="pv-mobile-card__meta-label">Total Purchases</span>
                <span className="pv-mobile-card__meta-val">
                  {formatInrCurrency(fin.totalPurchaseValue)}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#998675' }}>
                  ({fin.totalVouchersCount} voucher{fin.totalVouchersCount === 1 ? '' : 's'})
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="pv-mobile-card__meta-label">Outstanding</span>
                <strong
                  className="pv-mobile-card__total"
                  style={{ color: hasDue ? '#b54708' : '#1e5b38' }}
                >
                  {formatInrCurrency(fin.totalOutstandingAmount)}
                </strong>
              </div>
            </div>

            <div className="pv-mobile-card__actions" style={{ marginTop: '0.25rem' }}>
              <button
                type="button"
                className="pv-btn-view"
                onClick={() => onViewSupplier?.(sup.id)}
              >
                View History <span aria-hidden="true">&rarr;</span>
              </button>
              {onEditSupplier ? (
                <button
                  type="button"
                  className="pv-btn-edit-compact"
                  onClick={() => onEditSupplier(sup)}
                >
                  Edit
                </button>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
