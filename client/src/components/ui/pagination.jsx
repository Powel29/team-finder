import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button.jsx';

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3">
      <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm font-medium text-slate-600" aria-current="page">
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}
