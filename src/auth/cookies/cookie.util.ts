import { Response } from 'express';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export interface CookieConfig {
  secure: boolean;
  domain?: string;
  accessMaxAge: number;
  refreshMaxAge: number;
}

/**
 * SameSite policy:
 *  - localhost dev (COOKIE_SECURE=false): 'lax' — 3000↔5001 is same-site.
 *  - cross-origin / prod (COOKIE_SECURE=true, e.g. an HTTPS tunnel or a
 *    separate API domain): 'none' so the cookie is sent on cross-site fetches.
 *    ('none' requires Secure, which is why it's gated on cfg.secure.)
 *
 * Access cookie is sent on every request (path '/'); refresh cookie is scoped
 * to '/auth' so it only rides along to /auth/refresh and /auth/logout.
 */
function sameSite(secure: boolean): 'lax' | 'none' {
  return secure ? 'none' : 'lax';
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  cfg: CookieConfig,
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: sameSite(cfg.secure),
    domain: cfg.domain,
    path: '/',
    maxAge: cfg.accessMaxAge,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: sameSite(cfg.secure),
    domain: cfg.domain,
    path: '/auth',
    maxAge: cfg.refreshMaxAge,
  });
}

export function clearAuthCookies(
  res: Response,
  cfg: { secure: boolean; domain?: string },
): void {
  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: sameSite(cfg.secure),
    domain: cfg.domain,
    path: '/',
  });
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: sameSite(cfg.secure),
    domain: cfg.domain,
    path: '/auth',
  });
}
