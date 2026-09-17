import { ReactNode } from 'react';
import { Loader2, Inbox, X } from 'lucide-react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label || 'Loading…'}</span>
    </div>
  );
}

export function PageSpinner() {
  return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center">
      <Inbox className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', OPEN: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-slate-200 text-slate-600', PENDING: 'bg-amber-100 text-amber-800',
  SHORTLISTED: 'bg-violet-100 text-violet-800', REJECTED: 'bg-red-100 text-red-700',
  ACCEPTED: 'bg-green-100 text-green-800', WITHDRAWN: 'bg-slate-100 text-slate-500',
  ACTIVE: 'bg-blue-100 text-blue-800', IN_REVIEW: 'bg-amber-100 text-amber-800',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800', CANCELLED: 'bg-red-100 text-red-700',
  SUBMITTED: 'bg-indigo-100 text-indigo-800', APPROVED: 'bg-green-100 text-green-800',
  CREATED: 'bg-amber-100 text-amber-800', SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-700', VERIFICATION_FAILED: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-green-100 text-green-800', DISMISSED: 'bg-slate-100 text-slate-600',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
};

export function StatusBadge({ status }: { status?: string }) {
  const s = status || 'PENDING';
  return <span className={`badge ${STATUS_STYLES[s] || 'bg-slate-100 text-slate-600'}`}>{s.replace(/_/g, ' ')}</span>;
}

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Pagination">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
      <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
      <button className="btn-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100" aria-label="Close dialog"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message?: string | null }) {
  if (!message) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{message}</div>;
}

export function SkillChips({ skills, variant = 'default' }: { skills?: string[]; variant?: 'default' | 'matched' | 'missing' }) {
  if (!skills?.length) return null;
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    matched: 'bg-green-100 text-green-800',
    missing: 'bg-red-50 text-red-700 border border-red-200',
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s) => <span key={s} className={`badge ${styles[variant]}`}>{s}</span>)}
    </div>
  );
}

export function Avatar({ user, size = 'md' }: { user?: { name?: string; profileImage?: { url: string } } | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-20 w-20 text-xl' }[size];
  const url = user?.profileImage?.url;
  const src = url?.startsWith('/uploads') ? url : url;
  if (src) return <img src={src} alt={user?.name || 'avatar'} className={`${dims} rounded-full object-cover`} />;
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <div className={`${dims} flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700`}>{initials}</div>;
}

export function Stars({ rating, count }: { rating?: number; count?: number }) {
  const r = rating || 0;
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`${r} out of 5 stars`}>
      <span className="text-amber-500">{'★'.repeat(Math.round(r))}{'☆'.repeat(5 - Math.round(r))}</span>
      <span className="text-slate-500">{r.toFixed(1)}{count !== undefined ? ` (${count})` : ''}</span>
    </span>
  );
}
