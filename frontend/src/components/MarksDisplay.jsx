import React, { useEffect, useRef } from "react";

function getGrade(marks) {
  if (marks >= 9)  return { letter: "A+", color: "#4ade80" };
  if (marks >= 8)  return { letter: "A",  color: "#4ade80" };
  if (marks >= 7)  return { letter: "B+", color: "#86efac" };
  if (marks >= 6)  return { letter: "B",  color: "#fbbf24" };
  if (marks >= 5)  return { letter: "C",  color: "#f59e0b" };
  if (marks >= 4)  return { letter: "D",  color: "#fb923c" };
  return              { letter: "F",  color: "#f87171" };
}

export default function MarksDisplay({ marks }) {
  const { letter, color } = getGrade(marks);
  const pct = (marks / 10) * 100;

  // SVG circle
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const dash = (pct / 100) * CIRC;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ position: "relative", width: 148, height: 148 }}>
        <svg width="148" height="148" viewBox="0 0 148 148" style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx="74" cy="74" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
          {/* Progress */}
          <circle
            cx="74" cy="74" r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{
              transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)",
              filter: `drop-shadow(0 0 8px ${color}88)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text-1)",
              lineHeight: 1,
            }}
          >
            {marks.toFixed(1)}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            / 10
          </span>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 28,
            fontWeight: 700,
            color,
            display: "block",
            textShadow: `0 0 20px ${color}66`,
          }}
        >
          {letter}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>Grade</span>
      </div>
    </div>
  );
}
