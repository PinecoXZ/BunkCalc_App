import React from 'react';
import type { ThemeCardProps } from './types';

export const MemeThemeCard: React.FC<ThemeCardProps> = ({
  overallPct,
  isSafe,
  totalSafeBunks,
  totalAttended,
  totalPossible,
  subjectWithStats,
}) => {
  // Rank and meme analysis
  const rankInfo = React.useMemo(() => {
    if (overallPct >= 90) {
      return {
        title: 'ACADEMIC WEAPON 🗿',
        badge: 'TA In Training',
        badgeBg: 'rgba(34, 197, 94, 0.2)',
        badgeColor: '#4ade80',
        borderColor: 'rgba(34, 197, 94, 0.4)',
        glowColor: 'rgba(34, 197, 94, 0.3)',
        quote: "The professor thinks you're on the faculty payroll.",
        threat: 'Minimal 🟢',
        threatColor: '#4ade80',
      };
    } else if (overallPct >= 80) {
      return {
        title: 'GIGACHAD SCHOLAR 🛡️',
        badge: 'Chill & Safe',
        badgeBg: 'rgba(59, 130, 246, 0.2)',
        badgeColor: '#60a5fa',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        glowColor: 'rgba(59, 130, 246, 0.3)',
        quote: 'Comfortably cruising above the danger zone with zero stress.',
        threat: 'Very Low 🟢',
        threatColor: '#60a5fa',
      };
    } else if (overallPct >= 75) {
      return {
        title: '75.1% PRECISION SNIPER 🎯',
        badge: 'Calculated Legend',
        badgeBg: 'rgba(234, 179, 8, 0.2)',
        badgeColor: '#facc15',
        borderColor: 'rgba(234, 179, 8, 0.4)',
        glowColor: 'rgba(234, 179, 8, 0.3)',
        quote: 'Not 1% more, not 1% less. Master of mathematical efficiency.',
        threat: 'Moderate 🟡 (The professor is watching)',
        threatColor: '#facc15',
      };
    } else if (overallPct >= 65) {
      return {
        title: 'DANGEROUSLY COOKED 💀',
        badge: 'Praying for Medical Leave',
        badgeBg: 'rgba(249, 115, 22, 0.2)',
        badgeColor: '#fb923c',
        borderColor: 'rgba(249, 115, 22, 0.4)',
        glowColor: 'rgba(249, 115, 22, 0.3)',
        quote: 'Currently debating whether a fake cough or a medical certificate works better.',
        threat: 'High 🟠 (On the watchlist)',
        threatColor: '#fb923c',
      };
    } else {
      return {
        title: 'DEBARRED FINAL BOSS 🚨',
        badge: 'Campus Ghost',
        badgeBg: 'rgba(239, 68, 68, 0.2)',
        badgeColor: '#f87171',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        glowColor: 'rgba(239, 68, 68, 0.4)',
        quote: 'The professor only knows you as a blank line on the roll sheet.',
        threat: 'Code Red 🚨 (Detention impending)',
        threatColor: '#f87171',
      };
    }
  }, [overallPct]);

  // Find most bunked subject
  const mostBunked = React.useMemo(() => {
    if (subjectWithStats.length === 0) return null;
    let worst = subjectWithStats[0];
    let maxMissed = worst.stats.absentCount;

    for (const item of subjectWithStats) {
      if (item.stats.absentCount > maxMissed) {
        maxMissed = item.stats.absentCount;
        worst = item;
      }
    }
    return worst;
  }, [subjectWithStats]);

  const formattedPct = overallPct % 1 === 0 ? overallPct.toFixed(0) : overallPct.toFixed(1);

  return (
    <div
      id="share-card"
      style={{
        width: '375px',
        height: '667px',
        background: 'linear-gradient(155deg, #090314 0%, #150826 40%, #1f0b38 100%)',
        color: '#ffffff',
        padding: '24px',
        borderRadius: '28px',
        border: `1px solid ${rankInfo.borderColor}`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
      }}
    >
      {/* Background Gradient Blurs */}
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '180px',
          height: '180px',
          background: rankInfo.glowColor,
          borderRadius: '999px',
          filter: 'blur(45px)',
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-40px',
          left: '-40px',
          width: '160px',
          height: '160px',
          background: 'rgba(168, 85, 247, 0.25)',
          borderRadius: '999px',
          filter: 'blur(40px)',
          opacity: 0.5,
        }}
      />

      {/* Header */}
      <div style={{ textAlign: 'center', marginTop: '2px', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.07)',
            padding: '4px 12px',
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            marginBottom: '6px',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#c084fc' }}>
            SEMESTER ATTENDANCE WRAPPED 💀
          </span>
        </div>
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 900,
            background: 'linear-gradient(90deg, #f472b6 0%, #c084fc 50%, #60a5fa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontStyle: 'italic',
            textTransform: 'uppercase',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          BunkCalc
        </h2>
      </div>

      {/* Hero Rank Card */}
      <div
        style={{
          background: 'rgba(15, 7, 28, 0.75)',
          backdropFilter: 'blur(16px)',
          borderRadius: '22px',
          padding: '16px',
          textAlign: 'center',
          border: `1px solid ${rankInfo.borderColor}`,
          position: 'relative',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: rankInfo.badgeBg,
            color: rankInfo.badgeColor,
            fontSize: '11px',
            fontWeight: 900,
            padding: '4px 12px',
            borderRadius: '999px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
            border: `1px solid ${rankInfo.borderColor}`,
          }}
        >
          {rankInfo.badge}
        </div>

        <h3
          style={{
            fontSize: '20px',
            fontWeight: 900,
            margin: '0 0 6px 0',
            letterSpacing: '-0.01em',
            color: '#ffffff',
          }}
        >
          {rankInfo.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px', margin: '6px 0' }}>
          <span
            style={{
              fontSize: '52px',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: isSafe ? '#4ade80' : '#f87171',
            }}
          >
            {formattedPct}%
          </span>
          <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 700 }}>
            overall
          </span>
        </div>

        <p
          style={{
            color: '#cbd5e1',
            fontSize: '11px',
            fontStyle: 'italic',
            margin: '6px 0 0 0',
            lineHeight: 1.4,
            padding: '0 6px',
          }}
        >
          "{rankInfo.quote}"
        </p>
      </div>

      {/* Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
            Safe Bunk Buffer
          </p>
          <p
            style={{
              fontSize: '20px',
              fontWeight: 900,
              margin: '4px 0 0 0',
              color: totalSafeBunks >= 0 ? '#4ade80' : '#f87171',
            }}
          >
            {totalSafeBunks >= 0 ? `+${totalSafeBunks} left` : `${totalSafeBunks} deficit`}
          </p>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
            Classes Attended
          </p>
          <p style={{ fontSize: '20px', fontWeight: 900, margin: '4px 0 0 0', color: '#60a5fa' }}>
            {totalAttended} / {totalPossible}
          </p>
        </div>
      </div>

      {/* Most Bunked / Highlight Subject */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '12px 14px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Top Sacrificed Subject 📉
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>
            {mostBunked ? `${mostBunked.stats.absentCount} bunks` : 'None'}
          </span>
        </div>
        <p style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff', margin: '0 0 2px 0' }}>
          {mostBunked ? mostBunked.subject.name : 'All classes attended! 🗿'}
        </p>
        <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>
          {mostBunked
            ? `Attendance: ${mostBunked.stats.attendancePct.toFixed(1)}% • ${
                mostBunked.stats.attendancePct >= (mostBunked.subject.threshold * 100)
                  ? 'Safe for now'
                  : 'Subject in danger zone'
              }`
            : 'No lectures sacrificed this semester.'}
        </p>
      </div>

      {/* Professor Threat Level */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
          Professor Threat Level:
        </span>
        <span style={{ fontSize: '11px', fontWeight: 900, color: rankInfo.threatColor }}>
          {rankInfo.threat}
        </span>
      </div>

      {/* Footer Branding */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div>
          <p style={{ fontSize: '11px', fontWeight: 900, color: '#ffffff', margin: 0 }}>
            BunkCalc
          </p>
          <p style={{ fontSize: '8px', color: '#94a3b8', margin: 0, fontWeight: 700 }}>
            75% Attendance Survival Engine
          </p>
        </div>
        <span
          style={{
            fontSize: '9px',
            color: '#c084fc',
            fontWeight: 800,
            background: 'rgba(192, 132, 252, 0.1)',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(192, 132, 252, 0.2)',
          }}
        >
          No Cap 🧢
        </span>
      </div>
    </div>
  );
};
