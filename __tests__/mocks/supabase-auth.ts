export const mockGetCurrentUser = jest.fn().mockResolvedValue({
  id: 'test-user-id',
  email: 'test@example.com',
});

export const getCurrentUser = mockGetCurrentUser;
