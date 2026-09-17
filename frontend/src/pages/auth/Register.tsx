import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ErrorBox } from '../../components/ui';
import { Briefcase, UserRound } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'freelancer' as 'client' | 'freelancer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await register(form.name, form.email, form.password, form.role);
      navigate(`/${user.role}/dashboard`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card w-full max-w-md">
        <Link to="/" className="text-xl font-bold text-brand-700">WorkWave</Link>
        <h1 className="mt-4 text-2xl font-semibold">Create your account</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <ErrorBox message={error} />
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
            {([
              { value: 'freelancer', label: 'Freelancer', desc: 'Find work & get hired', icon: UserRound },
              { value: 'client', label: 'Client', desc: 'Post jobs & hire talent', icon: Briefcase },
            ] as const).map(({ value, label, desc, icon: Icon }) => (
              <button type="button" key={value} onClick={() => setForm({ ...form, role: value })}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${form.role === value ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
                aria-pressed={form.role === value}>
                <Icon className="mb-2 h-5 w-5 text-brand-600" />
                <p className="font-medium">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </button>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="name">Full name / Company name</label>
            <input id="name" className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            <p className="mt-1 text-xs text-slate-500">Minimum 8 characters.</p>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-brand-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
