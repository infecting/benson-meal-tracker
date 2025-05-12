import express, { Request, Response } from 'express'; // Import Request and Response types
import dotenv from 'dotenv';
import { auth, requiresAuth } from 'express-openid-connect';
import request from 'supertest';

dotenv.config();

const app = express();

// Set up Auth0 middleware
app.use(auth({
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET!,
  baseURL: process.env.AUTH0_BASE_URL!,
  clientID: process.env.AUTH0_CLIENT_ID!,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email',
    connection: 'google-oauth2'
  }
}));

// Home route (with typed parameters)
app.get('/', (req: Request, res: Response) => {
  res.send(req.oidc.isAuthenticated() 
    ? `Logged in as ${req.oidc.user?.name} <a href="/logout">Logout</a>` 
    : `Not logged in. <a href="/login">Login</a>`);
});

// Logout route (with typed parameters)
app.get('/logout', (req: Request, res: Response) => {
  // Redirect to Auth0 logout endpoint with the returnTo parameter to specify the post-logout redirect URI
  res.redirect(`https://${process.env.AUTH0_DOMAIN}/v2/logout?returnTo=http://localhost:3000/logged-out`);
});

// Logged out route (to confirm logout)
app.get('/logged-out', (req: Request, res: Response) => {
  res.send('You have been logged out.');
});

// Test routes
const testRoutes = async () => {
  // Test 1: Test the Home Route
  const res1 = await request(app).get('/');
  if (res1.text.includes('Not logged in')) {
    console.log('Test 1 Passed: Home route displays login link when not authenticated');
  } else {
    console.log('Test 1 Failed');
  }

  // Test 3: Test the Logout Route (Redirects to /logged-out)
  const res3 = await request(app).get('/logout');
  if (res3.status === 302 && res3.header.location === 'http://localhost:3000') {
    console.log('Test 2 Passed: Logout route redirects to home');
  } else {
    console.log('Test 2 Failed');
  }
};

// Run tests
testRoutes().then(() => process.exit(0));
