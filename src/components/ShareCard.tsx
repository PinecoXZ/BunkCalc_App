import React from 'react';
import type { Subject, AttendanceRecord, ShareCardTheme } from '../lib/types';
import { calculateSubjectStats } from '../lib/calculations';
import { useSettings } from '../store/useSettings';
import { OledThemeCard } from './share/OledThemeCard';
import { AcademicThemeCard } from './share/AcademicThemeCard';
import { TerminalThemeCard } from './share/TerminalThemeCard';
import { NeonThemeCard } from './share/NeonThemeCard';

interface Props {
  subjects: Subject[];
  records: AttendanceRecord[];
  theme?: ShareCardTheme;
}

export const ShareCard: React.FC<Props> = ({ subjects, records, theme = 'neon' }) => {
  const settings = useSettings((state) => state.settings);

  const subjectWithStats = React.useMemo(() => {
    return subjects.map((s) => ({
      subject: s,
      stats: calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays),
    }));
  }, [subjects, records, settings.semesterEndDate, settings.holidays]);

  const { totalAttended, totalPossible, totalSafeBunks } = React.useMemo(() => {
    let attended = 0;
    let possible = 0;
    let safeBunks = 0;
    for (const item of subjectWithStats) {
      attended += item.stats.attendedCount;
      possible += item.stats.totalClasses;
      safeBunks += Math.max(0, item.stats.bunkBudget);
    }
    return { totalAttended: attended, totalPossible: possible, totalSafeBunks: safeBunks };
  }, [subjectWithStats]);

  const overallPct = totalPossible === 0 ? 100 : (totalAttended / totalPossible) * 100;
  const isSafe = overallPct >= (settings.globalThreshold * 100);

  const themeProps = {
    overallPct,
    isSafe,
    totalAttended,
    totalPossible,
    totalSafeBunks,
    subjectWithStats,
  };

  switch (theme) {
    case 'oled':
      return <OledThemeCard {...themeProps} />;
    case 'academic':
      return <AcademicThemeCard {...themeProps} />;
    case 'terminal':
      return <TerminalThemeCard {...themeProps} />;
    case 'neon':
    default:
      return <NeonThemeCard {...themeProps} />;
  }
};

export default ShareCard;
