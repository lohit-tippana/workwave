import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import { PageSpinner } from './components/ui';
import type { Role } from './types';

import Home from './pages/public/Home';
import About from './pages/public/About';
import BrowseJobs from './pages/public/BrowseJobs';
import JobDetail from './pages/public/JobDetail';
import Freelancers from './pages/public/Freelancers';
import FreelancerProfile from './pages/public/FreelancerProfile';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import ClientDashboard from './pages/client/ClientDashboard';
import ClientJobs from './pages/client/ClientJobs';
import JobForm from './pages/client/JobForm';
import JobProposals from './pages/client/JobProposals';
import Payments from './pages/shared/Payments';

import FreelancerDashboard from './pages/freelancer/FreelancerDashboard';
import MyProposals from './pages/freelancer/MyProposals';
import Bookmarks from './pages/freelancer/Bookmarks';
import ResumePage from './pages/freelancer/ResumePage';

import Projects from './pages/shared/Projects';
import ProjectDetail from './pages/shared/ProjectDetail';
import ProposalDetail from './pages/shared/ProposalDetail';
import Messages from './pages/shared/Messages';
import Profile from './pages/shared/Profile';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminJobs from './pages/admin/AdminJobs';
import AdminPayments from './pages/admin/AdminPayments';
import AdminReports from './pages/admin/AdminReports';
import AdminCategories from './pages/admin/AdminCategories';

function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return <Outlet />;
}

function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Home />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleHome />} />
          <Route path="/about" element={<About />} />
          <Route path="/jobs" element={<BrowseJobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/freelancers" element={<Freelancers />} />
          <Route path="/freelancers/:id" element={<FreelancerProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<RequireAuth roles={['client']} />}>
            <Route element={<AppLayout />}>
              <Route path="/client/dashboard" element={<ClientDashboard />} />
              <Route path="/client/jobs" element={<ClientJobs />} />
              <Route path="/client/jobs/create" element={<JobForm />} />
              <Route path="/client/jobs/:id/edit" element={<JobForm />} />
              <Route path="/client/jobs/:id" element={<JobDetail />} />
              <Route path="/client/jobs/:id/proposals" element={<JobProposals />} />
              <Route path="/client/projects" element={<Projects />} />
              <Route path="/client/projects/:id" element={<ProjectDetail />} />
              <Route path="/client/messages" element={<Messages />} />
              <Route path="/client/profile" element={<Profile />} />
              <Route path="/client/payments" element={<Payments />} />
            </Route>
          </Route>

          <Route element={<RequireAuth roles={['freelancer']} />}>
            <Route element={<AppLayout />}>
              <Route path="/freelancer/dashboard" element={<FreelancerDashboard />} />
              <Route path="/freelancer/jobs" element={<BrowseJobs freelancerView />} />
              <Route path="/freelancer/jobs/:id" element={<JobDetail />} />
              <Route path="/freelancer/proposals" element={<MyProposals />} />
              <Route path="/freelancer/projects" element={<Projects />} />
              <Route path="/freelancer/projects/:id" element={<ProjectDetail />} />
              <Route path="/freelancer/messages" element={<Messages />} />
              <Route path="/freelancer/bookmarks" element={<Bookmarks />} />
              <Route path="/freelancer/resume" element={<ResumePage />} />
              <Route path="/freelancer/ai-analysis" element={<ResumePage />} />
              <Route path="/freelancer/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<RequireAuth roles={['client', 'freelancer']} />}>
            <Route element={<AppLayout />}>
              <Route path="/proposals/:id" element={<ProposalDetail />} />
            </Route>
          </Route>

          <Route element={<RequireAuth roles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/jobs" element={<AdminJobs />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
