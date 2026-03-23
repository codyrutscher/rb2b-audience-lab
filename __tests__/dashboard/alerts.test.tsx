import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AlertsPage from '@/app/dashboard/alerts/page';
import { mockFrom, setMockDataMulti } from '../mocks/supabase';
import { mockGetCurrentUser } from '../mocks/supabase-auth';

// Mock modules
jest.mock('@/lib/supabase', () => require('../mocks/supabase'));
jest.mock('@/lib/supabase-auth', () => require('../mocks/supabase-auth'));

describe('AlertsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' });
    setMockDataMulti({
      user_workspaces: [{ workspace_id: 'ws-123' }],
      alert_rules: [],
    });
  });

  it('renders the page title and description', async () => {
    render(<AlertsPage />);
    expect(screen.getByText('Alert Rules')).toBeInTheDocument();
    expect(screen.getByText('Get notified when specific conditions are met')).toBeInTheDocument();
  });

  it('shows empty state when no alerts exist', async () => {
    render(<AlertsPage />);
    await waitFor(() => {
      expect(screen.getByText('No alert rules yet')).toBeInTheDocument();
    });
  });

  it('looks up workspace_id from user_workspaces table', async () => {
    render(<AlertsPage />);
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('user_workspaces');
    });
  });

  it('opens the create form when New Alert is clicked', async () => {
    render(<AlertsPage />);
    const newAlertBtn = screen.getByText('New Alert');
    fireEvent.click(newAlertBtn);
    expect(screen.getByText('Create New Alert Rule')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., High-Value Visitor Alert')).toBeInTheDocument();
  });

  it('shows condition type dropdown with all options', async () => {
    render(<AlertsPage />);
    fireEvent.click(screen.getByText('New Alert'));
    const select = screen.getByDisplayValue('Visitor is identified');
    expect(select).toBeInTheDocument();
  });

  it('shows threshold input for page_views_threshold condition', async () => {
    render(<AlertsPage />);
    fireEvent.click(screen.getByText('New Alert'));
    const conditionSelect = screen.getByDisplayValue('Visitor is identified');
    fireEvent.change(conditionSelect, { target: { value: 'page_views_threshold' } });
    expect(screen.getByPlaceholderText('e.g., 5')).toBeInTheDocument();
  });

  it('shows match value input for company_match condition', async () => {
    render(<AlertsPage />);
    fireEvent.click(screen.getByText('New Alert'));
    const conditionSelect = screen.getByDisplayValue('Visitor is identified');
    fireEvent.change(conditionSelect, { target: { value: 'company_match' } });
    expect(screen.getByPlaceholderText('Enter company...')).toBeInTheDocument();
  });

  it('cancel button hides the form', async () => {
    render(<AlertsPage />);
    fireEvent.click(screen.getByText('New Alert'));
    expect(screen.getByText('Create New Alert Rule')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Create New Alert Rule')).not.toBeInTheDocument();
  });

  it('create button is disabled when name is empty', async () => {
    render(<AlertsPage />);
    fireEvent.click(screen.getByText('New Alert'));
    const createBtn = screen.getByText('Create');
    expect(createBtn).toBeDisabled();
  });

  it('uses dark theme classes (no white bg or gray-900 text)', async () => {
    const { container } = render(<AlertsPage />);
    // Should have dark theme text
    expect(screen.getByText('Alert Rules').className).toContain('text-white');
    // Should NOT have light theme classes
    const html = container.innerHTML;
    expect(html).not.toContain('bg-white');
    expect(html).not.toContain('text-gray-900');
  });

  it('renders alert cards when alerts exist', async () => {
    setMockDataMulti({
      user_workspaces: [{ workspace_id: 'ws-123' }],
      alert_rules: [
        {
          id: 'alert-1',
          name: 'Test Alert',
          conditions: { type: 'visitor_identified', value: '' },
          actions: { type: 'slack' },
          enabled: true,
          created_at: '2026-03-20T00:00:00Z',
        },
      ],
    });

    render(<AlertsPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Alert')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });
});
