import React from "react";
import { C, FONT } from "../theme";

/** DevTrack wordmark with the lime "check" glyph. */
export const Wordmark: React.FC<{ size?: number; glow?: number }> = ({
  size = 96,
  glow = 0,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: size * 0.22,
      fontFamily: FONT,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: -size * 0.03,
      color: C.text,
    }}
  >
    <div
      style={{
        width: size * 1.02,
        height: size * 1.02,
        borderRadius: size * 0.28,
        background: `linear-gradient(145deg, ${C.primary}, #a8d63e)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 ${40 + glow * 80}px ${C.primary}${Math.round(
          40 + glow * 120
        )
          .toString(16)
          .padStart(2, "0")}`,
      }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#06160b"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
    <span>
      Dev<span style={{ color: C.primary }}>Track</span>
    </span>
  </div>
);

export const Pill: React.FC<{
  label: string;
  color: string;
  filled?: boolean;
}> = ({ label, color, filled }) => (
  <span
    style={{
      fontFamily: FONT,
      fontSize: 18,
      fontWeight: 600,
      color: filled ? "#06160b" : color,
      background: filled ? color : `${color}1F`,
      border: `1px solid ${color}${filled ? "" : "55"}`,
      padding: "4px 12px",
      borderRadius: 999,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </span>
);

export type TaskData = {
  title: string;
  priority: "High" | "Medium" | "Low";
  tags: { label: string; color: string }[];
};

const priColor = (p: TaskData["priority"]) =>
  p === "High" ? C.rose : p === "Medium" ? C.amber : C.blue;

export const TaskCard: React.FC<{
  task: TaskData;
  width?: number;
  style?: React.CSSProperties;
}> = ({ task, width = 420, style }) => (
  <div
    style={{
      width,
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      padding: "20px 22px",
      boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
      fontFamily: FONT,
      ...style,
    }}
  >
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      {task.tags.map((t) => (
        <Pill key={t.label} label={t.label} color={t.color} />
      ))}
    </div>
    <div
      style={{
        color: C.text,
        fontSize: 26,
        fontWeight: 600,
        lineHeight: 1.25,
        marginBottom: 18,
      }}
    >
      {task.title}
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: priColor(task.priority),
            boxShadow: `0 0 12px ${priColor(task.priority)}`,
          }}
        />
        <span style={{ color: C.textDim, fontSize: 17, fontWeight: 500 }}>
          {task.priority}
        </span>
      </div>
      <div style={{ display: "flex" }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              marginLeft: i ? -10 : 0,
              background: i ? C.secondary : C.primary,
              border: `2px solid ${C.surface}`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);
