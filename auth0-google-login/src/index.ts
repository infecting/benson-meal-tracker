import express from 'express';
import dotenv from 'dotenv';
import { auth, requiresAuth } from 'express-openid-connect';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const config = {
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
    connection: 'google-oauth2' // Only Allows Google login
  }
};

// Attach Auth0 routes
app.use(auth(config));

// Home route
app.get('/', (req, res) => {
  res.send(req.oidc.isAuthenticated()
    ? `Logged in as ${req.oidc.user?.name} <a href="/logout">Logout</a>`
    : `Not logged in. <a href="/login">Login</a>`);
});

// Protected route
app.get('/profile', requiresAuth(), (req, res) => {
  res.send(`<pre>${JSON.stringify(req.oidc.user, null, 2)}</pre>`);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
