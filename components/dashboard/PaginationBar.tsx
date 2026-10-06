'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  noun: string;
  nounPlural: string;
  onPageChange: (page: number) => void;
}

// "Showing 1–10 of 23" with First / Previous / Next / Last. Renders nothing for a single page.
export default function PaginationBar({ page, totalPages, total, pageSize, noun, nounPlural, onPageChange }: PaginationBarProps) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return (
    <div className="flex flex-col items-center gap-3 pt-1 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{start + 1}–{end}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span> {total === 1 ? noun : nounPlural}
      </p>
      <div className="flex items-center gap-1.5">
        <PageButton label="First page" disabled={page === 1} onClick={() => onPageChange(1)}><ChevronsLeft className="size-4" /></PageButton>
        <PageButton label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="size-4" /></PageButton>
        <span className="min-w-[88px] px-2 text-center text-xs font-semibold text-muted-foreground">
          Page <span className="text-foreground">{page}</span> of {totalPages}
        </span>
        <PageButton label="Next page" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight className="size-4" /></PageButton>
        <PageButton label="Last page" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}><ChevronsRight className="size-4" /></PageButton>
      </div>
    </div>
  );
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border transition-colors hover:bg-muted/50"
      style={{
        borderColor: disabled ? 'var(--border)' : '#c8985e',
        color: disabled ? 'var(--muted-foreground)' : '#c8985e',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      {children}
    </button>
  );
}
