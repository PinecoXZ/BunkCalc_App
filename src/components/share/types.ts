import type { Subject } from '../../lib/types';
import type { calculateSubjectStats } from '../../lib/calculations';

export interface ThemeCardProps {
  overallPct: number;
  isSafe: boolean;
  totalAttended: number;
  totalPossible: number;
  totalSafeBunks: number;
  subjectWithStats: Array<{
    subject: Subject;
    stats: ReturnType<typeof calculateSubjectStats>;
  }>;
}

