import React from 'react';
import type { ThemeCardProps } from './types';

export const AcademicThemeCard: React.FC<ThemeCardProps> = ({
  overallPct,
  isSafe,
  totalAttended,
  totalPossible,
  totalSafeBunks,
  subjectWithStats,
}) => {
  return (
    <div
      id="share-card"
      style={{
        width: '375px',
        height: '667px',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        padding: '24px 20px',
        fontFamily: 'Georgia, "Times New Roman", serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        border: '8px double #cbd5e1',
      }}
    >
      <div>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 2px 0', color: '#0f172a' }}>
            Academic Attendance Summary
          </h2>
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#64748b', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
            Student Self-Audit Statement
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center',
          marginBottom: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        }}>
          <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px 0', fontFamily: 'system-ui, sans-serif' }}>
            Cumulative Semester Attendance
          </p>
          <p style={{ fontSize: '46px', fontWeight: 900, color: isSafe ? '#166534' : '#991b1b', margin: '0 0 6px 0', lineHeight: 1, fontFamily: 'system-ui, sans-serif' }}>
            {overallPct.toFixed(1)}%
          </p>
          <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 8px 0', fontStyle: 'italic' }}>
            {totalAttended} of {totalPossible} Sessions Attended
          </p>
          <div style={{
            display: 'inline-block',
            padding: '4px 14px',
            backgroundColor: isSafe ? '#dcfce7' : '#fee2e2',
            color: isSafe ? '#15803d' : '#b91c1c',
            border: isSafe ? '1px solid #86efac' : '1px solid #fca5a5',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {isSafe ? 'CRITERIA SATISFIED • ' + totalSafeBunks + ' BUNKS BUFFER' : 'SHORTAGE ALERT • IMMEDIATE ATTENDANCE REQUIRED'}
          </div>
        </div>

        <div>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', margin: '0 0 8px 0', fontFamily: 'system-ui, sans-serif' }}>
            Subject Records
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'system-ui, sans-serif' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '4px 0', fontWeight: 700 }}>Course</th>
                <th style={{ padding: '4px 0', textAlign: 'center', fontWeight: 700 }}>Bunks</th>
                <th style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {subjectWithStats.slice(0, 6).map(({ subject: s, stats }) => {
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 0', fontWeight: 600, color: '#1e293b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </td>
                    <td style={{ padding: '6px 0', textAlign: 'center', color: '#64748b', fontSize: '10px' }}>
                      {stats.bunkBudget >= 0 ? `${stats.bunkBudget}` : `Req ${stats.classesNeededToRecover}`}
                    </td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 800, color: stats.attendancePct >= 75 ? '#166534' : '#991b1b' }}>
                      {stats.attendancePct.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '10px' }}>
        <p style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 600, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
          Verified on-device with BunkCalc • No external tracking
        </p>
      </div>
    </div>
  );
};

