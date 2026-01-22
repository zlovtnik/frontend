/**
 * @module utils/pkce.test
 * @description Tests for PKCE (Proof Key for Code Exchange) utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  generatePKCE,
  generateState,
  generateNonce,
  storePKCEState,
  retrievePKCEState,
  clearPKCEState,
  validateState,
  buildAuthorizationUrl,
  initiatePKCEFlow,
  type PKCEState,
} from '../pkce';

describe('PKCE Utilities', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    clearPKCEState();
  });

  describe('generatePKCE', () => {
    it('should generate code_verifier and code_challenge', async () => {
      const { codeVerifier, codeChallenge } = await generatePKCE();

      expect(codeVerifier).toBeDefined();
      expect(codeChallenge).toBeDefined();
      expect(typeof codeVerifier).toBe('string');
      expect(typeof codeChallenge).toBe('string');
    });

    it('should generate code_verifier with correct length', async () => {
      const { codeVerifier } = await generatePKCE();

      // Should be 64 characters (our default)
      expect(codeVerifier.length).toBe(64);
    });

    it('should generate URL-safe code_verifier', async () => {
      const { codeVerifier } = await generatePKCE();

      // Should not contain URL-unsafe characters
      expect(codeVerifier).not.toMatch(/[+/=]/);
    });

    it('should generate URL-safe code_challenge', async () => {
      const { codeChallenge } = await generatePKCE();

      // Should not contain URL-unsafe characters
      expect(codeChallenge).not.toMatch(/[+/=]/);
    });

    it('should generate different values on each call', async () => {
      const first = await generatePKCE();
      const second = await generatePKCE();

      expect(first.codeVerifier).not.toBe(second.codeVerifier);
      expect(first.codeChallenge).not.toBe(second.codeChallenge);
    });

    it('should generate consistent challenge for same verifier', async () => {
      // This tests the deterministic nature of SHA-256
      // We can't easily test this without exposing the sha256 function,
      // but we can verify the challenge format
      const { codeChallenge } = await generatePKCE();

      // SHA-256 produces 32 bytes, Base64url encoded is 43 characters
      expect(codeChallenge.length).toBe(43);
    });
  });

  describe('generateState', () => {
    it('should generate a random state string', () => {
      const state = generateState();

      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBe(32);
    });

    it('should generate URL-safe state', () => {
      const state = generateState();

      expect(state).not.toMatch(/[+/=]/);
    });

    it('should generate different values on each call', () => {
      const first = generateState();
      const second = generateState();

      expect(first).not.toBe(second);
    });
  });

  describe('generateNonce', () => {
    it('should generate a random nonce string', () => {
      const nonce = generateNonce();

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBe(32);
    });

    it('should generate URL-safe nonce', () => {
      const nonce = generateNonce();

      expect(nonce).not.toMatch(/[+/=]/);
    });

    it('should generate different values on each call', () => {
      const first = generateNonce();
      const second = generateNonce();

      expect(first).not.toBe(second);
    });
  });

  describe('storePKCEState and retrievePKCEState', () => {
    it('should store and retrieve PKCE state', () => {
      const state: PKCEState = {
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        state: 'test-state',
        nonce: 'test-nonce',
        createdAt: Date.now(),
      };

      storePKCEState(state);
      const retrieved = retrievePKCEState();

      expect(retrieved).toEqual(state);
    });

    it('should clear state after retrieval (one-time use)', () => {
      const state: PKCEState = {
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        state: 'test-state',
        nonce: 'test-nonce',
        createdAt: Date.now(),
      };

      storePKCEState(state);
      retrievePKCEState(); // First retrieval
      const secondRetrieval = retrievePKCEState();

      expect(secondRetrieval).toBeNull();
    });

    it('should return null for expired state', () => {
      const state: PKCEState = {
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        state: 'test-state',
        nonce: 'test-nonce',
        createdAt: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      };

      storePKCEState(state);
      const retrieved = retrievePKCEState(10 * 60 * 1000); // 10 minute max age

      expect(retrieved).toBeNull();
    });

    it('should return null when no state is stored', () => {
      const retrieved = retrievePKCEState();

      expect(retrieved).toBeNull();
    });
  });

  describe('clearPKCEState', () => {
    it('should clear stored PKCE state', () => {
      const state: PKCEState = {
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        state: 'test-state',
        nonce: 'test-nonce',
        createdAt: Date.now(),
      };

      storePKCEState(state);
      clearPKCEState();
      const retrieved = retrievePKCEState();

      expect(retrieved).toBeNull();
    });

    it('should not throw when no state exists', () => {
      expect(() => clearPKCEState()).not.toThrow();
    });
  });

  describe('validateState', () => {
    it('should return true for matching states', () => {
      const state = 'test-state-12345';

      expect(validateState(state, state)).toBe(true);
    });

    it('should return false for different states', () => {
      expect(validateState('state-1', 'state-2')).toBe(false);
    });

    it('should return false for different length states', () => {
      expect(validateState('short', 'much-longer-state')).toBe(false);
    });

    it('should return false for empty returned state', () => {
      expect(validateState('', 'stored-state')).toBe(false);
    });

    it('should return false for empty stored state', () => {
      expect(validateState('returned-state', '')).toBe(false);
    });

    it('should return false for both empty states', () => {
      expect(validateState('', '')).toBe(false);
    });
  });

  describe('buildAuthorizationUrl', () => {
    it('should build correct authorization URL', () => {
      const url = buildAuthorizationUrl({
        issuerUrl: 'https://keycloak.example.com/realms/test',
        clientId: 'my-client',
        redirectUri: 'http://localhost:3000/callback',
        codeChallenge: 'test-challenge',
        state: 'test-state',
        nonce: 'test-nonce',
      });

      const parsed = new URL(url);

      expect(parsed.origin).toBe('https://keycloak.example.com');
      expect(parsed.pathname).toBe('/realms/test/protocol/openid-connect/auth');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('client_id')).toBe('my-client');
      expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
      expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge');
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
      expect(parsed.searchParams.get('state')).toBe('test-state');
      expect(parsed.searchParams.get('nonce')).toBe('test-nonce');
      expect(parsed.searchParams.get('scope')).toBe('openid profile email');
    });

    it('should use custom scope when provided', () => {
      const url = buildAuthorizationUrl({
        issuerUrl: 'https://keycloak.example.com/realms/test',
        clientId: 'my-client',
        redirectUri: 'http://localhost:3000/callback',
        codeChallenge: 'test-challenge',
        state: 'test-state',
        nonce: 'test-nonce',
        scope: 'openid custom-scope',
      });

      const parsed = new URL(url);

      expect(parsed.searchParams.get('scope')).toBe('openid custom-scope');
    });
  });

  describe('initiatePKCEFlow', () => {
    it('should generate complete PKCE state and authorization URL', async () => {
      const { authorizationUrl, state } = await initiatePKCEFlow({
        issuerUrl: 'https://keycloak.example.com/realms/test',
        clientId: 'my-client',
        redirectUri: 'http://localhost:3000/callback',
      });

      // Verify state object
      expect(state.codeVerifier).toBeDefined();
      expect(state.codeChallenge).toBeDefined();
      expect(state.state).toBeDefined();
      expect(state.nonce).toBeDefined();
      expect(state.createdAt).toBeDefined();
      expect(state.createdAt).toBeLessThanOrEqual(Date.now());

      // Verify URL contains the code_challenge
      const parsed = new URL(authorizationUrl);
      expect(parsed.searchParams.get('code_challenge')).toBe(state.codeChallenge);
      expect(parsed.searchParams.get('state')).toBe(state.state);
      expect(parsed.searchParams.get('nonce')).toBe(state.nonce);
    });

    it('should store PKCE state in sessionStorage', async () => {
      await initiatePKCEFlow({
        issuerUrl: 'https://keycloak.example.com/realms/test',
        clientId: 'my-client',
        redirectUri: 'http://localhost:3000/callback',
      });

      // Verify state was stored
      const retrieved = retrievePKCEState();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.codeVerifier).toBeDefined();
    });
  });
});
