import { formatCurrency, formatDate } from '../services/miscBusinessService';

export function MiscPurchasesMobileList({
  purchases = [],
  onEditPurchase,
  onDeletePurchase,
  onViewActivity,
}) {
  if (purchases.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <span className="pv-empty-message">No miscellaneous purchases recorded yet.</span>
      </div>
    );
  }

  return (
    <div className="pv-mobile-list" role="list" aria-label="Miscellaneous purchases list">
      {purchases.map((purchase) => {
        const isCancelled = purchase.status === 'cancelled';
        return (
          <article
            key={purchase.id}
            className={`pv-mobile-card${
              isCancelled ? ' pv-mobile-card--cancelled' : ''
            }`}
            role="listitem"
          >
            <div className="pv-mobile-card__top">
              <div>
                <span className="pv-code-link">{purchase.referenceNumber}</span>
                <span className="pv-mobile-card__date">
                  {formatDate(purchase.purchaseDate)}
                </span>
              </div>
              <span
                className={
                  purchase.status === 'active'
                    ? 'mb-badge-active'
                    : 'mb-badge-cancelled'
                }
              >
                {purchase.status === 'active' ? 'Active' : 'Cancelled'}
              </span>
            </div>

            <div className="pv-mobile-card__supplier">
              {onViewActivity ? (
                <button
                  type="button"
                  className="pv-supplier-link"
                  onClick={() => onViewActivity(purchase.activityId)}
                >
                  {purchase.activityName}
                </button>
              ) : (
                <strong>{purchase.activityName}</strong>
              )}
              {purchase.supplierName ? (
                <span>Supplier: {purchase.supplierName}</span>
              ) : null}
            </div>

            <div style={{ fontSize: '0.86rem', color: 'var(--sts-charcoal-muted)' }}>
              {purchase.description}
            </div>

            <div className="pv-mobile-card__meta-grid">
              <div>
                <span className="pv-mobile-card__meta-label">Payment</span>
                <span className="pv-mobile-card__meta-val">
                  {purchase.paymentMethod || '—'}
                </span>
              </div>
              <div>
                <span className="pv-mobile-card__meta-label">Amount</span>
                <strong className="pv-mobile-card__total">
                  {formatCurrency(purchase.amount)}
                </strong>
              </div>
            </div>

            <div className="pv-mobile-card__footer">
              <span className="pv-mobile-card__creator">
                {purchase.invoiceNumber ? `Invoice #${purchase.invoiceNumber}` : ''}
              </span>
              <div className="pv-row-actions">
                {onEditPurchase && !isCancelled ? (
                  <button
                    type="button"
                    className="mb-action-btn mb-action-btn--edit pv-btn-edit"
                    onClick={() => onEditPurchase(purchase)}
                  >
                    Edit
                  </button>
                ) : null}
                {onDeletePurchase ? (
                  <button
                    type="button"
                    className="mb-action-btn mb-action-btn--danger pv-btn-void"
                    onClick={() => onDeletePurchase(purchase)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default MiscPurchasesMobileList;
