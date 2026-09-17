import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Paged, Payment } from '../../types';
import { EmptyState, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Payments() {
  const { user } = useAuth();
  const [data, setData] = useState<Paged<Payment> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => { api.get('/payments/config').then((r) => setEnabled(r.data.data.enabled)).catch(() => setEnabled(false)); }, []);
  useEffect(() => {
    setLoading(true);
    api.get(`/payments?page=${page}`).then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">Payments</h1>
      {enabled === false && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Razorpay is not configured on this deployment. Set <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> to enable live checkout.
        </div>
      )}
      {loading ? <Spinner /> : !data || data.results.length === 0 ? (
        <EmptyState title="No transactions yet" hint={user?.role === 'client' ? 'Payments you make on projects will appear here.' : 'Payments you receive will appear here.'} />
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Order ID</th><th className="px-4 py-3">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((p) => (
                  <tr key={p._id}>
                    <td className="px-4 py-3">{typeof p.projectId === 'object' ? <Link className="text-brand-600 hover:underline" to={`/${user?.role}/projects/${p.projectId._id}`}>{p.projectId.title}</Link> : '—'}</td>
                    <td className="px-4 py-3 font-medium">{p.currency} {(p.amount / 100).toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.razorpayOrderId}</td>
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
