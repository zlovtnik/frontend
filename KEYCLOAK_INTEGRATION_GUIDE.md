# Keycloak OAuth2 Integration Guide - Frontend

## Overview

The frontend has been updated to support Keycloak OAuth2/OIDC authentication alongside the existing direct login (username/password) method. This guide explains the integration, configuration, and how the OAuth2 flow works.

## Architecture

The Keycloak OAuth2 flow uses the Authorization Code flow with PKCE protection:

```
Frontend              Backend (Actix Web)        Keycloak
   |                       |                         |
   |---(1) Login Click---->|                         |
   |                       |---(2) Generate Auth URL-|
   |                       |       + PKCE + CSRF     |
   |                       |<------(3) Auth URL-------
   |<----Redirect URL------|
   |
   |---------(4) Redirect to Keycloak Auth URL-------->|
   |                                                   |
   |<---------- User logs in, grants consent ----------|
   |
   |----(5) Callback with Auth Code + State---------->|
   |                       |
   |                       |---(6) Exchange Code for Tokens
   |                       |       Validate CSRF + nonce
   |                       |<-----ID Token + Access Token
   |                       |
   |<------Set Cookie-----|
   |
   |---------(7) Process Callback + Redirect--------->|
   |                       |
   |          (Dashboard)
```

## Frontend Components

### 1. Environment Configuration (`src/config/env.ts`)

Added Keycloak environment variables:

```typescript
interface EnvConfig {
  // ... existing config
  keycloakIssuerUrl?: string;      // Keycloak realm issuer URL
  keycloakClientId?: string;        // OAuth client ID
  keycloakRedirectUrl?: string;     // Frontend callback URL
  useKeycloakOAuth?: boolean;       // Enable/disable OAuth2
}
```

**Environment Variables to Set:**

```dotenv
# .env (Frontend)
VITE_KEYCLOAK_ISSUER_URL=http://localhost:8180/realms/master
VITE_KEYCLOAK_CLIENT_ID=middleware-app
VITE_KEYCLOAK_REDIRECT_URL=http://localhost:3000/auth/callback
```

### 2. Keycloak Auth Hook (`src/hooks/useKeycloakAuth.ts`)

Manages the OAuth2 flow:

```typescript
const { initiateKeycloakLogin, handleKeycloakCallback, isKeycloakEnabled } = useKeycloakAuth();

// Start OAuth2 login
await initiateKeycloakLogin();  // Redirects to /api/auth/login/keycloak

// Process callback after Keycloak redirects back
const authResponse = await handleKeycloakCallback();
```

### 3. Login Page Updates (`src/pages/LoginPage.fp.tsx`)

Added Keycloak login button:

- **Direct Login**: Traditional username/password/tenantId form
- **Keycloak OAuth2**: "Sign In with Keycloak" button (shown if enabled)

```tsx
{isKeycloakEnabled && (
  <Button
    type="default"
    onClick={initiateKeycloakLogin}
  >
    Sign In with Keycloak
  </Button>
)}
```

### 4. OAuth Callback Handler (`src/pages/OAuthCallbackPage.tsx`)

Routes: `/auth/callback`

Handles the redirect from Keycloak:

1. Checks for OAuth errors
2. Calls `handleKeycloakCallback()` to process tokens
3. Redirects to dashboard on success
4. Shows error page on failure

**Error Handling:**
- Invalid OAuth code
- CSRF token mismatch
- Session expired
- Nonce validation failure

## OAuth2 Flow Details

### Step 1: Frontend Initiates Login

User clicks "Sign In with Keycloak" button:

```typescript
// Frontend calls
window.location.href = `${apiUrl}/auth/login/keycloak`;
```

### Step 2: Backend Generates Authorization URL

Backend (`src/api/account_controller.rs::keycloak_login`):

```rust
1. Generates PKCE challenge (code_verifier + code_challenge)
2. Generates CSRF token (state parameter)
3. Generates nonce (replay attack prevention)
4. Stores all 3 in secure HttpOnly, SameSite=Strict cookie
5. Returns authorization URL to Keycloak
```

### Step 3: User Logs in at Keycloak

Keycloak presents login page where user enters credentials and grants consent.

### Step 4: Keycloak Redirects Back

Keycloak redirects to:
```
GET /api/callback?code=AUTHORIZATION_CODE&state=CSRF_TOKEN
```

### Step 5: Backend Exchanges Code for Tokens

Backend (`src/api/account_controller.rs::keycloak_callback`):

```rust
1. Retrieves stored OAuth state from secure cookie
2. Validates state parameter matches CSRF token
3. Validates session is not expired (10-minute window)
4. Exchanges authorization code for tokens using PKCE verifier
5. Validates ID token nonce matches stored value
6. Sets secure HttpOnly cookie with tokens
7. Redirects to /auth/callback or returns JSON
```

**Security Measures:**
- PKCE: Prevents authorization code interception attacks
- CSRF Token (state): Prevents CSRF attacks
- Nonce: Prevents replay attacks
- Session TTL: 10 minutes (prevents stale sessions)
- HttpOnly Cookies: Prevents XSS token extraction

### Step 6: Frontend Processes Callback

Frontend (`OAuthCallbackPage.tsx`):

```typescript
1. Detects redirect from Keycloak
2. Calls handleKeycloakCallback()
3. Retrieves token from cookies or API response
4. Stores token in localStorage
5. Updates auth context
6. Redirects to dashboard
```

## Configuration

### Backend Configuration

**File:** `.env` (Backend)

```dotenv
KEYCLOAK_ISSUER_URL=http://localhost:8180/realms/master
KEYCLOAK_CLIENT_ID=middleware-app
KEYCLOAK_CLIENT_SECRET=your_client_secret
KEYCLOAK_REDIRECT_URL=http://localhost:8000/api/callback

# Session encryption key for OAuth state storage
SESSION_ENCRYPTION_KEY=base64_encoded_64_byte_key
```

### Frontend Configuration

**File:** `.env` (Frontend)

```dotenv
VITE_API_URL=http://localhost:8000/api
VITE_KEYCLOAK_ISSUER_URL=http://localhost:8180/realms/master
VITE_KEYCLOAK_CLIENT_ID=middleware-app
VITE_KEYCLOAK_REDIRECT_URL=http://localhost:3000/auth/callback
```

### Keycloak Configuration

**Realm:** `master` (or your chosen realm)

**Client:** `middleware-app`

1. **Settings Tab:**
   - Client ID: `middleware-app`
   - Client Protocol: `openid-connect`
   - Access Type: `public` or `confidential`

2. **Valid Redirect URIs:**
   ```
   http://localhost:8000/api/callback
   http://localhost:8080/api/callback
   ```

3. **Web Origins:**
   ```
   http://localhost:8000
   http://localhost:8080
   http://localhost:3000
   http://localhost:5173
   ```

4. **Scopes:**
   - `openid` (required for OIDC)
   - `profile` (user profile info)
   - `email` (user email)

## Running Locally

### Start Services

```bash
# Start Keycloak
docker-compose -f docker-compose.local.yml up keycloak postgres

# Start backend
cd actix-web-rest-api-with-jwt
cargo run

# Start frontend
cd frontend
npm run dev
```

### Test OAuth2 Flow

1. **Visit:** `http://localhost:5173` (or your Vite dev server)
2. **Click:** "Sign In with Keycloak"
3. **Expected:** Redirects to Keycloak login page
4. **Login:** Use Keycloak credentials
5. **Expected:** Redirects back to `/auth/callback`
6. **Expected:** Shows loading, then redirects to dashboard

### Verify Logs

**Backend:**
```
OAuth session state stored with CSRF token: xxx
OAuth authorization URL generated for client_id: middleware-app
OAuth2 authorization URL generated for client_id: middleware-app
```

**Frontend:** (Browser console)
```
Keycloak OAuth2 login initiated
Processing OAuth callback...
Authentication successful
```

## Troubleshooting

### Issue: "Invalid redirect_uri" Error

**Cause:** Redirect URL mismatch between Keycloak and environment config

**Fix:**
```bash
# Verify they match exactly (including scheme, host, path)
# Backend
echo $KEYCLOAK_REDIRECT_URL
# Should be: http://localhost:8000/api/callback

# Keycloak admin console
# Clients > middleware-app > Settings > Valid Redirect URIs
# Should include: http://localhost:8000/api/callback
```

### Issue: "Session Expired" at Callback

**Cause:** 
- Session state cookie not preserved across redirects
- Took longer than 10 minutes to log in

**Fix:**
- Enable cookies in browser
- Clear cookies and try again
- Check browser privacy/incognito mode isn't blocking cookies

### Issue: CSRF Token Mismatch

**Cause:** Session cookie lost or state parameter modified

**Fix:**
- Don't block cookies
- Use incognito window
- Check browser console for errors
- Verify KEYCLOAK_REDIRECT_URL matches exactly

### Issue: Nonce Validation Fails

**Cause:** ID token nonce doesn't match stored value

**Fix:**
- Check backend logs for nonce value
- Verify Keycloak is returning nonce in ID token
- Ensure system clock skew < 30 seconds

## Security Considerations

1. **Never Store Tokens in localStorage Alone**
   - Tokens are stored as HttpOnly cookies on backend
   - Frontend stores only in localStorage as fallback
   - XSS attack cannot extract tokens from cookies

2. **HTTPS in Production**
   - Keycloak redirect URLs must use HTTPS
   - Secure flag set on cookies
   - SameSite=Strict enforced

3. **Session Management**
   - OAuth state expires after 10 minutes
   - Tokens have standard JWT expiration
   - Implement token refresh strategy

4. **Token Validation**
   - Backend validates JWT signature using JWKS
   - Validates issuer (iss) claim
   - Validates audience (aud) claim contains client_id
   - Validates nonce from ID token

## Backend Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login/keycloak` | GET | Initiate OAuth2 flow |
| `/api/callback` | GET | Handle OAuth callback from Keycloak |
| `/api/auth/login` | POST | Direct login (username/password) |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/refresh` | POST | Refresh token |

## Next Steps

1. **Set Environment Variables**
   - Frontend: `.env` with Keycloak URLs
   - Backend: `.env` with Keycloak credentials

2. **Test OAuth2 Flow**
   - Click "Sign In with Keycloak" on login page
   - Verify redirect to Keycloak
   - Verify user can log in
   - Verify redirect back to app

3. **Monitor Logs**
   - Check backend logs for OAuth errors
   - Check browser console for frontend errors
   - Enable debug logging if needed

4. **Customize (Optional)**
   - Add user claims extraction from ID token
   - Implement token refresh strategy
   - Add social login providers to Keycloak

## References

- [OpenID Connect Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)
- [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [Keycloak Admin Console](http://localhost:8180/admin)
- [Backend Keycloak Integration](/Users/rcs/git/fire/actix-web-rest-api-with-jwt/KEYCLOAK_OAUTH2_VERIFICATION.md)

