import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamPage from '@/app/dashboard/team/page';
import { mockFrom, setMockDataMulti } from '../mocks/supabase';
import { mockGetCurrentUser } from '../mocks/supabase-auth';

jest.mock('@/lib/supabase', () => require('../mocks/supabase'));
jest.mock('@/lib/supabase-auth', () => require('../mocks/supabase-auth'));

describe('TeamPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' });
    setMockDataMulti({
      user_workspaces: [{ workspace_id: 'ws-123', user_id: 'test-user-id', role: 'owner', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z', id: 'uw-1' }],
      team_invitations: [],
    });
  });

  it('renders the page title', async () => {
    render(<TeamPage />);
    expect(screen.getByText('Team Management')).toBeInTheDocument();
    expect(screen.getByText('Invite team members and manage access')).toBeInTheDocument();
  });

  it('looks up workspace_id from user_workspaces', async () => {
    render(<TeamPage />);
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('user_workspaces');
    });
  });

  it('opens invite form when Invite Member is clicked', async () => {
    render(<TeamPage />);
    // Use getAllByText since "Invite Member" appears in header and empty state
    const buttons = screen.getAllByText('Invite Member');
    fireEvent.click(buttons[0]);
    expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
  });

  it('has role selector with member, admin, owner options', async () => {
    render(<TeamPage />);
    const buttons = screen.getAllByText('Invite Member');
    fireEvent.click(buttons[0]);
    const roleSelect = screen.getByDisplayValue('Member - Can view data');
    expect(roleSelect).toBeInTheDocument();
  });

  it('send invitation button is disabled when email is empty', async () => {
    render(<TeamPage />);
    const buttons = screen.getAllByText('Invite Member');
    fireEvent.click(buttons[0]);
    const sendBtn = screen.getByText('Send Invitation');
    expect(sendBtn).toBeDisabled();
  });

  it('cancel button hides the invite form', async () => {
    render(<TeamPage />);
    const buttons = screen.getAllByText('Invite Member');
    fireEvent.click(buttons[0]);
    expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Invite Team Member')).not.toBeInTheDocument();
  });

  it('uses dark theme classes', async () => {
    const { container } = render(<TeamPage />);
    expect(screen.getByText('Team Management').className).toContain('text-white');
    const html = container.innerHTML;
    expect(html).not.toContain('bg-white');
    expect(html).not.toContain('text-gray-900');
  });

  it('renders team members section header', async () => {
    render(<TeamPage />);
    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeInTheDocument();
    });
  });
});
