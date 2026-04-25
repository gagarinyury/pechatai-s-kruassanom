import { useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProgress } from '../hooks/useProgress';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { getNextExercise } from '../utils/keyboard';
import { HandsGuide } from '../components/HandsGuide';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { CompactMetric } from '../components/CompactMetric';
import { ResultMetric } from '../components/ResultMetric';
import { WEEK_1 } from '../course/week1';
import type { AppView } from '../types';

interface LessonViewProps {
  dayId: string;
  exerciseId: string;
  onNavigate: (view: AppView, dayId?: string, exerciseId?: string) => void;
}

export function LessonView({ dayId, exerciseId, onNavigate }: LessonViewProps) {
  const { user } = useAuth();
  const progress = useProgress(user?.id ?? null);

  const currentDay = useMemo(() => {
    return WEEK_1.days.find((day) => day.id === dayId) || WEEK_1.days[0];
  }, [dayId]);

  const currentExercise = useMemo(() => {
    return currentDay.exercises.find((exercise) => exercise.id === exerciseId) || currentDay.exercises[0];
  }, [currentDay, exerciseId]);

  const nextTarget = useMemo(() => getNextExercise(currentDay, currentExercise), [currentDay, currentExercise]);
  const isFinalExercise = !nextTarget;

  const handleSaveResult = useCallback(async (result: import('../types').ExerciseResult, heatmap: Record<string, import('../types').KeyStats>) => {
    await progress.saveResult(WEEK_1.id, currentDay.id, currentExercise.id, result, heatmap);
  }, [progress, currentDay.id, currentExercise.id]);

  const engine = useTypingEngine({
    exerciseContent: currentExercise.content,
    targetAccuracy: currentExercise.targetAccuracy,
    active: !progress.loading,
    onSaveResult: handleSaveResult,
  });

  const canContinue = engine.lastResult?.passed && engine.saveState !== 'saving';

  const handleBackToCourse = useCallback(() => {
    engine.reset();
    onNavigate('course');
  }, [engine, onNavigate]);

  const handleContinue = useCallback(() => {
    if (!nextTarget) return;
    onNavigate('lesson', nextTarget.day.id, nextTarget.exercise.id);
  }, [nextTarget, onNavigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [exerciseId]);

  return (
    <div className="min-h-screen bg-bakery-50 font-sans text-bakery-900 selection:bg-bakery-200">
      <main className="min-h-screen w-full max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {engine.gameState !== 'typing' && (
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
          <CompactMetric label="Точность" value={`${engine.liveStats.accuracy}%`} />
          <CompactMetric label="Ошибки" value={engine.mistakes} />
          <CompactMetric label="Скорость" value={engine.liveStats.cpm} />
          <CompactMetric label="Прогресс" value={`${engine.progressPercent}%`} />
        </div>

        <section className="flex-1 flex flex-col gap-4">
          <div className="w-full bg-white rounded-3xl border-2 border-bakery-100 shadow-xl p-5 md:p-8 relative min-h-[240px] md:min-h-[280px] flex items-center">
            <div className="absolute left-5 top-4 right-5 flex items-center justify-between gap-4">
              <p className="text-xs md:text-sm text-bakery-400 font-bold truncate">{currentExercise.description}</p>
              <span className="shrink-0 text-[10px] uppercase tracking-widest font-black text-bakery-400">{currentExercise.type}</span>
            </div>

            <AnimatePresence>
              {engine.layoutWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-5 right-5 top-14 z-50 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-black text-red-700 shadow-sm"
                >
                  {engine.layoutWarning}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full pt-8 text-3xl md:text-5xl font-mono leading-relaxed whitespace-pre-wrap break-words tracking-tight text-bakery-800">
              <span className="opacity-40">{engine.userInput}</span>
              {engine.gameState !== 'finished' && (
                <span className="relative">
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="absolute left-0 top-0 bottom-0 w-[4px] bg-bakery-600 rounded-full"
                  />
                  <span className="text-bakery-900 border-b-4 border-bakery-500 bg-bakery-50/50 rounded-t-md">{engine.activeChar}</span>
                </span>
              )}
              <span className="text-bakery-100">{currentExercise.content.slice(engine.userInput.length + (engine.gameState !== 'finished' ? 1 : 0))}</span>
            </div>

            <AnimatePresence>
              {engine.gameState === 'finished' && engine.lastResult && (
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
                    <div className="text-5xl">{engine.lastResult.passed ? '🥐✨' : '🥐'}</div>
                    <div>
                      <h2 className="text-3xl md:text-5xl font-black mb-2 uppercase italic tracking-tight">
                        {engine.lastResult.passed ? 'Зачтено!' : 'Еще подход'}
                      </h2>
                      <p className="text-bakery-200 font-medium max-w-md">
                        {engine.lastResult.passed
                          ? isFinalExercise ? 'Неделя закрыта. Можно смотреть общий результат.' : 'Прогресс сохранен, можно двигаться дальше.'
                          : `Нужно ${currentExercise.targetAccuracy}% точности. Сейчас ${engine.lastResult.accuracy}%.`}
                      </p>
                    </div>

                    <div className="flex gap-8 md:gap-12 mt-2 bg-bakery-800/50 p-5 rounded-3xl border border-bakery-600/30">
                      <ResultMetric label="Скорость" value={`${engine.lastResult.cpm}`} unit="CPM" />
                      <ResultMetric label="Точность" value={`${engine.lastResult.accuracy}%`} />
                      <ResultMetric label="Ошибки" value={`${engine.lastResult.mistakes}`} />
                    </div>

                    <div className="min-h-5 text-xs font-bold text-bakery-100/70">
                      {engine.saveState === 'saving' && 'Сохраняю прогресс...'}
                      {engine.saveState === 'saved' && 'Прогресс сохранен'}
                      {engine.saveState === 'error' && engine.saveError}
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={engine.reset}
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

          {engine.worstKeys.length > 0 && engine.gameState === 'idle' && (
            <div className="mx-auto p-3 bg-orange-50 rounded-2xl flex gap-3 items-center border border-orange-100 shadow-sm">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-bold text-orange-800 italic">Тяжело пропекаются: {engine.worstKeys.map((key) => key[0].toUpperCase()).join(', ')}</span>
            </div>
          )}

          <div className="w-full space-y-1">
            <div className="overflow-hidden flex items-center justify-center">
              <HandsGuide activeFinger={engine.activeFinger} compact />
            </div>
            <VirtualKeyboard activeKey={engine.activeChar} nextKey={engine.nextChar} pressedKey={engine.pressedKey} />
          </div>
        </section>
      </main>
    </div>
  );
}
