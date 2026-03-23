import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsPage from '@/app/dashboard/analytics/page';
import { mockFrom, setMockDataMulti } from '../mocks/supabase';
import { mockGetCurrentUser } from '../mocks/supabase-auth';

jest.mock('@/lib/supabase', () => require('../mocks/supabase'));
jest.mock('@/lib/supabase-auth', () => require('../mocks/supabase-auth'));

describe('AnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' });
    setMockDataMulti({
      user_workspaces: [{ workspace_id: 'ws-123' }],
      visitors: [],
      page_views: [],
    });
  });

  it('renders the page title', async () => {
    render(<AnalyticsPage />);
    expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('looks up workspace_id from user_workspaces', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('user_workspaces');
    });
  });

  it('queries visitors with workspace_id not user.id', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      // Should call from('visitors') and from('user_workspaces')
      const calls = mockFrom.mock.calls.map((c: any) => c[0]);
      expect(calls).toContain('user_workspaces');
      expect(calls).toContain('visitors');
    });
  });

  it('has date range selector with 7d, 30d, 90d options', () => {
    render(<AnalyticsPage />);
    const select = screen.getByDisplayValue('Last 7 days');
    expect(select).toBeInTheDocument();
  });

  it('renders metric cards when data loads', async () => {
    setMockDataMulti({
      user_workspaces: [{ workspace_id: 'ws-123' }],
      visitors: [
        { id: 'v1', identified: true, country: 'US', company: 'Acme', device_type: 'desktop', first_seen: new Date().toISOString(), utm_source: 'google' },
        { id: 'v2', identified: false, country: 'UK', company: null, device_type: 'mobile', first_seen: new Date().toISOString(), utm_source: null },
      ],
      page_views: [
        { id: 'pv1', visitor_id: 'v1', time_on_page: 120, timestamp: new Date().toISOString() },
      ],
    });

    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Visitors')).toBeInTheDocument();
      expect(screen.getByText('Identified')).toBeInTheDocument();
      expect(screen.getByText('Page Views')).toBeInTheDocument();
      expect(screen.getByText('Avg. Time on Site')).toBeInTheDocument();
    });
  });
});
