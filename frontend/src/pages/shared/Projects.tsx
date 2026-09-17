import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Paged, Project } from '../../types';
import { Avatar, EmptyState, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function Projects() {
  const { user } = useAuth();
  const [data, setData] = useState<Paged<Project> | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/projects?page=${page}&status=${status}`)
      .then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, [page, status]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All</option>
          {['ACTIVE', 'IN_REVIEW', 'REVISION_REQUESTED', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : !data || data.results.length === 0 ? (
        <EmptyState title="No projects yet" hint={user?.role === 'client' ? 'Accept a proposal to create a project.' : 'Projects appear here once a client hires you.'} />
      ) : (
        <>
          <div className="space-y-3">
            {data.results.map((p) => {
              const other = user?.role === 'client' ? p.freelancerId : p.clientId;
              const otherUser = typeof other === 'object' ? other : null;
              return (
                <Link key={p._id} to={`/${user?.role}/projects/${p._id}`} className="card flex items-center gap-4 transition-shadow hover:shadow-md">
                  <Avatar user={otherUser} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-slate-500">with {otherUser?.name} · ${p.budget}</p>
                    <div className="mt-2 h-1.5 w-40 rounded-full bg-slate-200">
                      <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={p.status} />
                    <p className="mt-1 text-xs text-slate-400">{p.progress}%</p>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
