/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Lock,
  LogOut,
  RotateCcw,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { HandsGuide } from './components/HandsGuide';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { RUSSIAN_LAYOUT } from './constants';
import { WEEK_1 } from './course/week1';
import type { CourseDay, CourseExercise } from './course/types';

type GameState = 'idle' | 'typing' | 'finished';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type AppView = 'course' | 'lesson';

interface KeyStats {
  hits: number;
  misses: number;
}

interface AuthUser {
  id: number;
  nickname: string;
  createdAt: string;
}

interface ProgressRecord {
  userId: number;
  courseId: string;
  dayId: string;
  exerciseId: string;
  completed: boolean;
  bestAccuracy: number;
  bestCpm: number;
  mistakes: number;
  keyStats: Record<string, KeyStats>;
  updatedAt: string;
}

interface ExerciseResult {
  accuracy: number;
  cpm: number;
  mistakes: number;
  passed: boolean;
}

interface ApiErrorShape {
  error?: string;
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as ApiErrorShape;

  if (!response.ok) {
    throw new Error(payload.error || 'Ошибка запроса');
  }

  return payload as T;
}

function addKeyStat(map: Record<string, KeyStats>, key: string, isCorrect: boolean) {
  const current = map[key] || { hits: 0, misses: 0 };
  return {
    ...map,
    [key]: {
      hits: current.hits + (isCorrect ? 1 : 0),
      misses: current.misses + (isCorrect ? 0 : 1),
    },
  };
}

function calculateTypingStats(typedLength: number, mistakes: number, startedAt: number | null, finishedAt: number | null) {
  const attempts = typedLength + mistakes;
  const accuracy = attempts === 0 ? 100 : Math.max(0, Math.round((typedLength / attempts) * 100));
  if (!startedAt) return { accuracy, cpm: 0 };

  const end = finishedAt || Date.now();
  const durationInMinutes = Math.max((end - startedAt) / 60000, 1 / 60000);
  return {
    accuracy,
    cpm: Math.max(0, Math.round(typedLength / durationInMinutes)),
  };
}

function findFingerForChar(char: string) {
  const lower = char.toLowerCase();
  if (lower === ' ') return 5;

  for (const row of RUSSIAN_LAYOUT) {
    const found = row.find((key) => key.key.toLowerCase() === lower || key.shiftKey?.toLowerCase() === lower);
    if (found) return found.finger;
  }

  return undefined;
}

function findRussianCharForCode(code: string, shiftKey: boolean) {
  for (const row of RUSSIAN_LAYOUT) {
    const found = row.find((key) => key.code === code);
    if (found) return shiftKey && found.shiftKey ? found.shiftKey : found.key;
  }

  return undefined;
}

function isLatinLayoutKey(key: string) {
  return /^[a-z`[\]\\;',./0-9=-]$/i.test(key);
}

function shouldWarnAboutLayout(event: KeyboardEvent, expectedChar: string) {
  if (expectedChar === ' ') return false;

  const russianCharForPhysicalKey = findRussianCharForCode(event.code, event.shiftKey);
  const normalizedExpected = expectedChar.toLowerCase();
  const normalizedActual = event.key.toLowerCase();

  if (russianCharForPhysicalKey?.toLowerCase() === normalizedExpected && normalizedActual !== normalizedExpected) {
    return true;
  }

  return /[а-яё]/i.test(expectedChar) && isLatinLayoutKey(event.key);
}

function getNextExercise(day: CourseDay, exercise: CourseExercise) {
  const exerciseIndex = day.exercises.findIndex((item) => item.id === exercise.id);
  if (exerciseIndex >= 0 && exerciseIndex < day.exercises.length - 1) {
    return { day, exercise: day.exercises[exerciseIndex + 1] };
  }

  const dayIndex = WEEK_1.days.findIndex((item) => item.id === day.id);
  const nextDay = WEEK_1.days[dayIndex + 1];
  if (!nextDay) return null;

  return { day: nextDay, exercise: nextDay.exercises[0] };
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [selectedDayId, setSelectedDayId] = useState(WEEK_1.days[0].id);
  const [selectedExerciseId, setSelectedExerciseId] = useState(WEEK_1.days[0].exercises[0].id);
  const [appView, setAppView] = useState<AppView>('course');

  const [gameState, setGameState] = useState<GameState>('idle');
  const [userInput, setUserInput] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [pressedKey, setPressedKey] = useState<string | undefined>(undefined);
  const [layoutWarning, setLayoutWarning] = useState('');
  const [keyHeatmap, setKeyHeatmap] = useState<Record<string, KeyStats>>({});
  const [clockNow, setClockNow] = useState(Date.now());
  const [lastResult, setLastResult] = useState<ExerciseResult | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');

  const heatmapRef = useRef<Record<string, KeyStats>>({});
  const layoutWarningTimerRef = useRef<number | null>(null);

  const progressMap = useMemo(() => {
    return new Map(progressRecords.map((record) => [record.exerciseId, record]));
  }, [progressRecords]);

  const isExerciseCompleted = useCallback((exerciseId: string) => {
    return progressMap.get(exerciseId)?.completed || false;
  }, [progressMap]);

  const isDayCompleted = useCallback((day: CourseDay) => {
    return day.exercises.every((exercise) => isExerciseCompleted(exercise.id));
  }, [isExerciseCompleted]);

  const isDayUnlocked = useCallback((day: CourseDay) => {
    if (day.dayNumber === 1) return true;
    const previousDay = WEEK_1.days[day.dayNumber - 2];
    return previousDay ? isDayCompleted(previousDay) : false;
  }, [isDayCompleted]);

  const currentDay = useMemo(() => {
    return WEEK_1.days.find((day) => day.id === selectedDayId) || WEEK_1.days[0];
  }, [selectedDayId]);

  const currentExercise = useMemo(() => {
    return currentDay.exercises.find((exercise) => exercise.id === selectedExerciseId) || currentDay.exercises[0];
  }, [currentDay, selectedExerciseId]);

  const completedDaysCount = useMemo(() => {
    return WEEK_1.days.filter((day) => isDayCompleted(day)).length;
  }, [isDayCompleted]);

  const completedExercisesCount = useMemo(() => {
    return progressRecords.filter((record) => record.completed).length;
  }, [progressRecords]);

  const weekStats = useMemo(() => {
    const completed = progressRecords.filter((record) => record.completed);
    const bestCpm = completed.reduce((max, record) => Math.max(max, record.bestCpm), 0);
    const averageAccuracy = completed.length
      ? Math.round(completed.reduce((sum, record) => sum + record.bestAccuracy, 0) / completed.length)
      : 100;
    const weakKeys = new Map<string, number>();

    for (const record of progressRecords) {
      for (const [key, stats] of Object.entries(record.keyStats || {}) as Array<[string, KeyStats]>) {
        if (stats.misses > 0) weakKeys.set(key, (weakKeys.get(key) || 0) + stats.misses);
      }
    }

    return {
      bestCpm,
      averageAccuracy,
      weakKeys: [...weakKeys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
    };
  }, [progressRecords]);

  const liveStats = useMemo(() => {
    void clockNow;
    return calculateTypingStats(userInput.length, mistakes, startTime, endTime);
  }, [clockNow, endTime, mistakes, startTime, userInput.length]);

  const progressPercent = Math.round((userInput.length / currentExercise.content.length) * 100);
  const activeChar = currentExercise.content[userInput.length] || '';
  const nextChar = currentExercise.content[userInput.length + 1] || '';
  const activeFinger = activeChar ? findFingerForChar(activeChar) : undefined;
  const nextTarget = getNextExercise(currentDay, currentExercise);
  const isFinalExercise = !nextTarget;
  const canContinue = lastResult?.passed && saveState !== 'saving';

  const worstKeys = useMemo(() => {
    return (Object.entries(keyHeatmap) as Array<[string, KeyStats]>)
      .filter(([, stats]) => stats.misses > 0)
      .sort((a, b) => (b[1].misses / (b[1].hits + b[1].misses)) - (a[1].misses / (a[1].hits + a[1].misses)))
      .slice(0, 3);
  }, [keyHeatmap]);

  const loadProgress = useCallback(async () => {
    setProgressLoading(true);
    try {
      const data = await apiRequest<{ progress: ProgressRecord[] }>('/api/progress');
      setProgressRecords(data.progress);
    } finally {
      setProgressLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      try {
        const data = await apiRequest<{ user: AuthUser | null }>('/api/auth/me');
        if (isActive) setUser(data.user);
      } catch {
        if (isActive) setUser(null);
      } finally {
        if (isActive) setAuthLoading(false);
      }
    }

    void loadSession();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      void loadProgress();
    } else {
      setProgressRecords([]);
    }
  }, [loadProgress, user]);

  useEffect(() => {
    if (!user || progressLoading) return;

    const selectedDay = WEEK_1.days.find((day) => day.id === selectedDayId);
    if (selectedDay && isDayUnlocked(selectedDay)) return;

    const firstAvailableDay = WEEK_1.days.find((day) => isDayUnlocked(day) && !isDayCompleted(day))
      || [...WEEK_1.days].reverse().find((day) => isDayUnlocked(day))
      || WEEK_1.days[0];
    const firstExercise = firstAvailableDay.exercises.find((exercise) => !isExerciseCompleted(exercise.id))
      || firstAvailableDay.exercises[0];

    setSelectedDayId(firstAvailableDay.id);
    setSelectedExerciseId(firstExercise.id);
  }, [isDayCompleted, isDayUnlocked, isExerciseCompleted, progressLoading, selectedDayId, user]);

  const resetGame = useCallback(() => {
    setGameState('idle');
    setUserInput('');
    setMistakes(0);
    setStartTime(null);
    setEndTime(null);
    setPressedKey(undefined);
    setLayoutWarning('');
    setKeyHeatmap({});
    setLastResult(null);
    setSaveState('idle');
    setSaveError('');
    heatmapRef.current = {};
  }, []);

  const showLayoutWarning = useCallback(() => {
    setLayoutWarning('Проверьте раскладку: нужна русская');
    if (layoutWarningTimerRef.current) window.clearTimeout(layoutWarningTimerRef.current);
    layoutWarningTimerRef.current = window.setTimeout(() => {
      setLayoutWarning('');
      layoutWarningTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (layoutWarningTimerRef.current) window.clearTimeout(layoutWarningTimerRef.current);
    };
  }, []);

  useEffect(() => {
    resetGame();
  }, [currentExercise.id, resetGame]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [appView, currentExercise.id]);

  useEffect(() => {
    if (gameState !== 'typing') return;

    const timer = window.setInterval(() => setClockNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [gameState]);

  const commitKeyStat = useCallback((key: string, isCorrect: boolean) => {
    const nextHeatmap = addKeyStat(heatmapRef.current, key, isCorrect);
    heatmapRef.current = nextHeatmap;
    setKeyHeatmap(nextHeatmap);
    return nextHeatmap;
  }, []);

  const updateProgressRecord = useCallback((record: ProgressRecord) => {
    setProgressRecords((previous) => {
      const withoutRecord = previous.filter((item) => item.exerciseId !== record.exerciseId);
      return [...withoutRecord, record];
    });
  }, []);

  const saveExerciseResult = useCallback(async (result: ExerciseResult, finalHeatmap: Record<string, KeyStats>) => {
    setSaveState('saving');
    setSaveError('');

    try {
      const data = await apiRequest<{ progress: ProgressRecord }>('/api/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseId: WEEK_1.id,
          dayId: currentDay.id,
          exerciseId: currentExercise.id,
          completed: result.passed,
          bestAccuracy: result.accuracy,
          bestCpm: result.cpm,
          mistakes: result.mistakes,
          keyStats: finalHeatmap,
        }),
      });

      updateProgressRecord(data.progress);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить прогресс');
    }
  }, [currentDay.id, currentExercise.id, updateProgressRecord]);

  const finishExercise = useCallback((nextInput: string, nextMistakes: number, finalHeatmap: Record<string, KeyStats>) => {
    const finishedAt = Date.now();
    const stats = calculateTypingStats(nextInput.length, nextMistakes, startTime || finishedAt, finishedAt);
    const result = {
      ...stats,
      mistakes: nextMistakes,
      passed: stats.accuracy >= currentExercise.targetAccuracy,
    };

    setGameState('finished');
    setEndTime(finishedAt);
    setLastResult(result);
    void saveExerciseResult(result, finalHeatmap);
  }, [currentExercise.targetAccuracy, saveExerciseResult, startTime]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
    if (!user || appView !== 'lesson' || progressLoading || gameState === 'finished') return;
    if (event.key === 'Escape') {
      resetGame();
      return;
    }

    if (event.code === 'Space') event.preventDefault();

    const char = event.key;
    if (char.length !== 1 && char !== ' ') return;

    const expectedChar = currentExercise.content[userInput.length];
    if (!expectedChar) return;

    const russianCharForPhysicalKey = findRussianCharForCode(event.code, event.shiftKey);
    if (char.length === 1 || event.code === 'Space') {
      setPressedKey(russianCharForPhysicalKey || char);
      window.setTimeout(() => setPressedKey(undefined), 100);
    }

    if (shouldWarnAboutLayout(event, expectedChar)) {
      event.preventDefault();
      showLayoutWarning();
      return;
    }

    setLayoutWarning('');

    if (gameState === 'idle') {
      setGameState('typing');
      const now = Date.now();
      setStartTime(now);
      setClockNow(now);
    }

    if (char === expectedChar) {
      const nextHeatmap = commitKeyStat(char, true);
      const nextInput = userInput + char;
      setUserInput(nextInput);

      if (nextInput.length === currentExercise.content.length) {
        finishExercise(nextInput, mistakes, nextHeatmap);
      }
    } else {
      commitKeyStat(expectedChar, false);
      setMistakes((value) => value + 1);
    }
  }, [
    appView,
    commitKeyStat,
    currentExercise.content,
    finishExercise,
    gameState,
    mistakes,
    progressLoading,
    resetGame,
    showLayoutWarning,
    user,
    userInput,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelectDay = (day: CourseDay) => {
    if (!isDayUnlocked(day)) return;

    const firstExercise = day.exercises.find((exercise) => !isExerciseCompleted(exercise.id)) || day.exercises[0];
    setSelectedDayId(day.id);
    setSelectedExerciseId(firstExercise.id);
  };

  const handleSelectExercise = (exercise: CourseExercise) => {
    setSelectedExerciseId(exercise.id);
    setAppView('lesson');
  };

  const handleContinue = () => {
    if (!nextTarget) return;

    setSelectedDayId(nextTarget.day.id);
    setSelectedExerciseId(nextTarget.exercise.id);
    setAppView('lesson');
  };

  const handleBackToCourse = () => {
    resetGame();
    setAppView('course');
  };

  const handleLogout = async () => {
    await apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    setUser(null);
    resetGame();
  };

  if (authLoading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  if (appView === 'lesson') {
    return (
      <div className="min-h-screen bg-bakery-50 font-sans text-bakery-900 selection:bg-bakery-200">
        <main className="min-h-screen w-full max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {gameState !== 'typing' && (
                <button
                  type="button"
                  onClick={handleBackToCourse}
                  className="w-10 h-10 rounded-xl border border-bakery-100 bg-white text-bakery-600 hover:border-bakery-300 hover:text-bakery-900 flex items-center justify-center transition-colors"
                  title="К курсу"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="min-w-0">
                <span className="text-[10px] text-bakery-400 uppercase font-black tracking-widest">День {currentDay.dayNumber} · Урок {currentDay.exercises.findIndex((exercise) => exercise.id === currentExercise.id) + 1}</span>
                <h1 className="text-xl md:text-2xl font-black text-bakery-800 tracking-tight truncate">{currentExercise.title}</h1>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-2xl bg-white border border-bakery-100 px-4 py-3 shadow-sm">
              <Target className="w-4 h-4 text-bakery-600" />
              <span className="text-sm font-black text-bakery-700">{currentExercise.targetAccuracy}% точность</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 md:gap-3">
            <CompactMetric label="Точность" value={`${liveStats.accuracy}%`} />
            <CompactMetric label="Ошибки" value={mistakes} />
            <CompactMetric label="Скорость" value={liveStats.cpm} />
            <CompactMetric label="Прогресс" value={`${progressPercent}%`} />
          </div>

          <section className="flex-1 flex flex-col gap-4">
            <div className="w-full bg-white rounded-3xl border-2 border-bakery-100 shadow-xl p-5 md:p-8 relative min-h-[240px] md:min-h-[280px] flex items-center">
              <div className="absolute left-5 top-4 right-5 flex items-center justify-between gap-4">
                <p className="text-xs md:text-sm text-bakery-400 font-bold truncate">{currentExercise.description}</p>
                <span className="shrink-0 text-[10px] uppercase tracking-widest font-black text-bakery-400">{currentExercise.type}</span>
              </div>

              <AnimatePresence>
                {layoutWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute left-5 right-5 top-14 z-50 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-black text-red-700 shadow-sm"
                  >
                    {layoutWarning}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="w-full pt-8 text-3xl md:text-5xl font-mono leading-relaxed whitespace-pre-wrap break-words tracking-tight text-bakery-800">
                <span className="opacity-40">{userInput}</span>
                {gameState !== 'finished' && (
                  <span className="relative">
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="absolute left-0 top-0 bottom-0 w-[4px] bg-bakery-600 rounded-full"
                    />
                    <span className="text-bakery-900 border-b-4 border-bakery-500 bg-bakery-50/50 rounded-t-md">{activeChar}</span>
                  </span>
                )}
                <span className="text-bakery-100">{currentExercise.content.slice(userInput.length + (gameState !== 'finished' ? 1 : 0))}</span>
              </div>

              <AnimatePresence>
                {gameState === 'finished' && lastResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-bakery-700 rounded-3xl z-40 flex items-center justify-center flex-col text-white p-6 md:p-8 shadow-2xl overflow-hidden"
                  >
                    <motion.div
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="flex flex-col items-center gap-5 text-center"
                    >
                      <div className="text-5xl">{lastResult.passed ? '🥐✨' : '🥐'}</div>
                      <div>
                        <h2 className="text-3xl md:text-5xl font-black mb-2 uppercase italic tracking-tight">
                          {lastResult.passed ? 'Зачтено!' : 'Еще подход'}
                        </h2>
                        <p className="text-bakery-200 font-medium max-w-md">
                          {lastResult.passed
                            ? isFinalExercise ? 'Неделя закрыта. Можно смотреть общий результат.' : 'Прогресс сохранен, можно двигаться дальше.'
                            : `Нужно ${currentExercise.targetAccuracy}% точности. Сейчас ${lastResult.accuracy}%.`}
                        </p>
                      </div>

                      <div className="flex gap-8 md:gap-12 mt-2 bg-bakery-800/50 p-5 rounded-3xl border border-bakery-600/30">
                        <ResultMetric label="Скорость" value={`${lastResult.cpm}`} unit="CPM" />
                        <ResultMetric label="Точность" value={`${lastResult.accuracy}%`} />
                        <ResultMetric label="Ошибки" value={`${lastResult.mistakes}`} />
                      </div>

                      <div className="min-h-5 text-xs font-bold text-bakery-100/70">
                        {saveState === 'saving' && 'Сохраняю прогресс...'}
                        {saveState === 'saved' && 'Прогресс сохранен'}
                        {saveState === 'error' && saveError}
                      </div>

                      <div className="flex flex-wrap justify-center gap-3">
                        <button
                          type="button"
                          onClick={resetGame}
                          className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-full font-black hover:bg-white/15 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-tight"
                        >
                          <RotateCcw className="w-5 h-5" /> Повторить
                        </button>
                        <button
                          type="button"
                          onClick={handleBackToCourse}
                          className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-full font-black hover:bg-white/15 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-tight"
                        >
                          <ArrowLeft className="w-5 h-5" /> К курсу
                        </button>
                        {canContinue && nextTarget && (
                          <button
                            type="button"
                            onClick={handleContinue}
                            className="px-8 py-3 bg-white text-bakery-700 rounded-full font-black shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-tight"
                          >
                            Следующий урок <ChevronRight className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {worstKeys.length > 0 && gameState === 'idle' && (
              <div className="mx-auto p-3 bg-orange-50 rounded-2xl flex gap-3 items-center border border-orange-100 shadow-sm">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-bold text-orange-800 italic">Тяжело пропекаются: {worstKeys.map((key) => key[0].toUpperCase()).join(', ')}</span>
              </div>
            )}

            <div className="w-full space-y-1">
              <div className="overflow-hidden flex items-center justify-center">
                <HandsGuide activeFinger={activeFinger} compact />
              </div>
              <VirtualKeyboard activeKey={activeChar} nextKey={nextChar} pressedKey={pressedKey} />
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bakery-50 flex flex-col font-sans overflow-x-hidden selection:bg-bakery-200 text-bakery-900 transition-colors duration-500">
      <nav className="min-h-16 border-b border-bakery-100 bg-white px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <motion.div
            whileHover={{ rotate: 15 }}
            className="w-10 h-10 bg-bakery-600 rounded-lg flex shrink-0 items-center justify-center text-white font-bold text-xl shadow-lg shadow-bakery-500/20"
          >
            🥐
          </motion.div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg md:text-xl font-black text-bakery-800 tracking-tight truncate">ПЕЧАТАЙ С КРУАССАНОМ</h1>
            <span className="text-[10px] text-bakery-400 font-bold uppercase tracking-widest -mt-1">неделя 1</span>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] text-bakery-400 uppercase font-black tracking-widest">Ученик</span>
            <span className="text-sm font-bold text-bakery-700">{user.nickname}</span>
          </div>
          <div className="flex items-center gap-4 bg-bakery-100/50 px-4 py-2 rounded-full border border-bakery-200/50">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-bakery-400 uppercase font-black">Дни</span>
              <span className="text-xs font-bold text-bakery-600 flex items-center gap-1"><Trophy className="w-3 h-3" /> {completedDaysCount}/7</span>
            </div>
            <div className="w-px h-6 bg-bakery-200" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-bakery-400 uppercase font-black">Уроки</span>
              <span className="text-sm font-bold text-bakery-800 flex items-center gap-1">🥐 {completedExercisesCount}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl border border-bakery-100 bg-white text-bakery-500 hover:text-bakery-800 hover:border-bakery-300 flex items-center justify-center transition-colors"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 flex flex-col gap-8 items-center max-w-6xl mx-auto w-full">
        <section className="w-full grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="space-y-4">
            <div className="grid grid-cols-7 lg:grid-cols-1 gap-2">
              {WEEK_1.days.map((day) => {
                const unlocked = isDayUnlocked(day);
                const completed = isDayCompleted(day);
                const selected = currentDay.id === day.id;
                return (
                  <button
                    key={day.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => handleSelectDay(day)}
                    className={`
                      min-h-16 rounded-2xl border-2 p-2 lg:p-4 text-left transition-all
                      ${selected ? 'bg-white border-bakery-600 shadow-lg' : 'bg-white border-bakery-50 hover:border-bakery-200'}
                      ${!unlocked ? 'opacity-45 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-bakery-400 uppercase">День {day.dayNumber}</span>
                      {completed ? <Check className="w-4 h-4 text-green-600" /> : unlocked ? <ChevronRight className="w-4 h-4 text-bakery-300" /> : <Lock className="w-4 h-4 text-bakery-300" />}
                    </div>
                    <div className="hidden lg:block mt-2">
                      <h3 className="text-sm font-black text-bakery-800 uppercase tracking-tight">{day.title}</h3>
                      <p className="text-xs text-bakery-400 mt-1 leading-snug">{day.goal}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-white border-2 border-bakery-50 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-bakery-400 font-black uppercase text-[10px] tracking-widest">
                <BarChart3 className="w-4 h-4" />
                Итог недели
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <MiniMetric label="CPM" value={weekStats.bestCpm} />
                <MiniMetric label="Точн." value={`${weekStats.averageAccuracy}%`} />
                <MiniMetric label="Дней" value={`${completedDaysCount}/7`} />
              </div>
              {weekStats.weakKeys.length > 0 && (
                <div className="mt-4 pt-4 border-t border-bakery-50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-bakery-400">Слабые клавиши</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {weekStats.weakKeys.map(([key]) => (
                      <span key={key} className="px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-black uppercase">{key}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="bg-white border-2 border-bakery-50 rounded-3xl p-6 shadow-sm">
              <span className="text-[10px] text-bakery-400 uppercase font-black tracking-widest">{WEEK_1.title}</span>
              <h2 className="text-2xl md:text-3xl font-black text-bakery-800 tracking-tight mt-1">{currentDay.title}</h2>
              <p className="text-sm text-bakery-500 font-medium mt-1 max-w-2xl">{currentDay.goal}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentDay.exercises.map((exercise, index) => {
                const completed = isExerciseCompleted(exercise.id);
                const selected = exercise.id === currentExercise.id;
                const previousCompleted = index === 0 || isExerciseCompleted(currentDay.exercises[index - 1].id);
                const unlocked = completed || previousCompleted;

                return (
                  <button
                    key={exercise.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => handleSelectExercise(exercise)}
                    className={`
                      min-h-40 rounded-3xl border-2 bg-white p-5 text-left transition-all group
                      ${selected ? 'border-bakery-600 shadow-xl' : 'border-bakery-50 hover:border-bakery-200 hover:shadow-md'}
                      ${!unlocked ? 'opacity-45 cursor-not-allowed hover:shadow-none' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${completed ? 'bg-green-100 text-green-700' : unlocked ? 'bg-bakery-100 text-bakery-700' : 'bg-stone-100 text-stone-400'}`}>
                          {completed ? <Check className="w-5 h-5" /> : unlocked ? index + 1 : <Lock className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-widest font-black text-bakery-400">{exercise.type}</span>
                          <h3 className="text-lg font-black text-bakery-800 tracking-tight">{exercise.title}</h3>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 mt-2 ${unlocked ? 'text-bakery-300 group-hover:text-bakery-600' : 'text-stone-300'}`} />
                    </div>
                    <p className="text-sm text-bakery-400 font-medium leading-relaxed mt-4">{exercise.description}</p>
                    <div className="mt-5 flex items-center justify-between gap-4">
                      <span className="text-xs font-black text-bakery-500 bg-bakery-50 rounded-full px-3 py-1">Цель: {exercise.targetAccuracy}%</span>
                      {completed && (
                        <span className="text-xs font-black text-green-700 bg-green-50 rounded-full px-3 py-1">
                          Лучшее: {progressMap.get(exercise.id)?.bestAccuracy || exercise.targetAccuracy}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </section>
      </main>

      <footer className="bg-white border-t border-bakery-100 p-8 mt-12 flex flex-col items-center gap-4">
        <div className="flex flex-wrap gap-8 justify-center max-w-3xl">
          <FooterTip title="Цвет пальца" text="Клавиши окрашены тем же цветом, что и палец" color="bg-bakery-500" />
          <FooterTip title="Точность первой" text="Переход дальше открывается по точности" color="bg-green-500" />
          <FooterTip title="Прогресс онлайн" text="Результаты сохраняются в аккаунте" color="bg-sky-500" />
        </div>
      </footer>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="min-h-screen bg-bakery-50 flex items-center justify-center text-bakery-700 font-black">
      Загружаю пекарню...
    </div>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
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
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const data = await apiRequest<{ user: AuthUser }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ nickname, password }),
      });
      onAuthenticated(data.user);
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
              placeholder="любой непустой пароль"
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

function MiniMetric({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="rounded-2xl bg-bakery-50 p-3 text-center">
      <div className="text-lg font-black text-bakery-800">{value}</div>
      <div className="text-[9px] uppercase tracking-widest font-black text-bakery-400">{label}</div>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="rounded-2xl bg-white border border-bakery-100 px-3 py-2 shadow-sm text-center">
      <div className="text-lg md:text-xl font-black text-bakery-800 leading-none">{value}</div>
      <div className="text-[8px] md:text-[9px] uppercase tracking-widest font-black text-bakery-400 mt-1">{label}</div>
    </div>
  );
}

function ResultMetric({ label, value, unit }: { label: string, value: string, unit?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-widest font-black opacity-60">{label}</span>
      <span className="text-2xl md:text-3xl font-bold">{value} {unit && <span className="text-sm font-normal opacity-50">{unit}</span>}</span>
    </div>
  );
}

function FooterTip({ title, text, color }: { title: string, text: string, color: string }) {
  return (
    <div className="flex flex-col items-center text-center max-w-[200px] gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] font-black uppercase tracking-widest text-bakery-800">{title}</span>
      <p className="text-[10px] text-bakery-400 leading-tight font-medium">{text}</p>
    </div>
  );
}
