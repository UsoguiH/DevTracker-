import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../lib/Background";
import { C, FONT } from "../theme";
import { enter, ramp } from "../lib/anim";

const Panel: React.FC<{
  delay: number;
  title: string;
  sub: string;
  children: React.ReactNode;
}> = ({ delay, title, sub, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        flex: 1,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
        ...enter(frame, fps, delay, { y: 50, blur: 14 }),
      }}
    >
      <div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.text }}>
          {title}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 18, color: C.textDim, marginTop: 4 }}>
          {sub}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
};

/** Focus Mode pomodoro ring. */
const FocusRing: React.FC = () => {
  const frame = useCurrentFrame();
  const prog = interpolate(frame, [30, 130], [0.12, 0.78], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const R = 92;
  const circ = 2 * Math.PI * R;
  const mins = Math.floor((1 - prog) * 25);
  const secs = Math.floor(((1 - prog) * 25 * 60) % 60);
  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      <svg width="220" height="220" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="110" cy="110" r={R} stroke={C.border} strokeWidth="14" fill="none" />
        <circle
          cx="110"
          cy="110"
          r={R}
          stroke={C.primary}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - prog)}
          style={{ filter: `drop-shadow(0 0 10px ${C.primary})` }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: 46, fontWeight: 700, color: C.text }}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
        <div style={{ fontSize: 15, color: C.primary, letterSpacing: 2, fontWeight: 600 }}>
          FOCUS
        </div>
      </div>
    </div>
  );
};

/** GitHub-style contribution heatmap that fills in a diagonal wave. */
const Heatmap: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const cols = 18;
  const rows = 7;
  const cell = 22;
  const levels = [`${C.primary}00`, `${C.primary}30`, `${C.primary}55`, `${C.primary}99`, C.primary];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: cols }).map((_, x) => (
        <div key={x} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Array.from({ length: rows }).map((__, y) => {
            const seed = random(`c-${x}-${y}`);
            const lvl = Math.floor(random(`l-${x}-${y}`) * 5);
            const appear = ramp(frame, delay + (x + y) * 1.6, delay + (x + y) * 1.6 + 10);
            return (
              <div
                key={y}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 5,
                  background: levels[lvl],
                  border: `1px solid ${C.border}`,
                  opacity: appear,
                  transform: `scale(${0.4 + appear * 0.6})`,
                  boxShadow: lvl >= 3 ? `0 0 8px ${C.primary}66` : "none",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Timeline bars growing left-to-right. */
const Timeline: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const bars = [
    { w: 0.9, c: C.primary, off: 0 },
    { w: 0.6, c: C.blue, off: 0.18 },
    { w: 0.75, c: C.secondary, off: 0.1 },
    { w: 0.5, c: C.amber, off: 0.34 },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      {bars.map((b, i) => {
        const g = ramp(frame, delay + i * 8, delay + i * 8 + 26);
        return (
          <div key={i} style={{ position: "relative", height: 30 }}>
            <div
              style={{
                position: "absolute",
                left: `${b.off * 100}%`,
                top: 0,
                height: 30,
                width: `${b.w * g * (1 - b.off) * 100}%`,
                background: `linear-gradient(90deg, ${b.c}, ${b.c}aa)`,
                borderRadius: 999,
                boxShadow: `0 0 14px ${b.c}55`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export const FeatureMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Background intensity={0.85} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 44,
          padding: 80,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 40,
            color: C.text,
            ...enter(frame, fps, 2),
          }}
        >
          Everything you need to keep <span style={{ color: C.primary }}>shipping</span>
        </div>
        <div style={{ display: "flex", gap: 28, width: 1640, height: 460 }}>
          <Panel delay={10} title="Focus Mode" sub="Pomodoro + scratchpad">
            <FocusRing />
          </Panel>
          <Panel delay={20} title="Contribution Heatmap" sub="Streaks &amp; momentum">
            <Heatmap delay={40} />
          </Panel>
          <Panel delay={30} title="Timeline" sub="See the whole sprint">
            <Timeline delay={50} />
          </Panel>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
