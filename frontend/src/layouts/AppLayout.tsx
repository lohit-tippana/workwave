import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, FileText, FolderKanban, MessageSquare, User as UserIcon,
  Bookmark, Sparkles, Bell, LogOut, Menu, X, Users, Flag, CreditCard, Tags, BarChart3, Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Avatar } from '../components/ui';
import type { Notification } from '../types';

const NAV: Record<string, { to: string; label: string; icon: any }[]> = {
  client: [
    { to: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/client/jobs', label: 'My Jobs', icon: Briefcase },
    { to: '/client/projects', label: 'Projects', icon: FolderKanban },
    { to: '/client/messages', label: 'Messages', icon: MessageSquare },
    { to: '/client/payments', label: 'Payments', icon: CreditCard },
    { to: '/client/profile', label: 'Profile', icon: UserIcon },
  ],
  freelancer: [
    { to: '/freelancer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/freelancer/jobs', label: 'Find Jobs', icon: Search },
    { to: '/freelancer/proposals', label: 'My Proposals', icon: FileText },
    { to: '/freelancer/projects', label: 'Projects', icon: FolderKanban },
    { to: '/freelancer/messages', label: 'Messages', icon: MessageSquare },
    { to: '/freelancer/bookmarks', label: 'Saved Jobs', icon: Bookmark },
    { to: '/freelancer/resume', label: 'Resume & AI', icon: Sparkles },
    { to: '/freelancer/profile', label: 'Profile', icon: UserIcon },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
    { to: '/admin/payments', label: 'Payments', icon: CreditCard },
    { to: '/admin/reports', label: 'Reports', icon: Flag },
    { to: '/admin/categories', label: 'Categories', icon: Tags },
  ],
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const r = await api.get('/notifications?limit=8');
      setItems(r.data.data.results);
      setUnread(r.data.data.unread);
    } catch { /* ignore */ }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const open_ = async (n: Notification) => {
    if (!n.isRead) await api.post(`/notifications/${n._id}/read`).catch(() => {});
    setOpen(false);
    if (n.link) navigate(n.link);
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative rounded-lg p-2 hover:bg-slate-100" aria-label="Notifications">
        <Bell className="h-5 w-5 text-slate-600" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <button className="text-xs text-brand-600 hover:underline" onClick={async () => { await api.post('/notifications/read-all'); load(); }}>Mark all read</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>}
            {items.map((n) => (
              <button key={n._id} onClick={() => open_(n)} className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${!n.isRead ? 'bg-brand-50' : ''}`}>
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>}
                <p className="mt-1 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();
  const items = NAV[user?.role || 'client'] || [];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 transform border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link to="/" className="text-lg font-bold text-brand-700">WorkWave</Link>
          <button className="md:hidden" onClick={() => setMobileNav(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="p-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileNav(false)}
              className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {mobileNav && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMobileNav(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button className="md:hidden" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="flex-1" />
          <NotificationBell />
          <div className="flex items-center gap-2">
            <Avatar user={user} size="sm" />
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500">{user?.role}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Log out">
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
