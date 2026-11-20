import { formatCurrency, formatDate } from '../services/miscBusinessService';

export function MiscSalesTable({
  sales = [],
  onEditSale,
  onDeleteSale,
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
              Sales Date
            </th>
            <th scope="col">Activity</th>
            <th scope="col">Customer</th>
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
          {sales.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <span className="pv-empty-message">No miscellaneous sales recorded yet.</span>
              </td>
            </tr>
          ) : (
            sales.map((sale) => {
              const isCancelled = sale.status === 'cancelled';
              return (
                <tr
                  key={sale.id}
                  className={isCancelled ? 'pv-table__row--cancelled' : ''}
                >
                  {/* Ref No */}
                  <td className="pv-table__td-voucher">
                    <div className="pv-voucher-cell">
                      <span className="pv-code-link" style={{ cursor: 'default' }}>
                        {sale.referenceNumber}
                      </span>
                      {sale.invoiceNumber ? (
                        <span className="pv-voucher-sub">
                          Inv #{sale.invoiceNumber}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="pv-table__td-date">
                    <span className="pv-date-val">{formatDate(sale.salesDate)}</span>
                  </td>

                  {/* Activity */}
                  <td>
                    {onViewActivity ? (
                      <button
                        type="button"
                        className="pv-supplier-link"
                        onClick={() => onViewActivity(sale.activityId)}
                        title={`View ${sale.activityName} activity`}
                      >
                        {sale.activityName}
                      </button>
                    ) : (
                      <span className="pv-supplier-name">{sale.activityName}</span>
                    )}
                  </td>

                  {/* Customer */}
                  <td>
                    <span style={{ fontSize: '0.88rem', color: 'var(--sts-charcoal)' }}>
                      {sale.customerName || '—'}
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
                      title={sale.description}
                    >
                      {sale.description}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="pv-table__td-total">
                    <span
                      className={`pv-total-amount${
                        isCancelled ? ' pv-total-amount--cancelled' : ''
                      }`}
                    >
                      {formatCurrency(sale.amount)}
                    </span>
                  </td>

                  {/* Payment */}
                  <td>
                    <span style={{ fontSize: '0.84rem', color: 'var(--sts-taupe)' }}>
                      {sale.paymentMethod || '—'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="pv-table__td-status">
                    <span
                      className={
                        sale.status === 'active'
                          ? 'mb-badge-active'
                          : 'mb-badge-cancelled'
                      }
                    >
                      {sale.status === 'active' ? 'Active' : 'Cancelled'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="pv-table__td-actions">
                    <div className="pv-row-actions">
                      {onEditSale && !isCancelled ? (
                        <button
                          type="button"
                          className="mb-action-btn mb-action-btn--edit pv-btn-edit"
                          onClick={() => onEditSale(sale)}
                          title="Edit sale details"
                        >
                          Edit
                        </button>
                      ) : null}
                      {onDeleteSale ? (
                        <button
                          type="button"
                          className="mb-action-btn mb-action-btn--danger pv-btn-void"
                          onClick={() => onDeleteSale(sale)}
                          title="Delete sale"
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

export default MiscSalesTable;
