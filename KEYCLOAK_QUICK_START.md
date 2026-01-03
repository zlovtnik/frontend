# Frontend Keycloak Integration - Quick Reference

## What Changed

The frontend has been updated to support **Keycloak OAuth2/OIDC authentication** in addition to the existing direct login (username/password).

## Quick Start

### 1. Configure Environment Variables

Create or update `.env` with Keycloak settings:

```env
VITE_API_URL=http://localhost:8000/api
VITE_KEYCLOAK_ISSUER_URL=http://localhost:8180/realms/master
VITE_KEYCLOAK_CLIENT_ID=middleware-app
VITE_KEYCLOAK_REDIRECT_URL=http://localhost:3000/auth/callback
```

### 2. Run the Application

```bash
cd frontend
npm install
npm run dev
```

### 3. Test Login

- Visit `http://localhost:5173`
- Login page shows two options:
  - **Direct Login**: Enter username/email, password, tenant ID
  - **Sign In with Keycloak**: Click to use OAuth2 (if configured)

### 4. Keycloak Login Flow

1. Click "Sign In with Keycloak"
2. Redirected to Keycloak login page
3. Enter credentials
4. Grant consent (if first time)
5. Redirected back to app dashboard

## Files Added/Modified

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useKeycloakAuth.ts` | OAuth2 authentication hook |
| `src/pages/OAuthCallbackPage.tsx` | Handles OAuth callback redirect |
| `KEYCLOAK_INTEGRATION_GUIDE.md` | Detailed integration documentation |
| `.env.example.keycloak` | Environment variable example |

### Modified Files

| File | Changes |
|------|---------|
| `src/config/env.ts` | Added Keycloak config variables |
| `src/pages/LoginPage.fp.tsx` | Added "Sign In with Keycloak" button |
| `src/App.tsx` | Added `/auth/callback` route |

## Configuration

### Environment Variables Required

**For Direct Login (Always works):**
```env
VITE_API_URL=http://localhost:8000/api
```

**For Keycloak OAuth2 (Optional):**
```env
VITE_KEYCLOAK_ISSUER_URL=<keycloak-issuer-url>
VITE_KEYCLOAK_CLIENT_ID=<keycloak-client-id>
VITE_KEYCLOAK_REDIRECT_URL=http://localhost:3000/auth/callback
```

If Keycloak variables are NOT set:
- Only direct login appears
- OAuth2 button is hidden
- App works normally with username/password

### Backend Configuration Required

Backend must have Keycloak configured:

```env
KEYCLOAK_ISSUER_URL=http://localhost:8180/realms/master
KEYCLOAK_CLIENT_ID=middleware-app
KEYCLOAK_CLIENT_SECRET=your_secret
KEYCLOAK_REDIRECT_URL=http://localhost:8000/api/callback
SESSION_ENCRYPTION_KEY=base64_encoded_key
```

Routes:
- `GET /api/auth/login/keycloak` - Start OAuth2 flow
- `GET /api/callback` - Handle OAuth callback

### Keycloak Configuration Required

In Keycloak Admin Console:

1. **Create Client** named `middleware-app`
2. **Set Access Type**: public (for frontend without client secret)
3. **Add Valid Redirect URIs**:
   - `http://localhost:8000/api/callback`
   - `http://localhost:3000/auth/callback` (if frontend is separate)
4. **Add Web Origins**:
   - `http://localhost:8000`
   - `http://localhost:3000`
   - `http://localhost:5173`

## OAuth2 Flow

```
User clicks "Sign In with Keycloak"
         ↓
Frontend redirects to: /api/auth/login/keycloak
         ↓
Backend generates OAuth authorization URL + PKCE + CSRF
         ↓
Frontend redirected to Keycloak login page
         ↓
User enters credentials + grants consent
         ↓
Keycloak redirects to: /api/callback?code=...&state=...
         ↓
Backend exchanges code for tokens (validates CSRF + PKCE)
         ↓
Backend sets secure HttpOnly cookies
         ↓
Frontend at /auth/callback processes response
         ↓
Redirects to dashboard (authenticated)
```

## Security Features

✅ **PKCE**: Prevents authorization code interception  
✅ **CSRF Token (state)**: Prevents CSRF attacks  
✅ **Nonce**: Prevents replay attacks  
✅ **HttpOnly Cookies**: Protects tokens from XSS  
✅ **Session TTL**: 10-minute window prevents stale sessions  
✅ **JWT Validation**: Signature, issuer, audience checked  

## Troubleshooting

### OAuth Button Not Showing

**Cause**: Keycloak environment variables not set

**Fix**: 
```env
# These must be set:
VITE_KEYCLOAK_ISSUER_URL=...
VITE_KEYCLOAK_CLIENT_ID=...
```

### Redirect to Keycloak Fails

**Cause**: Backend not running or URL incorrect

**Fix**:
- Verify backend is running on port 8000
- Check VITE_API_URL points to correct backend
- Check backend has Keycloak configured

### "Invalid redirect_uri" Error

**Cause**: URL mismatch between frontend config and Keycloak

**Fix**:
```
Backend: KEYCLOAK_REDIRECT_URL=http://localhost:8000/api/callback
Keycloak: Valid Redirect URIs should include both:
  - http://localhost:8000/api/callback (backend handles code exchange)
  - http://localhost:3000/auth/callback (frontend handles callback)
Frontend: VITE_KEYCLOAK_REDIRECT_URL=http://localhost:3000/auth/callback
```

### Browser Blocks Cookies

**Cause**: Cookies needed for OAuth state storage

**Fix**:
- Allow cookies in browser privacy settings
- Try disabling privacy/tracking protection for localhost
- Test in incognito window if normal window doesn't work

### Session Expired at Callback

**Cause**: Took longer than 10 minutes to log in

**Fix**:
- Log in more quickly
- Or increase SESSION_ENCRYPTION_KEY timeout in backend (careful with security)

## Monitoring

### Backend Logs

Look for these messages when using OAuth2:

```
✅ "Keycloak: Fetching metadata from ..."
✅ "OAuth session state stored with CSRF token: ..."
✅ "OAuth2 authorization URL generated"
❌ "OAuth error from Keycloak: ..."
❌ "Failed to retrieve OAuth session state: ..."
```

### Browser Console

Look for:
```
✅ No errors about CORS or credentials
✅ Redirects to Keycloak login
✅ Returns from /auth/callback with tokens
❌ 401/403 from API endpoints
❌ Network errors connecting to Keycloak
```

## Switching Between Direct and OAuth2

You don't have to choose! Both work simultaneously:

1. **Direct Login**: Always available if backend is running
2. **OAuth2 Button**: Only shown if Keycloak env vars are set

Users can choose which method to use.

## Next Steps

1. **Set Environment Variables**: Copy `.env.example.keycloak` to `.env` and fill in values
2. **Verify Backend**: Ensure backend is running with Keycloak configured
3. **Test Login**: Try both direct and OAuth2 login methods
4. **Check Logs**: Monitor both backend and browser console for errors
5. **Deploy**: Once working locally, deploy to staging/production with correct URLs

## Support

For detailed information, see `KEYCLOAK_INTEGRATION_GUIDE.md`

For backend integration, see `actix-web-rest-api-with-jwt/KEYCLOAK_OAUTH2_VERIFICATION.md`

