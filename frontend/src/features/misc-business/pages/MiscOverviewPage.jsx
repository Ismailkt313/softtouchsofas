import { useState, useEffect, useCallback } from 'react';
import miscBusinessService, {
  formatCurrency,
  formatDate,
} from '../services/miscBusinessService';
import { SaleFormModal } from '../components/SaleFormModal';
import { PurchaseFormModal } from '../components/PurchaseFormModal';
import '../styles/misc-business.css';

export function MiscOverviewPage({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedActivityId) params.activityId = selectedActivityId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [overviewData, activitiesList] = await Promise.all([
        miscBusinessService.fetchOverviewSummary(params),
        miscBusinessService.fetchActiveActivities(),
      ]);

      setSummary(overviewData);
      setActivities(activitiesList);
    } catch (err) {
      setError(err.message || 'Failed to load miscellaneous business overview.');
    } finally {
      setLoading(false);
    }
  }, [selectedActivityId, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setSelectedActivityId('');
    setStartDate('');
    setEndDate('');
  };

  const netProfit = summary?.netProfit || 0;
  const isProfitable = netProfit >= 0;

  return (
    <div className="mb-page">
      {/* Header */}
      <div className="mb-header">
        <div className="mb-header__titles">
          <h1 className="mb-header__title">Miscellaneous Business Overview</h1>
          <p className="mb-header__subtitle">
            Track secondary business income, operational expenses, and activity profitability.
          </p>
        </div>

        <div className="mb-header__actions">
          <button
            type="button"
            className="mb-btn-secondary"
            onClick={() => setIsPurchaseModalOpen(true)}
          >
            + Record Purchase
          </button>
          <button
            type="button"
            className="mb-btn-primary"
            onClick={() => setIsSaleModalOpen(true)}
          >
            + Record Sale
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-filters-bar">
        <div className="mb-filters-bar__left">
          <select
            className="mb-select"
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
          >
            <option value="">All Business Activities</option>
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="mb-date-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start date"
          />
          <span style={{ color: 'var(--sts-taupe)', fontSize: '0.85rem' }}>to</span>
          <input
            type="date"
            className="mb-date-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End date"
          />
        </div>

        <div className="mb-filters-bar__right">
          {(selectedActivityId || startDate || endDate) && (
            <button
              type="button"
              className="mb-btn-secondary"
              onClick={handleClearFilters}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
            >
              Clear Filters
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

      {/* Top 3 Primary Financial Summary Cards */}
      <div className="mb-summary-grid">
        <div className="mb-summary-card">
          <span className="mb-summary-card__label">Total Income (Sales)</span>
          <span className="mb-summary-card__value" style={{ color: '#15803d' }}>
            {formatCurrency(summary?.totalIncome || 0)}
          </span>
          <span className="mb-summary-card__sub">
            {summary?.totalSalesCount || 0} sales transactions recorded
          </span>
        </div>

        <div className="mb-summary-card">
          <span className="mb-summary-card__label">Total Expenses (Purchases)</span>
          <span className="mb-summary-card__value" style={{ color: '#b91c1c' }}>
            {formatCurrency(summary?.totalExpenses || 0)}
          </span>
          <span className="mb-summary-card__sub">
            {summary?.totalPurchasesCount || 0} purchase transactions recorded
          </span>
        </div>

        <div
          className={`mb-summary-card ${
            isProfitable ? 'mb-summary-card--profit' : 'mb-summary-card--loss'
          }`}
        >
          <span className="mb-summary-card__label">Net Profit / Margin</span>
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
            Margin: {summary?.profitMargin || 0}%
          </span>
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--sts-sand-light)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--sts-taupe)', textTransform: 'uppercase' }}>
            Active Activities
          </span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--sts-charcoal)' }}>
            {summary?.totalActivitiesCount || activities.length}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--sts-sand-light)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--sts-taupe)', textTransform: 'uppercase' }}>
            Sales This Month
          </span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#15803d' }}>
            {formatCurrency(summary?.salesThisMonth || 0)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--sts-sand-light)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--sts-taupe)', textTransform: 'uppercase' }}>
            Purchases This Month
          </span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#b91c1c' }}>
            {formatCurrency(summary?.purchasesThisMonth || 0)}
          </div>
        </div>
      </div>

      {/* Activity Breakdown Table */}
      <div className="mb-table-card">
        <div
          style={{
            padding: '1.1rem 1.35rem',
            borderBottom: '1px solid var(--sts-sand-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--sts-font-display)',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: 'var(--sts-charcoal)',
              }}
            >
              Activity-Wise Performance Breakdown
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--sts-charcoal-muted)' }}>
              Net financial contribution by secondary business activity
            </p>
          </div>
          <button
            type="button"
            className="mb-btn-secondary"
            onClick={() => onNavigate?.('/misc-business/activities')}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
          >
            Manage Activities &rarr;
          </button>
        </div>

        <div className="pv-table-wrap">
          <table className="pv-table">
            <thead>
              <tr>
                <th scope="col">Activity Name</th>
                <th scope="col" className="pv-table__th-status">
                  Status
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Sales Total
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Purchases Total
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Net Profit
                </th>
                <th scope="col" className="pv-table__th-actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {!summary?.activityBreakdown || summary.activityBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <span className="pv-empty-message">No activities found.</span>
                  </td>
                </tr>
              ) : (
                summary.activityBreakdown.map((item) => {
                  const actNet = item.netProfit || 0;
                  return (
                    <tr key={item.activityId}>
                      <td>
                        <button
                          type="button"
                          className="pv-supplier-link"
                          onClick={() =>
                            onNavigate?.(`/misc-business/activities/${item.activityId}`)
                          }
                          style={{ fontWeight: 600 }}
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
                          ({item.salesCount} txns)
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
                          ({item.purchasesCount} txns)
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
      </div>

      {/* Recent Sales & Purchases Sections */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Recent Sales */}
        <div className="mb-table-card">
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--sts-sand-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--sts-charcoal)',
              }}
            >
              Recent Sales
            </h3>
            <button
              type="button"
              className="mb-action-btn mb-action-btn--view pv-btn-view"
              onClick={() => onNavigate?.('/misc-business/sales')}
            >
              View All Sales &rarr;
            </button>
          </div>

          <div style={{ padding: '0.75rem 1.25rem' }}>
            {!summary?.recentSales || summary.recentSales.length === 0 ? (
              <p style={{ color: 'var(--sts-charcoal-muted)', fontSize: '0.85rem' }}>
                No recent sales.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {summary.recentSales.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0',
                      borderBottom: '1px solid var(--sts-sand-light)',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        {s.referenceNumber}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          color: 'var(--sts-taupe)',
                        }}
                      >
                        {s.activityName} · {formatDate(s.salesDate)}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#15803d' }}>
                      {formatCurrency(s.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="mb-table-card">
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--sts-sand-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--sts-charcoal)',
              }}
            >
              Recent Purchases / Expenses
            </h3>
            <button
              type="button"
              className="mb-action-btn mb-action-btn--view pv-btn-view"
              onClick={() => onNavigate?.('/misc-business/purchases')}
            >
              View All Purchases &rarr;
            </button>
          </div>

          <div style={{ padding: '0.75rem 1.25rem' }}>
            {!summary?.recentPurchases || summary.recentPurchases.length === 0 ? (
              <p style={{ color: 'var(--sts-charcoal-muted)', fontSize: '0.85rem' }}>
                No recent purchases.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {summary.recentPurchases.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0',
                      borderBottom: '1px solid var(--sts-sand-light)',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        {p.referenceNumber}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          color: 'var(--sts-taupe)',
                        }}
                      >
                        {p.activityName} · {formatDate(p.purchaseDate)}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#b91c1c' }}>
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Sale Modal */}
      <SaleFormModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSuccess={() => loadData()}
      />

      {/* Record Purchase Modal */}
      <PurchaseFormModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}

export default MiscOverviewPage;
