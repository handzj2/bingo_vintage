/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bv: {
          // ── Text hierarchy ──────────────────────────────────────
          text:          '#111827', // Primary text / titles
          muted:         '#4B5563', // Body supporting text
          meta:          '#6B7280', // Metadata, timestamps, captions

          // ── Surfaces ────────────────────────────────────────────
          canvas:        '#F9FAFB', // Page background
          surface:       '#FFFFFF', // Cards, panels, content surfaces
          sidebar:       '#FFFFFF', // Sidebar background
          header:        '#FFFFFF', // Top header
          form:          '#FFFFFF', // Form backgrounds
          table:         '#FFFFFF', // Table backgrounds
          hover:         '#F3F4F6', // Row / interactive hover
          modal:         '#FFFFFF', // Modal / dialog backgrounds
          'sidebar-active': '#F3F4F6', // Active nav item background

          // ── Borders ─────────────────────────────────────────────
          border:        '#E5E7EB', // Default rules, table lines
          'border-strong': '#D1D5DB', // Stronger separators

          // ── Brand & Action (near-black operational chrome) ───────
          action:        '#111827', // Primary buttons, key actions
          'action-hover': '#1F2937', // Primary button hover
          'action-muted': '#374151', // Secondary / muted actions
          accent:        '#1E40AF', // Restrained blue — links only
          'accent-light': '#DBEAFE', // Light accent background

          // ── Functional / Status (always pair with text labels) ──
          success:       '#166534',
          'success-bg':  '#F0FDF4',
          warning:       '#A16207',
          'warning-bg':  '#FEFCE8',
          danger:        '#991B1B',
          'danger-bg':   '#FEF2F2',
          info:          '#1E40AF',
          'info-bg':     '#EFF6FF',
          neutral:       '#4B5563',
          'neutral-bg':  '#F3F4F6',

          // ── Loan / Payment specific statuses ────────────────────
          paid:          '#166534',
          'paid-bg':     '#F0FDF4',
          partial:       '#A16207',
          'partial-bg':  '#FEFCE8',
          overdue:       '#991B1B',
          'overdue-bg':  '#FEF2F2',
          defaulted:     '#7F1D1D',
          'defaulted-bg':'#FEF2F2',
          npl:           '#7F1D1D',
          'npl-bg':      '#FEF2F2',
          pending:       '#6B7280',
          'pending-bg':  '#F3F4F6',
        },
      },
      borderRadius: {
        bv: '0.375rem', // 6px — operational, not overly rounded
      },
      maxWidth: {
        bv: '72rem', // ~max-w-6xl — primary operational workspace
      },
      // Optional spacing tokens for consistent rhythm
      spacing: {
        'bv-section': '1.5rem', // 24px section gaps
        'bv-page': '1.5rem',    // page padding (sm: 1.5rem → 2rem)
      },
    },
  },
  plugins: [],
};
