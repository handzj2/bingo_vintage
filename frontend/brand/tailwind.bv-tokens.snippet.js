/**
 * Drop-in replacement for the `bv` colour block in tailwind.config.js.
 * Values reference CSS variables so Platform Admin can publish themes
 * without rebuilding every component class name.
 *
 * Keep class names (bg-bv-action, text-bv-text, etc.) unchanged.
 */
module.exports = {
  bv: {
    text: 'var(--bv-text)',
    muted: 'var(--bv-muted)',
    meta: 'var(--bv-meta)',
    canvas: 'var(--bv-canvas)',
    surface: 'var(--bv-surface)',
    sidebar: 'var(--bv-sidebar)',
    header: 'var(--bv-header)',
    form: 'var(--bv-surface)',
    table: 'var(--bv-surface)',
    hover: 'color-mix(in srgb, var(--bv-muted) 8%, var(--bv-surface))',
    modal: 'var(--bv-surface)',
    'sidebar-active': 'color-mix(in srgb, var(--bv-accent) 12%, var(--bv-sidebar))',
    border: 'var(--bv-border)',
    'border-strong': 'var(--bv-border-strong)',
    action: 'var(--bv-action)',
    'action-hover': 'var(--bv-action-hover)',
    'action-muted': 'var(--bv-action-muted)',
    accent: 'var(--bv-accent)',
    'accent-light': 'var(--bv-accent-light)',
    success: 'var(--bv-success)',
    'success-bg': 'var(--bv-success-bg)',
    warning: 'var(--bv-warning)',
    'warning-bg': 'var(--bv-warning-bg)',
    danger: 'var(--bv-danger)',
    'danger-bg': 'var(--bv-danger-bg)',
    info: 'var(--bv-info)',
    'info-bg': 'var(--bv-info-bg)',
    paid: 'var(--bv-success)',
    'paid-bg': 'var(--bv-success-bg)',
    partial: 'var(--bv-warning)',
    'partial-bg': 'var(--bv-warning-bg)',
    overdue: 'var(--bv-danger)',
    'overdue-bg': 'var(--bv-danger-bg)',
    defaulted: 'var(--bv-danger)',
    'defaulted-bg': 'var(--bv-danger-bg)',
    npl: 'var(--bv-danger)',
    'npl-bg': 'var(--bv-danger-bg)',
    pending: 'var(--bv-meta)',
    'pending-bg': 'var(--bv-canvas)',
  },
};
