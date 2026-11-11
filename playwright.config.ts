import { defineConfig, devices } from '@playwright/test'

/**
 * 端到端测试（SPEC §10.8）：iPhone 13 与 Pixel 7 视口。
 * 用系统里的 Chrome；没有浏览器的环境会跳过（记在 DECISIONS.md）。
 */
const chrome = { launchOptions: { executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome' } }

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/style-atlas/',
    trace: 'off',
    // 不让 service worker 接管请求，网络限速才对图片生效
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/style-atlas/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'iphone13', use: { ...devices['iPhone 13'], browserName: 'chromium', ...chrome } },
    { name: 'pixel7', use: { ...devices['Pixel 7'], ...chrome } },
  ],
})
