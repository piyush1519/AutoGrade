import React from "react";

function getGrade(m) {
  if (m >= 9) return { letter: "A+", color: "#4ade80" };
  if (m >= 8) return { letter: "A",  color: "#4ade80" };
  if (m >= 7) return { letter: "B+", color: "#86efac" };
  if (m >= 6) return { letter: "B",  color: "#fbbf24" };
  if (m >= 5) return { letter: "C",  color: "#f59e0b" };
  if (m >= 4) return { letter: "D",  color: "#fb923c" };
  return       { letter: "F",  color: "#f87171" };
}

export default function HistoryPanel({ results }) {
  if (!results.length) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 24px",
          color: "var(--text-3)",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
        }}
      >
        No evaluations yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {results.map((r, i) => {
        const { letter, color } = getGrade(r.marks);
        const date = new Date(r.timestamp).toLocaleString();
        return (
          <div
            key={r._id || i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            {/* Grade badge */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: `${color}18`,
                border: `1px solid ${color}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 14,
                color,
                flexShrink: 0,
              }}
            >
              {letter}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--text-1)",
                  marginBottom: 2,
                }}
              >
                {r.marks?.toFixed(2)} / 10
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-3)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {date}
              </div>
            </div>

            {/* Mini metrics */}
            <div
              style={{
                display: "flex",
                gap: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-3)",
              }}
            >
              <span title="Similarity">
                S:{" "}
                <span style={{ color: "var(--text-2)" }}>
                  {Math.round((r.similarity_score || 0) * 100)}%
                </span>
              </span>
              <span title="Keyword">
                K:{" "}
                <span style={{ color: "var(--text-2)" }}>
                  {Math.round((r.keyword_match_ratio || 0) * 100)}%
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
