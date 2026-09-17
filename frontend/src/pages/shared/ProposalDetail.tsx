import { useEffect, useState, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Proposal, Job, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Avatar, EmptyState, ErrorBox, Modal, SkillChips, Spinner, Stars, StatusBadge } from '../../components/ui';
import { Check, MessageSquare, Sparkles, X } from 'lucide-react';

export default function ProposalDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ coverLetter: '', proposedAmount: '', estimatedDays: '' });

  const load = () => {
    setLoading(true);
    api.get(`/proposals/${id}`)
      .then((r) => setProposal(r.data.data.proposal))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const job: Partial<Job> | null = proposal && typeof proposal.jobId === 'object' ? proposal.jobId : null;
  const freelancer: Partial<User> | null = proposal && typeof proposal.freelancerId === 'object' ? proposal.freelancerId : null;
  const isOwner = !!(user && freelancer && user._id === freelancer._id);
  const actionable = proposal && ['PENDING', 'SHORTLISTED'].includes(proposal.status);

  const act = async (action: 'shortlist' | 'reject') => {
    setBusy(true); setError('');
    try { await api.post(`/proposals/${id}/status`, { action }); load(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const accept = async () => {
    if (!confirm('Accept this proposal? A project will be created and other proposals rejected.')) return;
    setBusy(true); setError('');
    try {
      const r = await api.post(`/proposals/${id}/accept`);
      navigate(`/client/projects/${r.data.data.project._id}`);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const message = async (otherUserId: string) => {
    setBusy(true); setError('');
    try {
      const r = await api.post('/messages/conversations', { otherUserId });
      navigate(`/${user?.role}/messages`, { state: { conversationId: r.data.data.conversation._id } });
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const openEdit = () => {
    setEditForm({ coverLetter: proposal!.coverLetter, proposedAmount: String(proposal!.proposedAmount), estimatedDays: String(proposal!.estimatedDays) });
    setEditing(true);
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/proposals/${id}`, { ...editForm, proposedAmount: Number(editForm.proposedAmount), estimatedDays: Number(editForm.estimatedDays) });
      setEditing(false); load();
    } catch (e: any) { setError(e.message); }
  };

  const withdraw = async () => {
    if (!confirm('Withdraw this proposal?')) return;
    try { await api.post(`/proposals/${id}/withdraw`); load(); } catch (e: any) { setError(e.message); }
  };

  if (loading) return <Spinner />;
  if (!proposal) {
    return error
      ? <EmptyState title="Couldn't load proposal" hint={error} action={<button className="btn-primary" onClick={load}>Try again</button>} />
      : <EmptyState title="Proposal not found" />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Proposal</h1>
          <p className="text-sm text-slate-500">
            for{' '}
            <Link className="text-brand-600 hover:underline" to={`/${user?.role === 'client' ? 'client' : 'freelancer'}/jobs/${job?._id}`}>
              {job?.title || 'job'}
            </Link>
          </p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>
      <ErrorBox message={error} />

      <div className="card">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar user={freelancer} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/freelancers/${freelancer?._id}`} className="font-semibold hover:text-brand-700">{freelancer?.name}</Link>
              <Stars rating={freelancer?.rating} count={freelancer?.reviewCount} />
            </div>
            <p className="text-sm text-slate-500">{freelancer?.headline}</p>
            <div className="mt-2"><SkillChips skills={freelancer?.skills?.slice(0, 8)} /></div>
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-sm font-semibold text-slate-700">Cover letter</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{proposal.coverLetter}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-4 text-sm">
          <span>Bid: <b>${proposal.proposedAmount}</b></span>
          <span>Delivery: {proposal.estimatedDays} days</span>
          <span>Submitted {new Date(proposal.createdAt).toLocaleString()}</span>
          {job?.budget != null && <span>Job budget: ${job.budget} {job.budgetType}</span>}
        </div>

        {proposal.aiMatch && (
          <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs">
            <p className="flex items-center gap-1 font-semibold text-brand-800"><Sparkles className="h-3.5 w-3.5" /> AI match: {proposal.aiMatch.matchScore}/100</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {proposal.aiMatch.matchedSkills?.map((s: string) => <span key={s} className="badge bg-green-100 text-green-800">{s}</span>)}
              {proposal.aiMatch.missingSkills?.map((s: string) => <span key={s} className="badge bg-red-50 text-red-600">{s} (missing)</span>)}
            </div>
            <p className="mt-1 italic text-slate-500">{proposal.aiMatch.disclaimer}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {/* Freelancer (owner) actions */}
          {isOwner && actionable && (
            <>
              <button className="btn-secondary text-xs" onClick={openEdit}>Edit proposal</button>
              <button className="btn-ghost text-xs text-red-500" onClick={withdraw}>Withdraw</button>
            </>
          )}
          {isOwner && ['SHORTLISTED', 'ACCEPTED'].includes(proposal.status) && job?.clientId && (
            <button className="btn-secondary text-xs" disabled={busy} onClick={() => message(job.clientId as string)}><MessageSquare className="h-3.5 w-3.5" /> Message client</button>
          )}
          {isOwner && proposal.status === 'ACCEPTED' && (
            <Link to="/freelancer/projects" className="btn-primary text-xs">View my project</Link>
          )}
          {/* Client actions */}
          {!isOwner && user?.role === 'client' && (
            <>
              {actionable && job?.status === 'OPEN' && (
                <>
                  <button className="btn-primary text-xs" disabled={busy} onClick={accept}><Check className="h-3.5 w-3.5" /> Hire</button>
                  {proposal.status === 'PENDING' && <button className="btn-secondary text-xs" disabled={busy} onClick={() => act('shortlist')}>Shortlist</button>}
                  <button className="btn-danger text-xs" disabled={busy} onClick={() => act('reject')}><X className="h-3.5 w-3.5" /> Reject</button>
                </>
              )}
              {['SHORTLISTED', 'ACCEPTED'].includes(proposal.status) && freelancer?._id && (
                <button className="btn-secondary text-xs" disabled={busy} onClick={() => message(freelancer._id as string)}><MessageSquare className="h-3.5 w-3.5" /> Message freelancer</button>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit proposal">
        <form onSubmit={saveEdit} className="space-y-4">
          <div><label className="label">Cover letter</label><textarea className="input min-h-32" required minLength={30} value={editForm.coverLetter} onChange={(e) => setEditForm({ ...editForm, coverLetter: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Amount ($)</label><input type="number" min={1} className="input" required value={editForm.proposedAmount} onChange={(e) => setEditForm({ ...editForm, proposedAmount: e.target.value })} /></div>
            <div><label className="label">Days</label><input type="number" min={1} className="input" required value={editForm.estimatedDays} onChange={(e) => setEditForm({ ...editForm, estimatedDays: e.target.value })} /></div>
          </div>
          <button className="btn-primary w-full">Save changes</button>
        </form>
      </Modal>
    </div>
  );
}
