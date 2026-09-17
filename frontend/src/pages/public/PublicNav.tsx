import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PublicNav() {
  const { user } = useAuth();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="text-lg font-bold text-brand-700">WorkWave</Link>
        <nav className="flex gap-4 text-sm text-slate-600">
          <Link to="/jobs" className="hover:text-brand-700">Jobs</Link>
          <Link to="/freelancers" className="hover:text-brand-700">Freelancers</Link>
          <Link to="/about" className="hover:text-brand-700">About</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link to={`/${user.role}/dashboard`} className="btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
