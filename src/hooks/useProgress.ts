import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { WEEK_1 } from '../course/week1';
import type { CourseDay } from '../course/types';
import type { KeyStats, ProgressRecord, ExerciseResult } from '../types';

export function useProgress(userId: number | null) {
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.progress.list();
      setRecords(data.progress);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить прогресс');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      void loadProgress();
    } else {
      setRecords([]);
      setError('');
    }
  }, [loadProgress, userId]);

  const progressMap = useMemo(() => {
    return new Map(records.map((record) => [record.exerciseId, record]));
  }, [records]);

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

  const completedDaysCount = useMemo(() => {
    return WEEK_1.days.filter((day) => isDayCompleted(day)).length;
  }, [isDayCompleted]);

  const completedExercisesCount = useMemo(() => {
    return records.filter((record) => record.completed).length;
  }, [records]);

  const weekStats = useMemo(() => {
    const completed = records.filter((record) => record.completed);
    const bestCpm = completed.reduce((max, record) => Math.max(max, record.bestCpm), 0);
    const averageAccuracy = completed.length
      ? Math.round(completed.reduce((sum, record) => sum + record.bestAccuracy, 0) / completed.length)
      : 100;
    const weakKeys = new Map<string, number>();

    for (const record of records) {
      for (const [key, stats] of Object.entries(record.keyStats || {}) as Array<[string, KeyStats]>) {
        if (stats.misses > 0) weakKeys.set(key, (weakKeys.get(key) || 0) + stats.misses);
      }
    }

    return {
      bestCpm,
      averageAccuracy,
      weakKeys: [...weakKeys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
    };
  }, [records]);

  const updateRecord = useCallback((record: ProgressRecord) => {
    setRecords((previous) => {
      const withoutRecord = previous.filter((item) => item.exerciseId !== record.exerciseId);
      return [...withoutRecord, record];
    });
  }, []);

  const saveResult = useCallback(async (
    courseId: string,
    dayId: string,
    exerciseId: string,
    result: ExerciseResult,
    keyStats: Record<string, KeyStats>,
  ) => {
    const data = await api.progress.save({
      courseId,
      dayId,
      exerciseId,
      completed: result.passed,
      bestAccuracy: result.accuracy,
      bestCpm: result.cpm,
      mistakes: result.mistakes,
      keyStats,
    });
    updateRecord(data.progress);
    return data.progress;
  }, [updateRecord]);

  return {
    records,
    loading,
    error,
    progressMap,
    isExerciseCompleted,
    isDayCompleted,
    isDayUnlocked,
    completedDaysCount,
    completedExercisesCount,
    weekStats,
    reload: loadProgress,
    saveResult,
  };
}
