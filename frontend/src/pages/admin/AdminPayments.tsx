import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Paged, Payment } from '../../types';
import { EmptyState, Pagination, Spinner, StatusBadge } from '../../components/ui';

export default function AdminPayments() {
  const [data, setData] = useState<Paged<Payment> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/payments?page=${page}`).then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">Transactions</h1>
      {loading ? <Spinner /> : !data || data.results.length === 0 ? <EmptyState title="No transactions" /> : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Freelancer</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((p: any) => (
                  <tr key={p._id}>
                    <td className="px-4 py-3">{p.projectId?.title || '—'}</td>
                    <td className="px-4 py-3">{p.clientId?.name}</td>
                    <td className="px-4 py-3">{p.freelancerId?.name}</td>
                    <td className="px-4 py-3 font-medium">{p.currency} {(p.amount / 100).toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(p.createdAt).toLocaleString()}</td>
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
