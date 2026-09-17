import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatusBadge, EmptyState, SkillChips } from '../components/ui';

vi.mock('../services/api', () => ({
  default: { get: vi.fn().mockRejectedValue(new Error('no backend')), post: vi.fn() },
}));

describe('ui components', () => {
  it('renders a status badge with readable text', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
  });

  it('renders an empty state with hint', () => {
    render(<EmptyState title="No jobs found" hint="Try filters" />);
    expect(screen.getByText('No jobs found')).toBeInTheDocument();
    expect(screen.getByText('Try filters')).toBeInTheDocument();
  });

  it('renders skill chips', () => {
    render(<SkillChips skills={['react', 'node.js']} variant="matched" />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('node.js')).toBeInTheDocument();
  });
});

describe('login page', () => {
  it('renders the login form', async () => {
    const { AuthProvider } = await import('../context/AuthContext');
    const Login = (await import('../pages/auth/Login')).default;
    render(
      <MemoryRouter>
        <AuthProvider><Login /></AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });
});
