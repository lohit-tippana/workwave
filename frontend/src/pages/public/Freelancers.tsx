import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Paged, User } from '../../types';
import { Avatar, EmptyState, Pagination, SkillChips, Spinner, Stars } from '../../components/ui';
import PublicNav from './PublicNav';
import { useAuth } from '../../context/AuthContext';
import { Search } from 'lucide-react';

export default function Freelancers() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Paged<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get('q') || '');

  useEffect(() => {
    setLoading(true);
    api.get(`/users/freelancers?${params.toString()}`)
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
      <div className="mb-5 flex flex-wrap gap-2">
        <form className="relative flex-1 min-w-[200px]" onSubmit={(e) => { e.preventDefault(); setParam('q', q); }}>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, headline or skill…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search freelancers" />
        </form>
        <input className="input w-32" placeholder="Skill" value={params.get('skill') || ''} onChange={(e) => setParam('skill', e.target.value)} aria-label="Filter by skill" />
        <select className="input w-auto" value={params.get('availability') || ''} onChange={(e) => setParam('availability', e.target.value)} aria-label="Availability">
          <option value="">Any availability</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
        </select>
        <select className="input w-auto" value={params.get('minRating') || ''} onChange={(e) => setParam('minRating', e.target.value)} aria-label="Minimum rating">
          <option value="">Any rating</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
      </div>
      {loading ? <Spinner /> : !data || data.results.length === 0 ? (
        <EmptyState title="No freelancers found" hint="Try a different skill or keyword." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((f) => (
              <Link key={f._id} to={`/freelancers/${f._id}`} className="card block transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <Avatar user={f} size="lg" />
                  <div>
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-sm text-slate-500 line-clamp-1">{f.headline || 'Freelancer'}</p>
                    <Stars rating={f.rating} count={f.reviewCount} />
                  </div>
                </div>
                <div className="mt-3"><SkillChips skills={f.skills?.slice(0, 5)} /></div>
                <div className="mt-3 flex justify-between text-xs text-slate-500">
                  <span>{f.yearsOfExperience || 0} yrs experience</span>
                  {f.hourlyRate ? <span>${f.hourlyRate}/hr</span> : <span>{f.location || ''}</span>}
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={(p) => setParam('page', String(p))} />
        </>
      )}
    </>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNav />
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-5 text-2xl font-bold">Find freelancers</h1>
          {content}
        </div>
      </div>
    );
  }
  return <div><h1 className="mb-5 text-2xl font-bold">Find freelancers</h1>{content}</div>;
}
