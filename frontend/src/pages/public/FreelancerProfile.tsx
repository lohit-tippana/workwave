import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { Avatar, EmptyState, SkillChips, Spinner, Stars } from '../../components/ui';
import PublicNav from './PublicNav';
import { useAuth } from '../../context/AuthContext';
import { ExternalLink } from 'lucide-react';

export default function FreelancerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/users/freelancers/${id}`).then((r) => setData(r.data.data)).catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return <div className="min-h-screen"><PublicNav /><div className="p-10"><EmptyState title="Freelancer not found" /></div></div>;
  if (!data) return <div className="min-h-screen"><PublicNav /><Spinner /></div>;
  const { user: f, portfolio, reviews } = data;

  const content = (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1 h-fit">
          <div className="flex flex-col items-center text-center">
            <Avatar user={f} size="lg" />
            <h1 className="mt-3 text-xl font-bold">{f.name}</h1>
            <p className="text-sm text-slate-500">{f.headline}</p>
            <Stars rating={f.rating} count={f.reviewCount} />
            <p className="mt-2 text-xs capitalize text-slate-500">{f.availability} · {f.location || 'Remote'}</p>
            {f.hourlyRate && <p className="mt-2 text-lg font-semibold">${f.hourlyRate}/hr</p>}
          </div>
        </div>
        <div className="space-y-5 lg:col-span-2">
          {f.bio && <div className="card"><h3 className="mb-2 font-semibold">About</h3><p className="whitespace-pre-wrap text-sm text-slate-600">{f.bio}</p></div>}
          <div className="card">
            <h3 className="mb-2 font-semibold">Skills</h3>
            <SkillChips skills={f.skills} />
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-slate-500">Experience:</span> {f.yearsOfExperience || 0} years</p>
              <p><span className="text-slate-500">Languages:</span> {f.languages?.join(', ') || '—'}</p>
            </div>
          </div>
          {portfolio?.length > 0 && (
            <div className="card">
              <h3 className="mb-3 font-semibold">Portfolio</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {portfolio.map((p: any) => (
                  <div key={p._id} className="rounded-lg border border-slate-200 p-3">
                    {p.images?.[0] && <img src={p.images[0].url} alt={p.title} className="mb-2 h-28 w-full rounded-md object-cover" />}
                    <p className="font-medium">{p.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>
                    <div className="mt-2"><SkillChips skills={p.technologies?.slice(0, 4)} /></div>
                    {p.projectUrl && <a href={p.projectUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><ExternalLink className="h-3 w-3" /> View project</a>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {reviews?.length > 0 && (
            <div className="card">
              <h3 className="mb-3 font-semibold">Reviews</h3>
              <div className="space-y-3">
                {reviews.map((r: any) => (
                  <div key={r._id} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{r.reviewerId?.name}</p>
                      <Stars rating={r.rating} />
                    </div>
                    {r.text && <p className="mt-1 text-sm text-slate-600">{r.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return user ? content : <div className="min-h-screen bg-slate-50"><PublicNav />{content}</div>;
}
