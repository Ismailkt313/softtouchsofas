import { formatDate } from '../services/miscBusinessService';

export function MiscActivitiesTable({
  activities = [],
  onEditActivity,
  onToggleStatus,
  onViewDetails,
}) {
  return (
    <div className="pv-table-wrap">
      <table className="pv-table">
        <thead>
          <tr>
            <th scope="col" style={{ width: '25%' }}>
              Activity Name
            </th>
            <th scope="col" style={{ width: '35%' }}>
              Description
            </th>
            <th scope="col" className="pv-table__th-status">
              Status
            </th>
            <th scope="col" className="pv-table__th-date">
              Created Date
            </th>
            <th scope="col" className="pv-table__th-actions">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {activities.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <span className="pv-empty-message">No business activities found.</span>
              </td>
            </tr>
          ) : (
            activities.map((act) => {
              const isActive = act.status === 'active';
              return (
                <tr key={act.id}>
                  {/* Name */}
                  <td>
                    <button
                      type="button"
                      className="pv-supplier-link"
                      onClick={() => onViewDetails?.(act.id)}
                      title={`View financial history for ${act.name}`}
                      style={{ fontWeight: 600 }}
                    >
                      {act.name}
                    </button>
                  </td>

                  {/* Description */}
                  <td>
                    <span
                      style={{
                        fontSize: '0.86rem',
                        color: 'var(--sts-charcoal-muted)',
                      }}
                    >
                      {act.description || '—'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="pv-table__td-status">
                    <span
                      className={
                        isActive ? 'mb-badge-active' : 'mb-badge-inactive'
                      }
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="pv-table__td-date">
                    <span className="pv-date-val">{formatDate(act.createdAt)}</span>
                  </td>

                  {/* Actions */}
                  <td className="pv-table__td-actions">
                    <div className="pv-row-actions">
                      {onViewDetails ? (
                        <button
                          type="button"
                          className="mb-action-btn mb-action-btn--view pv-btn-view"
                          onClick={() => onViewDetails(act.id)}
                          title="View activity finances"
                        >
                          View
                        </button>
                      ) : null}
                      {onEditActivity ? (
                        <button
                          type="button"
                          className="mb-action-btn mb-action-btn--edit pv-btn-edit"
                          onClick={() => onEditActivity(act)}
                          title="Edit activity"
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
                          title={isActive ? 'Deactivate activity' : 'Activate activity'}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
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

export default MiscActivitiesTable;
