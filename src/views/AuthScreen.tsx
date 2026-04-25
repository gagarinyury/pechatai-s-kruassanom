import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        await register(nickname, password);
      } else {
        await login(nickname, password);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось войти');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bakery-50 flex items-center justify-center p-4 text-bakery-900">
      <div className="w-full max-w-md bg-white border-2 border-bakery-100 rounded-3xl shadow-xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-bakery-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg shadow-bakery-500/20">🥐</div>
          <div>
            <h1 className="text-2xl font-black text-bakery-800 tracking-tight">Печатай с Круассаном</h1>
            <p className="text-sm text-bakery-400 font-bold">7 дней тренировки печати</p>
          </div>
        </div>

        <div className="grid grid-cols-2 bg-bakery-50 rounded-2xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`h-11 rounded-xl text-sm font-black transition-all ${mode === 'register' ? 'bg-white text-bakery-800 shadow-sm' : 'text-bakery-400'}`}
          >
            Создать ник
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`h-11 rounded-xl text-sm font-black transition-all ${mode === 'login' ? 'bg-white text-bakery-800 shadow-sm' : 'text-bakery-400'}`}
          >
            Войти
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-bakery-400">Ник</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              autoComplete="username"
              className="mt-2 w-full h-12 rounded-2xl border-2 border-bakery-100 px-4 font-bold text-bakery-800 outline-none focus:border-bakery-500 transition-colors"
              placeholder="croissant_master"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-bakery-400">Пароль</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              type="password"
              className="mt-2 w-full h-12 rounded-2xl border-2 border-bakery-100 px-4 font-bold text-bakery-800 outline-none focus:border-bakery-500 transition-colors"
              placeholder="минимум 4 символа"
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-13 rounded-2xl bg-bakery-700 text-white font-black uppercase tracking-tight shadow-lg shadow-bakery-500/20 hover:bg-bakery-800 active:scale-[0.99] disabled:opacity-60 transition-all"
          >
            {isSubmitting ? 'Секунду...' : mode === 'register' ? 'Начать неделю' : 'Вернуться к урокам'}
          </button>
        </form>

        <p className="mt-5 text-xs text-bakery-400 leading-relaxed font-medium">
          Нужны только ник и пароль. Прогресс хранится в аккаунте, пароль сохраняется только как хэш.
        </p>
      </div>
    </div>
  );
}
