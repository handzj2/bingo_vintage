import Link from 'next/link';

/**
 * Explicit 404 — prevents Vercel "Failed to collect page data for /_not-found"
 * Added: 2026-09-19 with maintenance mode
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#FCFAF4',
        color: '#16241A',
        colorScheme: 'light'
      }}
    >
      <p style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5C5646' }}>
        404
      </p>
      <h1 style={{ marginTop: '0.75rem', fontSize: '1.75rem', fontWeight: 500, fontFamily: 'Georgia, serif' }}>
        Page not found
      </h1>
      <p style={{ marginTop: '1rem', maxWidth: '24rem', color: '#5C5646' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '2rem',
          display: 'inline-flex',
          padding: '0.6rem 1.5rem',
          borderRadius: '9999px',
          backgroundColor: '#1F4D2B',
          color: '#FCFAF4',
          fontSize: '0.9rem',
          fontWeight: 600,
          textDecoration: 'none'
        }}
      >
        Back to home
      </Link>
      <p style={{ marginTop: '2.5rem', fontSize: '0.75rem', color: '#5C5646' }}>
        Bingo Vintage
      </p>
    </div>
  );
}
