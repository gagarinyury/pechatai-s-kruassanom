export type GameState = 'idle' | 'typing' | 'finished';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type AppView = 'course' | 'lesson';

export interface KeyStats {
  hits: number;
  misses: number;
}

export interface AuthUser {
  id: number;
  nickname: string;
  createdAt: string;
}

export interface ProgressRecord {
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

export interface ExerciseResult {
  accuracy: number;
  cpm: number;
  mistakes: number;
  passed: boolean;
}

export interface RetryableSavePayload {
  result: ExerciseResult;
  keyStats: Record<string, KeyStats>;
}
