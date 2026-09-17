import { useEffect, useState, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Job, MatchResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, ErrorBox, Modal, SkillChips, Spinner, StatusBadge, Avatar } from '../../components/ui';
import { Bookmark, Sparkles, Send, Flag, Pencil } from 'lucide-react';
import PublicNav from './PublicNav';

function MatchPanel({ match, provider }: { match: MatchResult; provider: string }) {
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-brand-900"><Sparkles className="h-4 w-4" /> AI Match Analysis</h3>
        <span className="text-2xl font-bold text-brand-700">{match.matchScore}/100</span>
      </div>
      <div className="mt-3 space-y-3 text-sm">
        <div><p className="mb-1 font-medium text-green-800">Matched skills ({match.matchedSkills?.length || 0})</p><SkillChips skills={match.matchedSkills} variant="matched" /></div>
        <div><p className="mb-1 font-medium text-red-700">Missing skills</p>{match.missingSkills?.length ? <SkillChips skills={match.missingSkills} variant="missing" /> : <p className="text-slate-500">None identified</p>}</div>
        {match.explanation && <p className="text-slate-700">{match.explanation}</p>}
        <p className="text-xs italic text-slate-500">{match.disclaimer || 'AI-generated compatibility estimate for decision support only.'}{provider === 'fallback' ? ' (local heuristic analyzer)' : ''}</p>
      </div>
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [match, setMatch] = useState<{ match: MatchResult; provider: string } | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState('');

  // proposal state
  const [proposal, setProposal] = useState({ coverLetter: '', proposedAmount: '', estimatedDays: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({ reason: '', description: '' });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get(`/jobs/${id}`)
      .then((r) => { setJob(r.data.data.job); setBookmarked(r.data.data.bookmarked); })
      .catch(() => setNotFound(true));
  }, [id]);

  const isOwner = user?.role === 'client' && job && (typeof job.clientId === 'object' ? job.clientId._id === user._id : job.clientId === user._id);

  const runMatch = async () => {
    setMatchLoading(true); setError('');
    try { setMatch((await api.get(`/ai/match/${id}`)).data.data); }
    catch (e: any) { setError(e.message); }
    finally { setMatchLoading(false); }
  };

  const draftProposal = async () => {
    setDraftLoading(true); setError('');
    try {
      const r = await api.post('/ai/proposal-draft', { jobId: id });
      setProposal((p) => ({ ...p, coverLetter: r.data.data.draft.coverLetter }));
      setNotice('AI draft inserted — review and personalize before submitting.');
    } catch (e: any) { setError(e.message); }
    finally { setDraftLoading(false); }
  };

  const submitProposal = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await api.post('/proposals', { jobId: id, coverLetter: proposal.coverLetter, proposedAmount: Number(proposal.proposedAmount), estimatedDays: Number(proposal.estimatedDays) });
      setSubmitted(true);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const toggleBookmark = async () => {
    try { setBookmarked((await api.post(`/bookmarks/${id}`)).data.data.bookmarked); } catch (e: any) { setError(e.message); }
  };

  const submitReport = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/reports', { targetType: 'job', targetId: id, ...report });
      setReportOpen(false); setNotice('Report submitted. Thank you.');
    } catch (e: any) { setError(e.message); }
  };

  if (notFound) return <div className="min-h-screen"><PublicNav /><div className="p-10"><EmptyState title="Job not found" /></div></div>;
  if (!job) return <div className="min-h-screen"><PublicNav /><Spinner /></div>;

  const client = typeof job.clientId === 'object' ? job.clientId : null;
  const canPropose = user?.role === 'freelancer' && job.status === 'OPEN' && !isOwner;

  const body = (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ErrorBox message={error} />
      {notice && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <p className="mt-1 text-sm text-slate-500">{job.category} · posted {new Date(job.createdAt).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{job.description}</p>
            <div className="mt-4"><SkillChips skills={job.requiredSkills} /></div>
            {job.attachments?.length ? (
              <div className="mt-4">
                <p className="mb-1 text-sm font-medium">Attachments</p>
                {job.attachments.map((a, i) => <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block text-sm text-brand-600 hover:underline">{a.name || a.url}</a>)}
              </div>
            ) : null}
          </div>

          {job.aiAnalysis && (
            <div className="card">
              <h3 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-brand-600" /> AI Job Analysis</h3>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><p className="font-medium">Required skills</p><SkillChips skills={job.aiAnalysis.requiredSkills} /></div>
                <div><p className="font-medium">Complexity</p><p className="capitalize text-slate-600">{job.aiAnalysis.estimatedComplexity}</p></div>
              </div>
              {job.aiAnalysis.label && <p className="mt-2 text-xs italic text-slate-500">{job.aiAnalysis.label}</p>}
            </div>
          )}

          {canPropose && !submitted && (
            <div className="card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Submit a proposal</h3>
                <button type="button" className="btn-secondary text-xs" onClick={draftProposal} disabled={draftLoading}>
                  <Sparkles className="h-3.5 w-3.5" /> {draftLoading ? 'Drafting…' : 'AI draft assistant'}
                </button>
              </div>
              <form onSubmit={submitProposal} className="mt-4 space-y-4">
                <div>
                  <label className="label" htmlFor="cover">Cover letter</label>
                  <textarea id="cover" className="input min-h-32" required minLength={30} value={proposal.coverLetter}
                    onChange={(e) => setProposal({ ...proposal, coverLetter: e.target.value })}
                    placeholder="Introduce yourself and explain your approach (min 30 characters)…" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="amount">Proposed amount ($)</label>
                    <input id="amount" type="number" min={1} className="input" required value={proposal.proposedAmount} onChange={(e) => setProposal({ ...proposal, proposedAmount: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="days">Delivery time (days)</label>
                    <input id="days" type="number" min={1} className="input" required value={proposal.estimatedDays} onChange={(e) => setProposal({ ...proposal, estimatedDays: e.target.value })} />
                  </div>
                </div>
                <button className="btn-primary" disabled={submitting}><Send className="h-4 w-4" /> {submitting ? 'Submitting…' : 'Submit proposal'}</button>
              </form>
            </div>
          )}
          {submitted && <div className="card border-green-200 bg-green-50 text-sm text-green-800">Proposal submitted! The client will review it shortly. <Link className="font-medium underline" to="/freelancer/proposals">View my proposals</Link></div>}
        </div>

        <div className="space-y-5">
          <div className="card">
            <p className="text-2xl font-bold">${job.budget}<span className="text-sm font-normal text-slate-500">{job.budgetType === 'hourly' ? '/hr' : ' fixed'}</span></p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Experience</dt><dd className="capitalize">{job.experienceLevel}</dd></div>
              {job.deadline && <div className="flex justify-between"><dt className="text-slate-500">Deadline</dt><dd>{new Date(job.deadline).toLocaleDateString()}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Proposals</dt><dd>{job.proposalCount}</dd></div>
            </dl>
            {user?.role === 'freelancer' && (
              <button onClick={toggleBookmark} className="btn-secondary mt-4 w-full"><Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-brand-600 text-brand-600' : ''}`} />{bookmarked ? 'Saved' : 'Save job'}</button>
            )}
            {isOwner && (
              <div className="mt-4 space-y-2">
                <Link to={`/client/jobs/${job._id}/proposals`} className="btn-primary w-full">View proposals ({job.proposalCount})</Link>
                <Link to={`/client/jobs/${job._id}/edit`} className="btn-secondary w-full"><Pencil className="h-4 w-4" /> Edit job</Link>
              </div>
            )}
          </div>

          {client && (
            <div className="card">
              <p className="mb-2 text-sm font-medium text-slate-500">About the client</p>
              <div className="flex items-center gap-3">
                <Avatar user={client} />
                <div><p className="font-medium">{client.name}</p>{client.company && <p className="text-xs text-slate-500">{client.company}</p>}</div>
              </div>
            </div>
          )}

          {user?.role === 'freelancer' && (
            <div className="card">
              <h3 className="mb-2 font-semibold">Your fit for this job</h3>
              {match ? <MatchPanel match={match.match} provider={match.provider} /> : (
                <button onClick={runMatch} className="btn-secondary w-full" disabled={matchLoading}>
                  <Sparkles className="h-4 w-4" /> {matchLoading ? 'Analyzing…' : 'Run AI match analysis'}
                </button>
              )}
            </div>
          )}

          {user && !isOwner && (
            <button onClick={() => setReportOpen(true)} className="btn-ghost w-full text-xs text-slate-400"><Flag className="h-3.5 w-3.5" /> Report this job</button>
          )}
          {!user && job.status === 'OPEN' && (
            <div className="card text-center text-sm">
              <p className="mb-3 text-slate-600">Log in as a freelancer to submit a proposal.</p>
              <Link to="/login" className="btn-primary w-full" onClick={() => sessionStorage.setItem('redirectAfterLogin', `/jobs/${job._id}`)}>Log in</Link>
            </div>
          )}
        </div>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this job">
        <form onSubmit={submitReport} className="space-y-4">
          <div><label className="label">Reason</label><input className="input" required minLength={3} value={report.reason} onChange={(e) => setReport({ ...report, reason: e.target.value })} placeholder="e.g. Spam, scam, inappropriate content" /></div>
          <div><label className="label">Details (optional)</label><textarea className="input" value={report.description} onChange={(e) => setReport({ ...report, description: e.target.value })} /></div>
          <button className="btn-primary w-full">Submit report</button>
        </form>
      </Modal>
    </div>
  );

  return user ? body : <div className="min-h-screen bg-slate-50"><PublicNav />{body}</div>;
}
