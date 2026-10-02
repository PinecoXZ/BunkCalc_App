import React from 'react';
import type { Subject, AttendanceRecord, ShareCardTheme } from '../lib/types';
import { calculateSubjectStats, calculateOverallStats } from '../lib/calculations';
import { useSettings } from '../store/useSettings';
import { OledThemeCard } from './share/OledThemeCard';
import { AcademicThemeCard } from './share/AcademicThemeCard';
import { TerminalThemeCard } from './share/TerminalThemeCard';
import { NeonThemeCard } from './share/NeonThemeCard';
import { MemeThemeCard } from './share/MemeThemeCard';

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

  const overallStats = React.useMemo(() => {
    return calculateOverallStats(
      subjects,
      records,
      settings.semesterEndDate,
      settings.holidays,
      settings.globalThreshold
    );
  }, [subjects, records, settings.semesterEndDate, settings.holidays, settings.globalThreshold]);

  const themeProps = {
    overallPct: overallStats.percentage,
    isSafe: overallStats.isSafe,
    totalAttended: overallStats.totalAttended,
    totalPossible: overallStats.totalClasses,
    totalSafeBunks: overallStats.totalSafeBunks,
    subjectWithStats,
  };

  switch (theme) {
    case 'oled':
      return <OledThemeCard {...themeProps} />;
    case 'academic':
      return <AcademicThemeCard {...themeProps} />;
    case 'terminal':
      return <TerminalThemeCard {...themeProps} />;
    case 'meme':
      return <MemeThemeCard {...themeProps} />;
    case 'neon':
    default:
      return <NeonThemeCard {...themeProps} />;
  }
};

export default ShareCard;
