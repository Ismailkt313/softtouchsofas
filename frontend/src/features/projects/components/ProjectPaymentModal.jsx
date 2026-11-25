import React, { useState, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Dropdown, DatePicker } from '../../../components/common'
import {
  formatCurrency,
  formatProjectDate,
  recordProjectPayment,
  toProjectDateInputValue,
  PAYMENT_METHOD_OPTIONS,
} from '../services/projectService'
import { ProjectPaymentStatusBadge } from './ProjectPaymentStatusBadge'

export function ProjectPaymentModal({
  isOpen,
  project,
  onClose,
  onSuccess,
}) {
  const modalTitleId = useId()
  const backdropMouseDownRef = useRef(false)

  const [option, setOption] = useState('partial') // 'partial' | 'full' | 'unpaid'
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(toProjectDateInputValue(new Date()))
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
  const [transactionReference, setTransactionReference] = useState('')
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  // Derive project financials
  const hasContractValue =
    project?.contractValue !== null &&
    project?.contractValue !== undefined &&
    Number(project?.contractValue) > 0
  const contractValue = hasContractValue ? Number(project.contractValue) : null
  const previouslyReceived = Number(project?.totalReceived) || 0
  const currentBalance = hasContractValue
    ? Math.max(0, contractValue - previouslyReceived)
    : null

  useEffect(() => {
    if (isOpen) {
      setOption('partial')
      setAmount('')
      setPaymentDate(toProjectDateInputValue(new Date()))
      setPaymentMethod('Bank Transfer')
      setTransactionReference('')
      setNotes('')
      setErrors({})
      setSubmitError('')
      setIsSubmitting(false)
    }
  }, [isOpen, project])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen || !project) {
    return null
  }

  // Handle amount calculations for Option A (Partial Payment)
  const numericInputAmount = Number(amount) || 0
  const projectedTotalReceived = previouslyReceived + numericInputAmount
  const projectedRemainingBalance = hasContractValue
    ? Math.max(0, contractValue - projectedTotalReceived)
    : null

  const handleOptionChange = (newOption) => {
    setOption(newOption)
    setErrors({})
    setSubmitError('')
    if (newOption === 'full' && currentBalance !== null) {
      setAmount(String(currentBalance))
    } else if (newOption === 'partial') {
      setAmount('')
    }
  }

  const handleAmountChange = (e) => {
    const val = e.target.value
    setAmount(val)
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: '' }))
    }
    if (submitError) {
      setSubmitError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    // Option C: Keep Unpaid
    if (option === 'unpaid') {
      // Do not create a payment transaction when the user simply selects Unpaid.
      onClose()
      return
    }

    const newErrors = {}

    let paymentAmount = 0
    if (option === 'full') {
      if (!hasContractValue) {
        newErrors.option =
          'Cannot mark as fully paid because this project has no Contract Value set.'
      } else if (currentBalance === 0) {
        newErrors.option =
          'This project is already fully settled (Remaining Balance is ₹0.00).'
      } else {
        paymentAmount = currentBalance
      }
    } else {
      // Option A: Partial
      if (!amount || String(amount).trim() === '') {
        newErrors.amount = 'Please enter the payment amount received.'
      } else {
        const parsed = Number(amount)
        if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0) {
          newErrors.amount = 'Amount must be greater than zero.'
        } else if (hasContractValue && parsed > currentBalance) {
          newErrors.amount = `Amount cannot exceed the remaining balance (${formatCurrency(
            currentBalance,
          )}).`
        } else {
          paymentAmount = Math.round(parsed * 100) / 100
        }
      }
    }

    if (!paymentDate) {
      newErrors.paymentDate = 'Payment date is required.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        amount: paymentAmount,
        paymentDate: new Date(paymentDate).toISOString(),
        paymentMethod,
        transactionReference: transactionReference.trim(),
        notes: notes.trim(),
        isFullPaymentSettlement: option === 'full',
      }

      const response = await recordProjectPayment(
        project.projectId || project.id,
        payload,
      )

      if (onSuccess) {
        onSuccess(response.summary, response.payment)
      }
      onClose()
    } catch (err) {
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        'Failed to record project payment.'
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalElement = (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (
          backdropMouseDownRef.current &&
          e.target === e.currentTarget &&
          !isSubmitting
        ) {
          onClose()
        }
        backdropMouseDownRef.current = false
      }}
    >
      <div
        className="admin-modal project-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal__header">
          <div>
            <div className="project-payment-modal__eyebrow">
              Client Payment Tracking
            </div>
            <h2 id={modalTitleId} className="admin-modal__title">
              Manage Client Payment
            </h2>
          </div>
          <button
            type="button"
            className="admin-modal__close"
            onClick={onClose}
            disabled={isSubmitting}
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

        {/* Project Financial Summary Banner */}
        <div className="project-payment-summary-strip">
          <div className="project-payment-summary-strip__header">
            <div>
              <span className="project-code-pill">{project.projectId}</span>
              <strong className="project-payment-summary-strip__name">
                {project.name}
              </strong>
            </div>
            <ProjectPaymentStatusBadge
              status={project.paymentStatus}
              contractValueSet={hasContractValue}
            />
          </div>
          <div className="project-payment-summary-strip__client">
            Client: <strong>{project.clientName}</strong>
            {project.clientContact ? ` (${project.clientContact})` : ''}
          </div>

          <div className="project-payment-summary-strip__metrics">
            <div className="project-payment-summary-strip__metric">
              <span className="metric-label">Contract Value</span>
              <span className="metric-val">
                {hasContractValue ? formatCurrency(contractValue) : 'Not Set'}
              </span>
            </div>
            <div className="project-payment-summary-strip__metric">
              <span className="metric-label">Previously Received</span>
              <span className="metric-val metric-val--received">
                {formatCurrency(previouslyReceived)}
              </span>
            </div>
            <div className="project-payment-summary-strip__metric">
              <span className="metric-label">Remaining Balance</span>
              <span
                className={`metric-val${
                  currentBalance !== null && currentBalance > 0
                    ? ' metric-val--pending'
                    : ' metric-val--settled'
                }`}
              >
                {hasContractValue ? formatCurrency(currentBalance) : '—'}
              </span>
            </div>
          </div>
        </div>

        <form className="project-payment-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="admin-modal__body project-payment-modal__body">
            {submitError ? (
              <div className="project-payment-alert project-payment-alert--error" role="alert">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 5V9M8 11.5H8.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span>{submitError}</span>
              </div>
            ) : null}

            {/* Option Selection Radio / Tabs */}
            <div className="project-payment-options">
              <label className="project-payment-option-label">
                Select Payment Action
              </label>
              <div className="project-payment-options__grid">
                <button
                  type="button"
                  className={`project-payment-option-card${
                    option === 'partial' ? ' project-payment-option-card--active' : ''
                  }`}
                  onClick={() => handleOptionChange('partial')}
                >
                  <div className="option-radio-circle">
                    {option === 'partial' ? <span className="option-radio-dot" /> : null}
                  </div>
                  <div className="option-text">
                    <strong className="option-title">Record Partial Payment</strong>
                    <span className="option-desc">
                      Enter amount received for stage / milestone
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`project-payment-option-card${
                    option === 'full' ? ' project-payment-option-card--active' : ''
                  }`}
                  onClick={() => handleOptionChange('full')}
                  disabled={!hasContractValue || currentBalance === 0}
                  title={
                    !hasContractValue
                      ? 'Contract value not set'
                      : currentBalance === 0
                        ? 'Project already fully paid'
                        : undefined
                  }
                >
                  <div className="option-radio-circle">
                    {option === 'full' ? <span className="option-radio-dot" /> : null}
                  </div>
                  <div className="option-text">
                    <strong className="option-title">Mark as Fully Paid</strong>
                    <span className="option-desc">
                      {hasContractValue
                        ? currentBalance === 0
                          ? 'Already settled (₹0.00)'
                          : `Settle balance (${formatCurrency(currentBalance)})`
                        : 'Contract value required'}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`project-payment-option-card${
                    option === 'unpaid' ? ' project-payment-option-card--active' : ''
                  }`}
                  onClick={() => handleOptionChange('unpaid')}
                >
                  <div className="option-radio-circle">
                    {option === 'unpaid' ? <span className="option-radio-dot" /> : null}
                  </div>
                  <div className="option-text">
                    <strong className="option-title">Keep Unpaid</strong>
                    <span className="option-desc">
                      Retain current status with no transaction
                    </span>
                  </div>
                </button>
              </div>
              {errors.option ? (
                <p className="projects-form-field__error" role="alert">
                  {errors.option}
                </p>
              ) : null}
            </div>

            {/* Dynamic Form Sections based on selected Option */}
            {option === 'unpaid' ? (
              <div className="project-payment-unpaid-notice">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6V11M10 14H10.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <div>
                  <strong>No Payment Received Yet</strong>
                  <p>
                    Selecting this option retains the project payment status as{' '}
                    <em>Unpaid</em>. No payment voucher or transaction entry will be recorded.
                  </p>
                </div>
              </div>
            ) : (
              <div className="project-payment-fields">
                {option === 'full' ? (
                  <div className="project-payment-full-notice">
                    <div className="full-notice-header">
                      <span>Remaining Balance to Settle:</span>
                      <strong>{formatCurrency(currentBalance)}</strong>
                    </div>
                    <p className="full-notice-desc">
                      Recording this final payment of{' '}
                      <strong>{formatCurrency(currentBalance)}</strong> will clear the
                      outstanding balance to ₹0.00 and mark the project status as{' '}
                      <strong>Fully Paid</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="projects-form-field">
                      <label
                        htmlFor="project-payment-amount"
                        className="projects-form-field__label"
                      >
                        Amount Received <span aria-hidden="true">*</span>
                      </label>
                      <div
                        className={`projects-currency-input${
                          errors.amount ? ' projects-currency-input--error' : ''
                        }${isSubmitting ? ' projects-currency-input--disabled' : ''}`}
                      >
                        <span className="projects-currency-input__prefix" aria-hidden="true">
                          ₹
                        </span>
                        <input
                          id="project-payment-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="projects-currency-input__field"
                          placeholder="0.00"
                          value={amount}
                          onChange={handleAmountChange}
                          disabled={isSubmitting}
                          autoFocus
                        />
                      </div>
                      {errors.amount ? (
                        <p className="projects-form-field__error" role="alert">
                          {errors.amount}
                        </p>
                      ) : null}

                      {/* Live Calculation preview for Partial Payment */}
                      {numericInputAmount > 0 ? (
                        <div className="project-payment-calc-preview">
                          <div className="calc-row">
                            <span>New Total Received:</span>
                            <strong>{formatCurrency(projectedTotalReceived)}</strong>
                          </div>
                          {hasContractValue ? (
                            <div className="calc-row">
                              <span>Remaining Balance:</span>
                              <strong>{formatCurrency(projectedRemainingBalance)}</strong>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </>
                )}

                <div className="project-payment-row">
                  <div className="projects-form-field">
                    <label className="projects-form-field__label">
                      Payment Date <span aria-hidden="true">*</span>
                    </label>
                    <DatePicker
                      variant="form"
                      value={paymentDate}
                      onChange={(val) => {
                        setPaymentDate(val)
                        if (errors.paymentDate) {
                          setErrors((prev) => ({ ...prev, paymentDate: '' }))
                        }
                      }}
                      required
                      error={Boolean(errors.paymentDate)}
                      disabled={isSubmitting}
                    />
                    {errors.paymentDate ? (
                      <p className="projects-form-field__error" role="alert">
                        {errors.paymentDate}
                      </p>
                    ) : null}
                  </div>

                  <div className="projects-form-field">
                    <label className="projects-form-field__label">
                      Payment Method <span aria-hidden="true">*</span>
                    </label>
                    <Dropdown
                      variant="form"
                      value={paymentMethod}
                      options={PAYMENT_METHOD_OPTIONS}
                      onChange={(val) => setPaymentMethod(val)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="projects-form-field">
                  <label
                    htmlFor="project-payment-ref"
                    className="projects-form-field__label"
                  >
                    Transaction Reference / Cheque No.{' '}
                    <span className="projects-form-field__optional">(Optional)</span>
                  </label>
                  <input
                    id="project-payment-ref"
                    type="text"
                    className="projects-form-field__input"
                    placeholder="e.g., UPI Ref, NEFT UTR, Cheque #4521"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    disabled={isSubmitting}
                    maxLength={100}
                  />
                </div>

                <div className="projects-form-field">
                  <label
                    htmlFor="project-payment-notes"
                    className="projects-form-field__label"
                  >
                    Notes &amp; Remarks{' '}
                    <span className="projects-form-field__optional">(Optional)</span>
                  </label>
                  <textarea
                    id="project-payment-notes"
                    className="projects-form-field__textarea"
                    rows={2}
                    placeholder="e.g. 50% advance for raw fabrics"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSubmitting}
                    maxLength={500}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="admin-modal__footer projects-form-modal__footer">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Processing...'
                : option === 'unpaid'
                  ? 'Keep Unpaid'
                  : option === 'full'
                    ? `Confirm Full Payment (${formatCurrency(currentBalance)})`
                    : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(modalElement, document.body)
    : modalElement
}
