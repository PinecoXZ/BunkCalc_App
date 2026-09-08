import React from 'react';
import type { ThemeCardProps } from './types';

export const TerminalThemeCard: React.FC<ThemeCardProps> = ({
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
        backgroundColor: '#0a0f0d',
        color: '#00ff66',
        padding: '24px 20px',
        fontFamily: '"SF Mono", "Fira Code", "Courier New", Courier, monospace',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        border: '1px solid #00ff66',
        boxShadow: 'inset 0 0 20px rgba(0,255,102,0.15)',
      }}
    >
      <div>
        <div style={{ borderBottom: '1px dashed #00ff66', paddingBottom: '10px', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: 700 }}>
            &gt; RUN BUNK_CALC.EXE --AUDIT
          </p>
          <p style={{ margin: 0, fontSize: '9px', color: '#00cc52', opacity: 0.8 }}>
            SYS_STAT: OK // HOST_ID: LOCAL_USER
          </p>
        </div>

        <div style={{
          border: '1px solid #00ff66',
          backgroundColor: '#041c10',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '9px', letterSpacing: '0.1em', opacity: 0.8 }}>
            [ AGGREGATE_ATTENDANCE ]
          </p>
          <p style={{ fontSize: '50px', fontWeight: 900, margin: '0 0 6px 0', lineHeight: 1, letterSpacing: '-0.03em' }}>
            {overallPct.toFixed(1)}%
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '10px' }}>
            TOTAL_SESSIONS: {totalAttended}/{totalPossible}
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{
              padding: '2px 8px',
              fontSize: '9px',
              fontWeight: 900,
              backgroundColor: isSafe ? '#00ff66' : '#ff0055',
              color: '#000000',
            }}>
              {isSafe ? '[ STATUS: SECURE ]' : '[ STATUS: BREACHED ]'}
            </span>
            <span style={{
              padding: '2px 8px',
              fontSize: '9px',
              fontWeight: 900,
              border: '1px solid #00ff66',
              color: '#00ff66',
            }}>
              [ BUFFER: {totalSafeBunks} ]
            </span>
          </div>
        </div>

        <div style={{ fontSize: '10px', lineHeight: 1.5 }}>
          <p style={{ margin: '0 0 6px 0', opacity: 0.8, borderBottom: '1px dashed #005522', paddingBottom: '4px' }}>
            -- COURSE_TELEMETRY --
          </p>
          {subjectWithStats.slice(0, 6).map(({ subject: s, stats }) => {
            const safeChar = stats.bunkBudget >= 0 ? '+' : '!';
            return (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {safeChar} {s.name}
                </span>
                <span>
                  [{stats.bunkBudget >= 0 ? `${stats.bunkBudget}b` : `req${stats.classesNeededToRecover}`}] {stats.attendancePct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #00ff66', paddingTop: '10px', fontSize: '9px', opacity: 0.7, textAlign: 'center' }}>
        END_TRANSMISSION // BUNKCALC_ENGINE
      </div>
    </div>
  );
};

