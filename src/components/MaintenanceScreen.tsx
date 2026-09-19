/**
 * ★★★ NEW FILE — MAINTENANCE MODE 2026-09-19 ★★★
 * Path: frontend/src/components/MaintenanceScreen.tsx
 * Shown when SITE_STATUS=OFF
 */

/**
 * ─────────────────────────────────────────────────────────────
 * MAINTENANCE / OFFLINE SCREEN — Bingo Vintage
 * ─────────────────────────────────────────────────────────────
 * Added: 2026-09-19
 * Shown when SITE_STATUS=OFF (Vercel Environment Variables).
 * No client CTAs — hosting admin only (Handzj Tech).
 * Inline styles only → stays visible in dark mode.
 * ─────────────────────────────────────────────────────────────
 */

const SITE = {
  name: "Bingo Vintage"
};

const HOSTING_ADMIN = {
  name: "Handzj Tech",
  email: "handzj2@gmail.com",
  phone: "0781909507",
  phoneHref: "tel:+256781909507",
  whatsapp: "256781909507"
};

const C = {
  bg: "#FCFAF4",
  card: "#FFFFFF",
  ink: "#16241A",
  muted: "#5C5646",
  field: "#1F4D2B",
  harvest: "#E0A526",
  border: "rgba(22, 36, 26, 0.12)",
  iconBg: "rgba(31, 77, 43, 0.12)",
  shadow: "0 4px 24px rgba(0, 0, 0, 0.08)"
};

export default function MaintenanceScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        padding: "4rem 1.5rem",
        backgroundColor: C.bg,
        color: C.ink,
        colorScheme: "light"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "6px",
          background: `linear-gradient(to right, ${C.field}, ${C.harvest}, ${C.field})`
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "28rem",
          textAlign: "center"
        }}
      >
        <p
          style={{
            marginBottom: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: C.field
          }}
        >
          Official notice
        </p>

        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            fontWeight: 500,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            color: C.ink,
            margin: 0
          }}
        >
          {SITE.name}
        </h1>

        <div style={{ margin: "1.5rem auto 0", maxWidth: "24rem" }}>
          <div
            style={{
              borderRadius: "1rem",
              padding: "2rem",
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              boxShadow: C.shadow
            }}
          >
            <p
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "1.25rem",
                fontWeight: 500,
                color: C.ink,
                margin: 0
              }}
            >
              Website temporarily unavailable
            </p>
            <p
              style={{
                marginTop: "0.75rem",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                color: C.muted
              }}
            >
              This website is currently offline.
            </p>
            <p
              style={{
                marginTop: "1rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                lineHeight: 1.6,
                color: C.ink
              }}
            >
              Please contact the hosting administrator for assistance.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "2.5rem", display: "grid", gap: "0.75rem" }}>
          <p
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: C.muted,
              margin: 0
            }}
          >
            Hosting administrator · {HOSTING_ADMIN.name}
          </p>

          <ContactRow
            href={HOSTING_ADMIN.phoneHref}
            label="Call"
            value={HOSTING_ADMIN.phone}
            icon={<PhoneIcon />}
          />
          <ContactRow
            href={`https://wa.me/${HOSTING_ADMIN.whatsapp}`}
            label="WhatsApp"
            value={HOSTING_ADMIN.phone}
            icon={<WhatsAppIcon />}
            external
          />
          <ContactRow
            href={`mailto:${HOSTING_ADMIN.email}`}
            label="Email"
            value={HOSTING_ADMIN.email}
            icon={<MailIcon />}
          />
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  href,
  label,
  value,
  icon,
  external
}: {
  href: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        borderRadius: "0.75rem",
        padding: "0.9rem 1.25rem",
        fontSize: "0.9rem",
        fontWeight: 600,
        textDecoration: "none",
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        color: C.ink,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
      }}
    >
      <span
        style={{
          display: "flex",
          width: "2.25rem",
          height: "2.25rem",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "9999px",
          backgroundColor: C.iconBg,
          color: C.field
        }}
      >
        {icon}
      </span>
      <span style={{ textAlign: "left" }}>
        <span
          style={{
            display: "block",
            fontSize: "0.65rem",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: C.muted
          }}
        >
          {label}
        </span>
        {value}
      </span>
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.85 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
