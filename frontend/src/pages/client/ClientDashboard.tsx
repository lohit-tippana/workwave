import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Spinner, StatusBadge } from '../../components/ui';
import { Briefcase, FileText, FolderKanban, CheckCircle2, Wallet, Plus } from 'lucide-react';

export function StatCard({ icon: Icon, label, value, to }: { icon: any; label: string; value: string | number; to?: string }) {
  const inner = (
    <div className="card flex items-center gap-4">
      <div className="rounded-lg bg-brand-50 p-3"><Icon className="h-5 w-5 text-brand-600" /></div>
      <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-slate-500">{label}</p></div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function ClientDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/dashboard/client').then((r) => setData(r.data.data)).catch((e) => setError(e.message));
  }, []);
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <Spinner />;
  const s = data.stats;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client dashboard</h1>
        <Link to="/client/jobs/create" className="btn-primary"><Plus className="h-4 w-4" /> Post a job</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Briefcase} label="Open jobs" value={s.openJobs} to="/client/jobs" />
        <StatCard icon={FileText} label="New proposals" value={s.proposalsReceived} />
        <StatCard icon={FolderKanban} label="Active projects" value={s.activeProjects} to="/client/projects" />
        <StatCard icon={CheckCircle2} label="Completed" value={s.completedProjects} />
        <StatCard icon={Wallet} label="Total spent" value={`$${s.totalSpent.toFixed(2)}`} to="/client/payments" />
        <StatCard icon={Wallet} label="Pending payments" value={s.pendingPayments} to="/client/payments" />
      </div>
      <div className="card mt-6">
        <h2 className="mb-3 font-semibold">Recent jobs</h2>
        {data.recentJobs.length === 0 ? (
          <p className="text-sm text-slate-500">No jobs yet — <Link to="/client/jobs/create" className="text-brand-600 hover:underline">post your first job</Link>.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recentJobs.map((j: any) => (
              <Link key={j._id} to={`/client/jobs/${j._id}/proposals`} className="flex items-center justify-between py-3 hover:bg-slate-50">
                <div><p className="text-sm font-medium">{j.title}</p><p className="text-xs text-slate-500">{j.proposalCount} proposals</p></div>
                <StatusBadge status={j.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
