import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Proposal } from '../../types';
import { Avatar, EmptyState, ErrorBox, SkillChips, Spinner, Stars, StatusBadge } from '../../components/ui';
import { MessageSquare, Check, X, ListFilter, Sparkles } from 'lucide-react';

export default function JobProposals() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ results: Proposal[]; job: any } | null>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/proposals/job/${id}${filter ? `?status=${filter}` : ''}`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id, filter]);

  const act = async (pid: string, action: 'shortlist' | 'reject') => {
    setBusyId(pid); setError('');
    try { await api.post(`/proposals/${pid}/status`, { action }); load(); }
    catch (e: any) { setError(e.message); }
    finally { setBusyId(''); }
  };

  const accept = async (pid: string) => {
    if (!confirm('Accept this proposal? A project will be created and other proposals rejected.')) return;
    setBusyId(pid); setError('');
    try {
      const r = await api.post(`/proposals/${pid}/accept`);
      navigate(`/client/projects/${r.data.data.project._id}`);
    } catch (e: any) { setError(e.message); }
    finally { setBusyId(''); }
  };

  const message = async (freelancerId: string) => {
    setBusyId(freelancerId); setError('');
    try {
      const r = await api.post('/messages/conversations', { otherUserId: freelancerId });
      navigate('/client/messages', { state: { conversationId: r.data.data.conversation._id } });
    } catch (e: any) { setError(e.message); }
    finally { setBusyId(''); }
  };

  if (loading) return <Spinner />;
  if (!data) {
    return error
      ? <EmptyState title="Couldn't load proposals" hint={error} action={<button className="btn-primary" onClick={load}>Try again</button>} />
      : <EmptyState title="Job not found" />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="text-sm text-slate-500">for <Link className="text-brand-600 hover:underline" to={`/client/jobs/${id}`}>{data.job.title}</Link></p>
        </div>
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-slate-400" />
          <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter proposals">
            <option value="">All</option>
            {['PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <ErrorBox message={error} />
      {data.results.length === 0 ? (
        <EmptyState title="No proposals yet" hint="Freelancers will appear here once they submit proposals." />
      ) : (
        <div className="space-y-4">
          {data.results.map((p) => {
            const f = typeof p.freelancerId === 'object' ? p.freelancerId : null;
            return (
              <div key={p._id} className="card">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar user={f} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/freelancers/${f?._id}`} className="font-semibold hover:text-brand-700">{f?.name}</Link>
                      <Stars rating={f?.rating} count={f?.reviewCount} />
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-sm text-slate-500">{f?.headline}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{p.coverLetter}</p>
                    <div className="mt-3"><SkillChips skills={f?.skills?.slice(0, 6)} /></div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Bid: <b className="text-slate-800">${p.proposedAmount}</b></span>
                      <span>Delivery: {p.estimatedDays} days</span>
                      <span>{f?.yearsOfExperience} yrs experience</span>
                      {f?.hourlyRate && <span>${f.hourlyRate}/hr</span>}
                    </div>
                    {p.aiMatch && (
                      <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs">
                        <p className="flex items-center gap-1 font-semibold text-brand-800"><Sparkles className="h-3.5 w-3.5" /> AI match: {p.aiMatch.matchScore}/100</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.aiMatch.matchedSkills?.map((s: string) => <span key={s} className="badge bg-green-100 text-green-800">{s}</span>)}
                          {p.aiMatch.missingSkills?.map((s: string) => <span key={s} className="badge bg-red-50 text-red-600">{s} (missing)</span>)}
                        </div>
                        <p className="mt-1 italic text-slate-500">{p.aiMatch.disclaimer}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {['PENDING', 'SHORTLISTED'].includes(p.status) && data.job.status === 'OPEN' && (
                      <>
                        <button className="btn-primary text-xs" disabled={busyId === p._id} onClick={() => accept(p._id)}><Check className="h-3.5 w-3.5" /> Hire</button>
                        {p.status === 'PENDING' && <button className="btn-secondary text-xs" disabled={busyId === p._id} onClick={() => act(p._id, 'shortlist')}>Shortlist</button>}
                        <button className="btn-danger text-xs" disabled={busyId === p._id} onClick={() => act(p._id, 'reject')}><X className="h-3.5 w-3.5" /> Reject</button>
                      </>
                    )}
                    {['SHORTLISTED', 'ACCEPTED'].includes(p.status) && (
                      <button className="btn-secondary text-xs" disabled={busyId === f?._id} onClick={() => message(f!._id)}><MessageSquare className="h-3.5 w-3.5" /> Message</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
