import { useState, useEffect, useCallback } from 'react';
import miscBusinessService from '../services/miscBusinessService';
import { MiscActivitiesTable } from '../components/MiscActivitiesTable';
import { MiscActivitiesMobileList } from '../components/MiscActivitiesMobileList';
import { ActivityFormModal } from '../components/ActivityFormModal';
import { Pagination } from '../../../components/common/Pagination';
import '../styles/misc-business.css';

const DEFAULT_PAGE_SIZE = 10;

export function MiscActivitiesPage({ onNavigate }) {
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: DEFAULT_PAGE_SIZE,
      };
      if (search) params.search = search;
      if (status && status !== 'all') params.status = status;

      const result = await miscBusinessService.fetchActivities(params);
      setActivities(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err.message || 'Failed to load business activities.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleCreateNew = () => {
    setEditingActivity(null);
    setIsModalOpen(true);
  };

  const handleEdit = (act) => {
    setEditingActivity(act);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (act) => {
    const nextStatus = act.status === 'active' ? 'inactive' : 'active';
    const actionLabel = nextStatus === 'active' ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionLabel} "${act.name}"?`)) {
      return;
    }

    try {
      await miscBusinessService.updateActivity(act.id, { status: nextStatus });
      loadActivities();
    } catch (err) {
      alert(err.message || `Failed to ${actionLabel} activity.`);
    }
  };

  return (
    <div className="mb-page">
      {/* Header */}
      <div className="mb-header">
        <div className="mb-header__titles">
          <h1 className="mb-header__title">Business Activities</h1>
          <p className="mb-header__subtitle">
            Manage categories and service lines for all secondary business operations.
          </p>
        </div>

        <div className="mb-header__actions">
          <button
            type="button"
            className="mb-btn-primary"
            onClick={handleCreateNew}
          >
            + Add New Activity
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-filters-bar">
        <div className="mb-filters-bar__left">
          <input
            type="text"
            className="mb-search-input"
            placeholder="Search activity name or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="mb-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="mb-filters-bar__right">
          {(search || status !== 'all') && (
            <button
              type="button"
              className="mb-btn-secondary"
              onClick={() => {
                setSearch('');
                setStatus('all');
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

      {/* Dual View Table & Mobile List */}
      <div className="pv-surface">
        <MiscActivitiesTable
          activities={activities}
          onEditActivity={handleEdit}
          onToggleStatus={handleToggleStatus}
          onViewDetails={(id) => onNavigate?.(`/misc-business/activities/${id}`)}
        />

        <MiscActivitiesMobileList
          activities={activities}
          onEditActivity={handleEdit}
          onToggleStatus={handleToggleStatus}
          onViewDetails={(id) => onNavigate?.(`/misc-business/activities/${id}`)}
        />

        {total > 0 && (
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--sts-sand-light)' }}>
            <Pagination
              page={page}
              totalPages={Math.ceil(total / DEFAULT_PAGE_SIZE) || 1}
              totalItems={total}
              pageSize={DEFAULT_PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              itemName="activity"
              itemsName="activities"
            />
          </div>
        )}
      </div>

      {/* Activity Form Modal */}
      <ActivityFormModal
        isOpen={isModalOpen}
        activity={editingActivity}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadActivities()}
      />
    </div>
  );
}

export default MiscActivitiesPage;
