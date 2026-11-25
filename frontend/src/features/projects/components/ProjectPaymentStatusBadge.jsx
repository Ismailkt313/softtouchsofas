import React from 'react'

export function ProjectPaymentStatusBadge({
  status,
  contractValueSet = true,
  onClick,
  isUpdating = false,
  disabled: propDisabled = false,
  title,
}) {
  const normalized = String(status || 'Unpaid').trim()

  const isFullyPaid =
    normalized.toLowerCase() === 'fully paid' ||
    normalized.toLowerCase() === 'paid'

  const hasNoContractValue = !contractValueSet

  let modifier = 'unpaid'
  let label = 'Unpaid'

  if (hasNoContractValue && (!status || normalized === 'Unpaid')) {
    modifier = 'no-contract'
    label = 'No Contract Value'
  } else if (isFullyPaid) {
    modifier = 'paid'
    label = 'Fully Paid'
  } else if (
    normalized.toLowerCase() === 'partially paid' ||
    normalized.toLowerCase() === 'partial'
  ) {
    modifier = 'partial'
    label = 'Partially Paid'
  } else {
    modifier = 'unpaid'
    label = 'Unpaid'
  }

  // The button must be disabled if fully paid or has no contract value
  const isDisabled =
    propDisabled || isFullyPaid || hasNoContractValue || isUpdating

  const defaultTooltip = isFullyPaid
    ? 'Payment Status: Fully Paid (All payments settled - status cannot be updated)'
    : hasNoContractValue
      ? 'Payment Status: No Contract Value (Set Contract Value before recording payments)'
      : onClick && !isDisabled
        ? `Payment Status: ${label} (Click to record or manage payment)`
        : `Payment Status: ${label}`

  const tooltip = title || defaultTooltip

  if (onClick) {
    return (
      <button
        type="button"
        className={`project-payment-badge project-payment-badge--${modifier}${
          isDisabled
            ? ' project-payment-badge--disabled'
            : ' project-payment-badge--interactive'
        }`}
        onClick={isDisabled ? undefined : onClick}
        title={tooltip}
        disabled={isDisabled}
        aria-disabled={isDisabled}
      >
        <span className="project-payment-badge__dot" aria-hidden="true" />
        <span>{isUpdating ? 'Updating...' : label}</span>
        {!isDisabled ? (
          <svg
            className="project-payment-badge__chevron"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>
    )
  }

  return (
    <span
      className={`project-payment-badge project-payment-badge--${modifier}${
        isDisabled ? ' project-payment-badge--disabled' : ''
      }`}
      title={tooltip}
    >
      <span className="project-payment-badge__dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
