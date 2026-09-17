import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ErrorBox } from '../../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(email, password);
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
        <h1 className="mt-4 text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to your account</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <ErrorBox message={error} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
          <Link to="/register" className="text-brand-600 hover:underline">Create account</Link>
        </div>
        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium">Demo accounts (run <code>npm run seed</code> in backend):</p>
          <p>client@workwave.dev / Client@12345 · freelancer@workwave.dev / Freelance@12345 · admin@workwave.dev / Admin@12345</p>
        </div>
      </div>
    </div>
  );
}
