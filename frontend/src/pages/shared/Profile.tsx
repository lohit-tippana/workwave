import { useEffect, useState, FormEvent, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Avatar, ErrorBox, SkillChips } from '../../components/ui';
import { Camera, Plus, Trash2, ExternalLink } from 'lucide-react';

export default function Profile() {
  const { user, refresh } = useAuth();
  const isFreelancer = user?.role === 'freelancer';
  const [form, setForm] = useState<any>({});
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ title: '', description: '', technologies: '', projectUrl: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '', headline: user.headline || '', bio: user.bio || '',
        skills: (user.skills || []).join(', '), yearsOfExperience: user.yearsOfExperience || 0,
        hourlyRate: user.hourlyRate || '', location: user.location || '',
        languages: (user.languages || []).join(', '), availability: user.availability || 'available',
        company: user.company || '',
      });
      if (isFreelancer) api.get('/users/portfolio/me').then((r) => setPortfolio(r.data.data.items)).catch(() => {});
    }
  }, [user]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      await api.put('/users/profile', {
        ...form,
        skills: String(form.skills).split(',').map((s: string) => s.trim()).filter(Boolean),
        languages: String(form.languages).split(',').map((s: string) => s.trim()).filter(Boolean),
        yearsOfExperience: Number(form.yearsOfExperience) || 0,
        hourlyRate: form.hourlyRate === '' ? undefined : Number(form.hourlyRate),
      });
      await refresh();
      setNotice('Profile saved.');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const uploadAvatar = async (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    try { await api.post('/users/avatar', fd); await refresh(); setNotice('Photo updated.'); }
    catch (e: any) { setError(e.message); }
  };

  const addPortfolio = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api.post('/users/portfolio', { ...newItem, technologies: newItem.technologies.split(',').map((s) => s.trim()).filter(Boolean) });
      setPortfolio((p) => [r.data.data.item, ...p]);
      setNewItem({ title: '', description: '', technologies: '', projectUrl: '' });
    } catch (e: any) { setError(e.message); }
  };

  const removePortfolio = async (id: string) => {
    try { await api.delete(`/users/portfolio/${id}`); setPortfolio((p) => p.filter((i) => i._id !== id)); }
    catch (e: any) { setError(e.message); }
  };

  const uploadPortfolioImage = async (id: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await api.post(`/users/portfolio/${id}/images`, fd);
      setPortfolio((p) => p.map((i) => (i._id === id ? r.data.data.item : i)));
    } catch (e: any) { setError(e.message); }
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 text-2xl font-bold">My profile</h1>
      <ErrorBox message={error} />
      {notice && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>}

      <div className="card mb-6 flex items-center gap-4">
        <Avatar user={user} size="lg" />
        <div>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm capitalize text-slate-500">{user?.role} · {user?.email}</p>
        </div>
        <label className="btn-secondary ml-auto cursor-pointer text-xs">
          <Camera className="h-3.5 w-3.5" /> Change photo
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </label>
      </div>

      <form onSubmit={save} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" required value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
          {isFreelancer ? (
            <div><label className="label">Headline</label><input className="input" value={form.headline || ''} onChange={(e) => set('headline', e.target.value)} placeholder="e.g. Full-stack React developer" /></div>
          ) : (
            <div><label className="label">Company</label><input className="input" value={form.company || ''} onChange={(e) => set('company', e.target.value)} /></div>
          )}
        </div>
        <div><label className="label">Bio</label><textarea className="input min-h-24" value={form.bio || ''} onChange={(e) => set('bio', e.target.value)} /></div>
        {isFreelancer && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Skills (comma-separated)</label><input className="input" value={form.skills || ''} onChange={(e) => set('skills', e.target.value)} placeholder="react, node.js, mongodb" /></div>
              <div><label className="label">Languages</label><input className="input" value={form.languages || ''} onChange={(e) => set('languages', e.target.value)} placeholder="English, Hindi" /></div>
              <div><label className="label">Years of experience</label><input type="number" min={0} className="input" value={form.yearsOfExperience ?? ''} onChange={(e) => set('yearsOfExperience', e.target.value)} /></div>
              <div><label className="label">Hourly rate ($)</label><input type="number" min={0} className="input" value={form.hourlyRate ?? ''} onChange={(e) => set('hourlyRate', e.target.value)} /></div>
              <div><label className="label">Location</label><input className="input" value={form.location || ''} onChange={(e) => set('location', e.target.value)} /></div>
              <div><label className="label">Availability</label>
                <select className="input" value={form.availability} onChange={(e) => set('availability', e.target.value)}>
                  <option value="available">Available</option><option value="busy">Busy</option><option value="unavailable">Unavailable</option>
                </select>
              </div>
            </div>
          </>
        )}
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
      </form>

      {isFreelancer && (
        <div className="card mt-6">
          <h2 className="mb-3 font-semibold">Portfolio</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {portfolio.map((p) => (
              <div key={p._id} className="rounded-lg border border-slate-200 p-3">
                {p.images?.[0] && <img src={p.images[0].url} alt={p.title} className="mb-2 h-28 w-full rounded-md object-cover" />}
                <div className="flex items-start justify-between">
                  <p className="font-medium">{p.title}</p>
                  <button className="text-red-400 hover:text-red-600" onClick={() => removePortfolio(p._id)} aria-label="Delete portfolio item"><Trash2 className="h-4 w-4" /></button>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>
                <div className="mt-2"><SkillChips skills={p.technologies?.slice(0, 4)} /></div>
                <div className="mt-2 flex items-center gap-3">
                  {p.projectUrl && <a href={p.projectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><ExternalLink className="h-3 w-3" /> Link</a>}
                  <label className="cursor-pointer text-xs text-brand-600 hover:underline">
                    + image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPortfolioImage(p._id, e.target.files[0])} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={addPortfolio} className="mt-4 space-y-3 rounded-lg border border-dashed border-slate-300 p-4">
            <p className="text-sm font-medium">Add portfolio item</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" required placeholder="Title" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} />
              <input className="input" placeholder="Technologies (comma-sep)" value={newItem.technologies} onChange={(e) => setNewItem({ ...newItem, technologies: e.target.value })} />
            </div>
            <textarea className="input" placeholder="Description" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
            <input className="input" placeholder="Project URL (optional)" value={newItem.projectUrl} onChange={(e) => setNewItem({ ...newItem, projectUrl: e.target.value })} />
            <button className="btn-secondary text-xs"><Plus className="h-3.5 w-3.5" /> Add item</button>
          </form>
        </div>
      )}
    </div>
  );
}
