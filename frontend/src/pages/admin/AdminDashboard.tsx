import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Spinner, StatusBadge } from '../../components/ui';
import { StatCard } from '../client/ClientDashboard';
import { Users, Briefcase, FolderKanban, CreditCard, Flag, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/admin/stats').then((r) => setData(r.data.data)); }, []);
  if (!data) return <Spinner />;
  const t = data.totals;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={t.users} to="/admin/users" />
        <StatCard icon={Users} label="Clients / Freelancers" value={`${t.clients} / ${t.freelancers}`} />
        <StatCard icon={Briefcase} label="Jobs (open)" value={`${t.jobs} (${t.activeJobs})`} to="/admin/jobs" />
        <StatCard icon={FolderKanban} label="Projects (done)" value={`${t.projects} (${t.completedProjects})`} />
        <StatCard icon={FileText} label="Proposals" value={t.proposals} />
        <StatCard icon={CreditCard} label="Transactions" value={t.successfulPayments} to="/admin/payments" />
        <StatCard icon={CreditCard} label="Volume (INR)" value={`₹${(t.transactionVolume / 100).toFixed(2)}`} />
        <StatCard icon={Flag} label="Open reports" value={t.openReports} to="/admin/reports" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Recent users</h2>
          <div className="divide-y divide-slate-100">
            {data.recentUsers.map((u: any) => (
              <div key={u._id} className="flex justify-between py-2 text-sm">
                <span>{u.name} <span className="text-slate-400">({u.email})</span></span>
                <span className="capitalize text-slate-500">{u.role}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Recent jobs</h2>
          <div className="divide-y divide-slate-100">
            {data.recentJobs.map((j: any) => (
              <div key={j._id} className="flex items-center justify-between py-2 text-sm">
                <span>{j.title}</span><StatusBadge status={j.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
