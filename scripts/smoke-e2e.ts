import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, devices, type BrowserContextOptions, type Page } from 'playwright';
import { RUSSIAN_LAYOUT } from '../src/constants';
import { WEEK_1 } from '../src/course/week1';

const viewportArg = process.argv.find((argument) => argument.startsWith('--viewport='))?.split('=')[1];
const viewportMode = viewportArg === 'mobile' ? 'mobile' : 'desktop';
const tempDir = mkdtempSync(path.join(tmpdir(), 'croissant-smoke-'));
const databasePath = path.join(tempDir, 'croissant.sqlite');
const port = Number(process.env.SMOKE_PORT || (viewportMode === 'mobile' ? 3312 : 3311));
const appBaseUrl = `http://127.0.0.1:${port}`;
const nickname = `s${viewportMode === 'mobile' ? 'm' : 'd'}${Date.now().toString().slice(-10)}`;
const password = 'smoke-pass-123';

const firstDay = WEEK_1.days[0];
const firstExercise = firstDay.exercises[0];
const secondExercise = firstDay.exercises[1];

const keyMap = new Map(
  RUSSIAN_LAYOUT.flat().flatMap((keyInfo) => {
    const pairs: Array<[string, { key: string; code: string; shiftKey: boolean }]> = [
      [keyInfo.key, { key: keyInfo.key, code: keyInfo.code, shiftKey: false }],
    ];

    if (keyInfo.shiftKey) {
      pairs.push([keyInfo.shiftKey, { key: keyInfo.shiftKey, code: keyInfo.code, shiftKey: true }]);
    }

    return pairs;
  }),
);

keyMap.set(' ', { key: ' ', code: 'Space', shiftKey: false });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url: string, timeoutMs = 20_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function startServer() {
  return spawn('npm', ['run', 'start'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_PATH: databasePath,
      SESSION_SECRET: 'smoke-secret-for-local-production',
      COOKIE_SECURE: 'false',
      APP_BASE_URL: appBaseUrl,
    },
    stdio: 'inherit',
  });
}

function getContextOptions(): BrowserContextOptions {
  if (viewportMode === 'mobile') {
    return {
      ...devices['iPhone 13'],
      locale: 'ru-RU',
    };
  }

  return {
    viewport: { width: 1440, height: 1200 },
    locale: 'ru-RU',
  };
}

async function clickExerciseCard(page: Page, title: string) {
  const card = page.locator('button').filter({ has: page.getByText(title, { exact: true }) }).first();
  await card.click();
}

async function waitForCourseView(page: Page) {
  await page.waitForFunction(() => document.body.innerText.includes('НЕДЕЛЯ 1: БАЗА СЛЕПОЙ ПЕЧАТИ'));
}

async function dispatchCharacter(page: Page, character: string) {
  const keySpec = keyMap.get(character);
  if (!keySpec) {
    throw new Error(`No key mapping for "${character}"`);
  }

  await page.evaluate((payload) => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: payload.key,
      code: payload.code,
      shiftKey: payload.shiftKey,
      bubbles: true,
      cancelable: true,
    }));
  }, keySpec);
}

async function completeExercise(page: Page, content: string) {
  for (const character of content) {
    await dispatchCharacter(page, character);
    await page.waitForTimeout(12);
  }
}

function assertNoBrowserIssues(consoleIssues: string[], pageErrors: string[]) {
  if (!consoleIssues.length && !pageErrors.length) return;

  const details = [
    ...consoleIssues.map((issue) => `console: ${issue}`),
    ...pageErrors.map((issue) => `pageerror: ${issue}`),
  ];

  throw new Error(`Browser issues detected during smoke run:\n${details.join('\n')}`);
}

async function main() {
  let server: ChildProcess | undefined;
  let browser;

  const consoleIssues: string[] = [];
  const pageErrors: string[] = [];

  try {
    server = startServer();
    await waitForHealth(`${appBaseUrl}/health`);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(getContextOptions());
    const page = await context.newPage();

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleIssues.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(appBaseUrl, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Ник', { exact: true }).fill(nickname);
    await page.getByLabel('Пароль', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Начать неделю', exact: true }).click();
    await waitForCourseView(page);

    await clickExerciseCard(page, firstExercise.title);
    await page.getByRole('heading', { name: firstExercise.title, exact: true }).waitFor();
    await completeExercise(page, firstExercise.content);
    await page.getByText('Прогресс сохранен', { exact: true }).waitFor();
    await page.locator('button[title="К курсу"]').click();
    await page.getByText('Лучшее:', { exact: false }).waitFor();

    await clickExerciseCard(page, secondExercise.title);
    await page.getByRole('heading', { name: secondExercise.title, exact: true }).waitFor();
    await page.locator('button[title="К курсу"]').click();
    await waitForCourseView(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Лучшее:', { exact: false }).waitFor();

    await page.locator('button[title="Выйти"]').click();
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await page.getByLabel('Ник', { exact: true }).fill(nickname);
    await page.getByLabel('Пароль', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Вернуться к урокам', exact: true }).click();
    await waitForCourseView(page);
    await page.getByText('Лучшее:', { exact: false }).waitFor();

    assertNoBrowserIssues(consoleIssues, pageErrors);
    console.log(`Smoke e2e passed (${viewportMode})`);
  } finally {
    if (browser) {
      await browser.close();
    }

    if (server && !server.killed) {
      server.kill('SIGTERM');
    }

    rmSync(tempDir, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
