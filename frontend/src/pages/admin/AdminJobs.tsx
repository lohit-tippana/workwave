import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Job, Paged } from '../../types';
import { EmptyState, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { Search } from 'lucide-react';

export default function AdminJobs() {
  const [data, setData] = useState<Paged<Job> | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/admin/jobs?page=${page}&q=${encodeURIComponent(q)}&status=${status}`)
      .then((r) => setData(r.data.data)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, [page, status]);

  const toggleRemoved = async (j: any) => {
    try { await api.post(`/admin/jobs/${j._id}/moderation`, { removed: !j.isRemoved }); load(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">Jobs moderation</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex flex-wrap gap-2">
        <form className="relative" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search jobs" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : !data || data.results.length === 0 ? <EmptyState title="No jobs" /> : (
        <>
          <div className="space-y-3">
            {data.results.map((j: any) => (
              <div key={j._id} className="card flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{j.title} {j.isRemoved && <span className="badge bg-red-100 text-red-700">REMOVED</span>}</p>
                  <p className="text-xs text-slate-500">{j.category} · ${j.budget} · by {j.clientId?.name}</p>
                </div>
                <StatusBadge status={j.status} />
                <button className={`text-xs ${j.isRemoved ? 'btn-primary' : 'btn-danger'}`} onClick={() => toggleRemoved(j)}>
                  {j.isRemoved ? 'Restore' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
