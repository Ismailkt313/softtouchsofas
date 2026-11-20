import { formatCurrency, formatDate } from '../services/miscBusinessService';

export function MiscPurchasesTable({
  purchases = [],
  onEditPurchase,
  onDeletePurchase,
  onViewActivity,
}) {
  return (
    <div className="pv-table-wrap">
      <table className="pv-table">
        <thead>
          <tr>
            <th scope="col" className="pv-table__th-voucher">
              Ref No
            </th>
            <th scope="col" className="pv-table__th-date">
              Purchase Date
            </th>
            <th scope="col">Activity</th>
            <th scope="col">Supplier</th>
            <th scope="col">Description</th>
            <th scope="col" className="pv-table__th-total">
              Amount
            </th>
            <th scope="col">Payment</th>
            <th scope="col" className="pv-table__th-status">
              Status
            </th>
            <th scope="col" className="pv-table__th-actions">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {purchases.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <span className="pv-empty-message">No miscellaneous purchases recorded yet.</span>
              </td>
            </tr>
          ) : (
            purchases.map((purchase) => {
              const isCancelled = purchase.status === 'cancelled';
              return (
                <tr
                  key={purchase.id}
                  className={isCancelled ? 'pv-table__row--cancelled' : ''}
                >
                  {/* Ref No */}
                  <td className="pv-table__td-voucher">
                    <div className="pv-voucher-cell">
                      <span className="pv-code-link" style={{ cursor: 'default' }}>
                        {purchase.referenceNumber}
                      </span>
                      {purchase.invoiceNumber ? (
                        <span className="pv-voucher-sub">
                          Inv #{purchase.invoiceNumber}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="pv-table__td-date">
                    <span className="pv-date-val">
                      {formatDate(purchase.purchaseDate)}
                    </span>
                  </td>

                  {/* Activity */}
                  <td>
                    {onViewActivity ? (
                      <button
                        type="button"
                        className="pv-supplier-link"
                        onClick={() => onViewActivity(purchase.activityId)}
                        title={`View ${purchase.activityName} activity`}
                      >
                        {purchase.activityName}
                      </button>
                    ) : (
                      <span className="pv-supplier-name">
                        {purchase.activityName}
                      </span>
                    )}
                  </td>

                  {/* Supplier */}
                  <td>
                    <span style={{ fontSize: '0.88rem', color: 'var(--sts-charcoal)' }}>
                      {purchase.supplierName || '—'}
                    </span>
                  </td>

                  {/* Description */}
                  <td>
                    <span
                      style={{
                        fontSize: '0.86rem',
                        color: 'var(--sts-charcoal-muted)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                      title={purchase.description}
                    >
                      {purchase.description}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="pv-table__td-total">
                    <span
                      className={`pv-total-amount${
                        isCancelled ? ' pv-total-amount--cancelled' : ''
                      }`}
                    >
                      {formatCurrency(purchase.amount)}
                    </span>
                  </td>

                  {/* Payment */}
                  <td>
                    <span style={{ fontSize: '0.84rem', color: 'var(--sts-taupe)' }}>
                      {purchase.paymentMethod || '—'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="pv-table__td-status">
                    <span
                      className={
                        purchase.status === 'active'
                          ? 'mb-badge-active'
                          : 'mb-badge-cancelled'
                      }
                    >
                      {purchase.status === 'active' ? 'Active' : 'Cancelled'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="pv-table__td-actions">
                    <div className="pv-row-actions">
                      {onEditPurchase && !isCancelled ? (
                        <button
                          type="button"
                          className="mb-action-btn mb-action-btn--edit pv-btn-edit"
                          onClick={() => onEditPurchase(purchase)}
                          title="Edit purchase details"
                        >
                          Edit
                        </button>
                      ) : null}
                      {onDeletePurchase ? (
                        <button
                          type="button"
                          className="mb-action-btn mb-action-btn--danger pv-btn-void"
                          onClick={() => onDeletePurchase(purchase)}
                          title="Delete purchase"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default MiscPurchasesTable;
