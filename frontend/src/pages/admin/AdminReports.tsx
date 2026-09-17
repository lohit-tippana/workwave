import { useEffect, useState } from 'react';
import api from '../../services/api';
import { EmptyState, Pagination, Spinner, StatusBadge } from '../../components/ui';

export default function AdminReports() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/admin/reports?page=${page}&status=${status}`)
      .then((r) => setData(r.data.data)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, [page, status]);

  const resolve = async (id: string, s: string) => {
    const note = s === 'RESOLVED' ? prompt('Resolution note (optional)') || '' : '';
    try { await api.post(`/admin/reports/${id}/resolve`, { status: s, resolutionNote: note }); load(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option>
          {['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <Spinner /> : !data || data.results.length === 0 ? <EmptyState title="No reports" /> : (
        <>
          <div className="space-y-3">
            {data.results.map((r: any) => (
              <div key={r._id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{r.reason}</p>
                    <p className="text-xs text-slate-500">
                      {r.targetType} · reported by {r.reporterId?.name} · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
                    {r.resolutionNote && <p className="mt-1 text-xs text-slate-400">Resolution: {r.resolutionNote}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === 'OPEN' && <button className="btn-secondary text-xs" onClick={() => resolve(r._id, 'UNDER_REVIEW')}>Review</button>}
                    {['OPEN', 'UNDER_REVIEW'].includes(r.status) && (
                      <>
                        <button className="btn-primary text-xs" onClick={() => resolve(r._id, 'RESOLVED')}>Resolve</button>
                        <button className="btn-ghost text-xs" onClick={() => resolve(r._id, 'DISMISSED')}>Dismiss</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
