import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../lib/Background";
import { Pill } from "../lib/ui";
import { C, FONT } from "../theme";
import { enter, ramp } from "../lib/anim";

const COLS = [
  { id: "todo", name: "To Do", color: C.textDim },
  { id: "prog", name: "In Progress", color: C.blue },
  { id: "test", name: "Testing", color: C.amber },
  { id: "done", name: "Done", color: C.primary },
];

const COL_W = 380;
const GAP = 28;
const boardW = COLS.length * COL_W + (COLS.length - 1) * GAP;

const MiniCard: React.FC<{
  title: string;
  tag?: { label: string; color: string };
  ghost?: boolean;
}> = ({ title, tag, ghost }) => (
  <div
    style={{
      background: ghost ? "transparent" : C.surface,
      border: `1px ${ghost ? "dashed" : "solid"} ${ghost ? C.border : C.border}`,
      borderRadius: 14,
      padding: 18,
      fontFamily: FONT,
      opacity: ghost ? 0.5 : 1,
      minHeight: ghost ? 92 : undefined,
    }}
  >
    {!ghost && (
      <>
        {tag && (
          <div style={{ marginBottom: 10 }}>
            <Pill label={tag.label} color={tag.color} />
          </div>
        )}
        <div style={{ color: C.text, fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>
          {title}
        </div>
      </>
    )}
  </div>
);

/** x-offset of a column's card area, relative to board left. */
const colX = (i: number) => i * (COL_W + GAP);

export const KanbanDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The travelling card moves To Do → In Progress → Testing → Done.
  const ease = (a: number, b: number) =>
    interpolate(frame, [a, b], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.65, 0, 0.35, 1),
    });

  const seg1 = ease(40, 70); // todo -> prog
  const seg2 = ease(80, 110); // prog -> test
  const seg3 = ease(120, 150); // test -> done
  const stage = seg1 + seg2 + seg3; // 0..3 fractional column index

  const cardX = interpolate(stage, [0, 3], [colX(0), colX(3)]);
  const lift = Math.sin(Math.min(stage % 1 || (stage > 0 && stage < 3 ? 0 : 0), 1) * Math.PI);
  // simpler lift: rises while moving between integers
  const moving = (seg1 > 0 && seg1 < 1) || (seg2 > 0 && seg2 < 1) || (seg3 > 0 && seg3 < 1);
  const liftAmt = moving ? -14 : 0;

  const settle = ramp(frame, 150, 162);

  return (
    <AbsoluteFill>
      <Background intensity={0.8} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 44,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 40,
            color: C.text,
            ...enter(frame, fps, 4),
          }}
        >
          Your board. Your <span style={{ color: C.primary }}>workflow.</span>
        </div>

        <div style={{ position: "relative", width: boardW }}>
          {/* columns */}
          <div style={{ display: "flex", gap: GAP }}>
            {COLS.map((c, i) => {
              const p = enter(frame, fps, 8 + i * 5, { y: 30 });
              return (
                <div key={c.id} style={{ width: COL_W, ...p }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: 999,
                        background: c.color,
                        boxShadow: `0 0 10px ${c.color}`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: FONT,
                        fontWeight: 600,
                        fontSize: 22,
                        color: C.text,
                      }}
                    >
                      {c.name}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      background: "#0c0c0c",
                      border: `1px solid ${C.border}`,
                      borderRadius: 16,
                      padding: 16,
                      minHeight: 360,
                    }}
                  >
                    {/* static filler cards per column */}
                    {i === 0 && (
                      <>
                        <MiniCard title="Write API docs" tag={{ label: "Docs", color: C.textDim }} />
                        <MiniCard ghost title="" />
                      </>
                    )}
                    {i === 1 && (
                      <MiniCard
                        title="Implement Supabase auth"
                        tag={{ label: "Backend", color: C.secondary }}
                      />
                    )}
                    {i === 2 && (
                      <MiniCard title="QA checkout flow" tag={{ label: "QA", color: C.amber }} />
                    )}
                    {i === 3 && (
                      <MiniCard
                        title="Set up CI pipeline"
                        tag={{ label: "DevOps", color: C.blue }}
                      />
                    )}
                    {/* drop target ghost in the column the card is heading to */}
                    {Math.round(stage) === i && i !== 0 && stage < 3 && (
                      <MiniCard ghost title="" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* travelling card (absolute over the board) */}
          <div
            style={{
              position: "absolute",
              top: 52,
              left: cardX,
              width: COL_W,
              padding: "0 16px",
              transform: `translateY(${liftAmt}px) rotate(${moving ? -1.5 : 0}deg) scale(${
                moving ? 1.03 : 1
              })`,
              filter: moving ? "drop-shadow(0 26px 40px rgba(0,0,0,0.6))" : "none",
              zIndex: 5,
            }}
          >
            <div
              style={{
                background: C.surfaceHi,
                border: `1px solid ${C.primary}${stage >= 3 ? "" : "55"}`,
                borderRadius: 14,
                padding: 18,
                fontFamily: FONT,
                boxShadow: stage >= 3 ? `0 0 40px ${C.primary}33` : "none",
              }}
            >
              <div style={{ marginBottom: 10, display: "flex", gap: 8 }}>
                <Pill label="UI" color={C.primary} />
                <Pill label="High" color={C.rose} />
              </div>
              <div style={{ color: C.text, fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>
                Design landing page UI
              </div>
              {stage >= 3 && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: C.primary,
                    fontSize: 17,
                    fontWeight: 600,
                    opacity: settle,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Shipped
                </div>
              )}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
