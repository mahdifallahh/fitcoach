'use client';

import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { ExerciseLibrary } from '@/components/coach/exercise-library';

export default function CoachExercisesPage() {
  return (
    <CoachPageLayout>
      <ExerciseLibrary />
    </CoachPageLayout>
  );
}
