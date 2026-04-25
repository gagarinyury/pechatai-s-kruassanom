/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SplashScreen } from './views/SplashScreen';
import { AuthScreen } from './views/AuthScreen';
import { CourseView } from './views/CourseView';
import { LessonView } from './views/LessonView';
import type { AppView } from './types';
import { WEEK_1 } from './course/week1';

function AppRouter() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<AppView>('course');
  const [dayId, setDayId] = useState(WEEK_1.days[0].id);
  const [exerciseId, setExerciseId] = useState(WEEK_1.days[0].exercises[0].id);

  const handleNavigate = useCallback((nextView: AppView, nextDayId?: string, nextExerciseId?: string) => {
    setView(nextView);
    if (nextDayId) setDayId(nextDayId);
    if (nextExerciseId) setExerciseId(nextExerciseId);
  }, []);

  if (loading) return <SplashScreen />;
  if (!user) return <AuthScreen />;

  if (view === 'lesson') {
    return <LessonView dayId={dayId} exerciseId={exerciseId} onNavigate={handleNavigate} />;
  }

  return <CourseView onNavigate={handleNavigate} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
