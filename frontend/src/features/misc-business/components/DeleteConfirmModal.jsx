export function DeleteConfirmModal({
  isOpen,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  onConfirm,
  onClose,
  isSubmitting = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="mb-modal-overlay" onClick={onClose}>
      <div
        className="mb-modal-card"
        style={{ maxWidth: '420px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-modal-header">
          <h3 className="mb-modal-header__title" style={{ color: '#991b1b' }}>
            {title}
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

        <div className="mb-modal-body">
          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              color: 'var(--sts-charcoal-muted)',
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
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
            type="button"
            className="mb-btn-primary"
            style={{
              backgroundColor: '#dc2626',
              borderColor: '#b91c1c',
            }}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
