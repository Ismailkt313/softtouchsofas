import { useState, useEffect, useCallback } from 'react';
import miscBusinessService, {
  formatCurrency,
} from '../services/miscBusinessService';
import { MiscPurchasesTable } from '../components/MiscPurchasesTable';
import { MiscPurchasesMobileList } from '../components/MiscPurchasesMobileList';
import { PurchaseFormModal } from '../components/PurchaseFormModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Pagination } from '../../../components/common/Pagination';
import '../styles/misc-business.css';

const DEFAULT_PAGE_SIZE = 10;

export function MiscPurchasesPage({ onNavigate }) {
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [activityId, setActivityId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [deletingPurchase, setDeletingPurchase] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadActivities = useCallback(async () => {
    try {
      const list = await miscBusinessService.fetchActiveActivities();
      setActivities(list);
    } catch {
      // ignore
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const params = {};
      if (activityId) params.activityId = activityId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await miscBusinessService.fetchPurchasesSummary(params);
      setSummary(data);
    } catch {
      // ignore
    }
  }, [activityId, startDate, endDate]);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: DEFAULT_PAGE_SIZE,
      };
      if (search) params.search = search;
      if (activityId) params.activityId = activityId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (paymentMethod) params.paymentMethod = paymentMethod;

      const result = await miscBusinessService.fetchPurchases(params);
      setPurchases(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err.message || 'Failed to load miscellaneous purchases.');
    } finally {
      setLoading(false);
    }
  }, [page, search, activityId, startDate, endDate, paymentMethod]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleCreateNew = () => {
    setEditingPurchase(null);
    setIsFormOpen(true);
  };

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (purchase) => {
    setDeletingPurchase(purchase);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPurchase) return;
    setIsDeleting(true);
    try {
      await miscBusinessService.deletePurchase(deletingPurchase.id);
      setDeletingPurchase(null);
      loadPurchases();
      loadSummary();
    } catch (err) {
      alert(err.message || 'Failed to delete purchase.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setActivityId('');
    setStartDate('');
    setEndDate('');
    setPaymentMethod('');
    setPage(1);
  };

  return (
    <div className="mb-page">
      {/* Header */}
      <div className="mb-header">
        <div className="mb-header__titles">
          <h1 className="mb-header__title">Miscellaneous Purchases & Expenses</h1>
          <p className="mb-header__subtitle">
            Manage operational expenses and material purchases associated with secondary business activities.
          </p>
        </div>

        <div className="mb-header__actions">
          <button
            type="button"
            className="mb-btn-primary"
            onClick={handleCreateNew}
          >
            + Record Purchase
          </button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="mb-summary-grid">
        <div className="mb-summary-card">
          <span className="mb-summary-card__label">Total Purchases</span>
          <span className="mb-summary-card__value" style={{ color: '#b91c1c' }}>
            {formatCurrency(summary?.totalPurchases || 0)}
          </span>
          <span className="mb-summary-card__sub">Across all secondary activities</span>
        </div>

        <div className="mb-summary-card">
          <span className="mb-summary-card__label">Purchase Transactions</span>
          <span className="mb-summary-card__value">
            {summary?.totalPurchasesCount || 0}
          </span>
          <span className="mb-summary-card__sub">Recorded supplier bills & receipts</span>
        </div>

        <div className="mb-summary-card">
          <span className="mb-summary-card__label">Purchases This Month</span>
          <span className="mb-summary-card__value" style={{ color: '#b91c1c' }}>
            {formatCurrency(summary?.purchasesThisMonth || 0)}
          </span>
          <span className="mb-summary-card__sub">Current calendar month</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-filters-bar">
        <div className="mb-filters-bar__left">
          <input
            type="text"
            className="mb-search-input"
            placeholder="Search ref, supplier, desc..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="mb-select"
            value={activityId}
            onChange={(e) => {
              setActivityId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Activities</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            className="mb-select"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </select>

          <input
            type="date"
            className="mb-date-input"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            title="From date"
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
            title="To date"
          />
        </div>

        <div className="mb-filters-bar__right">
          {(search || activityId || startDate || endDate || paymentMethod) && (
            <button
              type="button"
              className="mb-btn-secondary"
              onClick={handleClearFilters}
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

      {/* Dual View Table & Mobile List */}
      <div className="pv-surface">
        <MiscPurchasesTable
          purchases={purchases}
          onEditPurchase={handleEdit}
          onDeletePurchase={handleDeleteClick}
          onViewActivity={(id) => onNavigate?.(`/misc-business/activities/${id}`)}
        />

        <MiscPurchasesMobileList
          purchases={purchases}
          onEditPurchase={handleEdit}
          onDeletePurchase={handleDeleteClick}
          onViewActivity={(id) => onNavigate?.(`/misc-business/activities/${id}`)}
        />

        {total > 0 && (
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--sts-sand-light)' }}>
            <Pagination
              page={page}
              totalPages={Math.ceil(total / DEFAULT_PAGE_SIZE) || 1}
              totalItems={total}
              pageSize={DEFAULT_PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              itemName="purchase"
              itemsName="purchases"
            />
          </div>
        )}
      </div>

      {/* Purchase Form Modal */}
      <PurchaseFormModal
        isOpen={isFormOpen}
        purchase={editingPurchase}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          loadPurchases();
          loadSummary();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingPurchase)}
        title="Delete Miscellaneous Purchase"
        message={`Are you sure you want to delete purchase record ${deletingPurchase?.referenceNumber} (${formatCurrency(
          deletingPurchase?.amount || 0,
        )})?`}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingPurchase(null)}
        isSubmitting={isDeleting}
      />
    </div>
  );
}

export default MiscPurchasesPage;
