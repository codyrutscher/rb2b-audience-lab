// Chainable query builder mock
function createQueryBuilder(data: any[] = []) {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: data[0] || null, error: null }),
    then: undefined as any,
  };
  // Make the builder itself thenable so `await supabase.from(...).select(...)` resolves
  builder.then = (resolve: any) => resolve({ data, error: null });
  return builder;
}

export const mockFrom = jest.fn().mockReturnValue(createQueryBuilder([]));

export const mockSignOut = jest.fn().mockResolvedValue({});

export const supabase = {
  from: mockFrom,
  auth: { signOut: mockSignOut },
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  }),
  removeChannel: jest.fn(),
};

export function setMockData(table: string, data: any[]) {
  mockFrom.mockImplementation((t: string) => {
    if (t === table) return createQueryBuilder(data);
    return createQueryBuilder([]);
  });
}

export function setMockDataMulti(tableData: Record<string, any[]>) {
  mockFrom.mockImplementation((t: string) => {
    return createQueryBuilder(tableData[t] || []);
  });
}
