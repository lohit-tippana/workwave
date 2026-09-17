import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { ErrorBox, SkillChips, Spinner } from '../../components/ui';
import { Sparkles, Upload, Trash2, FileText } from 'lucide-react';

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="capitalize text-slate-600">{label}</span><span className="font-medium">{value}/100</span></div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ResumePage() {
  const [resume, setResume] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([api.get('/resumes/mine'), api.get('/resumes/analysis/latest')]);
      setResume(r.data.data.resume);
      if (a.data.data.analysis) {
        setAnalysis(a.data.data.analysis.result);
        setProvider(a.data.data.analysis.provider);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    setUploading(true); setError('');
    const fd = new FormData();
    fd.append('resume', file);
    try { await api.post('/resumes', fd); setAnalysis(null); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const analyze = async () => {
    setAnalyzing(true); setError('');
    try {
      const r = await api.post('/resumes/analyze');
      setAnalysis(r.data.data.analysis.result);
      setProvider(r.data.data.analysis.provider);
    } catch (e: any) { setError(e.message); }
    finally { setAnalyzing(false); }
  };

  const remove = async () => {
    if (!confirm('Delete your resume?')) return;
    try { await api.delete('/resumes/mine'); setResume(null); setAnalysis(null); }
    catch (e: any) { setError(e.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 text-2xl font-bold">Resume & AI analysis</h1>
      <ErrorBox message={error} />

      <div className="card mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-brand-600" />
            <div>
              {resume ? (
                <>
                  <p className="font-medium">{resume.file?.name || 'resume'}</p>
                  <p className="text-xs text-slate-500">Uploaded {new Date(resume.updatedAt).toLocaleString()}</p>
                </>
              ) : <p className="text-sm text-slate-500">No resume uploaded yet. PDF or DOCX, max 8MB.</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <label className="btn-primary cursor-pointer">
              <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : resume ? 'Replace resume' : 'Upload resume'}
              <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" disabled={uploading}
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {resume && <button className="btn-ghost text-red-500" onClick={remove} aria-label="Delete resume"><Trash2 className="h-4 w-4" /></button>}
          </div>
        </div>
        {resume && (
          <button className="btn-primary mt-4" onClick={analyze} disabled={analyzing}>
            <Sparkles className="h-4 w-4" /> {analyzing ? 'Analyzing resume…' : 'Run AI resume analysis'}
          </button>
        )}
      </div>

      {analysis && (
        <div className="card mt-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-5 w-5 text-brand-600" /> ATS-style analysis</h2>
            <div className="text-right">
              <p className="text-3xl font-bold text-brand-700">{analysis.overallScore}<span className="text-base text-slate-400">/100</span></p>
            </div>
          </div>
          <p className="mt-1 text-xs italic text-slate-500">
            {analysis.label || 'AI-generated ATS-style analysis'}
            {provider === 'fallback' && ' · local heuristic analyzer (configure GEMINI_API_KEY for LLM analysis)'}
            . This is an estimate, not the score of any real ATS system.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {analysis.sections && Object.entries(analysis.sections).map(([k, v]) => (
              <ScoreBar key={k} label={k} value={v as number} />
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium">Technical skills detected</p>
              <SkillChips skills={analysis.technicalSkills} variant="matched" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Soft skills detected</p>
              <SkillChips skills={analysis.softSkills} />
            </div>
          </div>

          {analysis.missingInformation?.length > 0 && (
            <div className="mt-5">
              <p className="mb-1 text-sm font-medium text-red-700">Missing information</p>
              <ul className="list-disc pl-5 text-sm text-slate-600">{analysis.missingInformation.map((m: string) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          {analysis.suggestions?.length > 0 && (
            <div className="mt-5">
              <p className="mb-1 text-sm font-medium">Improvement suggestions</p>
              <ul className="list-disc pl-5 text-sm text-slate-600">{analysis.suggestions.map((s: string) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
