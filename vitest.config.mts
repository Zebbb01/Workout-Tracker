import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname) } },
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    // next-auth imports 'next/server' without an extension, which only a bundler resolves.
    server: { deps: { inline: ['next-auth'] } },
  },
});
