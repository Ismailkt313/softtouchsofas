import { formatInrCurrency } from '../../purchases/utils/purchaseMath'

export function SuppliersTable({
  suppliers,
  onViewSupplier,
  onEditSupplier,
}) {
  return (
    <div className="pv-table-wrap">
      <table className="pv-table">
        <thead>
          <tr>
            <th
              scope="col"
              className="pv-table__th-supplier"
              style={{ width: '24%' }}
            >
              Supplier Name
            </th>
            <th scope="col" style={{ width: '16%' }}>
              Contact Person
            </th>
            <th scope="col" style={{ width: '14%' }}>
              Phone
            </th>
            <th
              scope="col"
              className="pv-table__th-total"
              style={{ width: '14%', textAlign: 'right' }}
            >
              Total Purchases
            </th>
            <th
              scope="col"
              className="pv-table__th-total"
              style={{ width: '14%', textAlign: 'right' }}
            >
              Outstanding
            </th>
            <th
              scope="col"
              className="pv-table__th-payment-status"
              style={{ width: '10%' }}
            >
              Status
            </th>
            <th
              scope="col"
              className="pv-table__th-actions"
              style={{ width: '8%' }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((sup) => {
            const fin = sup.financialSummary || {}
            const hasDue = fin.totalOutstandingAmount > 0
            const unpaidCount = Number(fin.unpaidBillsCount || 0)

            return (
              <tr key={sup.id}>
                {/* 1. Supplier Name */}
                <td className="pv-table__td-supplier">
                  <div className="pv-voucher-cell">
                    <button
                      type="button"
                      className="pv-supplier-link"
                      onClick={() => onViewSupplier?.(sup.id)}
                      title={`View profile and purchase history for ${sup.name}`}
                    >
                      {sup.name}
                    </button>
                    {sup.gstNumber ? (
                      <span
                        className="pv-voucher-sub pv-voucher-sub--muted"
                        title={`GST: ${sup.gstNumber}`}
                      >
                        GST: {sup.gstNumber}
                      </span>
                    ) : null}
                  </div>
                </td>

                {/* 2. Contact Person */}
                <td>
                  <span style={{ fontSize: '0.875rem', color: '#524337' }}>
                    {sup.contactPerson || '—'}
                  </span>
                </td>

                {/* 3. Phone */}
                <td>
                  <span style={{ fontSize: '0.875rem', color: '#524337' }}>
                    {sup.phone || '—'}
                  </span>
                </td>

                {/* 4. Total Purchases */}
                <td className="pv-table__td-total" style={{ textAlign: 'right' }}>
                  <span className="pv-total-amount">
                    {formatInrCurrency(fin.totalPurchaseValue)}
                  </span>
                  <span
                    className="pv-voucher-sub pv-voucher-sub--muted"
                    style={{ display: 'block', fontSize: '0.75rem' }}
                  >
                    {fin.totalVouchersCount} voucher
                    {fin.totalVouchersCount === 1 ? '' : 's'}
                  </span>
                </td>

                {/* 5. Outstanding Amount */}
                <td className="pv-table__td-total" style={{ textAlign: 'right' }}>
                  <strong
                    style={{
                      color: hasDue ? '#b54708' : '#1e5b38',
                      fontWeight: 700,
                    }}
                  >
                    {formatInrCurrency(fin.totalOutstandingAmount)}
                  </strong>
                </td>

                {/* 6. Unpaid Bills / Credit Status */}
                <td className="pv-table__td-payment-status">
                  {unpaidCount > 0 ? (
                    <span
                      className="pv-badge pv-badge--pending"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewSupplier?.(sup.id)}
                      title={`View ${unpaidCount} unpaid bill${
                        unpaidCount === 1 ? '' : 's'
                      }`}
                    >
                      <span className="pv-badge__dot" aria-hidden="true" />
                      {unpaidCount} Pending
                    </span>
                  ) : (
                    <span className="pv-badge pv-badge--settled">
                      <span className="pv-badge__dot" aria-hidden="true" />
                      Settled
                    </span>
                  )}
                </td>

                {/* 7. Row Actions */}
                <td className="pv-table__td-actions">
                  <div className="pv-row-actions">
                    <button
                      type="button"
                      className="pv-btn-view"
                      onClick={() => onViewSupplier?.(sup.id)}
                      title={`View details for ${sup.name}`}
                    >
                      View <span aria-hidden="true">&rarr;</span>
                    </button>
                    {onEditSupplier ? (
                      <button
                        type="button"
                        className="pv-btn-edit-compact"
                        onClick={() => onEditSupplier(sup)}
                        title={`Edit profile for ${sup.name}`}
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
