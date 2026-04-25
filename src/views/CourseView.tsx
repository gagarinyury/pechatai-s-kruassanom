import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  Check,
  ChevronRight,
  Lock,
  LogOut,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProgress } from '../hooks/useProgress';
import { MiniMetric } from '../components/MiniMetric';
import { FooterTip } from '../components/FooterTip';
import { WEEK_1 } from '../course/week1';
import type { CourseDay, CourseExercise } from '../course/types';
import type { AppView } from '../types';

interface CourseViewProps {
  onNavigate: (view: AppView, dayId: string, exerciseId: string) => void;
}

export function CourseView({ onNavigate }: CourseViewProps) {
  const { user, logout } = useAuth();
  const progress = useProgress(user?.id ?? null);

  const [selectedDayId, setSelectedDayId] = useState(WEEK_1.days[0].id);

  const currentDay = useMemo(() => {
    return WEEK_1.days.find((day) => day.id === selectedDayId) || WEEK_1.days[0];
  }, [selectedDayId]);

  const [selectedExerciseId, setSelectedExerciseId] = useState(currentDay.exercises[0].id);

  const currentExercise = useMemo(() => {
    return currentDay.exercises.find((exercise) => exercise.id === selectedExerciseId) || currentDay.exercises[0];
  }, [currentDay, selectedExerciseId]);

  // Auto-navigate to first available day on load
  useEffect(() => {
    if (progress.loading) return;

    const selectedDay = WEEK_1.days.find((day) => day.id === selectedDayId);
    if (selectedDay && progress.isDayUnlocked(selectedDay)) return;

    const firstAvailableDay = WEEK_1.days.find((day) => progress.isDayUnlocked(day) && !progress.isDayCompleted(day))
      || [...WEEK_1.days].reverse().find((day) => progress.isDayUnlocked(day))
      || WEEK_1.days[0];
    const firstExercise = firstAvailableDay.exercises.find((exercise) => !progress.isExerciseCompleted(exercise.id))
      || firstAvailableDay.exercises[0];

    setSelectedDayId(firstAvailableDay.id);
    setSelectedExerciseId(firstExercise.id);
  }, [progress.isDayCompleted, progress.isDayUnlocked, progress.isExerciseCompleted, progress.loading, selectedDayId]);

  const handleSelectDay = useCallback((day: CourseDay) => {
    if (!progress.isDayUnlocked(day)) return;

    const firstExercise = day.exercises.find((exercise) => !progress.isExerciseCompleted(exercise.id)) || day.exercises[0];
    setSelectedDayId(day.id);
    setSelectedExerciseId(firstExercise.id);
  }, [progress]);

  const handleSelectExercise = useCallback((exercise: CourseExercise) => {
    setSelectedExerciseId(exercise.id);
    onNavigate('lesson', currentDay.id, exercise.id);
  }, [currentDay.id, onNavigate]);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

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
            <span className="text-sm font-bold text-bakery-700">{user?.nickname}</span>
          </div>
          <div className="flex items-center gap-4 bg-bakery-100/50 px-4 py-2 rounded-full border border-bakery-200/50">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-bakery-400 uppercase font-black">Дни</span>
              <span className="text-xs font-bold text-bakery-600 flex items-center gap-1"><Trophy className="w-3 h-3" /> {progress.completedDaysCount}/7</span>
            </div>
            <div className="w-px h-6 bg-bakery-200" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-bakery-400 uppercase font-black">Уроки</span>
              <span className="text-sm font-bold text-bakery-800 flex items-center gap-1">🥐 {progress.completedExercisesCount}</span>
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
                const unlocked = progress.isDayUnlocked(day);
                const completed = progress.isDayCompleted(day);
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
                <MiniMetric label="CPM" value={progress.weekStats.bestCpm} />
                <MiniMetric label="Точн." value={`${progress.weekStats.averageAccuracy}%`} />
                <MiniMetric label="Дней" value={`${progress.completedDaysCount}/7`} />
              </div>
              {progress.weekStats.weakKeys.length > 0 && (
                <div className="mt-4 pt-4 border-t border-bakery-50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-bakery-400">Слабые клавиши</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {progress.weekStats.weakKeys.map(([key]) => (
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
                const completed = progress.isExerciseCompleted(exercise.id);
                const selected = exercise.id === currentExercise.id;
                const previousCompleted = index === 0 || progress.isExerciseCompleted(currentDay.exercises[index - 1].id);
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
                          Лучшее: {progress.progressMap.get(exercise.id)?.bestAccuracy || exercise.targetAccuracy}%
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
