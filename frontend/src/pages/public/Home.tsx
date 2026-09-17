import { Link } from 'react-router-dom';
import { Search, Sparkles, ShieldCheck, CreditCard, MessageSquare, FolderKanban } from 'lucide-react';
import PublicNav from './PublicNav';

const FEATURES = [
  { icon: Sparkles, title: 'AI Resume Analysis', desc: 'Freelancers get an ATS-style analysis of their resume with skill extraction and improvement suggestions.' },
  { icon: Search, title: 'Smart Job Matching', desc: 'AI compares profiles and resumes to job requirements, showing matched and missing skills.' },
  { icon: FolderKanban, title: 'Projects & Milestones', desc: 'Structured workflow: proposals, hiring, milestones, submissions, reviews.' },
  { icon: CreditCard, title: 'Secure Payments', desc: 'Razorpay checkout with server-side signature verification for every payment.' },
  { icon: MessageSquare, title: 'Messaging', desc: 'Client-freelancer messaging that unlocks when the workflow permits it.' },
  { icon: ShieldCheck, title: 'Trust & Safety', desc: 'Role-based access, reviews, reporting and admin moderation.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Hire better. Work smarter. <span className="text-brand-600">Powered by AI.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          WorkWave connects clients with skilled freelancers — with AI-assisted matching, structured projects, secure payments, and built-in messaging.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/register" className="btn-primary px-6 py-3 text-base">Get started</Link>
          <Link to="/jobs" className="btn-secondary px-6 py-3 text-base">Browse jobs</Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card">
              <Icon className="h-7 w-7 text-brand-600" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
