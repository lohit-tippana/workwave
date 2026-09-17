import { useEffect, useState, FormEvent } from 'react';
import api from '../../services/api';
import { EmptyState, ErrorBox, Spinner } from '../../components/ui';
import { Plus } from 'lucide-react';

export default function AdminCategories() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => api.get('/admin/categories').then((r) => setItems(r.data.data.results)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    try { await api.post('/admin/categories', { name, description }); setName(''); setDescription(''); load(); }
    catch (e: any) { setError(e.message); }
  };
  const deactivate = async (id: string) => {
    try { await api.delete(`/admin/categories/${id}`); load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-2xl font-bold">Categories</h1>
      <ErrorBox message={error} />
      <form onSubmit={add} className="card mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1"><label className="label">Name</label><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="min-w-[180px] flex-1"><label className="label">Description</label><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <button className="btn-primary"><Plus className="h-4 w-4" /> Add</button>
      </form>
      {loading ? <Spinner /> : items.length === 0 ? <EmptyState title="No categories" /> : (
        <div className="card divide-y divide-slate-100 p-0">
          {items.map((c) => (
            <div key={c._id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{c.name} {!c.isActive && <span className="badge bg-slate-100 text-slate-500">inactive</span>}</p>
                <p className="text-xs text-slate-500">{c.description}</p>
              </div>
              {c.isActive && <button className="btn-ghost text-xs text-red-500" onClick={() => deactivate(c._id)}>Deactivate</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
