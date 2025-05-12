import request from 'supertest';
import app from './index'; // Import the app from index.ts

describe('GET /', () => {
  it('should respond with the logged-in user message and a logout link if authenticated', async () => {
    // Mocking a logged-in user
    const mockUser = { name: 'John Doe' };
    jest.spyOn(app.request, 'oidc').mockReturnValue({ isAuthenticated: () => true, user: mockUser });

    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Logged in as John Doe');
    expect(response.text).toContain('/logout');
  });
});
