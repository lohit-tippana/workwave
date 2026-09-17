import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { ErrorBox, SkillChips, Spinner } from '../../components/ui';
import { Sparkles, Upload } from 'lucide-react';

export default function JobForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', category: '', requiredSkills: '',
    experienceLevel: 'intermediate', budget: '', budgetType: 'fixed', deadline: '',
  });
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [jobStatus, setJobStatus] = useState('');

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.data.results)).catch(() => {});
    if (isEdit) {
      api.get(`/jobs/${id}`).then((r) => {
        const j = r.data.data.job;
        setForm({
          title: j.title, description: j.description, category: j.category,
          requiredSkills: (j.requiredSkills || []).join(', '),
          experienceLevel: j.experienceLevel, budget: String(j.budget),
          budgetType: j.budgetType, deadline: j.deadline ? j.deadline.slice(0, 10) : '',
        });
        setJobStatus(j.status);
        if (j.aiAnalysis) setAnalysis(j.aiAnalysis);
      }).catch((e) => setError(e.message)).finally(() => setPageLoading(false));
    }
  }, [id]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const analyze = async () => {
    if (form.description.length < 30) { setError('Write a longer description (30+ chars) before analyzing.'); return; }
    setAnalyzing(true); setError('');
    try {
      const r = await api.post('/ai/analyze-description', { description: form.description });
      setAnalysis({ ...r.data.data.analysis, provider: r.data.data.provider });
      const skills = r.data.data.analysis.requiredSkills;
      if (skills?.length && !form.requiredSkills.trim()) set('requiredSkills', skills.join(', '));
    } catch (e: any) { setError(e.message); }
    finally { setAnalyzing(false); }
  };

  const submit = async (e: FormEvent, publish = false) => {
    e.preventDefault();
    setLoading(true); setError('');
    const payload = {
      ...form,
      budget: Number(form.budget),
      requiredSkills: form.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
      deadline: form.deadline || undefined,
      publish,
    };
    try {
      if (isEdit) await api.put(`/jobs/${id}`, payload);
      else await api.post('/jobs', payload);
      navigate('/client/jobs');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const uploadAttachment = async (file: File) => {
    if (!id) { setError('Save the job first, then attach files.'); return; }
    const fd = new FormData();
    fd.append('file', file);
    try { await api.post(`/jobs/${id}/attachments`, fd); } catch (e: any) { setError(e.message); }
  };

  if (pageLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-2xl font-bold">{isEdit ? 'Edit job' : 'Post a new job'}</h1>
      <form onSubmit={(e) => submit(e, false)} className="card space-y-5">
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="title">Job title</label>
          <input id="title" className="input" required minLength={5} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Build a React dashboard for analytics" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="description">Description</label>
            <button type="button" className="btn-secondary text-xs" onClick={analyze} disabled={analyzing}>
              <Sparkles className="h-3.5 w-3.5" /> {analyzing ? 'Analyzing…' : 'Analyze with AI'}
            </button>
          </div>
          <textarea id="description" className="input min-h-40" required minLength={30} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the work, deliverables, and requirements…" />
        </div>

        {analysis && (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-brand-900"><Sparkles className="h-4 w-4" /> AI job analysis</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><p className="mb-1 font-medium">Detected skills</p><SkillChips skills={analysis.requiredSkills} /></div>
              <div className="space-y-1">
                <p><span className="text-slate-500">Experience level:</span> <span className="capitalize">{analysis.experienceLevel}</span></p>
                <p><span className="text-slate-500">Complexity:</span> <span className="capitalize">{analysis.estimatedComplexity}</span></p>
              </div>
            </div>
            {analysis.responsibilities?.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-slate-600">{analysis.responsibilities.slice(0, 4).map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
            )}
            <p className="mt-2 text-xs italic text-slate-500">{analysis.label || 'AI-generated analysis'} — the description above stays fully editable.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" className="input" required list="categories" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Web Development" />
            <datalist id="categories">{categories.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          </div>
          <div>
            <label className="label" htmlFor="exp">Experience level</label>
            <select id="exp" className="input" value={form.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>
              <option value="entry">Entry</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="skills">Required skills (comma-separated)</label>
            <input id="skills" className="input" value={form.requiredSkills} onChange={(e) => set('requiredSkills', e.target.value)} placeholder="react, node.js, mongodb" />
          </div>
          <div>
            <label className="label" htmlFor="deadline">Deadline</label>
            <input id="deadline" type="date" className="input" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="budget">Budget ($)</label>
            <input id="budget" type="number" min={1} className="input" required value={form.budget} onChange={(e) => set('budget', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="btype">Budget type</label>
            <select id="btype" className="input" value={form.budgetType} onChange={(e) => set('budgetType', e.target.value)}>
              <option value="fixed">Fixed price</option><option value="hourly">Hourly</option>
            </select>
          </div>
        </div>

        {isEdit && (
          <div>
            <label className="label">Attachment</label>
            <label className="btn-secondary cursor-pointer text-xs">
              <Upload className="h-3.5 w-3.5" /> Upload file
              <input type="file" className="hidden" accept="image/*,.pdf,.docx" onChange={(e) => e.target.files?.[0] && uploadAttachment(e.target.files[0])} />
            </label>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-secondary" disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Save changes' : 'Save as draft'}</button>
          {(!isEdit || jobStatus === 'DRAFT') && (
            <button type="button" className="btn-primary" disabled={loading} onClick={(e) => submit(e as any, true)}>
              {loading ? 'Publishing…' : 'Publish job'}
            </button>
          )}
          <Link to="/client/jobs" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
