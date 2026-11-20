import { formatCurrency, formatDate } from '../services/miscBusinessService';

export function MiscSalesMobileList({
  sales = [],
  onEditSale,
  onDeleteSale,
  onViewActivity,
}) {
  if (sales.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <span className="pv-empty-message">No miscellaneous sales recorded yet.</span>
      </div>
    );
  }

  return (
    <div className="pv-mobile-list" role="list" aria-label="Miscellaneous sales list">
      {sales.map((sale) => {
        const isCancelled = sale.status === 'cancelled';
        return (
          <article
            key={sale.id}
            className={`pv-mobile-card${
              isCancelled ? ' pv-mobile-card--cancelled' : ''
            }`}
            role="listitem"
          >
            <div className="pv-mobile-card__top">
              <div>
                <span className="pv-code-link">{sale.referenceNumber}</span>
                <span className="pv-mobile-card__date">
                  {formatDate(sale.salesDate)}
                </span>
              </div>
              <span
                className={
                  sale.status === 'active'
                    ? 'mb-badge-active'
                    : 'mb-badge-cancelled'
                }
              >
                {sale.status === 'active' ? 'Active' : 'Cancelled'}
              </span>
            </div>

            <div className="pv-mobile-card__supplier">
              {onViewActivity ? (
                <button
                  type="button"
                  className="pv-supplier-link"
                  onClick={() => onViewActivity(sale.activityId)}
                >
                  {sale.activityName}
                </button>
              ) : (
                <strong>{sale.activityName}</strong>
              )}
              {sale.customerName ? <span>Customer: {sale.customerName}</span> : null}
            </div>

            <div style={{ fontSize: '0.86rem', color: 'var(--sts-charcoal-muted)' }}>
              {sale.description}
            </div>

            <div className="pv-mobile-card__meta-grid">
              <div>
                <span className="pv-mobile-card__meta-label">Payment</span>
                <span className="pv-mobile-card__meta-val">
                  {sale.paymentMethod || '—'}
                </span>
              </div>
              <div>
                <span className="pv-mobile-card__meta-label">Amount</span>
                <strong className="pv-mobile-card__total">
                  {formatCurrency(sale.amount)}
                </strong>
              </div>
            </div>

            <div className="pv-mobile-card__footer">
              <span className="pv-mobile-card__creator">
                {sale.invoiceNumber ? `Invoice #${sale.invoiceNumber}` : ''}
              </span>
              <div className="pv-row-actions">
                {onEditSale && !isCancelled ? (
                  <button
                    type="button"
                    className="mb-action-btn mb-action-btn--edit pv-btn-edit"
                    onClick={() => onEditSale(sale)}
                  >
                    Edit
                  </button>
                ) : null}
                {onDeleteSale ? (
                  <button
                    type="button"
                    className="mb-action-btn mb-action-btn--danger pv-btn-void"
                    onClick={() => onDeleteSale(sale)}
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

export default MiscSalesMobileList;
