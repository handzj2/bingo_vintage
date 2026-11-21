'use client';

/**
 * Brand DNA Control Centre — Phase 1 UI
 * Displays foundational HandzJ identity and explains publish workflow.
 * Full draft/publish API wires when brand backend service is merged.
 */

const DNA = [
  { name: 'Deep Ink', hex: '#101820', role: 'Primary text, dark chrome, sidebar' },
  { name: 'Graphite', hex: '#263238', role: 'Secondary text, muted surfaces' },
  { name: 'Warm Ivory', hex: '#F7F5EF', role: 'Canvas / page background' },
  { name: 'Signal Green', hex: '#16836A', role: 'Accent, links, interactive' },
  { name: 'Deep Green', hex: '#0D5C4A', role: 'Primary action, success' },
  { name: 'Amber', hex: '#D99A2B', role: 'Warning, attention' },
];

export default function BrandDnaPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-white">Brand DNA & Appearance</h1>
        <p className="text-sm text-bv-meta mt-1">
          HandzJ foundational identity is protected. Application appearance is published through
          versioned themes. Tenant admins cannot replace protected DNA keys.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-bv-meta mb-3">
          Foundational identity (protected)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DNA.map((c) => (
            <div
              key={c.hex}
              className="rounded-xl border border-gray-800 overflow-hidden bg-gray-900/50"
            >
              <div className="h-16" style={{ backgroundColor: c.hex }} />
              <div className="px-3 py-2">
                <div className="text-sm font-semibold text-white">{c.name}</div>
                <div className="text-xs font-mono text-bv-meta">{c.hex}</div>
                <div className="text-xs text-gray-400 mt-1">{c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900/40 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white">Publish workflow</h2>
        <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1">
          <li>Import <code className="text-bv-accent">handzj-dna.css</code> and map Tailwind <code className="text-bv-accent">bv-*</code> to CSS variables.</li>
          <li>Run migration 045 (<code className="text-bv-accent">brand_theme_versions</code>).</li>
          <li>Draft token overrides (non-protected keys only).</li>
          <li>Preview on real components → Publish → audit history.</li>
          <li>Rollback restores previous published version.</li>
        </ol>
        <p className="text-xs text-bv-meta pt-2">
          Draft/publish API and live preview editor ship next. This page is the discoverable
          Platform Admin entry and DNA reference — not a decorative placeholder for identity.
        </p>
      </section>
    </div>
  );
}
