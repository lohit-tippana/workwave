import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Paged, User } from '../../types';
import { Avatar, EmptyState, Pagination, Spinner } from '../../components/ui';
import { Search } from 'lucide-react';

export default function AdminUsers() {
  const [data, setData] = useState<Paged<User> | null>(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/admin/users?page=${page}&q=${encodeURIComponent(q)}&role=${role}`)
      .then((r) => setData(r.data.data)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, [page, role]);

  const toggleSuspend = async (u: User) => {
    try { await api.post(`/admin/users/${u._id}/suspension`, { suspended: !u.isSuspended }); load(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">Users</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex flex-wrap gap-2">
        <form className="relative" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <select className="input w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option><option value="client">Clients</option><option value="freelancer">Freelancers</option>
        </select>
      </div>
      {loading ? <Spinner /> : !data || data.results.length === 0 ? <EmptyState title="No users found" /> : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((u) => (
                  <tr key={u._id}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar user={u} size="sm" /><div><p className="font-medium">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></div></div></td>
                    <td className="px-4 py-3 capitalize">{u.role}</td>
                    <td className="px-4 py-3">{u.rating?.toFixed(1) || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.createdAt!).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{u.isSuspended ? <span className="badge bg-red-100 text-red-700">Suspended</span> : <span className="badge bg-green-100 text-green-700">Active</span>}</td>
                    <td className="px-4 py-3">
                      <button className={`text-xs ${u.isSuspended ? 'btn-primary' : 'btn-danger'}`} onClick={() => toggleSuspend(u)}>
                        {u.isSuspended ? 'Activate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
