/**
 * @jest-environment node
 * 
 * Unit tests for the seed-activity API route logic.
 * Uses node environment since NextRequest requires Web API globals.
 */

const mockGetAccountIdFromRequest = jest.fn();
const mockPrisma = {
  rtAccount: {
    findUnique: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
};

jest.mock('@/lib/reactivate/auth', () => ({
  getAccountIdFromRequest: (...args: any[]) => mockGetAccountIdFromRequest(...args),
}));

jest.mock('@/lib/reactivate/db', () => ({
  prisma: mockPrisma,
}));

import { POST } from '@/app/api/reactivate/test/seed-activity/route';
import { NextRequest } from 'next/server';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/reactivate/test/seed-activity', {
    method: 'POST',
  });
}

describe('POST /api/reactivate/test/seed-activity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAccountIdFromRequest.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when account not found', async () => {
    mockGetAccountIdFromRequest.mockResolvedValue('account-123');
    mockPrisma.rtAccount.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Account not found');
  });

  it('returns 400 when no visitors exist', async () => {
    mockGetAccountIdFromRequest.mockResolvedValue('account-123');
    mockPrisma.rtAccount.findUnique.mockResolvedValue({ workspaceId: 'ws-123' });
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('No visitors found');
  });

  it('creates activity events and page views when visitors exist', async () => {
    mockGetAccountIdFromRequest.mockResolvedValue('account-123');
    mockPrisma.rtAccount.findUnique.mockResolvedValue({ workspaceId: 'ws-123' });
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: 'v1', name: 'John Doe', session_id: 'sess-1' },
      { id: 'v2', name: 'Jane Smith', session_id: 'sess-2' },
    ]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue(undefined);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.activityEventsCreated).toBe(65);
    expect(body.pageViewsCreated).toBe(40);
    expect(body.visitorsUsed).toBe(2);
  });

  it('inserts into activity_feed and page_views tables', async () => {
    mockGetAccountIdFromRequest.mockResolvedValue('account-123');
    mockPrisma.rtAccount.findUnique.mockResolvedValue({ workspaceId: 'ws-123' });
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: 'v1', name: 'Test User', session_id: 'sess-1' },
    ]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue(undefined);

    await POST(makeRequest());

    const calls = mockPrisma.$queryRawUnsafe.mock.calls;
    const activityInserts = calls.filter((c: any) => c[0].includes('INSERT INTO activity_feed'));
    const pageViewInserts = calls.filter((c: any) => c[0].includes('INSERT INTO page_views'));

    expect(activityInserts.length).toBe(65);
    expect(pageViewInserts.length).toBe(40);
  });

  it('generates all three activity types', async () => {
    mockGetAccountIdFromRequest.mockResolvedValue('account-123');
    mockPrisma.rtAccount.findUnique.mockResolvedValue({ workspaceId: 'ws-123' });
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: 'v1', name: 'Test', session_id: 's1' },
    ]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue(undefined);

    await POST(makeRequest());

    const calls = mockPrisma.$queryRawUnsafe.mock.calls;
    const types = calls
      .filter((c: any) => c[0].includes('INSERT INTO activity_feed'))
      .map((c: any) => {
        if (c[0].includes("'page_view'")) return 'page_view';
        if (c[0].includes("'button_clicked'")) return 'button_clicked';
        if (c[0].includes("'form_submitted'")) return 'form_submitted';
        return 'unknown';
      });

    expect(types.filter((t: string) => t === 'page_view').length).toBe(40);
    expect(types.filter((t: string) => t === 'button_clicked').length).toBe(15);
    expect(types.filter((t: string) => t === 'form_submitted').length).toBe(10);
  });
});
