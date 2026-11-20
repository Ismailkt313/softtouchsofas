import { formatDate } from '../services/miscBusinessService';

export function MiscActivitiesMobileList({
  activities = [],
  onEditActivity,
  onToggleStatus,
  onViewDetails,
}) {
  if (activities.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <span className="pv-empty-message">No business activities found.</span>
      </div>
    );
  }

  return (
    <div className="pv-mobile-list" role="list" aria-label="Business activities list">
      {activities.map((act) => {
        const isActive = act.status === 'active';
        return (
          <article key={act.id} className="pv-mobile-card" role="listitem">
            <div className="pv-mobile-card__top">
              <button
                type="button"
                className="pv-supplier-link"
                onClick={() => onViewDetails?.(act.id)}
                style={{ fontWeight: 600, fontSize: '0.95rem' }}
              >
                {act.name}
              </button>
              <span
                className={
                  isActive ? 'mb-badge-active' : 'mb-badge-inactive'
                }
              >
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div style={{ fontSize: '0.86rem', color: 'var(--sts-charcoal-muted)' }}>
              {act.description || 'No description provided.'}
            </div>

            <div className="pv-mobile-card__meta-grid">
              <div>
                <span className="pv-mobile-card__meta-label">Created Date</span>
                <span className="pv-mobile-card__meta-val">
                  {formatDate(act.createdAt)}
                </span>
              </div>
            </div>

            <div className="pv-mobile-card__footer">
              <div className="pv-row-actions">
                {onViewDetails ? (
                  <button
                    type="button"
                    className="mb-action-btn mb-action-btn--view pv-btn-view"
                    onClick={() => onViewDetails(act.id)}
                  >
                    View History
                  </button>
                ) : null}
                {onEditActivity ? (
                  <button
                    type="button"
                    className="mb-action-btn mb-action-btn--edit pv-btn-edit"
                    onClick={() => onEditActivity(act)}
                  >
                    Edit
                  </button>
                ) : null}
                {onToggleStatus ? (
                  <button
                    type="button"
                    className={`mb-action-btn ${
                      isActive
                        ? 'mb-action-btn--deactivate pv-btn-void'
                        : 'mb-action-btn--activate pv-btn-void--activate'
                    }`}
                    onClick={() => onToggleStatus(act)}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
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

export default MiscActivitiesMobileList;
