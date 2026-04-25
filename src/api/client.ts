import type { AuthUser, KeyStats, ProgressRecord } from '../types';

interface ApiErrorShape {
  error?: string;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Не удалось связаться с сервером. Проверьте соединение и попробуйте еще раз.');
  }

  const payload = await response.json().catch(() => ({})) as ApiErrorShape;

  if (!response.ok) {
    throw new Error(payload.error || 'Ошибка запроса');
  }

  return payload as T;
}

export const api = {
  auth: {
    me: () => apiRequest<{ user: AuthUser | null }>('/api/auth/me'),

    login: (nickname: string, password: string) =>
      apiRequest<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ nickname, password }),
      }),

    register: (nickname: string, password: string) =>
      apiRequest<{ user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nickname, password }),
      }),

    logout: () =>
      apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  },

  progress: {
    list: () => apiRequest<{ progress: ProgressRecord[] }>('/api/progress'),

    save: (data: {
      courseId: string;
      dayId: string;
      exerciseId: string;
      completed: boolean;
      bestAccuracy: number;
      bestCpm: number;
      mistakes: number;
      keyStats: Record<string, KeyStats>;
    }) =>
      apiRequest<{ progress: ProgressRecord }>('/api/progress', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
