import { useState, useEffect } from 'react';
import miscBusinessService from '../services/miscBusinessService';

export function ActivityFormModal({
  isOpen,
  onClose,
  onSuccess,
  activity = null, // null for create, object for edit
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activity) {
      setName(activity.name || '');
      setDescription(activity.description || '');
      setStatus(activity.status || 'active');
    } else {
      setName('');
      setDescription('');
      setStatus('active');
    }
    setErrors({});
  }, [activity, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Activity name is required.';
    } else if (name.length > 100) {
      newErrors.name = 'Activity name cannot exceed 100 characters.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      let saved;
      if (activity?.id) {
        saved = await miscBusinessService.updateActivity(activity.id, {
          name: name.trim(),
          description: description.trim(),
          status,
        });
      } else {
        saved = await miscBusinessService.createActivity({
          name: name.trim(),
          description: description.trim(),
          status,
        });
      }
      onSuccess?.(saved);
      onClose();
    } catch (err) {
      if (err.fieldErrors) {
        setErrors(err.fieldErrors);
      } else {
        setErrors({ general: err.message || 'Failed to save business activity.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-modal-overlay" onClick={onClose}>
      <div
        className="mb-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-modal-header">
          <h3 className="mb-modal-header__title">
            {activity ? 'Edit Business Activity' : 'Add New Business Activity'}
          </h3>
          <button
            type="button"
            className="mb-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-modal-body">
            {errors.general ? (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--sts-error-bg)',
                  border: '1px solid var(--sts-error-border)',
                  borderRadius: '8px',
                  color: 'var(--sts-error-text)',
                  fontSize: '0.84rem',
                }}
              >
                {errors.general}
              </div>
            ) : null}

            <div className="mb-form-group">
              <label className="mb-form-label">
                Activity Name <span className="req">*</span>
              </label>
              <input
                type="text"
                className="mb-form-input"
                placeholder="e.g. Cushion Refurbishing, Curtain Cleaning"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
              {errors.name ? (
                <span className="mb-form-error">{errors.name}</span>
              ) : null}
            </div>

            <div className="mb-form-group">
              <label className="mb-form-label">Description (Optional)</label>
              <textarea
                className="mb-form-textarea"
                rows={3}
                placeholder="Brief description of this business activity..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {errors.description ? (
                <span className="mb-form-error">{errors.description}</span>
              ) : null}
            </div>

            {activity ? (
              <div className="mb-form-group">
                <label className="mb-form-label">Status</label>
                <select
                  className="mb-form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            ) : null}
          </div>

          <div className="mb-modal-footer">
            <button
              type="button"
              className="mb-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mb-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : activity
                ? 'Save Changes'
                : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ActivityFormModal;
