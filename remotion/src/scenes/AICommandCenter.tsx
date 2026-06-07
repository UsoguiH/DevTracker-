import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../lib/Background";
import { TaskCard, TaskData } from "../lib/ui";
import { C, FONT } from "../theme";
import { enter, ramp, reveal } from "../lib/anim";

const TASKS: TaskData[] = [
  {
    title: "Design landing page UI & hero section",
    priority: "High",
    tags: [{ label: "UI", color: C.primary }],
  },
  {
    title: "Set up Next.js app structure & routing",
    priority: "High",
    tags: [{ label: "Dev", color: C.blue }],
  },
  {
    title: "Implement Supabase auth (email + OAuth)",
    priority: "Medium",
    tags: [{ label: "Backend", color: C.secondary }],
  },
  {
    title: "Integrate Stripe billing & webhooks",
    priority: "Medium",
    tags: [{ label: "Payments", color: C.amber }],
  },
];

const Thinking: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity,
        fontFamily: FONT,
        fontSize: 24,
        color: C.textDim,
        fontWeight: 500,
      }}
    >
      <span>AI architect is decomposing your goal</span>
      <div style={{ display: "flex", gap: 7 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: C.primary,
              opacity: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((frame - i * 6) / 5)),
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const AICommandCenter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const think = interpolate(frame, [4, 18, 46, 58], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardsStart = 56;
  const summary = ramp(frame, cardsStart + 60, cardsStart + 80);

  return (
    <AbsoluteFill>
      <Background intensity={0.85} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          padding: 90,
          gap: 36,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 40,
            color: C.text,
            opacity: ramp(frame, 4, 18),
            textAlign: "center",
          }}
        >
          One goal becomes a real engineering plan
        </div>

        <div style={{ height: 34 }}>
          {think > 0.02 && <Thinking opacity={think} />}
        </div>

        {/* 2×2 grid of cascading task cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
            width: 980,
          }}
        >
          {TASKS.map((task, i) => {
            const delay = cardsStart + i * 9;
            const p = reveal(frame, fps, delay, {
              damping: 200,
              mass: 0.8,
              stiffness: 120,
            });
            return (
              <div
                key={i}
                style={{
                  opacity: p,
                  filter: `blur(${(1 - p) * 10}px)`,
                  transform: `translateY(${(1 - p) * 40}px) scale(${
                    0.92 + p * 0.08
                  })`,
                }}
              >
                <TaskCard task={task} width={476} />
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 24,
            color: C.primary,
            fontWeight: 600,
            opacity: summary,
            transform: `translateY(${(1 - summary) * 10}px)`,
          }}
        >
          ✓ Broke that down into 4 technical tasks — review &amp; approve.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
