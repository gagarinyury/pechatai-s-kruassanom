import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';
const defaultDatabasePath = path.join(rootDir, 'data', 'croissant.sqlite');
const databasePath = process.env.DATABASE_PATH || defaultDatabasePath;
const sessionSecret = process.env.SESSION_SECRET || 'croissant-dev-secret-change-me';
const cookieSecure = process.env.COOKIE_SECURE === 'true';
const appBaseUrl = process.env.APP_BASE_URL || '';
const cookieName = 'croissant_session';
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

function isLocalAppUrl(value: string) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

if (isProduction) {
  if (!process.env.DATABASE_PATH) {
    throw new Error('DATABASE_PATH is required in production');
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'croissant-dev-secret-change-me') {
    throw new Error('SESSION_SECRET must be set to a non-default value in production');
  }

  if (!cookieSecure && !isLocalAppUrl(appBaseUrl)) {
    throw new Error('COOKIE_SECURE=true is required in production');
  }
}

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER NOT NULL,
    course_id TEXT NOT NULL,
    day_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    best_accuracy REAL NOT NULL DEFAULT 0,
    best_cpm INTEGER NOT NULL DEFAULT 0,
    mistakes INTEGER NOT NULL DEFAULT 0,
    key_stats TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, course_id, day_id, exercise_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

interface UserRow {
  id: number;
  nickname: string;
  password_hash: string;
  created_at: string;
}

interface ProgressRow {
  user_id: number;
  course_id: string;
  day_id: string;
  exercise_id: string;
  completed: 0 | 1;
  best_accuracy: number;
  best_cpm: number;
  mistakes: number;
  key_stats: string;
  updated_at: string;
}

const findUserByNickname = db.prepare('SELECT * FROM users WHERE nickname = ?');
const findUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const createUser = db.prepare('INSERT INTO users (nickname, password_hash) VALUES (?, ?)');
const listProgress = db.prepare('SELECT * FROM progress WHERE user_id = ? ORDER BY updated_at DESC');
const findProgress = db.prepare(`
  SELECT * FROM progress
  WHERE user_id = ? AND course_id = ? AND day_id = ? AND exercise_id = ?
`);
const saveProgress = db.prepare(`
  INSERT INTO progress (
    user_id,
    course_id,
    day_id,
    exercise_id,
    completed,
    best_accuracy,
    best_cpm,
    mistakes,
    key_stats,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(user_id, course_id, day_id, exercise_id) DO UPDATE SET
    completed = CASE WHEN progress.completed = 1 OR excluded.completed = 1 THEN 1 ELSE 0 END,
    best_accuracy = MAX(progress.best_accuracy, excluded.best_accuracy),
    best_cpm = MAX(progress.best_cpm, excluded.best_cpm),
    mistakes = MIN(progress.mistakes, excluded.mistakes),
    key_stats = excluded.key_stats,
    updated_at = datetime('now')
`);

const app = express();
app.use(express.json({ limit: '128kb' }));
app.use(cookieParser(sessionSecret));

const nicknamePattern = /^[\p{L}\p{N}_-]{2,24}$/u;

function publicUser(user: UserRow) {
  return {
    id: user.id,
    nickname: user.nickname,
    createdAt: user.created_at,
  };
}

function serializeProgress(row: ProgressRow) {
  return {
    userId: row.user_id,
    courseId: row.course_id,
    dayId: row.day_id,
    exerciseId: row.exercise_id,
    completed: row.completed === 1,
    bestAccuracy: row.best_accuracy,
    bestCpm: row.best_cpm,
    mistakes: row.mistakes,
    keyStats: JSON.parse(row.key_stats || '{}') as unknown,
    updatedAt: row.updated_at,
  };
}

function getCurrentUser(req: Request): UserRow | null {
  const rawUserId = req.signedCookies?.[cookieName];
  if (typeof rawUserId !== 'string') return null;

  const userId = Number.parseInt(rawUserId, 10);
  if (!Number.isInteger(userId)) return null;

  return findUserById.get(userId) as UserRow | undefined || null;
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: 'Нужно войти' });
    return;
  }

  res.locals.user = user;
  next();
}

function setSessionCookie(res: Response, userId: number) {
  res.cookie(cookieName, String(userId), {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure,
    maxAge: thirtyDaysMs,
    path: '/',
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(cookieName, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure,
    path: '/',
  });
}

function readAuthBody(req: Request) {
  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  return { nickname, password };
}

function validateAuthBody(nickname: string, password: string): string | null {
  if (!nicknamePattern.test(nickname)) {
    return 'Ник: 2-24 символа, буквы, цифры, _ или -';
  }

  if (password.length < 4) {
    return 'Пароль: минимум 4 символа';
  }

  return null;
}

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { nickname, password } = readAuthBody(req);
    const validationError = validateAuthBody(nickname, password);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const existingUser = findUserByNickname.get(nickname) as UserRow | undefined;
    if (existingUser) {
      res.status(409).json({ error: 'Такой ник уже занят' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = createUser.run(nickname, passwordHash);
    const user = findUserById.get(result.lastInsertRowid) as UserRow;
    setSessionCookie(res, user.id);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { nickname, password } = readAuthBody(req);
    const validationError = validateAuthBody(nickname, password);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const user = findUserByNickname.get(nickname) as UserRow | undefined;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Неверный ник или пароль' });
      return;
    }

    setSessionCookie(res, user.id);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/progress', requireUser, (req, res) => {
  const user = res.locals.user as UserRow;
  const rows = listProgress.all(user.id) as ProgressRow[];
  res.json({ progress: rows.map(serializeProgress) });
});

app.post('/api/progress', requireUser, (req, res) => {
  const user = res.locals.user as UserRow;
  const courseId = typeof req.body?.courseId === 'string' ? req.body.courseId : '';
  const dayId = typeof req.body?.dayId === 'string' ? req.body.dayId : '';
  const exerciseId = typeof req.body?.exerciseId === 'string' ? req.body.exerciseId : '';
  const bestAccuracy = Number(req.body?.bestAccuracy);
  const bestCpm = Number(req.body?.bestCpm);
  const mistakes = Number(req.body?.mistakes);
  const completed = Boolean(req.body?.completed);
  const keyStats = req.body?.keyStats && typeof req.body.keyStats === 'object' ? req.body.keyStats : {};

  if (!courseId || !dayId || !exerciseId || !Number.isFinite(bestAccuracy) || !Number.isFinite(bestCpm) || !Number.isFinite(mistakes)) {
    res.status(400).json({ error: 'Некорректный результат упражнения' });
    return;
  }

  saveProgress.run(
    user.id,
    courseId,
    dayId,
    exerciseId,
    completed ? 1 : 0,
    Math.max(0, Math.min(100, Math.round(bestAccuracy))),
    Math.max(0, Math.round(bestCpm)),
    Math.max(0, Math.round(mistakes)),
    JSON.stringify(keyStats),
  );

  const row = findProgress.get(user.id, courseId, dayId, exerciseId) as ProgressRow;
  res.json({ progress: serializeProgress(row) });
});

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(rootDir, 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, '0.0.0.0', () => {
  console.log(`Croissant API listening on http://localhost:${port}`);
  console.log(`SQLite database: ${databasePath}`);
});
