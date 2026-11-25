import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Toast } from '../../../components/common'
import { navigateBackOrFallback } from '../../../services/navigationState'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { ProjectPaymentModal } from '../components/ProjectPaymentModal'
import { ProjectPaymentStatusBadge } from '../components/ProjectPaymentStatusBadge'
import {
  ProjectCostThresholdBadge,
  ProjectStatusBadge,
} from '../components/ProjectStatusBadge'
import { ProjectStatusDropdown } from '../components/ProjectStatusDropdown'
import { useProjectDetails } from '../hooks/useProjectDetails'
import {
  fetchProjectPayments,
  formatActivityTypeLabel,
  formatCurrency,
  formatPercentage,
  formatProjectDate,
  formatProjectDateTime,
  reverseProjectPayment,
} from '../services/projectService'
import '../styles/projects.css'

export function ProjectDetailsPage({
  projectIdentifier,
  currentUser,
  onNavigate,
}) {
  const {
    project,
    financialSummary,
    summaryUnavailableMessage,
    automationFeed,
    canEditProject,
    canViewProfitability,

    isLoading,
    isRefreshing,
    isRecalculating,
    authRequired,
    notFound,
    error,
    reloadProjectDetails,
    handleRecalculateFinancials,

    isEditModalOpen,
    openEditModal,
    closeEditModal,
    handleEditSubmit,

    isUpdatingStatus,
    handleStatusSubmit,

    feedbackBanner,
    clearFeedbackBanner,
  } = useProjectDetails({ projectIdentifier, currentUser })

  const [paymentsData, setPaymentsData] = useState({
    isLoading: true,
    payments: [],
    summary: null,
    error: '',
  })
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [reversalTarget, setReversalTarget] = useState(null)
  const [reversalReason, setReversalReason] = useState('')
  const [reversalError, setReversalError] = useState('')
  const [isReversing, setIsReversing] = useState(false)
  const [paymentToast, setPaymentToast] = useState(null)
  const reversalBackdropMouseDownRef = useRef(false)

  // Close reversal modal on Escape key
  useEffect(() => {
    if (!reversalTarget) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isReversing) {
        handleCloseReversal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reversalTarget, isReversing])

  const loadPayments = useCallback(async () => {
    if (!projectIdentifier) return
    try {
      setPaymentsData((prev) => ({ ...prev, isLoading: true, error: '' }))
      const res = await fetchProjectPayments(projectIdentifier)
      setPaymentsData({
        isLoading: false,
        payments: Array.isArray(res.payments) ? res.payments : [],
        summary: res.summary || null,
        error: '',
      })
    } catch (err) {
      setPaymentsData((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'Failed to load payments history.',
      }))
    }
  }, [projectIdentifier])

  useEffect(() => {
    if (!authRequired && !isLoading && !notFound && projectIdentifier) {
      loadPayments()
    }
  }, [authRequired, isLoading, notFound, projectIdentifier, loadPayments])

  const handlePaymentSuccess = (updatedSummary, newPayment) => {
    setPaymentToast({
      text: `Payment ${newPayment?.paymentReference || ''} of ${formatCurrency(
        newPayment?.amount,
      )} recorded successfully.`,
      tone: 'success',
    })
    loadPayments()
    reloadProjectDetails()
  }

  const handleOpenReversal = (payment) => {
    setReversalTarget(payment)
    setReversalReason('')
    setReversalError('')
  }

  const handleCloseReversal = () => {
    setReversalTarget(null)
    setReversalReason('')
    setReversalError('')
    setIsReversing(false)
  }

  const handleConfirmReversal = async (e) => {
    e.preventDefault()
    if (!reversalReason.trim() || reversalReason.trim().length < 3) {
      setReversalError('Please enter a reversal reason (at least 3 characters).')
      return
    }
    setIsReversing(true)
    try {
      await reverseProjectPayment(
        projectIdentifier,
        reversalTarget._id || reversalTarget.id,
        {
          reason: reversalReason.trim(),
        },
      )
      setPaymentToast({
        text: `Payment ${reversalTarget.paymentReference} was reversed successfully.`,
        tone: 'success',
      })
      handleCloseReversal()
      loadPayments()
      reloadProjectDetails()
    } catch (err) {
      setReversalError(err?.message || 'Failed to reverse payment.')
      setIsReversing(false)
    }
  }

  const handleBackToList = () => {
    navigateBackOrFallback(onNavigate, '/projects')
  }

  if (authRequired) {
    return (
      <div className="projects-page">
        <div className="project-detail-nav">
          <button
            type="button"
            className="project-back-btn"
            onClick={handleBackToList}
          >
            <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M11 4L6 9L11 14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Back to Projects</span>
          </button>
        </div>
        <section className="projects-surface">
          <div className="projects-state">
            <h2 className="projects-state__title">Sign in required</h2>
            <p className="projects-state__message">
              Please sign in with an approved account to view project details
              and financial summaries.
            </p>
            <div className="projects-state__actions">
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => onNavigate?.('/login')}
              >
                Go to Sign In
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className="projects-page"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="project-detail-nav">
          <button
            type="button"
            className="project-back-btn"
            onClick={handleBackToList}
          >
            <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M11 4L6 9L11 14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Back to Projects</span>
          </button>
        </div>

        <section className="projects-surface project-detail-skeleton-wrap">
          <div className="projects-skeleton-line projects-skeleton-line--title" />
          <div className="projects-skeleton-line projects-skeleton-line--sub" />
          <div className="project-financial-grid">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="project-financial-skeleton-card" />
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (notFound || error || !project) {
    return (
      <div className="projects-page">
        <div className="project-detail-nav">
          <button
            type="button"
            className="project-back-btn"
            onClick={handleBackToList}
          >
            <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M11 4L6 9L11 14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Back to Projects</span>
          </button>
        </div>

        <section className="projects-surface">
          <div className="projects-state" role="alert">
            <div
              className="projects-state__icon projects-state__icon--error"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M12 7.5V12.5M12 16H12.01"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2 className="projects-state__title">
              {notFound ? 'Project not found' : 'Unable to load project'}
            </h2>
            <p className="projects-state__message">
              {notFound
                ? `No project matching "${projectIdentifier}" exists in the directory.`
                : error}
            </p>
            <div className="projects-state__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={handleBackToList}
              >
                Return to Projects
              </button>
              {!notFound ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={reloadProjectDetails}
                >
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    )
  }

  const hasContractValue =
    (financialSummary?.contractValue ?? project?.contractValue) !== null &&
    (financialSummary?.contractValue ?? project?.contractValue) !== undefined

  const authoritativeThresholdState =
    financialSummary?.costThresholdState || project.costThresholdState
  const isCriticalOverrun = Boolean(
    hasContractValue && authoritativeThresholdState?.exceededCrossed,
  )
  const isWarningThreshold = Boolean(
    hasContractValue && authoritativeThresholdState?.warningCrossed,
  )
  const warningThresholdPercent =
    authoritativeThresholdState?.warningThresholdPercent ||
    project.costAlertThresholdPercent ||
    80

  const activeInactivityWarnings = (
    automationFeed.activityWarnings || []
  ).filter((item) => item.status === 'active')

  const clampedProgressWidth = financialSummary
    ? Math.max(0, Math.min(100, Number(financialSummary.costPercentage) || 0))
    : 0

  const effectiveContractValue =
    paymentsData.summary?.totalContractValue ??
    (financialSummary?.contractValue ??
      (project?.contractValue > 0 ? project.contractValue : null))
  const hasEffectiveContractValue =
    effectiveContractValue !== null &&
    effectiveContractValue !== undefined &&
    Number(effectiveContractValue) > 0
  const effectiveTotalReceived =
    paymentsData.summary?.totalReceived ??
    (Number(project?.totalReceived) || 0)
  const effectiveOutstanding =
    paymentsData.summary?.outstandingBalance ??
    (hasEffectiveContractValue
      ? Math.max(0, effectiveContractValue - effectiveTotalReceived)
      : null)
  const effectiveExcess =
    paymentsData.summary?.excessPayment ??
    (Number(project?.excessPayment) || 0)
  const effectivePaymentStatus =
    paymentsData.summary?.paymentStatus ??
    project?.paymentStatus ??
    (effectiveTotalReceived > 0
      ? hasEffectiveContractValue &&
        effectiveTotalReceived >= effectiveContractValue
        ? 'Fully Paid'
        : 'Partially Paid'
      : 'Unpaid')

  const isFullyPaid =
    String(effectivePaymentStatus || '').trim().toLowerCase() === 'fully paid' ||
    String(effectivePaymentStatus || '').trim().toLowerCase() === 'paid' ||
    (hasEffectiveContractValue &&
      effectiveTotalReceived > 0 &&
      effectiveTotalReceived >= effectiveContractValue)

  const isPaymentDisabled = isFullyPaid || !hasEffectiveContractValue

  return (
    <div
      className={`projects-page${
        isRefreshing ? ' projects-page--refreshing' : ''
      }`}
    >
      <div className="project-detail-nav">
        <button
          type="button"
          className="project-back-btn"
          onClick={handleBackToList}
        >
          <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11 4L6 9L11 14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Back to Projects</span>
        </button>
      </div>

      <header className="project-detail-header">
        <div className="project-detail-header__main">
          <div className="project-detail-header__badges">
            <span className="project-code-pill project-code-pill--lg">
              {project.projectId}
            </span>
            {canEditProject ? (
              <ProjectStatusDropdown
                project={project}
                isUpdating={isUpdatingStatus}
                onStatusChange={handleStatusSubmit}
              />
            ) : (
              <ProjectStatusBadge status={project.status} />
            )}
            <span className="project-category-pill">{project.category}</span>
            {canViewProfitability ? (
              <ProjectCostThresholdBadge
                costThresholdState={authoritativeThresholdState}
                costPercentage={financialSummary?.costPercentage}
              />
            ) : null}
          </div>

          <h1 className="project-detail-header__title">{project.name}</h1>
          <p className="project-detail-header__client">
            Client: <strong>{project.clientName}</strong>
            
          </p>
        </div>

        <div className="project-detail-header__actions">
          {canViewProfitability ? (
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={handleRecalculateFinancials}
              disabled={isRecalculating}
            >
              {isRecalculating ? 'Recalculating...' : 'Recalculate Summary'}
            </button>
          ) : null}

          {canEditProject ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={openEditModal}
            >
              Edit Project
            </button>
          ) : null}
        </div>
      </header>

      {feedbackBanner ? (
        <Toast
          message={feedbackBanner.text || feedbackBanner}
          tone={feedbackBanner.tone || 'success'}
          onClose={clearFeedbackBanner}
        />
      ) : null}

      {paymentToast ? (
        <Toast
          message={paymentToast.text}
          tone={paymentToast.tone || 'success'}
          onClose={() => setPaymentToast(null)}
        />
      ) : null}

      {canViewProfitability && isCriticalOverrun ? (
        <div
          className="project-detail-banner project-detail-banner--critical"
          role="alert"
        >
          <div className="project-detail-banner__title">
            Contract Value Reached or Exceeded
          </div>
          <p className="project-detail-banner__desc">
            Total recorded project costs (
            {formatCurrency(
              financialSummary ? financialSummary.totalCost : project.totalCost,
            )}
            ) have reached or exceeded the fixed contract value (
            {formatCurrency(
              financialSummary
                ? financialSummary.contractValue
                : project.contractValue,
            )}
            ). Review purchases and expenses immediately.
          </p>
        </div>
      ) : canViewProfitability && isWarningThreshold ? (
        <div
          className="project-detail-banner project-detail-banner--warning"
          role="status"
        >
          <div className="project-detail-banner__title">
            Cost Warning Threshold Reached ({formatPercentage(warningThresholdPercent)})
          </div>
          <p className="project-detail-banner__desc">
            Total recorded project costs have reached{' '}
            {formatPercentage(
              financialSummary
                ? financialSummary.costPercentage
                : project.costPercentage,
            )}{' '}
            of the fixed contract value (configured warning threshold:{' '}
            {formatPercentage(warningThresholdPercent)}).
          </p>
        </div>
      ) : null}

      {activeInactivityWarnings.map((warning) => (
        <div
          key={warning.id || 'active-inactivity-warning'}
          className="project-detail-banner project-detail-banner--inactive"
          role="status"
        >
          <div className="project-detail-banner__title">
            Project Inactivity Warning
          </div>
          <p className="project-detail-banner__desc">
            {warning.message ||
              `No project updates or voucher entries recorded for ${Math.floor(
                warning.inactiveDays,
              )} day(s) (threshold: ${warning.inactivityThresholdDays} days).`}
          </p>
        </div>
      ))}

      {canViewProfitability ? (
        <section
          className="projects-surface project-detail-section"
          aria-labelledby="project-financial-heading"
        >
        <div className="project-section-header">
          <div>
            <div className="project-section-header__title-row">
              <h2
                id="project-financial-heading"
                className="project-section-header__title"
              >
                Financial Summary
              </h2>
            </div>
            
          </div>

          {financialSummary?.financialSummaryUpdatedAt ? (
            <span className="project-section-header__timestamp">
              Updated{' '}
              {formatProjectDateTime(financialSummary.financialSummaryUpdatedAt)}
            </span>
          ) : null}
        </div>

        {summaryUnavailableMessage || !financialSummary ? (
          <div
            className="project-detail-banner project-detail-banner--unavailable"
            role="status"
          >
            <div className="project-detail-banner__title">
              Financial Summary Unavailable
            </div>
            <p className="project-detail-banner__desc">
              {summaryUnavailableMessage ||
                'The backend financial summary API did not return summary data for this project.'}
            </p>
          </div>
        ) : (
          <>
            <div className="project-financial-grid">
              <article className="project-fin-card">
                <span className="project-fin-card__label">
                  Fixed Contract Value
                </span>
                <span className="project-fin-card__value">
                  {formatCurrency(financialSummary.contractValue)}
                </span>
                <span className="project-fin-card__note">
                  Agreed project contract baseline
                </span>
              </article>

              <article className="project-fin-card">
                <span className="project-fin-card__label">Total Purchases</span>
                <span className="project-fin-card__value">
                  {formatCurrency(financialSummary.totalPurchases)}
                </span>
                <span className="project-fin-card__note">
                  Aggregated purchase vouchers
                </span>
              </article>

              <article className="project-fin-card">
                <span className="project-fin-card__label">
                  Total Other Expenses
                </span>
                <span className="project-fin-card__value">
                  {formatCurrency(financialSummary.totalOtherExpenses)}
                </span>
                <span className="project-fin-card__note">
                  Aggregated workshop &amp; site expenses
                </span>
              </article>

              <article
                className={`project-fin-card${
                  isCriticalOverrun
                    ? ' project-fin-card--critical'
                    : isWarningThreshold
                      ? ' project-fin-card--warning'
                      : ''
                }`}
              >
                <span className="project-fin-card__label">Total Cost</span>
                <span className="project-fin-card__value">
                  {formatCurrency(financialSummary.totalCost)}
                </span>
                <span className="project-fin-card__note">
                  Purchases + other expenses
                </span>
              </article>

              <article
                className={`project-fin-card project-fin-card--highlight${
                  hasContractValue &&
                  financialSummary.estimatedProfit !== null &&
                  financialSummary.estimatedProfit < 0
                    ? ' project-fin-card--negative'
                    : ''
                }`}
              >
                <div className="project-fin-card__label-row">
                  <span className="project-fin-card__label">
                    Estimated Profit
                  </span>
                  <span className="project-fin-card__est-pill">Estimate</span>
                </div>
                <span className="project-fin-card__value">
                  {hasContractValue && financialSummary.estimatedProfit !== null
                    ? formatCurrency(financialSummary.estimatedProfit)
                    : '—'}
                </span>
                <span className="project-fin-card__note">
                  {hasContractValue
                    ? 'Contract value minus recorded cost (unaudited)'
                    : 'Set a contract value to calculate estimated profit'}
                </span>
              </article>

              <article className="project-fin-card">
                <div className="project-fin-card__label-row">
                  <span className="project-fin-card__label">
                    Cost % &amp; Est. Profit Margin
                  </span>
                  <span className="project-fin-card__est-pill">Estimate</span>
                </div>
                <div className="project-fin-card__dual">
                  <div>
                    <span className="project-fin-card__sub-caption">
                      Cost %
                    </span>
                    <strong className="project-fin-card__dual-val">
                      {hasContractValue &&
                      financialSummary.costPercentage !== null
                        ? formatPercentage(financialSummary.costPercentage)
                        : '—'}
                    </strong>
                  </div>
                  <div className="project-fin-card__divider" aria-hidden="true" />
                  <div>
                    <span className="project-fin-card__sub-caption">
                      Est. Margin
                    </span>
                    <strong
                      className={`project-fin-card__dual-val${
                        hasContractValue &&
                        financialSummary.estimatedProfitMargin !== null &&
                        financialSummary.estimatedProfitMargin < 0
                          ? ' project-fin-card__dual-val--negative'
                          : ''
                      }`}
                    >
                      {hasContractValue &&
                      financialSummary.estimatedProfitMargin !== null
                        ? formatPercentage(
                            financialSummary.estimatedProfitMargin,
                          )
                        : '—'}
                    </strong>
                  </div>
                </div>
                <span className="project-fin-card__note">
                  {!hasContractValue
                    ? 'Contract value not set'
                    : financialSummary.contractValue === 0
                      ? 'Zero contract baseline (0% safe ratio)'
                      : `Warning threshold set at ${formatPercentage(
                          warningThresholdPercent,
                        )}`}
                </span>
              </article>
            </div>

            {financialSummary.contractValue > 0 ? (
              <div className="project-cost-meter">
                <div className="project-cost-meter__labels">
                  <span>
                    Contract Cost Utilization:{' '}
                    <strong>
                      {formatPercentage(financialSummary.costPercentage)}
                    </strong>
                  </span>
                  <span>
                    Warning Threshold:{' '}
                    <strong>{formatPercentage(warningThresholdPercent)}</strong>
                  </span>
                </div>
                <div className="project-cost-meter__track">
                  <div
                    className={`project-cost-meter__fill${
                      isCriticalOverrun
                        ? ' project-cost-meter__fill--critical'
                        : isWarningThreshold
                          ? ' project-cost-meter__fill--warning'
                          : ''
                    }`}
                    style={{ width: `${clampedProgressWidth}%` }}
                  />
                  <span
                    className="project-cost-meter__marker"
                    style={{
                      left: `${Math.min(99, Math.max(1, warningThresholdPercent))}%`,
                    }}
                    title={`${warningThresholdPercent}% warning threshold`}
                  />
                </div>
              </div>
            ) : null}

            {!financialSummary.integrations.purchaseModuleIntegrated ||
            !financialSummary.integrations.expenseModuleIntegrated ? (
              <p className="project-integration-note">
                Voucher Module Status: Purchase voucher integration is{' '}
                <strong>
                  {financialSummary.integrations.purchaseModuleIntegrated
                    ? 'connected'
                    : 'pending implementation'}
                </strong>{' '}
                and Expense voucher integration is{' '}
                <strong>
                  {financialSummary.integrations.expenseModuleIntegrated
                    ? 'connected'
                    : 'pending implementation'}
                </strong>
                . Totals update automatically once voucher records are linked.
              </p>
            ) : null}
          </>
        )}
      </section>
      ) : null}

      {/* Client Payment Tracking & Outstanding Balances */}
      <section
        className="projects-surface project-detail-section project-payments-section"
        aria-labelledby="project-payments-heading"
      >
        <div className="project-section-header">
          <div>
            <div className="project-section-header__title-row">
              <h2
                id="project-payments-heading"
                className="project-section-header__title"
              >
                Client Payments &amp; Settlement Overview
              </h2>
            </div>
            <p className="project-section-header__subtitle">
              Cumulative client payment receipts, stage milestone tracking, and remaining contract balances.
            </p>
          </div>

          <div className="project-section-header__actions">
            {canEditProject ? (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={isPaymentDisabled}
                title={
                  isFullyPaid
                    ? 'Payment status: Fully Paid (All contract receivables settled)'
                    : !hasEffectiveContractValue
                      ? 'Set a Contract Value first to record client payments'
                      : 'Record client payment'
                }
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M10 4.25V15.75M4.25 10H15.75"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{isFullyPaid ? 'Fully Settled' : 'Record Payment'}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="project-financial-grid">
          <article className="project-fin-card">
            <span className="project-fin-card__label">Contract Value</span>
            <span className="project-fin-card__value">
              {hasEffectiveContractValue
                ? formatCurrency(effectiveContractValue)
                : 'Not Set'}
            </span>
            <span className="project-fin-card__note">
              {hasEffectiveContractValue
                ? 'Agreed client contract amount'
                : 'Set a contract value to track remaining balance'}
            </span>
          </article>

          <article className="project-fin-card">
            <span className="project-fin-card__label">Total Received</span>
            <span className="project-fin-card__value" style={{ color: '#166534' }}>
              {formatCurrency(effectiveTotalReceived)}
            </span>
            <span className="project-fin-card__note">
              Sum of all valid payments recorded
            </span>
          </article>

          <article
            className={`project-fin-card${
              effectiveOutstanding > 0 ? ' project-fin-card--warning' : ''
            }`}
          >
            <span className="project-fin-card__label">Outstanding Balance</span>
            <span
              className="project-fin-card__value"
              style={{
                color:
                  effectiveOutstanding > 0
                    ? '#c2410c'
                    : hasEffectiveContractValue
                      ? '#166534'
                      : undefined,
              }}
            >
              {hasEffectiveContractValue
                ? formatCurrency(effectiveOutstanding)
                : '—'}
            </span>
            <span className="project-fin-card__note">
              {!hasEffectiveContractValue
                ? 'Contract value not set'
                : effectiveExcess > 0
                  ? `Overpayment/Excess: ${formatCurrency(effectiveExcess)}`
                  : effectiveOutstanding === 0
                    ? 'All payments settled (₹0.00)'
                    : 'Pending client receivable'}
            </span>
          </article>

          <article className="project-fin-card">
            <span className="project-fin-card__label">Payment Status</span>
            <div style={{ marginTop: '0.45rem' }}>
              <ProjectPaymentStatusBadge
                status={effectivePaymentStatus}
                contractValueSet={hasEffectiveContractValue}
                onClick={canEditProject ? () => setIsPaymentModalOpen(true) : null}
                disabled={isPaymentDisabled}
              />
            </div>
            <span className="project-fin-card__note" style={{ marginTop: '0.45rem' }}>
              {paymentsData.summary?.lastPaymentDate
                ? `Last payment on ${formatProjectDate(paymentsData.summary.lastPaymentDate)}`
                : project?.lastPaymentDate
                  ? `Last payment on ${formatProjectDate(project.lastPaymentDate)}`
                  : 'No payments received yet'}
            </span>
          </article>
        </div>

        {/* Payment History Table */}
        <div className="project-payments-table-container">
          <div
            className="project-payments-subheading"
            style={{
              marginTop: '1.25rem',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--sts-charcoal)',
                margin: 0,
              }}
            >
              Payment History ({paymentsData.payments.length})
            </h3>
          </div>

          {paymentsData.isLoading ? (
            <div className="projects-alerts-skeleton" aria-busy="true" />
          ) : paymentsData.error ? (
            <div className="project-payment-alert project-payment-alert--error">
              <span>{paymentsData.error}</span>
            </div>
          ) : paymentsData.payments.length === 0 ? (
            <div className="project-automation-empty">
              <p className="project-automation-empty__title">
                No payment transactions recorded
              </p>
              <p className="project-automation-empty__desc">
                Record advance deposits, stage installments, or milestone payments received from the client for this project.
              </p>
              {canEditProject ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={() => setIsPaymentModalOpen(true)}
                    disabled={!hasEffectiveContractValue}
                    title={
                      !hasEffectiveContractValue
                        ? 'Set Contract Value before recording payments'
                        : 'Record first client payment'
                    }
                  >
                    + Record First Payment
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="project-payments-table-wrap">
              <table className="project-payments-table">
                <thead>
                  <tr>
                    <th scope="col">Payment Ref</th>
                    <th scope="col">Date</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Method</th>
                    <th scope="col">Txn Reference</th>
                    <th scope="col">Notes</th>
                    <th scope="col">Recorded By</th>
                    <th scope="col">Status</th>
                    {canEditProject ? <th scope="col">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {paymentsData.payments.map((p) => {
                    const isReversed = p.status === 'reversed'
                    return (
                      <tr
                        key={p._id || p.id || p.paymentReference}
                        className={isReversed ? 'project-payments-table__row--reversed' : ''}
                      >
                        <td>
                          <span className="project-payment-ref">
                            {p.paymentReference}
                          </span>
                        </td>
                        <td>{formatProjectDate(p.paymentDate)}</td>
                        <td>
                          <span className="project-payment-amount">
                            {formatCurrency(p.amount)}
                          </span>
                        </td>
                        <td>{p.paymentMethod || '—'}</td>
                        <td>{p.transactionReference || '—'}</td>
                        <td style={{ maxWidth: '220px' }}>
                          <div>{p.notes || '—'}</div>
                          {isReversed && p.reversal ? (
                            <div className="project-reversal-details">
                              Reversed on {formatProjectDate(p.reversal.reversedAt)} by{' '}
                              {p.reversal.reversedByName || 'Admin'}: "{p.reversal.reason}"
                            </div>
                          ) : null}
                        </td>
                        <td>{p.recordedByName || '—'}</td>
                        <td>
                          {isReversed ? (
                            <span className="project-payment-badge-pill project-payment-badge-pill--reversed">
                              Reversed
                            </span>
                          ) : (
                            <span className="project-payment-badge-pill project-payment-badge-pill--valid">
                              Valid
                            </span>
                          )}
                        </td>
                        {canEditProject ? (
                          <td>
                            {!isReversed ? (
                              <button
                                type="button"
                                className="project-payment-rev-btn"
                                onClick={() => handleOpenReversal(p)}
                                title="Reverse this payment transaction"
                              >
                                Reverse
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>—</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <div className="project-detail-columns">
        <section
          className="projects-surface project-detail-section"
          aria-labelledby="project-overview-heading"
        >
          <div className="project-section-header">
            <h2
              id="project-overview-heading"
              className="project-section-header__title"
            >
              Project &amp; Client Overview
            </h2>
          </div>

          <div className="project-materials-used">
            <h3>Materials Used</h3>
            {(project.materialsUsed || []).length ? (
              <ul>{project.materialsUsed.map((line, index) => <li key={`${line.materialId}-${index}`}><span>{line.materialName}</span><strong>{line.quantity} {line.unit}</strong>{line.notes ? <small>{line.notes}</small> : null}</li>)}</ul>
            ) : <p>No materials have been recorded for this project.</p>}
          </div>
          <dl className="project-specs-list">
            <div className="project-specs-list__item">
              <dt>Project ID</dt>
              <dd>{project.projectId}</dd>
            </div>
            <div className="project-specs-list__item">
              <dt>Project Name</dt>
              <dd>{project.name}</dd>
            </div>
            <div className="project-specs-list__item">
              <dt>Category</dt>
              <dd>{project.category}</dd>
            </div>
            <div className="project-specs-list__item">
              <dt>Status</dt>
              <dd>
                <ProjectStatusBadge status={project.status} />
              </dd>
            </div>
            <div className="project-specs-list__item">
              <dt>Client Name</dt>
              <dd>{project.clientName}</dd>
            </div>
            <div className="project-specs-list__item">
              <dt>Client Contact</dt>
              <dd
                className={
                  project.clientContact ? '' : 'projects-cell-muted'
                }
              >
                {project.clientContact ||
                  'Not supported in current Project model'}
              </dd>
            </div>
            
            <div className="project-specs-list__item">
              <dt>Last Recorded Activity</dt>
              <dd>
                {formatProjectDateTime(project.lastActivityAt)} (
                {formatActivityTypeLabel(project.lastActivityType)})
              </dd>
            </div>
            <div className="project-specs-list__item">
              <dt>Created By</dt>
              <dd>{project.createdBy || '—'}</dd>
            </div>
            <div className="project-specs-list__item">
              <dt>Creation Date</dt>
              <dd>
                {formatProjectDate(project.creationDate || project.createdAt)}
              </dd>
            </div>
            <div className="project-specs-list__item">
              <dt>Record Created</dt>
              <dd>{formatProjectDateTime(project.createdAt)}</dd>
            </div>
          </dl>

          <div className="project-notes-block">
            <h3 className="project-notes-block__title">
              Project Notes &amp; Scope
            </h3>
            <p className="project-notes-block__text">
              {project.description ||
                'No additional scope notes recorded for this project.'}
            </p>
          </div>
        </section>

        <section
          className="projects-surface project-detail-section"
          aria-labelledby="project-automation-heading"
        >
          <div className="project-section-header">
            <div>
              <h2
                id="project-automation-heading"
                className="project-section-header__title"
              >
                Automation &amp; Alert Activity
              </h2>
              <p className="project-section-header__subtitle">
                Threshold crossings and inactivity evaluations recorded for{' '}
                {project.projectId}.
              </p>
            </div>
          </div>

          {automationFeed.status === 'loading' ? (
            <div className="projects-alerts-skeleton" aria-busy="true" />
          ) : automationFeed.status === 'admin_only' ? (
            <div className="project-automation-empty">
              <p className="project-automation-empty__title">
                Threshold State:{' '}
                {isCriticalOverrun
                  ? 'Critical (100%+ of contract)'
                  : isWarningThreshold
                    ? `Warning (${formatPercentage(warningThresholdPercent)}+ of contract)`
                    : `Within budget (< ${formatPercentage(warningThresholdPercent)})`}
              </p>
              <p className="project-automation-empty__desc">
                Detailed alert history and project inactivity logs are
                restricted to Administrator accounts.
              </p>
            </div>
          ) : automationFeed.status === 'unavailable' ? (
            <div className="project-automation-empty">
              <p className="project-automation-empty__title">
                Alert Log Unavailable
              </p>
              <p className="project-automation-empty__desc">
                {automationFeed.errorMessage ||
                  'Unable to retrieve alert and inactivity records right now.'}
              </p>
            </div>
          ) : automationFeed.costAlerts.length === 0 &&
            automationFeed.activityWarnings.length === 0 ? (
            <div className="project-automation-empty">
              <p className="project-automation-empty__title">
                No alerts or inactivity warnings recorded
              </p>
              <p className="project-automation-empty__desc">
                Costs are currently below the{' '}
                {formatPercentage(warningThresholdPercent)} warning threshold
                and activity is up to date (inactivity window:{' '}
                {automationFeed.inactivityThresholdDays} days).
              </p>
            </div>
          ) : (
            <ul className="project-history-list">
              {automationFeed.costAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className={`project-history-item project-history-item--${alert.status}`}
                >
                  <div className="project-history-item__top">
                    <span
                      className={`projects-alert-item__tag projects-alert-item__tag--${alert.thresholdType}`}
                    >
                      {alert.thresholdType === 'critical'
                        ? '100% Contract Threshold'
                        : `${formatPercentage(alert.thresholdPercent)} Warning`}
                    </span>
                    <span className="project-history-item__status">
                      {alert.status === 'active' ? 'Active' : 'Resolved'}
                    </span>
                  </div>
                  <p className="project-history-item__msg">{alert.message}</p>
                  <span className="project-history-item__meta">
                    Triggered {formatProjectDateTime(alert.triggeredAt)}
                    {alert.resolvedAt
                      ? ` • Resolved ${formatProjectDateTime(alert.resolvedAt)}`
                      : ''}
                  </span>
                </li>
              ))}

              {automationFeed.activityWarnings.map((warning) => (
                <li
                  key={warning.id}
                  className={`project-history-item project-history-item--${warning.status}`}
                >
                  <div className="project-history-item__top">
                    <span className="projects-alert-item__tag projects-alert-item__tag--inactive">
                      Inactivity Warning
                    </span>
                    <span className="project-history-item__status">
                      {warning.status === 'active' ? 'Active' : 'Resolved'}
                    </span>
                  </div>
                  <p className="project-history-item__msg">{warning.message}</p>
                  <span className="project-history-item__meta">
                    Triggered {formatProjectDateTime(warning.triggeredAt)}
                    {warning.resolvedAt
                      ? ` • Resolved ${formatProjectDateTime(warning.resolvedAt)}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {isEditModalOpen ? (
        <ProjectFormModal
          key={`detail-edit-${project.id || project.projectId}`}
          mode="edit"
          project={project}
          isOpen
          onClose={closeEditModal}
          onSubmit={handleEditSubmit}
        />
      ) : null}

      {isPaymentModalOpen ? (
        <ProjectPaymentModal
          key={`project-payment-modal-${project.id || project.projectId}`}
          isOpen
          project={{
            ...project,
            contractValue: effectiveContractValue,
            totalReceived: effectiveTotalReceived,
            outstandingBalance: effectiveOutstanding,
            paymentStatus: effectivePaymentStatus,
            excessPayment: effectiveExcess,
          }}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      ) : null}

      {reversalTarget && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="admin-modal-backdrop"
              role="presentation"
              onMouseDown={(e) => {
                reversalBackdropMouseDownRef.current = e.target === e.currentTarget
              }}
              onClick={(e) => {
                if (
                  reversalBackdropMouseDownRef.current &&
                  e.target === e.currentTarget &&
                  !isReversing
                ) {
                  handleCloseReversal()
                }
                reversalBackdropMouseDownRef.current = false
              }}
            >
              <div
                className="admin-modal project-reversal-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reversal-dialog-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-modal__header">
                  <div>
                    <div className="project-reversal-modal__eyebrow">
                      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ width: 14, height: 14 }}>
                        <path
                          d="M8 2.5V8.5M8 11.5H8.01"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>Accounting Reversal</span>
                    </div>
                    <h2 id="reversal-dialog-title" className="admin-modal__title">
                      Confirm Payment Reversal
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="admin-modal__close"
                    onClick={handleCloseReversal}
                    disabled={isReversing}
                    aria-label="Close dialog"
                  >
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M5 5L15 15M15 5L5 15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleConfirmReversal}>
                  <div className="project-reversal-modal__body">
                    <div className="project-reversal-card">
                      <div className="project-reversal-card__icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none">
                          <path
                            d="M3.5 8H12C14.7614 8 17 10.2386 17 13C17 15.7614 14.7614 18 12 18H6.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7 4.5L3.5 8L7 11.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="project-reversal-card__content">
                        <div className="project-reversal-card__title">
                          Reverse Payment{' '}
                          <span className="project-reversal-card__badge">
                            {reversalTarget.paymentReference}
                          </span>
                        </div>
                        <div className="project-reversal-card__meta">
                          <span className="project-reversal-card__amount">
                            {formatCurrency(reversalTarget.amount)}
                          </span>
                          {reversalTarget.paymentMethod ? (
                            <span>• via {reversalTarget.paymentMethod}</span>
                          ) : null}
                          {reversalTarget.paymentDate ? (
                            <span>
                              • on {formatProjectDate(reversalTarget.paymentDate)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="project-reversal-audit-box">
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M10 6V10M10 13.5H10.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <span>
                        This action will mark the payment as reversed, deduct{' '}
                        <strong>{formatCurrency(reversalTarget.amount)}</strong> from Total Received,
                        restore the project outstanding balance, and preserve an audit log.
                      </span>
                    </div>

                    {reversalError ? (
                      <div
                        className="project-payment-alert project-payment-alert--error"
                        role="alert"
                      >
                        <span>{reversalError}</span>
                      </div>
                    ) : null}

                    <div className="project-reversal-field">
                      <label
                        htmlFor="payment-reversal-reason"
                        className="project-reversal-field__label"
                      >
                        <span>Reason for Reversal</span>
                        <span className="project-reversal-field__required" aria-hidden="true">*</span>
                      </label>
                      <textarea
                        id="payment-reversal-reason"
                        className="project-reversal-field__textarea"
                        rows={3}
                        placeholder="e.g., Client cheque bounced, incorrect amount entered, duplicate transaction..."
                        value={reversalReason}
                        onChange={(e) => {
                          setReversalReason(e.target.value)
                          if (reversalError) setReversalError('')
                        }}
                        required
                        disabled={isReversing}
                        autoFocus
                      />
                      <span className="project-reversal-field__hint">
                        A detailed reason is required for audit trail records.
                      </span>
                    </div>
                  </div>

                  <div className="admin-modal__footer">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={handleCloseReversal}
                      disabled={isReversing}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-btn admin-btn--danger"
                      disabled={isReversing || !reversalReason.trim()}
                    >
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path
                          d="M3.5 8H12C14.7614 8 17 10.2386 17 13C17 15.7614 14.7614 18 12 18H6.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7 4.5L3.5 8L7 11.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{isReversing ? 'Reversing...' : 'Confirm Reversal'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
