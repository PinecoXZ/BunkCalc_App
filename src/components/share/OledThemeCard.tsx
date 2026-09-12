import React from 'react';
import type { ThemeCardProps } from './types';

export const OledThemeCard: React.FC<ThemeCardProps> = ({
  overallPct,
  isSafe,
  totalSafeBunks,
  subjectWithStats,
}) => {
  return (
    <div
      id="share-card"
      style={{
        width: '375px',
        height: '667px',
        backgroundColor: '#181c24',
        color: '#ffffff',
        padding: '28px 24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        border: '1px solid #2a313d',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.03em', color: '#ffffff', textTransform: 'uppercase' }}>
            BunkCalc
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Dark Soft
          </span>
        </div>

        <div style={{ borderBottom: '1px solid #27272a', paddingBottom: '24px', marginBottom: '20px' }}>
          <p style={{ color: '#71717a', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px 0' }}>
            Attendance Score
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: isSafe ? '#ffffff' : '#f43f5e' }}>
              {overallPct.toFixed(1)}%
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              border: isSafe ? '1px solid #22c55e' : '1px solid #f43f5e',
              color: isSafe ? '#4ade80' : '#fb7185',
              borderRadius: '6px',
            }}>
              {isSafe ? 'STATUS: SAFE' : 'STATUS: DANGER'}
            </span>
            <span style={{
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              border: '1px solid #3f3f46',
              color: '#e4e4e7',
              borderRadius: '6px',
            }}>
              {totalSafeBunks} SAFE BUNKS
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p style={{ color: '#71717a', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px 0' }}>
            Courses Breakdown
          </p>
          {subjectWithStats.slice(0, 6).map(({ subject: s, stats }) => {
            return (
              <div key={s.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #18181b',
              }}>
                <span style={{ fontWeight: 600, fontSize: '12px', color: '#f4f4f5', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600 }}>
                    {stats.bunkBudget >= 0 ? `+${stats.bunkBudget} bunks` : `-${stats.classesNeededToRecover} classes`}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: stats.attendancePct >= 75 ? '#ffffff' : '#f43f5e', minWidth: '42px', textAlign: 'right' }}>
                    {stats.attendancePct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', borderTop: '1px solid #27272a', paddingTop: '12px' }}>
        <p style={{ color: '#52525b', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
          Generated via BunkCalc • University Attendance Engine
        </p>
      </div>
    </div>
  );
};

