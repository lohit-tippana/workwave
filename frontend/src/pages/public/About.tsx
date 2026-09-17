import PublicNav from './PublicNav';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">About WorkWave</h1>
        <p className="mt-4 text-slate-600">
          WorkWave is an AI-assisted freelancer marketplace. Clients post projects, review proposals with
          AI-generated match analysis, hire freelancers, manage milestones, and pay securely via Razorpay.
          Freelancers build professional profiles, upload resumes for ATS-style AI analysis, discover jobs,
          get personalized recommendations, and submit proposals.
        </p>
        <h2 className="mt-8 text-xl font-semibold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-600">
          <li>Clients post jobs with skills, budget and deadlines — optionally analyzed by AI.</li>
          <li>Freelancers discover jobs through search, filters and AI recommendations.</li>
          <li>Proposals carry an AI match snapshot showing matched and missing skills.</li>
          <li>Accepting a proposal creates a project with milestones and messaging.</li>
          <li>Milestone work is submitted, reviewed, and paid through verified Razorpay checkout.</li>
          <li>Both sides review each other after project completion.</li>
        </ol>
        <p className="mt-8 text-sm text-slate-500">
          AI features provide decision-support only — all hiring and payment decisions are made by people.
        </p>
      </div>
    </div>
  );
}
