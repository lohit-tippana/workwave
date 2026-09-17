import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const JOB = {
  _id: 'job123', title: 'Build a React dashboard', status: 'OPEN', category: 'Web Development',
  budget: 800, budgetType: 'fixed', proposalCount: 1, requiredSkills: ['react'],
  experienceLevel: 'intermediate', description: 'x'.repeat(60), createdAt: new Date().toISOString(),
};

const PROPOSAL = {
  _id: 'prop1',
  jobId: 'job123',
  freelancerId: { _id: 'f1', name: 'Test Freelancer', headline: 'Dev', skills: ['react'], yearsOfExperience: 2, rating: 0, reviewCount: 0, hourlyRate: 10 },
  coverLetter: 'I can do this job well.',
  proposedAmount: 500, estimatedDays: 5, status: 'PENDING',
  aiMatch: { matchScore: 80, matchedSkills: ['react'], missingSkills: ['aws'], disclaimer: 'estimate' },
  createdAt: new Date().toISOString(),
};

describe('My Jobs -> Proposals navigation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the Proposals link pointing at the proposals route', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.startsWith('/jobs/mine')) return Promise.resolve({ data: { data: { results: [JOB], page: 1, limit: 10, total: 1, totalPages: 1 } } });
      return Promise.reject(new Error('unexpected ' + url));
    });
    const ClientJobs = (await import('../pages/client/ClientJobs')).default;
    render(<MemoryRouter><ClientJobs /></MemoryRouter>);
    const link = await screen.findByRole('link', { name: 'Proposals' });
    expect(link).toHaveAttribute('href', '/client/jobs/job123/proposals');
  });

  it('JobProposals renders the proposals screen for a job with proposals', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.startsWith('/proposals/job/')) return Promise.resolve({ data: { data: { results: [PROPOSAL], job: { _id: 'job123', title: JOB.title, status: 'OPEN' } } } });
      return Promise.reject(new Error('unexpected ' + url));
    });
    const JobProposals = (await import('../pages/client/JobProposals')).default;
    render(
      <MemoryRouter initialEntries={[`/client/jobs/job123/proposals`]}>
        <Routes><Route path="/client/jobs/:id/proposals" element={<JobProposals />} /></Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText('Test Freelancer')).toBeInTheDocument();
    expect(screen.getByText(/I can do this job well/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hire/i })).toBeInTheDocument();
  });

  it('shows empty state for a job with zero proposals', async () => {
    (api.get as any).mockResolvedValue({ data: { data: { results: [], job: { _id: 'job123', title: JOB.title, status: 'OPEN' } } } });
    const JobProposals = (await import('../pages/client/JobProposals')).default;
    render(
      <MemoryRouter initialEntries={[`/client/jobs/job123/proposals`]}>
        <Routes><Route path="/client/jobs/:id/proposals" element={<JobProposals />} /></Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText('No proposals yet')).toBeInTheDocument();
  });
});
