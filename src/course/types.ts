export type ExerciseType = 'intro' | 'drill' | 'bigrams' | 'words' | 'sentences' | 'checkpoint';

export interface CourseExercise {
  id: string;
  type: ExerciseType;
  title: string;
  description: string;
  focusKeys: string[];
  preLessonNote: string;
  coachNote: string;
  content: string;
  targetAccuracy: number;
  targetCpm?: number;
}

export interface CourseDay {
  id: string;
  dayNumber: number;
  title: string;
  goal: string;
  exercises: CourseExercise[];
}

export interface CourseWeek {
  id: string;
  title: string;
  days: CourseDay[];
}
