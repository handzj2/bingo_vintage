'use client';

/**
 * Branded Bingo Vintage loader — use for page/section loading states.
 * Default text reads "Bingo Vintage".
 */

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: Size;
  className?: string;
  fullScreen?: boolean;
  /** Defaults to "Bingo Vintage" */
  text?: string | null;
  /** Hide label */
  silent?: boolean;
}

const sizeMap: Record<Size, string> = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
  xl: 'h-16 w-16 border-4',
};

export default function LoadingSpinner({
  size = 'md',
  className = '',
  fullScreen = false,
  text = 'Bingo Vintage',
  silent = false,
}: LoadingSpinnerProps) {
  const label = silent ? null : (text === undefined ? 'Bingo Vintage' : text);

  const spinner = (
    <div
      className={`animate-spin rounded-full border-bv-border border-t-bv-action ${sizeMap[size]} ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    />
  );

  const body = (
    <div className="flex flex-col items-center justify-center gap-3">
      {spinner}
      {label && (
        <p className="text-sm font-semibold tracking-wide text-bv-text">
          {label}
          <span className="text-bv-meta font-normal"> · loading</span>
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bv-surface/90 backdrop-blur-sm">
        {body}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-10">{body}</div>;
}

export function LoadingOverlay({ text = 'Bingo Vintage' }: { text?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bv-surface/70 backdrop-blur-[1px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent ${className}`}
      aria-hidden
    />
  );
}
