import { describe, expect, it } from 'vitest';
import { iosBrowser } from './install';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';

describe('iosBrowser', () => {
  it('recognises Safari', () => {
    expect(iosBrowser(`${IPHONE} Version/18.5 Mobile/15E148 Safari/604.1`)).toBe('safari');
  });

  it('recognises other browsers, which have their own Share button', () => {
    expect(iosBrowser(`${IPHONE} CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1`)).toBe('other');
    expect(iosBrowser(`${IPHONE} FxiOS/133.0 Mobile/15E148 Safari/605.1.15`)).toBe('other');
    expect(iosBrowser(`${IPHONE} Version/18.5 EdgiOS/131.0.2903.92 Mobile/15E148 Safari/604.1`)).toBe('other');
  });

  it('recognises the browser built into another app, where the option does not exist', () => {
    expect(iosBrowser(`${IPHONE} Mobile/15E148 [FBAN/MessengerForiOS;FBAV/483.0;FBBV/1]`)).toBe('in-app');
    expect(iosBrowser(`${IPHONE} Mobile/15E148 Instagram 360.0.0.30.109`)).toBe('in-app');
    expect(iosBrowser(`${IPHONE} Mobile/15E148 [LinkedInApp]/9.31`)).toBe('in-app');
  });

  it('treats a built-in browser as in-app even when it claims to be Safari', () => {
    expect(iosBrowser(`${IPHONE} Version/18.5 Mobile/15E148 Safari/604.1 [FBAN/FBIOS;FBAV/483.0]`)).toBe('in-app');
  });

  it('treats any web view without a Safari token as in-app', () => {
    expect(iosBrowser(`${IPHONE} Mobile/15E148`)).toBe('in-app');
  });
});
