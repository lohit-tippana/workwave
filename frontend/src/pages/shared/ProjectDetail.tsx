import { useEffect, useRef, useState, FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Milestone, Payment, Project } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Avatar, EmptyState, ErrorBox, Modal, Spinner, StatusBadge } from '../../components/ui';
import { Plus, Upload, MessageSquare, Star, CreditCard, CheckCircle2 } from 'lucide-react';

declare global { interface Window { Razorpay?: any } }

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isClient = user?.role === 'client';

  const [project, setProject] = useState<Project | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [msModal, setMsModal] = useState(false);
  const [msForm, setMsForm] = useState({ title: '', description: '', amount: '', dueDate: '' });
  const [submitFor, setSubmitFor] = useState<Milestone | null>(null);
  const [submitNote, setSubmitNote] = useState('');
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [reviseFor, setReviseFor] = useState<Milestone | null>(null);
  const [reviseNote, setReviseNote] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [payConfig, setPayConfig] = useState<{ enabled: boolean; keyId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const r = await api.get(`/projects/${id}`);
      setProject(r.data.data.project);
      setPayments(r.data.data.payments);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); api.get('/payments/config').then((r) => setPayConfig(r.data.data)).catch(() => {}); }, [id]);

  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); await load(); } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const addMilestone = (e: FormEvent) => run(async () => {
    e.preventDefault();
    await api.post(`/projects/${id}/milestones`, { ...msForm, amount: Number(msForm.amount), dueDate: msForm.dueDate || undefined });
    setMsModal(false); setMsForm({ title: '', description: '', amount: '', dueDate: '' });
  });

  const submitWork = (e: FormEvent) => run(async () => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('note', submitNote);
    submitFiles.forEach((f) => fd.append('files', f));
    await api.post(`/projects/${id}/milestones/${submitFor!._id}/submit`, fd);
    setSubmitFor(null); setSubmitNote(''); setSubmitFiles([]);
  });

  const review = (mid: string, action: 'approve' | 'request_revision', note = '') =>
    run(() => api.post(`/projects/${id}/milestones/${mid}/review`, { action, note }));

  const pay = async (milestoneId?: string) => run(async () => {
    if (!payConfig?.enabled) { setError('Razorpay is not configured on the server.'); return; }
    const okScript = await loadRazorpayScript();
    if (!okScript) { setError('Could not load Razorpay checkout. Check your connection.'); return; }
    const r = await api.post('/payments/order', { projectId: id, milestoneId });
    const d = r.data.data;
    const rzp = new window.Razorpay({
      key: d.keyId,
      amount: d.amount,
      currency: d.currency,
      name: 'WorkWave',
      description: project!.title,
      order_id: d.orderId,
      handler: async (resp: any) => {
        try {
          await api.post('/payments/verify', {
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          });
          setNotice('Payment verified successfully.');
          await load();
        } catch (e: any) { setError(e.message); }
      },
      modal: { ondismiss: async () => { await api.post('/payments/failed', { razorpayOrderId: d.orderId, reason: 'Checkout cancelled' }).catch(() => {}); } },
      theme: { color: '#1b64f5' },
    });
    rzp.on('payment.failed', async () => {
      await api.post('/payments/failed', { razorpayOrderId: d.orderId, reason: 'Payment failed' }).catch(() => {});
    });
    rzp.open();
  });

  const leaveReview = (e: FormEvent) => run(async () => {
    e.preventDefault();
    await api.post('/reviews', { projectId: id, rating: reviewForm.rating, text: reviewForm.text });
    setReviewOpen(false); setNotice('Review submitted.');
  });

  const startChat = async () => {
    const other = isClient ? project!.freelancerId : project!.clientId;
    const otherId = typeof other === 'object' ? other._id : other;
    try {
      const r = await api.post('/messages/conversations', { otherUserId: otherId });
      navigate(`/${user?.role}/messages`, { state: { conversationId: r.data.data.conversation._id } });
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <Spinner />;
  if (!project) return <EmptyState title="Project not found" hint={error} />;

  const client = typeof project.clientId === 'object' ? project.clientId : null;
  const freelancer = typeof project.freelancerId === 'object' ? project.freelancerId : null;
  const myReviewed = isClient ? project.clientReviewed : project.freelancerReviewed;
  const paidMilestoneIds = new Set(payments.filter((p) => p.status === 'SUCCESS').map((p) => String(p.milestoneId)));

  return (
    <div className="mx-auto max-w-5xl">
      <ErrorBox message={error} />
      {notice && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>}

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <p className="mt-1 text-sm text-slate-500">Budget ${project.budget} {project.deadline && `· due ${new Date(project.deadline).toLocaleDateString()}`}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Progress</span><span>{project.progress}%</span></div>
          <div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${project.progress}%` }} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2"><Avatar user={client} size="sm" /><span className="text-sm">Client: {client?.name}</span></div>
          <div className="flex items-center gap-2"><Avatar user={freelancer} size="sm" /><span className="text-sm">Freelancer: {freelancer?.name}</span></div>
          <div className="ml-auto flex gap-2">
            <button className="btn-secondary text-xs" onClick={startChat}><MessageSquare className="h-3.5 w-3.5" /> Message</button>
            {isClient && ['ACTIVE', 'IN_REVIEW', 'REVISION_REQUESTED'].includes(project.status) && (
              <>
                <button className="btn-primary text-xs" disabled={busy} onClick={() => run(() => api.post(`/projects/${id}/complete`))}>Mark complete</button>
                <button className="btn-ghost text-xs text-red-500" disabled={busy} onClick={() => confirm('Cancel this project?') && run(() => api.post(`/projects/${id}/cancel`))}>Cancel</button>
              </>
            )}
            {project.status === 'COMPLETED' && !myReviewed && (
              <button className="btn-primary text-xs" onClick={() => setReviewOpen(true)}><Star className="h-3.5 w-3.5" /> Leave a review</button>
            )}
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Milestones</h2>
          {isClient && ['ACTIVE', 'PENDING'].includes(project.status) && (
            <button className="btn-primary text-xs" onClick={() => setMsModal(true)}><Plus className="h-3.5 w-3.5" /> Add milestone</button>
          )}
        </div>
        {project.milestones.length === 0 ? (
          <EmptyState title="No milestones yet" hint={isClient ? 'Break the project into payable milestones.' : 'The client will add milestones here.'} />
        ) : (
          <div className="space-y-3">
            {project.milestones.map((m) => (
              <div key={m._id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    {m.description && <p className="text-sm text-slate-500">{m.description}</p>}
                    <p className="mt-1 text-xs text-slate-400">${m.amount} {m.dueDate && `· due ${new Date(m.dueDate).toLocaleDateString()}`}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                {m.submission?.note && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium">Submission</p>
                    <p className="text-slate-600">{m.submission.note}</p>
                    {m.submission.files?.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" className="block text-xs text-brand-600 hover:underline">{f.name || f.url}</a>
                    ))}
                  </div>
                )}
                {m.revisionNote && <p className="mt-2 text-xs text-orange-600">Revision requested: {m.revisionNote}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!isClient && m.status === 'PENDING' && <button className="btn-secondary text-xs" disabled={busy} onClick={() => run(() => api.post(`/projects/${id}/milestones/${m._id}/start`))}>Start work</button>}
                  {!isClient && ['IN_PROGRESS', 'REVISION_REQUESTED'].includes(m.status) && <button className="btn-primary text-xs" onClick={() => setSubmitFor(m)}><Upload className="h-3.5 w-3.5" /> Submit work</button>}
                  {isClient && m.status === 'SUBMITTED' && (
                    <>
                      <button className="btn-primary text-xs" disabled={busy} onClick={() => review(m._id, 'approve')}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                      <button className="btn-secondary text-xs" onClick={() => setReviseFor(m)}>Request revision</button>
                    </>
                  )}
                  {isClient && m.status === 'APPROVED' && !paidMilestoneIds.has(String(m._id)) && (
                    <button className="btn-primary text-xs" disabled={busy || !payConfig?.enabled} onClick={() => pay(m._id)}><CreditCard className="h-3.5 w-3.5" /> Pay ${m.amount}</button>
                  )}
                  {isClient && m.status === 'APPROVED' && paidMilestoneIds.has(String(m._id)) && (
                    <button className="btn-secondary text-xs" disabled={busy} onClick={() => run(() => api.post(`/projects/${id}/milestones/${m._id}/complete`))}>Mark milestone complete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {isClient && project.milestones.length === 0 && project.status !== 'COMPLETED' && (
          <button className="btn-secondary mt-3 w-full" disabled={busy || !payConfig?.enabled} onClick={() => pay()}>
            <CreditCard className="h-4 w-4" /> Pay full project budget (${project.budget})
          </button>
        )}
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <div className="card mt-6">
          <h2 className="mb-3 font-semibold">Payments</h2>
          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div key={p._id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-xs text-slate-500">{p.razorpayOrderId}</span>
                <span>{p.currency} {(p.amount / 100).toFixed(2)}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add milestone modal */}
      <Modal open={msModal} onClose={() => setMsModal(false)} title="Add milestone">
        <form onSubmit={addMilestone} className="space-y-4">
          <div><label className="label">Title</label><input className="input" required value={msForm.title} onChange={(e) => setMsForm({ ...msForm, title: e.target.value })} /></div>
          <div><label className="label">Description</label><textarea className="input" value={msForm.description} onChange={(e) => setMsForm({ ...msForm, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Amount ($)</label><input type="number" min={1} className="input" required value={msForm.amount} onChange={(e) => setMsForm({ ...msForm, amount: e.target.value })} /></div>
            <div><label className="label">Due date</label><input type="date" className="input" value={msForm.dueDate} onChange={(e) => setMsForm({ ...msForm, dueDate: e.target.value })} /></div>
          </div>
          <button className="btn-primary w-full" disabled={busy}>Add milestone</button>
        </form>
      </Modal>

      {/* Submit work modal */}
      <Modal open={!!submitFor} onClose={() => setSubmitFor(null)} title={`Submit work — ${submitFor?.title}`}>
        <form onSubmit={submitWork} className="space-y-4">
          <div><label className="label">Note for the client</label><textarea className="input min-h-24" required value={submitNote} onChange={(e) => setSubmitNote(e.target.value)} placeholder="Describe what you delivered…" /></div>
          <div>
            <label className="label">Files (up to 5)</label>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.docx" className="input text-xs" onChange={(e) => setSubmitFiles(Array.from(e.target.files || []).slice(0, 5))} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
        </form>
      </Modal>

      {/* Revision modal */}
      <Modal open={!!reviseFor} onClose={() => setReviseFor(null)} title="Request revision">
        <form onSubmit={(e) => { e.preventDefault(); review(reviseFor!._id, 'request_revision', reviseNote); setReviseFor(null); }} className="space-y-4">
          <div><label className="label">What needs to change?</label><textarea className="input min-h-24" required value={reviseNote} onChange={(e) => setReviseNote(e.target.value)} /></div>
          <button className="btn-primary w-full" disabled={busy}>Send revision request</button>
        </form>
      </Modal>

      {/* Review modal */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Leave a review">
        <form onSubmit={leaveReview} className="space-y-4">
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setReviewForm({ ...reviewForm, rating: n })} aria-label={`${n} stars`}
                  className={`text-2xl ${n <= reviewForm.rating ? 'text-amber-400' : 'text-slate-300'}`}>★</button>
              ))}
            </div>
          </div>
          <div><label className="label">Review</label><textarea className="input min-h-24" value={reviewForm.text} onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })} /></div>
          <button className="btn-primary w-full" disabled={busy}>Submit review</button>
        </form>
      </Modal>
    </div>
  );
}
