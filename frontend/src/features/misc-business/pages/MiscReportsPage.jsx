import { useState, useEffect, useCallback } from 'react';
import miscBusinessService, {
  formatCurrency,
} from '../services/miscBusinessService';
import { Pagination } from '../../../components/common/Pagination';
import '../styles/misc-business.css';

export function MiscReportsPage({ onNavigate }) {
  const [report, setReport] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activityId, setActivityId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination for Activity Breakdown
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadActivities = useCallback(async () => {
    try {
      const list = await miscBusinessService.fetchActiveActivities();
      setActivities(list);
    } catch {
      // ignore
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (activityId) params.activityId = activityId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await miscBusinessService.fetchReports(params);
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to generate financial reports.');
    } finally {
      setLoading(false);
    }
  }, [activityId, startDate, endDate]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => {
    window.print();
  };

  const netProfit = report?.netProfit || 0;
  const isProfitable = netProfit >= 0;

  const breakdownList = report?.activityBreakdown || [];
  const totalStatements = breakdownList.length;
  const totalPages = Math.ceil(totalStatements / pageSize) || 1;
  const paginatedBreakdown = breakdownList.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="mb-page">
      {/* Header */}
      <div className="mb-header">
        <div className="mb-header__titles">
          <h1 className="mb-header__title">Miscellaneous Financial Reports</h1>
          <p className="mb-header__subtitle">
            Consolidated secondary activity income, expenses, and net profitability statement.
          </p>
        </div>

        <div className="mb-header__actions">
          <button
            type="button"
            className="mb-btn-secondary"
            onClick={handlePrint}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-filters-bar">
        <div className="mb-filters-bar__left">
          <select
            className="mb-select"
            value={activityId}
            onChange={(e) => {
              setActivityId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Business Activities</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="mb-date-input"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            title="Start date"
          />
          <span style={{ color: 'var(--sts-taupe)', fontSize: '0.85rem' }}>to</span>
          <input
            type="date"
            className="mb-date-input"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            title="End date"
          />
        </div>

        <div className="mb-filters-bar__right">
          {(activityId || startDate || endDate) && (
            <button
              type="button"
              className="mb-btn-secondary"
              onClick={() => {
                setActivityId('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--sts-error-bg)',
            border: '1px solid var(--sts-error-border)',
            borderRadius: '10px',
            color: 'var(--sts-error-text)',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Financial Overview Cards */}
      <div className="mb-summary-grid">
        <div className="mb-summary-card">
          <span className="mb-summary-card__label">Gross Revenue (Sales)</span>
          <span className="mb-summary-card__value" style={{ color: '#15803d' }}>
            {formatCurrency(report?.totalIncome || 0)}
          </span>
          <span className="mb-summary-card__sub">
            {report?.totalSalesCount || 0} transactions
          </span>
        </div>

        <div className="mb-summary-card">
          <span className="mb-summary-card__label">Total Operating Expenses</span>
          <span className="mb-summary-card__value" style={{ color: '#b91c1c' }}>
            {formatCurrency(report?.totalExpenses || 0)}
          </span>
          <span className="mb-summary-card__sub">
            {report?.totalPurchasesCount || 0} transactions
          </span>
        </div>

        <div
          className={`mb-summary-card ${
            isProfitable ? 'mb-summary-card--profit' : 'mb-summary-card--loss'
          }`}
        >
          <span className="mb-summary-card__label">Net Secondary Profit</span>
          <span
            className={`mb-summary-card__value ${
              isProfitable
                ? 'mb-summary-card__value--profit'
                : 'mb-summary-card__value--loss'
            }`}
          >
            {formatCurrency(netProfit)}
          </span>
          <span className="mb-summary-card__sub">
            Profit Margin: {report?.profitMargin || 0}%
          </span>
        </div>
      </div>

      {/* Detailed Activity Performance Table */}
      <div className="mb-table-card">
        <div style={{ padding: '1.25rem 1.4rem', borderBottom: '1px solid var(--sts-sand-light)' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--sts-font-display)',
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'var(--sts-charcoal)',
            }}
          >
            Activity Financial Statements
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--sts-charcoal-muted)' }}>
            Breakdown of revenues, costs, net contribution, and profit margins.
          </p>
        </div>

        <div className="pv-table-wrap">
          <table className="pv-table">
            <thead>
              <tr>
                <th scope="col">Activity</th>
                <th scope="col" className="pv-table__th-status">
                  Status
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Sales (Income)
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Purchases (Expenses)
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Net Profit / Loss
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Margin %
                </th>
                <th scope="col" className="pv-table__th-actions">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {totalStatements === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <span className="pv-empty-message">No activity financial records found.</span>
                  </td>
                </tr>
              ) : (
                paginatedBreakdown.map((item) => {
                  const actNet = item.netProfit || 0;
                  const margin =
                    item.totalSales > 0
                      ? Math.round((actNet / item.totalSales) * 10000) / 100
                      : 0;
                  return (
                    <tr key={item.activityId}>
                      <td style={{ fontWeight: 600 }}>
                        <button
                          type="button"
                          className="pv-supplier-link"
                          onClick={() =>
                            onNavigate?.(`/misc-business/activities/${item.activityId}`)
                          }
                        >
                          {item.activityName}
                        </button>
                      </td>
                      <td className="pv-table__td-status">
                        <span
                          className={
                            item.status === 'active'
                              ? 'mb-badge-active'
                              : 'mb-badge-inactive'
                          }
                        >
                          {item.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                        {formatCurrency(item.totalSales)}
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: 'var(--sts-taupe)',
                            fontWeight: 400,
                          }}
                        >
                          {item.salesCount} txns
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#b91c1c' }}>
                        {formatCurrency(item.totalPurchases)}
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: 'var(--sts-taupe)',
                            fontWeight: 400,
                          }}
                        >
                          {item.purchasesCount} txns
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: actNet >= 0 ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {formatCurrency(actNet)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color: margin >= 0 ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {margin}%
                      </td>
                      <td className="pv-table__td-actions">
                        <button
                          type="button"
                          className="mb-action-btn mb-action-btn--view pv-btn-view"
                          onClick={() =>
                            onNavigate?.(`/misc-business/activities/${item.activityId}`)
                          }
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalStatements > 0 && (
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--sts-sand-light)' }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalStatements}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              itemName="activity statement"
              itemsName="activity statements"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MiscReportsPage;
