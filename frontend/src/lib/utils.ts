import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — Tailwind class merger.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 * Used by all shadcn/ui components: Button, Badge, Card, Table, etc.
 *
 * FIX: lib/utils.ts previously only exported `safeDate` and had no `cn`.
 * Every file in src/components/ui/* imports { cn } from '@/lib/utils',
 * causing build errors for ALL ui components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Safely format a date value for display — returns '-' for null/invalid. */
export const safeDate = (date: any): string => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
  } catch {
    return '-';
  }
};
