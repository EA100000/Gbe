import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de parcours complets sur l'appli web (comme un apprenant).
 * Préalable : npm run web:export (fait par npm run e2e:web).
 * Hors CI, PW_CHROMIUM_PATH permet d'utiliser un Chromium déjà installé.
 */
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: process.env.CI === 'true' ? 1 : 0,
  reporter: process.env.CI === 'true' ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8770',
    ...devices['Pixel 7'],
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    launchOptions: executablePath === undefined ? {} : { executablePath },
  },
  webServer: {
    command: 'npx tsx ../scripts/serve-web.ts --port 8770',
    url: 'http://127.0.0.1:8770',
    reuseExistingServer: process.env.CI !== 'true',
  },
});
