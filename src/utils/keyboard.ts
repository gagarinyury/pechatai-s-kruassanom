import { RUSSIAN_LAYOUT } from '../constants';
import { WEEK_1 } from '../course/week1';
import type { CourseDay, CourseExercise } from '../course/types';
import type { KeyStats } from '../types';

export function addKeyStat(map: Record<string, KeyStats>, key: string, isCorrect: boolean): Record<string, KeyStats> {
  const current = map[key] || { hits: 0, misses: 0 };
  return {
    ...map,
    [key]: {
      hits: current.hits + (isCorrect ? 1 : 0),
      misses: current.misses + (isCorrect ? 0 : 1),
    },
  };
}

export function calculateTypingStats(typedLength: number, mistakes: number, startedAt: number | null, finishedAt: number | null) {
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

export function getSpaceFingerForInput(input: string): number {
  for (let index = input.length - 1; index >= 0; index -= 1) {
    const char = input[index];
    if (char === ' ') continue;

    const previousFinger = findFingerForChar(char);
    if (previousFinger === undefined) break;

    return previousFinger <= 4 ? 5 : 4;
  }

  return 5;
}

export function findFingerForChar(char: string, inputContext = ''): number | undefined {
  const lower = char.toLowerCase();
  if (lower === ' ') return getSpaceFingerForInput(inputContext);

  for (const row of RUSSIAN_LAYOUT) {
    const found = row.find((key) => key.key.toLowerCase() === lower || key.shiftKey?.toLowerCase() === lower);
    if (found) return found.finger;
  }

  return undefined;
}

export function findRussianCharForCode(code: string, shiftKey: boolean): string | undefined {
  for (const row of RUSSIAN_LAYOUT) {
    const found = row.find((key) => key.code === code);
    if (found) return shiftKey && found.shiftKey ? found.shiftKey : found.key;
  }

  return undefined;
}

export function isLatinLayoutKey(key: string): boolean {
  return /^[a-z`[\]\\;',./0-9=-]$/i.test(key);
}

export function shouldWarnAboutLayout(event: KeyboardEvent, expectedChar: string): boolean {
  if (expectedChar === ' ') return false;

  const russianCharForPhysicalKey = findRussianCharForCode(event.code, event.shiftKey);
  const normalizedExpected = expectedChar.toLowerCase();
  const normalizedActual = event.key.toLowerCase();

  if (russianCharForPhysicalKey?.toLowerCase() === normalizedExpected && normalizedActual !== normalizedExpected) {
    return true;
  }

  return /[а-яё]/i.test(expectedChar) && isLatinLayoutKey(event.key);
}

export function getNextExercise(day: CourseDay, exercise: CourseExercise): { day: CourseDay; exercise: CourseExercise } | null {
  const exerciseIndex = day.exercises.findIndex((item) => item.id === exercise.id);
  if (exerciseIndex >= 0 && exerciseIndex < day.exercises.length - 1) {
    return { day, exercise: day.exercises[exerciseIndex + 1] };
  }

  const dayIndex = WEEK_1.days.findIndex((item) => item.id === day.id);
  const nextDay = WEEK_1.days[dayIndex + 1];
  if (!nextDay) return null;

  return { day: nextDay, exercise: nextDay.exercises[0] };
}
