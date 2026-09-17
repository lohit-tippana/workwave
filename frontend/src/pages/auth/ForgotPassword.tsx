import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ErrorBox } from '../../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await api.post('/auth/forgot-password', { email });
      setMessage(r.data.message);
      if (r.data.data?.resetToken) setDevToken(r.data.data.resetToken);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your account email and we'll send a reset link.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <ErrorBox message={error} />
          {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
          {devToken && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Dev mode reset token (in production this is emailed):<br />
              <Link className="font-mono text-brand-700 underline break-all" to={`/reset-password?token=${devToken}`}>
                /reset-password?token={devToken}
              </Link>
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
        <p className="mt-4 text-center text-sm"><Link to="/login" className="text-brand-600 hover:underline">Back to login</Link></p>
      </div>
    </div>
  );
}
