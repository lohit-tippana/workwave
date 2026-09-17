import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Job, Paged } from '../../types';
import { EmptyState, ErrorBox, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { Plus, Trash2 } from 'lucide-react';

export default function ClientJobs() {
  const [data, setData] = useState<Paged<Job> | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/jobs/mine?page=${page}&status=${status}`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, status]);

  const act = async (id: string, action: string) => {
    try { await api.post(`/jobs/${id}/status`, { action }); load(); }
    catch (e: any) { setError(e.message); }
  };
  const del = async (id: string) => {
    if (!confirm('Delete this job permanently?')) return;
    try { await api.delete(`/jobs/${id}`); load(); } catch (e: any) { setError(e.message); }
  };

  const actions = (j: Job) => {
    switch (j.status) {
      case 'DRAFT': return <button className="btn-primary text-xs" onClick={() => act(j._id, 'publish')}>Publish</button>;
      case 'OPEN': return <>
        <button className="btn-secondary text-xs" onClick={() => act(j._id, 'unpublish')}>Unpublish</button>
        <button className="btn-secondary text-xs" onClick={() => act(j._id, 'close')}>Close</button>
      </>;
      case 'CLOSED': return <button className="btn-primary text-xs" onClick={() => act(j._id, 'publish')}>Re-open</button>;
      default: return null;
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My jobs</h1>
        <Link to="/client/jobs/create" className="btn-primary"><Plus className="h-4 w-4" /> Post a job</Link>
      </div>
      <ErrorBox message={error} />
      <div className="mb-4">
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : !data || data.results.length === 0 ? (
        <EmptyState title="No jobs yet" hint="Post a job to start receiving proposals." action={<Link to="/client/jobs/create" className="btn-primary">Post a job</Link>} />
      ) : (
        <>
          <div className="space-y-3">
            {data.results.map((j) => (
              <div key={j._id} className="card flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <Link to={`/client/jobs/${j._id}`} className="font-semibold hover:text-brand-700">{j.title}</Link>
                  <p className="mt-0.5 text-xs text-slate-500">{j.category} · ${j.budget} {j.budgetType} · {j.proposalCount} proposals</p>
                </div>
                <StatusBadge status={j.status} />
                <div className="flex gap-2">
                  <Link to={`/client/jobs/${j._id}/proposals`} className="btn-secondary text-xs">Proposals</Link>
                  {!['COMPLETED', 'IN_PROGRESS'].includes(j.status) && <Link to={`/client/jobs/${j._id}/edit`} className="btn-secondary text-xs">Edit</Link>}
                  {actions(j)}
                  {j.status !== 'IN_PROGRESS' && <button className="btn-ghost text-xs text-red-500" onClick={() => del(j._id)} aria-label="Delete job"><Trash2 className="h-4 w-4" /></button>}
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
