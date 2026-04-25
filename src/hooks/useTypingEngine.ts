import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addKeyStat,
  calculateTypingStats,
  findFingerForChar,
  findRussianCharForCode,
  shouldWarnAboutLayout,
} from '../utils/keyboard';
import type { ExerciseResult, GameState, KeyStats, SaveState } from '../types';

interface UseTypingEngineOptions {
  exerciseContent: string;
  targetAccuracy: number;
  active: boolean;
  onSaveResult: (result: ExerciseResult, heatmap: Record<string, KeyStats>) => Promise<void>;
}

export function useTypingEngine({ exerciseContent, targetAccuracy, active, onSaveResult }: UseTypingEngineOptions) {
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

  const reset = useCallback(() => {
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

  // Reset when exercise changes
  useEffect(() => {
    reset();
  }, [exerciseContent, reset]);

  // Live clock for CPM updates
  useEffect(() => {
    if (gameState !== 'typing') return;

    const timer = window.setInterval(() => setClockNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [gameState]);

  // Cleanup layout warning timer
  useEffect(() => {
    return () => {
      if (layoutWarningTimerRef.current) window.clearTimeout(layoutWarningTimerRef.current);
    };
  }, []);

  const liveStats = useMemo(() => {
    void clockNow;
    return calculateTypingStats(userInput.length, mistakes, startTime, endTime);
  }, [clockNow, endTime, mistakes, startTime, userInput.length]);

  const progressPercent = Math.round((userInput.length / exerciseContent.length) * 100);
  const activeChar = exerciseContent[userInput.length] || '';
  const nextChar = exerciseContent[userInput.length + 1] || '';
  const activeFinger = activeChar ? findFingerForChar(activeChar) : undefined;

  const worstKeys = useMemo(() => {
    return (Object.entries(keyHeatmap) as Array<[string, KeyStats]>)
      .filter(([, stats]) => stats.misses > 0)
      .sort((a, b) => (b[1].misses / (b[1].hits + b[1].misses)) - (a[1].misses / (a[1].hits + a[1].misses)))
      .slice(0, 3);
  }, [keyHeatmap]);

  const showLayoutWarning = useCallback(() => {
    setLayoutWarning('Проверьте раскладку: нужна русская');
    if (layoutWarningTimerRef.current) window.clearTimeout(layoutWarningTimerRef.current);
    layoutWarningTimerRef.current = window.setTimeout(() => {
      setLayoutWarning('');
      layoutWarningTimerRef.current = null;
    }, 2600);
  }, []);

  const commitKeyStat = useCallback((key: string, isCorrect: boolean) => {
    const nextHeatmap = addKeyStat(heatmapRef.current, key, isCorrect);
    heatmapRef.current = nextHeatmap;
    setKeyHeatmap(nextHeatmap);
    return nextHeatmap;
  }, []);

  const saveExerciseResult = useCallback(async (result: ExerciseResult, finalHeatmap: Record<string, KeyStats>) => {
    setSaveState('saving');
    setSaveError('');

    try {
      await onSaveResult(result, finalHeatmap);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить прогресс');
    }
  }, [onSaveResult]);

  const finishExercise = useCallback((nextInput: string, nextMistakes: number, finalHeatmap: Record<string, KeyStats>) => {
    const finishedAt = Date.now();
    const stats = calculateTypingStats(nextInput.length, nextMistakes, startTime || finishedAt, finishedAt);
    const result: ExerciseResult = {
      ...stats,
      mistakes: nextMistakes,
      passed: stats.accuracy >= targetAccuracy,
    };

    setGameState('finished');
    setEndTime(finishedAt);
    setLastResult(result);
    void saveExerciseResult(result, finalHeatmap);
  }, [targetAccuracy, saveExerciseResult, startTime]);

  // Keyboard event handler
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (gameState === 'finished') return;

      if (event.key === 'Escape') {
        reset();
        return;
      }

      if (event.code === 'Space') event.preventDefault();

      const char = event.key;
      if (char.length !== 1 && char !== ' ') return;

      const expectedChar = exerciseContent[userInput.length];
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

        if (nextInput.length === exerciseContent.length) {
          finishExercise(nextInput, mistakes, nextHeatmap);
        }
      } else {
        commitKeyStat(expectedChar, false);
        setMistakes((value) => value + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    active,
    commitKeyStat,
    exerciseContent,
    finishExercise,
    gameState,
    mistakes,
    reset,
    showLayoutWarning,
    userInput,
  ]);

  return {
    gameState,
    userInput,
    mistakes,
    pressedKey,
    layoutWarning,
    keyHeatmap,
    liveStats,
    progressPercent,
    activeChar,
    nextChar,
    activeFinger,
    worstKeys,
    lastResult,
    saveState,
    saveError,
    reset,
  };
}
