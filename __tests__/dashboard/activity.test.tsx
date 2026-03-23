import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActivityFeedPage from '@/app/dashboard/activity/page';
import { mockFrom, setMockDataMulti } from '../mocks/supabase';

jest.mock('@/lib/supabase', () => require('../mocks/supabase'));
jest.mock('@/lib/supabase-auth', () => require('../mocks/supabase-auth'));

// Mock fetch for the seed endpoint
const mockFetch = jest.fn();
global.fetch = mockFetch;

function getSeedButton() {
  // The button text is split by emoji: "🧪 " + "Seed Test Data" / "Seeding..."
  return screen.getByRole('button', { name: /seed test data/i });
}

describe('ActivityFeedPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockDataMulti({
      activity_feed: [],
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ activityEventsCreated: 65, pageViewsCreated: 40 }),
    });
  });

  it('renders the page title', () => {
    render(<ActivityFeedPage />);
    expect(screen.getByText('Real-Time Activity')).toBeInTheDocument();
  });

  it('shows the live indicator', () => {
    render(<ActivityFeedPage />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('has a Seed Test Data button', () => {
    render(<ActivityFeedPage />);
    expect(getSeedButton()).toBeInTheDocument();
  });

  it('has activity type filter dropdown', () => {
    render(<ActivityFeedPage />);
    const select = screen.getByDisplayValue('All Activity');
    expect(select).toBeInTheDocument();
  });

  it('shows empty state when no activities', async () => {
    render(<ActivityFeedPage />);
    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
  });

  it('calls seed endpoint when Seed Test Data is clicked', async () => {
    render(<ActivityFeedPage />);
    fireEvent.click(getSeedButton());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reactivate/test/seed-activity',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows success message after seeding', async () => {
    render(<ActivityFeedPage />);
    fireEvent.click(getSeedButton());

    await waitFor(() => {
      expect(screen.getByText(/Created 65 activity events and 40 page views/)).toBeInTheDocument();
    });
  });

  it('renders activity items when data exists', async () => {
    setMockDataMulti({
      activity_feed: [
        {
          id: 'a1',
          activity_type: 'page_view',
          title: 'John viewed Pricing',
          description: '/pricing',
          metadata: { url: '/pricing' },
          timestamp: new Date().toISOString(),
          visitor_id: 'v1',
        },
        {
          id: 'a2',
          activity_type: 'button_clicked',
          title: 'Jane clicked "Get Started"',
          description: 'Button: Get Started',
          metadata: {},
          timestamp: new Date().toISOString(),
          visitor_id: 'v2',
        },
      ],
    });

    render(<ActivityFeedPage />);
    await waitFor(() => {
      expect(screen.getByText('John viewed Pricing')).toBeInTheDocument();
      expect(screen.getByText('Jane clicked "Get Started"')).toBeInTheDocument();
    });
  });

  it('filters activities by type', async () => {
    setMockDataMulti({
      activity_feed: [
        { id: 'a1', activity_type: 'page_view', title: 'Page View Event', timestamp: new Date().toISOString() },
        { id: 'a2', activity_type: 'button_clicked', title: 'Click Event', timestamp: new Date().toISOString() },
      ],
    });

    render(<ActivityFeedPage />);
    await waitFor(() => {
      expect(screen.getByText('Page View Event')).toBeInTheDocument();
      expect(screen.getByText('Click Event')).toBeInTheDocument();
    });

    const filterSelect = screen.getByDisplayValue('All Activity');
    fireEvent.change(filterSelect, { target: { value: 'page_view' } });

    expect(screen.getByText('Page View Event')).toBeInTheDocument();
    expect(screen.queryByText('Click Event')).not.toBeInTheDocument();
  });
});
