import React from 'react';
import type { ThemeCardProps } from './types';

export const NeonThemeCard: React.FC<ThemeCardProps> = ({
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
        background: 'linear-gradient(145deg, #090d16 0%, #030712 50%, #0f172a 100%)',
        color: '#ffffff',
        padding: '24px',
        borderRadius: '28px',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
      }}
    >
      {/* Cyberpunk Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '160px',
        height: '160px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
        borderRadius: '999px',
        filter: 'blur(30px)',
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '-30px',
        width: '140px',
        height: '140px',
        background: 'radial-gradient(circle, rgba(147,51,234,0.25) 0%, transparent 70%)',
        borderRadius: '999px',
        filter: 'blur(30px)',
      }}></div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginTop: '4px' }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 900,
          background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontStyle: 'italic',
          textTransform: 'uppercase',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          BunkCalc
        </h2>
        <p style={{
          color: '#94a3b8',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          margin: '4px 0 0 0',
        }}>
          Attendance Metrics Card
        </p>
      </div>

      {/* Main Score Hero Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(12px)',
        borderRadius: '22px',
        padding: '20px',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px 0' }}>
          Current Attendance
        </p>
        <p style={{
          fontSize: '56px',
          fontWeight: 900,
          margin: '0 0 8px 0',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: isSafe ? '#4ade80' : '#f87171',
        }}>
          {overallPct.toFixed(1)}%
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '5px 14px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            backgroundColor: isSafe ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isSafe ? '#4ade80' : '#f87171',
            border: isSafe ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
          }}>
            {isSafe ? 'SAFE BUFFER' : 'SHORTAGE ALERT'}
          </span>
          <span style={{
            padding: '5px 14px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.4)',
          }}>
            {totalSafeBunks} Safe Bunks
          </span>
        </div>
      </div>

      {/* Courses Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0' }}>
          Course Breakdown
        </p>
        {subjectWithStats.slice(0, 6).map(({ subject: s, stats }) => {
          return (
            <div key={s.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              padding: '9px 14px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <span style={{ fontWeight: 700, fontSize: '12px', color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: stats.bunkBudget >= 0 ? '#4ade80' : '#f87171' }}>
                  {stats.bunkBudget >= 0 ? `${stats.bunkBudget} left` : `Need ${stats.classesNeededToRecover}`}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: stats.attendancePct >= 75 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                  color: stats.attendancePct >= 75 ? '#4ade80' : '#f87171',
                  border: stats.attendancePct >= 75 ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                }}>
                  {stats.attendancePct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        paddingTop: '10px',
      }}>
        <p style={{ color: '#64748b', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
          BunkCalc • Smart Attendance Manager
        </p>
      </div>
    </div>
  );
};

