import { useState, useEffect, useMemo } from 'react'
import {
  getEffectivePermissions,
  normalizeRoleKey,
} from '../../permissions/constants/permissionsCatalog'
import { usePermissions } from '../../permissions/context/permissionsContextRef'
import { updateSelfProfile } from '../services/profileService'
import '../styles/profile.css'

function getInitials(name) {
  const cleaned = (name || '').trim()
  if (!cleaned) return 'ST'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const ADMIN_CAPABILITIES = [
  'Full Workspace Dashboard & KPIs',
  'Projects & Custom Production Orders',
  'Purchase Vouchers & Bill Verification',
  'Unpaid Bills & Supplier Credit Tracking',
  'Centralized Supplier Directory',
  'Company Expenses & Overhead Tracking',
  'Raw Materials & Inventory Management',
  'Secondary Business Income & Expenses',
  'Confidential Financial & Profitability Reports',
  'User Account Approvals & User Management',
  'Role-Based Access Control (RBAC)',
]

const OPERATOR_CAPABILITIES = [
  'Operational Dashboard Overview',
  'Assigned Production Projects',
  'Purchase Voucher Creation & Entry',
  'Expense Logging & Documentation',
  'Raw Materials Inventory Access',
  'Supplier Information Lookup',
]

export function ProfilePage({ currentUser, onLogout, onNavigate }) {
  const { refreshPermissions } = usePermissions()

  const initialName = useMemo(() => currentUser?.name || '', [currentUser])
  const initialPhone = useMemo(() => currentUser?.phone || '', [currentUser])

  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Keep state in sync if currentUser updates externally
  useEffect(() => {
    setName(initialName)
    setPhone(initialPhone)
  }, [initialName, initialPhone])

  const roleKey = normalizeRoleKey(currentUser?.role)
  const isAdmin = roleKey === 'admin'
  const roleLabel = isAdmin ? 'Administrator' : 'Data Entry Operator'
  const initials = getInitials(name || currentUser?.name)

  const isDirty = name.trim() !== initialName.trim() || phone.trim() !== initialPhone.trim()

  const handleReset = () => {
    setName(initialName)
    setPhone(initialPhone)
    setFeedback(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (isSaving) return

    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      setFeedback({
        tone: 'error',
        text: 'Full Name is required and cannot be left blank.',
      })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const res = await updateSelfProfile({
        name: trimmedName,
        phone: trimmedPhone,
      })

      if (typeof refreshPermissions === 'function') {
        await refreshPermissions()
      }

      setFeedback({
        tone: 'success',
        text: res.message || 'Profile details updated successfully.',
      })
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: err?.message || 'Unable to update profile. Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="sts-profile-page">
      {/* Page Header */}
      <header className="sts-profile-header">
        <div>
          <h1 className="sts-profile-header__title">My Profile &amp; Account</h1>
          <p className="sts-profile-header__subtitle">
            Manage your personal contact details, workspace credentials, and active permissions.
          </p>
        </div>
        <div className="sts-profile-header__actions">
          <span
            className={`sts-profile-role-pill ${
              isAdmin ? 'sts-profile-role-pill--admin' : ''
            }`}
          >
            {isAdmin ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: '14px', height: '14px' }}
                aria-hidden="true"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: '14px', height: '14px' }}
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
            {roleLabel}
          </span>

          {typeof onLogout === 'function' ? (
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={onLogout}
              title="Sign out of Soft Touch Sofas"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          ) : null}
        </div>
      </header>

      {/* Hero Overview Card */}
      <section className="sts-profile-hero" aria-label="User overview">
        <div className="sts-profile-hero__left">
          <div className="sts-profile-avatar-wrap">
            <div className="sts-profile-avatar">
              {currentUser?.image ? (
                <img
                  src={currentUser.image}
                  alt={displayNameOrDefault(currentUser?.name)}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <span
              className="sts-profile-status-indicator"
              title="Active user session"
              aria-label="Active user session"
            />
          </div>

          <div className="sts-profile-hero__identity">
            <h2 className="sts-profile-hero__name">
              {currentUser?.name || 'Workspace User'}
            </h2>
            <div className="sts-profile-hero__meta">
              <span className="sts-profile-hero__meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {currentUser?.email || 'No email associated'}
              </span>
              {phone ? (
                <span className="sts-profile-hero__meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {phone}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="sts-profile-hero__badge">
          <span className="sts-profile-hero__badge-dot" />
          <span>Active Workspace Access</span>
        </div>
      </section>

      {/* Feedback Banner */}
      {feedback ? (
        <div
          className={`sts-profile-banner sts-profile-banner--${feedback.tone}`}
          role="status"
          aria-live="polite"
        >
          {feedback.tone === 'success' ? (
            <svg
              className="sts-profile-banner__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg
              className="sts-profile-banner__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <span className="sts-profile-banner__text">{feedback.text}</span>
          <button
            type="button"
            className="sts-profile-banner__close"
            onClick={() => setFeedback(null)}
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : null}

      {/* Main Grid: Form + Role & Permissions */}
      <div className="sts-profile-grid">
        {/* Left: Personal Information Form */}
        <section className="sts-profile-card" aria-labelledby="personal-info-heading">
          <div className="sts-profile-card__header">
            <div className="sts-profile-card__icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="sts-profile-card__titles">
              <h2 id="personal-info-heading" className="sts-profile-card__title">
                Personal Information
              </h2>
              <p className="sts-profile-card__desc">
                Update your display name and primary mobile contact information.
              </p>
            </div>
          </div>

          <form className="sts-profile-form" onSubmit={handleSave}>
            <div className="sts-profile-fields-grid">
              {/* Full Name */}
              <div className="sts-profile-field sts-profile-field--full">
                <label className="sts-profile-label" htmlFor="profile-name">
                  <span>Full Name</span>
                  <span className="sts-profile-label__tag">Required</span>
                </label>
                <div className="sts-profile-input-wrap">
                  <svg
                    className="sts-profile-input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="profile-name"
                    type="text"
                    className="sts-profile-input sts-profile-input--with-icon"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={isSaving}
                  />
                </div>
                <span className="sts-profile-hint">
                  Your full name appears across activity audit logs and project assignments.
                </span>
              </div>

              {/* Email Address (Login ID) */}
              <div className="sts-profile-field sts-profile-field--full">
                <label className="sts-profile-label" htmlFor="profile-email">
                  <span>Email Address (Login ID)</span>
                  <span className="sts-profile-label__tag">Read-Only</span>
                </label>
                <div className="sts-profile-input-wrap">
                  <svg
                    className="sts-profile-input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    id="profile-email"
                    type="email"
                    className="sts-profile-input sts-profile-input--with-icon"
                    value={currentUser?.email || ''}
                    disabled
                    readOnly
                  />
                  <svg
                    className="sts-profile-input-lock"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="sts-profile-hint">
                  Email serves as your unique authentication identity and cannot be altered directly.
                </span>
              </div>

              {/* Phone Number */}
              <div className="sts-profile-field">
                <label className="sts-profile-label" htmlFor="profile-phone">
                  <span>Phone Number</span>
                  <span className="sts-profile-label__tag">Optional</span>
                </label>
                <div className="sts-profile-input-wrap">
                  <svg
                    className="sts-profile-input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <input
                    id="profile-phone"
                    type="tel"
                    className="sts-profile-input sts-profile-input--with-icon"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Assigned Role */}
              <div className="sts-profile-field">
                <label className="sts-profile-label" htmlFor="profile-role">
                  <span>Workspace Role</span>
                  <span className="sts-profile-label__tag">Managed</span>
                </label>
                <div className="sts-profile-input-wrap">
                  <svg
                    className="sts-profile-input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <input
                    id="profile-role"
                    type="text"
                    className="sts-profile-input sts-profile-input--with-icon"
                    value={roleLabel}
                    disabled
                    readOnly
                  />
                  <svg
                    className="sts-profile-input-lock"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="sts-profile-form-footer">
              <div>
                {isDirty ? (
                  <span className="sts-profile-unsaved-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '13px', height: '13px' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Unsaved changes
                  </span>
                ) : null}
              </div>

              <div className="sts-profile-form-buttons">
                {isDirty ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={handleReset}
                    disabled={isSaving}
                  >
                    Discard Changes
                  </button>
                ) : null}

                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={isSaving || !isDirty}
                >
                  {isSaving ? (
                    <>
                      <div className="rbac-route-loading__spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'currentColor', borderTopColor: 'transparent' }} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Update Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Right: Role & Permissions Summary Card */}
        <section className="sts-profile-card" aria-labelledby="role-privileges-heading">
          <div className="sts-profile-card__header">
            <div className="sts-profile-card__icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="sts-profile-card__titles">
              <h2 id="role-privileges-heading" className="sts-profile-card__title">
                Role &amp; Privileges
              </h2>
              <p className="sts-profile-card__desc">
                Operational privileges granted to your account in this workspace.
              </p>
            </div>
          </div>

          <div className="sts-profile-role-box">
            <div className="sts-profile-role-box__top">
              <span className="sts-profile-role-box__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                {roleLabel}
              </span>
              <span className="sts-profile-cap-tag sts-profile-cap-tag--accent">
                {isAdmin ? 'Full Authorization' : 'Standard Access'}
              </span>
            </div>
            <p className="sts-profile-role-box__desc">
              {isAdmin
                ? 'Unrestricted workspace administration. You have full access to create, view, edit, approve, and manage projects, purchases, unpaid bills, expenses, raw materials, suppliers, miscellaneous business, user management, and roles & permissions.'
                : 'Standard operational data entry access. You can record purchases, expenses, and manage materials for your assigned projects.'}
            </p>
          </div>

          {/* Capabilities List */}
          <div className="sts-profile-caps-section">
            <span className="sts-profile-caps-title">Operational Capabilities</span>
            <div className="sts-profile-caps-list">
              {(isAdmin ? ADMIN_CAPABILITIES : OPERATOR_CAPABILITIES).map((cap) => (
                <span key={cap} className="sts-profile-cap-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Admin Navigation Shortcuts */}
          {isAdmin && typeof onNavigate === 'function' ? (
            <div className="sts-profile-admin-actions">
              <span className="sts-profile-caps-title">Administrative Shortcuts</span>
              <button
                type="button"
                className="sts-profile-link-btn"
                onClick={() => onNavigate('/permissions')}
              >
                <span>Roles &amp; Permissions Configurator</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <button
                type="button"
                className="sts-profile-link-btn"
                onClick={() => onNavigate('/users')}
              >
                <span>User Management Directory</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="sts-profile-security-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                To request additional project permissions or role upgrades, please contact your workspace administrator.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function displayNameOrDefault(name) {
  return (name || '').trim() || 'Workspace User'
}
