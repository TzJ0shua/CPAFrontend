import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5194', channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 960 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5194 --strictPort',
    url: 'http://127.0.0.1:5194',
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:8199', VITE_KEYCLOAK_URL: 'http://127.0.0.1:8189', VITE_KEYCLOAK_REALM: 'cpa', VITE_KEYCLOAK_CLIENT_ID: 'cpa-frontend' },
  },
})
