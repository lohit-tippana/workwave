import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Paged, Proposal } from '../../types';
import { EmptyState, ErrorBox, Modal, Pagination, Spinner, StatusBadge } from '../../components/ui';

export default function MyProposals() {
  const [data, setData] = useState<Paged<Proposal> | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [editForm, setEditForm] = useState({ coverLetter: '', proposedAmount: '', estimatedDays: '' });

  const load = () => {
    setLoading(true);
    api.get(`/proposals/mine?page=${page}&status=${status}`)
      .then((r) => setData(r.data.data)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, [page, status]);

  const withdraw = async (id: string) => {
    if (!confirm('Withdraw this proposal?')) return;
    try { await api.post(`/proposals/${id}/withdraw`); load(); } catch (e: any) { setError(e.message); }
  };

  const openEdit = (p: Proposal) => {
    setEditing(p);
    setEditForm({ coverLetter: p.coverLetter, proposedAmount: String(p.proposedAmount), estimatedDays: String(p.estimatedDays) });
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/proposals/${editing!._id}`, { ...editForm, proposedAmount: Number(editForm.proposedAmount), estimatedDays: Number(editForm.estimatedDays) });
      setEditing(null); load();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My proposals</h1>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All</option>
          {['PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <ErrorBox message={error} />
      {loading ? <Spinner /> : !data || data.results.length === 0 ? (
        <EmptyState title="No proposals yet" hint="Browse jobs and submit your first proposal." action={<Link to="/freelancer/jobs" className="btn-primary">Find jobs</Link>} />
      ) : (
        <>
          <div className="space-y-3">
            {data.results.map((p) => {
              const job = typeof p.jobId === 'object' ? p.jobId : null;
              return (
                <div key={p._id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link to={`/proposals/${p._id}`} className="font-semibold hover:text-brand-700">{job?.title || 'Job'}</Link>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.coverLetter}</p>
                      <p className="mt-2 text-xs text-slate-500">Bid ${p.proposedAmount} · {p.estimatedDays} days · {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <Link to={`/proposals/${p._id}`} className="btn-secondary text-xs">View</Link>
                      {['PENDING', 'SHORTLISTED'].includes(p.status) && (
                        <>
                          <button className="btn-secondary text-xs" onClick={() => openEdit(p)}>Edit</button>
                          <button className="btn-ghost text-xs text-red-500" onClick={() => withdraw(p._id)}>Withdraw</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit proposal">
        <form onSubmit={saveEdit} className="space-y-4">
          <div><label className="label">Cover letter</label><textarea className="input min-h-32" required minLength={30} value={editForm.coverLetter} onChange={(e) => setEditForm({ ...editForm, coverLetter: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Amount ($)</label><input type="number" min={1} className="input" required value={editForm.proposedAmount} onChange={(e) => setEditForm({ ...editForm, proposedAmount: e.target.value })} /></div>
            <div><label className="label">Days</label><input type="number" min={1} className="input" required value={editForm.estimatedDays} onChange={(e) => setEditForm({ ...editForm, estimatedDays: e.target.value })} /></div>
          </div>
          <button className="btn-primary w-full">Save changes</button>
        </form>
      </Modal>
    </div>
  );
}
