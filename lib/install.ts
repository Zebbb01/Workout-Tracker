export type IosBrowser = 'safari' | 'other' | 'in-app';

/**
 * Which route to the Home Screen works in this iPhone browser. A browser built
 * into another app has no such option at all; most drop "Safari/" from their
 * user agent, and the big social apps name themselves.
 */
export function iosBrowser(userAgent: string): IosBrowser {
  if (!userAgent.includes('Safari/') || /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|MicroMessenger|Line\/|TikTok|musical_ly|GSA\//.test(userAgent)) return 'in-app';
  return /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(userAgent) ? 'other' : 'safari';
}
