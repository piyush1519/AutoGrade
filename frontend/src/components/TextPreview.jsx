import React, { useState } from "react";

export default function TextPreview({ studentText, modelText }) {
  const [tab, setTab] = useState("student");

  const text = tab === "student" ? studentText : modelText;
  const accent = tab === "student" ? "#f59e0b" : "#2dd4bf";

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {["student", "model"].map((t) => {
          const active = tab === t;
          const c = t === "student" ? "#f59e0b" : "#2dd4bf";
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? c : "transparent"}`,
                color: active ? c : "var(--text-3)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t} Answer
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        style={{
          padding: "16px",
          background: "var(--bg-card)",
          maxHeight: 200,
          overflowY: "auto",
        }}
      >
        <pre
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-2)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            lineHeight: 1.7,
          }}
        >
          {text || "No text extracted."}
        </pre>
      </div>

      {/* Word count */}
      <div
        style={{
          padding: "8px 16px",
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-3)",
          }}
        >
          {text ? text.split(/\s+/).filter(Boolean).length : 0} words
        </span>
      </div>
    </div>
  );
}
