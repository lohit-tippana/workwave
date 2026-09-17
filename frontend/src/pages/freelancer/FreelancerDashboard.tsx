import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Spinner, EmptyState, SkillChips } from '../../components/ui';
import { StatCard } from '../client/ClientDashboard';
import { FileText, FolderKanban, CheckCircle2, Wallet, Sparkles, Clock } from 'lucide-react';
import type { Job } from '../../types';

export default function FreelancerDashboard() {
  const [data, setData] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/freelancer').then((r) => setData(r.data.data)).catch((e) => setError(e.message));
    api.get('/ai/recommendations').then((r) => setRecs(r.data.data.results)).catch(() => setRecs([]));
  }, []);

  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <Spinner />;
  const s = data.stats;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Freelancer dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={FileText} label="Active proposals" value={s.activeProposals} to="/freelancer/proposals" />
        <StatCard icon={FolderKanban} label="Active projects" value={s.activeProjects} to="/freelancer/projects" />
        <StatCard icon={CheckCircle2} label="Completed" value={s.completedProjects} />
        <StatCard icon={Wallet} label="Earned" value={`$${s.totalEarned.toFixed(2)}`} />
        <StatCard icon={Sparkles} label="Resume score" value={s.resumeScore !== null ? `${s.resumeScore}/100` : '—'} to="/freelancer/resume" />
        <StatCard icon={Clock} label="Profile" value={`${s.profileCompletion}%`} to="/freelancer/profile" />
      </div>

      {s.profileCompletion < 100 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your profile is {s.profileCompletion}% complete.{' '}
          <Link to="/freelancer/profile" className="font-medium underline">Complete it</Link> to improve AI matches.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-brand-600" /> Recommended jobs for you</h2>
          {recs.length === 0 ? (
            <EmptyState title="No recommended jobs yet" hint="Add skills to your profile or upload a resume to get recommendations." />
          ) : (
            <div className="space-y-3">
              {recs.slice(0, 5).map((r: any) => {
                const j = r.job as Job;
                return (
                  <Link key={j._id} to={`/freelancer/jobs/${j._id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-brand-300">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-medium">{j.title}</p>
                      <span className="badge bg-brand-100 text-brand-800">{r.score}% match</span>
                    </div>
                    <p className="mt-1 text-xs italic text-slate-500">{r.reason}</p>
                    <div className="mt-2"><SkillChips skills={r.matchedSkills?.slice(0, 4)} variant="matched" /></div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Upcoming deadlines</h2>
          {data.upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming project deadlines.</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingDeadlines.map((p: any) => (
                <Link key={p._id} to={`/freelancer/projects/${p._id}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <p className="text-sm font-medium">{p.title}</p>
                  <span className="text-xs text-slate-500">{new Date(p.deadline).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
