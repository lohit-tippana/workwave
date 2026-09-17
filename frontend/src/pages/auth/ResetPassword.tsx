import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { ErrorBox } from '../../components/ui';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <ErrorBox message={error} />
          {done && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Password updated. Redirecting to login…</div>}
          <div>
            <label className="label" htmlFor="token">Reset token</label>
            <input id="token" className="input" required value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">New password</label>
            <input id="password" type="password" className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
        </form>
        <p className="mt-4 text-center text-sm"><Link to="/login" className="text-brand-600 hover:underline">Back to login</Link></p>
      </div>
    </div>
  );
}
