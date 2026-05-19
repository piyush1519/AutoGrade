import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

const MAX_SIZE = 20 * 1024 * 1024;
const ACCEPTED = { "application/pdf": [".pdf"], "text/plain": [".txt"] };

export default function DropZone({ label, file, onFile, color = "amber" }) {
  const [error, setError] = useState("");

  const onDrop = useCallback(
    (accepted, rejected) => {
      setError("");
      if (rejected.length > 0) {
        const msg = rejected[0].errors?.[0]?.message || "Invalid file";
        setError(msg);
        return;
      }
      if (accepted.length > 0) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  const isAmber = color === "amber";
  const accent = isAmber ? "#f59e0b" : "#2dd4bf";
  const accentDim = isAmber ? "rgba(245,158,11,0.08)" : "rgba(45,212,191,0.08)";
  const accentBorder = isAmber ? "rgba(245,158,11,0.4)" : "rgba(45,212,191,0.4)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: accent,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        {file && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-2)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "1px 8px",
            }}
          >
            {file.name}
          </span>
        )}
      </div>

      <div
        {...getRootProps()}
        style={{
          border: `1.5px dashed ${isDragActive || file ? accentBorder : "var(--border-hi)"}`,
          borderRadius: "var(--radius-lg)",
          background: isDragActive ? accentDim : file ? "rgba(255,255,255,0.02)" : "transparent",
          padding: "32px 24px",
          cursor: "pointer",
          textAlign: "center",
          transition: "all 0.2s ease",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <input {...getInputProps()} />

        {/* Icon */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={file ? accent : "var(--text-3)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {file ? (
            <>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="13" y2="17"/>
            </>
          ) : (
            <>
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </>
          )}
        </svg>

        {file ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: "var(--text-1)", fontWeight: 500, fontSize: 14 }}>
              {file.name}
            </span>
            <span style={{ color: "var(--text-3)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              {(file.size / 1024).toFixed(1)} KB · Click to replace
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: "var(--text-2)", fontSize: 14 }}>
              {isDragActive ? "Drop it here" : "Drag & drop or click to browse"}
            </span>
            <span style={{ color: "var(--text-3)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              PDF · TXT · Max 20MB
            </span>
          </div>
        )}
      </div>

      {error && (
        <span style={{ color: "var(--red)", fontSize: 12, marginTop: 2 }}>{error}</span>
      )}
    </div>
  );
}
