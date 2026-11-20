import { useState, useEffect, useCallback } from 'react';
import miscBusinessService, {
  formatCurrency,
  formatDate,
} from '../services/miscBusinessService';
import { MiscSalesTable } from '../components/MiscSalesTable';
import { MiscSalesMobileList } from '../components/MiscSalesMobileList';
import { MiscPurchasesTable } from '../components/MiscPurchasesTable';
import { MiscPurchasesMobileList } from '../components/MiscPurchasesMobileList';
import { ActivityFormModal } from '../components/ActivityFormModal';
import { SaleFormModal } from '../components/SaleFormModal';
import { PurchaseFormModal } from '../components/PurchaseFormModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Pagination } from '../../../components/common/Pagination';
import '../styles/misc-business.css';

const DEFAULT_PAGE_SIZE = 10;

export function MiscActivityDetailsPage({ activityId, onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'purchases'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab lists & pagination
  const [sales, setSales] = useState([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesPage, setSalesPage] = useState(1);

  const [purchases, setPurchases] = useState([]);
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [purchasesPage, setPurchasesPage] = useState(1);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'sale' | 'purchase', item }
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!activityId) return;
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await miscBusinessService.fetchActivitySummary(activityId, params);
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load activity summary.');
    }
  }, [activityId, startDate, endDate]);

  const loadSales = useCallback(async () => {
    if (!activityId) return;
    try {
      const params = {
        activityId,
        page: salesPage,
        limit: DEFAULT_PAGE_SIZE,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await miscBusinessService.fetchSales(params);
      setSales(res.items);
      setSalesTotal(res.total);
    } catch (err) {
      console.error(err);
    }
  }, [activityId, salesPage, startDate, endDate]);

  const loadPurchases = useCallback(async () => {
    if (!activityId) return;
    try {
      const params = {
        activityId,
        page: purchasesPage,
        limit: DEFAULT_PAGE_SIZE,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await miscBusinessService.fetchPurchases(params);
      setPurchases(res.items);
      setPurchasesTotal(res.total);
    } catch (err) {
      console.error(err);
    }
  }, [activityId, purchasesPage, startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSummary(), loadSales(), loadPurchases()]).finally(() => {
      setLoading(false);
    });
  }, [loadSummary, loadSales, loadPurchases]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'sale') {
        await miscBusinessService.deleteSale(deleteTarget.item.id);
        loadSales();
      } else {
        await miscBusinessService.deletePurchase(deleteTarget.item.id);
        loadPurchases();
      }
      loadSummary();
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message || 'Failed to delete transaction.');
    } finally {
      setIsDeleting(false);
    }
  };

  const activity = summary?.activity;
  const netProfit = summary?.netProfit || 0;
  const isProfitable = netProfit >= 0;

  return (
    <div className="mb-page">
      {/* Breadcrumbs */}
      <div className="mb-breadcrumbs">
        <button type="button" onClick={() => onNavigate?.('/misc-business')}>
          Overview
        </button>
        <span>/</span>
        <button type="button" onClick={() => onNavigate?.('/misc-business/activities')}>
          Activities
        </button>
        <span>/</span>
        <span style={{ color: 'var(--sts-charcoal)', fontWeight: 600 }}>
          {summary?.activityName || 'Activity Details'}
        </span>
      </div>

      {/* Header */}
      <div className="mb-header">
        <div className="mb-header__titles">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 className="mb-header__title">{summary?.activityName}</h1>
            {activity && (
              <span
                className={
                  activity.status === 'active'
                    ? 'mb-badge-active'
                    : 'mb-badge-inactive'
                }
              >
                {activity.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
          <p className="mb-header__subtitle">
            {activity?.description || 'No description provided.'}
          </p>
        </div>

        <div className="mb-header__actions">
          {activity && (
            <button
              type="button"
              className="mb-btn-secondary"
              onClick={() => setIsEditActivityOpen(true)}
            >
              Edit Activity
            </button>
          )}
          <button
            type="button"
            className="mb-btn-secondary"
            onClick={() => {
              setEditingPurchase(null);
              setIsPurchaseModalOpen(true);
            }}
          >
            + Record Purchase
          </button>
          <button
            type="button"
            className="mb-btn-primary"
            onClick={() => {
              setEditingSale(null);
              setIsSaleModalOpen(true);
            }}
          >
            + Record Sale
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-filters-bar">
        <div className="mb-filters-bar__left">
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sts-charcoal)' }}>
            Filter by Date:
          </span>
          <input
            type="date"
            className="mb-date-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ color: 'var(--sts-taupe)', fontSize: '0.85rem' }}>to</span>
          <input
            type="date"
            className="mb-date-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="mb-filters-bar__right">
          {(startDate || endDate) && (
            <button
              type="button"
              className="mb-btn-secondary"
              onClick={() => {
                setStartDate('');
                setEndDate('');
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

      {/* 3 Metric Cards for this Activity */}
      <div className="mb-summary-grid">
        <div className="mb-summary-card">
          <span className="mb-summary-card__label">Total Sales (Income)</span>
          <span className="mb-summary-card__value" style={{ color: '#15803d' }}>
            {formatCurrency(summary?.totalSales || 0)}
          </span>
          <span className="mb-summary-card__sub">
            {summary?.salesCount || 0} transactions
          </span>
        </div>

        <div className="mb-summary-card">
          <span className="mb-summary-card__label">Total Purchases (Expenses)</span>
          <span className="mb-summary-card__value" style={{ color: '#b91c1c' }}>
            {formatCurrency(summary?.totalPurchases || 0)}
          </span>
          <span className="mb-summary-card__sub">
            {summary?.purchasesCount || 0} transactions
          </span>
        </div>

        <div
          className={`mb-summary-card ${
            isProfitable ? 'mb-summary-card--profit' : 'mb-summary-card--loss'
          }`}
        >
          <span className="mb-summary-card__label">Net Profit</span>
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
            Income minus operational expenses
          </span>
        </div>
      </div>

      {/* Tabs: Sales vs Purchases */}
      <div className="pv-surface" style={{ padding: '1.25rem' }}>
        <div className="mb-tabs">
          <button
            type="button"
            className={`mb-tab-btn ${activeTab === 'sales' ? 'mb-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Transactions ({salesTotal})
          </button>
          <button
            type="button"
            className={`mb-tab-btn ${activeTab === 'purchases' ? 'mb-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            Purchases & Expenses ({purchasesTotal})
          </button>
        </div>

        {activeTab === 'sales' ? (
          <div>
            <MiscSalesTable
              sales={sales}
              onEditSale={(s) => {
                setEditingSale(s);
                setIsSaleModalOpen(true);
              }}
              onDeleteSale={(s) => setDeleteTarget({ type: 'sale', item: s })}
            />
            <MiscSalesMobileList
              sales={sales}
              onEditSale={(s) => {
                setEditingSale(s);
                setIsSaleModalOpen(true);
              }}
              onDeleteSale={(s) => setDeleteTarget({ type: 'sale', item: s })}
            />
            {salesTotal > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--sts-sand-light)', paddingTop: '0.75rem' }}>
                <Pagination
                  page={salesPage}
                  totalPages={Math.ceil(salesTotal / DEFAULT_PAGE_SIZE) || 1}
                  totalItems={salesTotal}
                  pageSize={DEFAULT_PAGE_SIZE}
                  onPageChange={(p) => setSalesPage(p)}
                  itemName="sale"
                  itemsName="sales"
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <MiscPurchasesTable
              purchases={purchases}
              onEditPurchase={(p) => {
                setEditingPurchase(p);
                setIsPurchaseModalOpen(true);
              }}
              onDeletePurchase={(p) => setDeleteTarget({ type: 'purchase', item: p })}
            />
            <MiscPurchasesMobileList
              purchases={purchases}
              onEditPurchase={(p) => {
                setEditingPurchase(p);
                setIsPurchaseModalOpen(true);
              }}
              onDeletePurchase={(p) => setDeleteTarget({ type: 'purchase', item: p })}
            />
            {purchasesTotal > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--sts-sand-light)', paddingTop: '0.75rem' }}>
                <Pagination
                  page={purchasesPage}
                  totalPages={Math.ceil(purchasesTotal / DEFAULT_PAGE_SIZE) || 1}
                  totalItems={purchasesTotal}
                  pageSize={DEFAULT_PAGE_SIZE}
                  onPageChange={(p) => setPurchasesPage(p)}
                  itemName="purchase"
                  itemsName="purchases"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Activity Modal */}
      {activity && (
        <ActivityFormModal
          isOpen={isEditActivityOpen}
          activity={activity}
          onClose={() => setIsEditActivityOpen(false)}
          onSuccess={() => loadSummary()}
        />
      )}

      {/* Sale Form Modal */}
      <SaleFormModal
        isOpen={isSaleModalOpen}
        sale={editingSale}
        initialActivityId={activityId}
        onClose={() => setIsSaleModalOpen(false)}
        onSuccess={() => {
          loadSales();
          loadSummary();
        }}
      />

      {/* Purchase Form Modal */}
      <PurchaseFormModal
        isOpen={isPurchaseModalOpen}
        purchase={editingPurchase}
        initialActivityId={activityId}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSuccess={() => {
          loadPurchases();
          loadSummary();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={`Delete Miscellaneous ${deleteTarget?.type === 'sale' ? 'Sale' : 'Purchase'}`}
        message={`Are you sure you want to delete ${deleteTarget?.item?.referenceNumber} (${formatCurrency(
          deleteTarget?.item?.amount || 0,
        )})?`}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
        isSubmitting={isDeleting}
      />
    </div>
  );
}

export default MiscActivityDetailsPage;
