import { describe, expect, it } from 'vitest';
import { authMessage, authProblem, estimateProblem } from './errors';

describe('estimateProblem', () => {
  const fallback = "The estimate didn't work. Try again, or enter the numbers yourself.";

  it("shows this app's own sentence", () => {
    expect(estimateProblem({ error: 'That photo is too large. Try another one.' })).toBe('That photo is too large. Try another one.');
  });

  it("replaces a provider's JSON error", () => {
    expect(estimateProblem({ error: { code: 503, message: 'The model is overloaded' } })).toBe(fallback);
  });

  it('replaces a reply that was not JSON at all', () => {
    expect(estimateProblem(null)).toBe(fallback);
  });
});

describe('authMessage', () => {
  it('tells someone who hit the rate limit to wait', () => {
    expect(authMessage('Request rate limit reached')).toMatch(/wait a few minutes/i);
  });

  it('explains a Google account that already has its own data', () => {
    expect(authMessage('Identity is already linked to another user')).toMatch(/already has Body Tracker data/);
  });

  it('says a declined Google screen was cancelled', () => {
    expect(authMessage('The resource owner or authorization server denied the request')).toMatch(/cancelled/);
  });

  it('calls a dropped connection a connection problem', () => {
    expect(authMessage('Failed to fetch')).toMatch(/check your connection/i);
  });

  it('never repeats text it does not recognise', () => {
    const message = authMessage('{"code":"unexpected_failure","msg":"Database error saving new user"}');
    expect(message).toBe("Sign-in didn't work. Try again in a minute.");
  });

  it('cannot be made to show something else through the address bar', () => {
    for (const planted of ['constructor', '__proto__', 'toString', '<img src=x>']) {
      expect(typeof authMessage(planted), planted).toBe('string');
      expect(authMessage(planted), planted).toBe("Sign-in didn't work. Try again in a minute.");
    }
  });

  it('reads back the short code the sign-in callback puts in the address', () => {
    const code = authProblem('Identity is already linked to another user');
    expect(code).toBe('taken');
    expect(authMessage(code)).toMatch(/already has Body Tracker data/);
  });
});
