import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Job, Paged } from '../../types';
import { EmptyState, Pagination, SkillChips, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import PublicNav from './PublicNav';
import { Search } from 'lucide-react';

export function JobCard({ job, linkPrefix = '/jobs' }: { job: Job; linkPrefix?: string }) {
  const client = typeof job.clientId === 'object' ? job.clientId : null;
  return (
    <Link to={`${linkPrefix}/${job._id}`} className="card block transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{job.title}</h3>
        <StatusBadge status={job.status} />
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{job.description}</p>
      <div className="mt-3"><SkillChips skills={job.requiredSkills?.slice(0, 6)} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="font-medium text-slate-700">${job.budget}{job.budgetType === 'hourly' ? '/hr' : ' fixed'}</span>
        <span className="capitalize">{job.experienceLevel}</span>
        <span>{job.category}</span>
        {job.deadline && <span>Due {new Date(job.deadline).toLocaleDateString()}</span>}
        {client && <span>by {client.name}</span>}
        <span>{job.proposalCount ?? 0} proposals</span>
      </div>
    </Link>
  );
}

export default function BrowseJobs({ freelancerView = false }: { freelancerView?: boolean }) {
  const { user } = useAuth();
  const isFreelancer = freelancerView || user?.role === 'freelancer';
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Paged<Job> | null>(null);
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get('q') || '');

  const page = Number(params.get('page') || 1);

  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data.data.results)).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/jobs?${params.toString()}`)
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [params]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    next.set('page', '1');
    setParams(next);
  };

  const content = (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <form className="relative flex-1 min-w-[200px]" onSubmit={(e) => { e.preventDefault(); setParam('q', q); }}>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search jobs by title, skills, description…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search jobs" />
        </form>
        <select className="input w-auto" value={params.get('category') || ''} onChange={(e) => setParam('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select className="input w-auto" value={params.get('experienceLevel') || ''} onChange={(e) => setParam('experienceLevel', e.target.value)} aria-label="Experience level">
          <option value="">Any experience</option>
          <option value="entry">Entry</option>
          <option value="intermediate">Intermediate</option>
          <option value="expert">Expert</option>
        </select>
        <select className="input w-auto" value={params.get('budgetType') || ''} onChange={(e) => setParam('budgetType', e.target.value)} aria-label="Budget type">
          <option value="">Fixed & hourly</option>
          <option value="fixed">Fixed</option>
          <option value="hourly">Hourly</option>
        </select>
        <select className="input w-auto" value={params.get('sort') || 'newest'} onChange={(e) => setParam('sort', e.target.value)} aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="budget_high">Highest budget</option>
          <option value="budget_low">Lowest budget</option>
          <option value="deadline">Deadline</option>
        </select>
      </div>
      {loading ? <Spinner label="Finding jobs…" /> : !data || data.results.length === 0 ? (
        <EmptyState title="No jobs found" hint="Try different keywords or filters." />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{data.total} job{data.total === 1 ? '' : 's'} found</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.results.map((j) => <JobCard key={j._id} job={j} linkPrefix={isFreelancer ? '/freelancer/jobs' : '/jobs'} />)}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={(p) => setParam('page', String(p))} />
        </>
      )}
    </>
  );

  if (!user || !isFreelancer) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNav />
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-5 text-2xl font-bold">Browse jobs</h1>
          {content}
        </div>
      </div>
    );
  }
  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">Find work</h1>
      {content}
    </div>
  );
}
