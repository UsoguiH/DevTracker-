import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../lib/Background";
import { C, FONT } from "../theme";
import { ramp, reveal } from "../lib/anim";

const Line: React.FC<{
  words: { t: string; accent?: boolean; strike?: boolean }[];
  delay: number;
  size: number;
}> = ({ words, delay, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: size * 0.28,
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: -size * 0.025,
        lineHeight: 1.05,
      }}
    >
      {words.map((w, i) => {
        const p = reveal(frame, fps, delay + i * 4);
        const strike = w.strike ? ramp(frame, delay + i * 4 + 16, delay + i * 4 + 30) : 0;
        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              color: w.accent ? C.primary : C.text,
              opacity: p,
              filter: `blur(${(1 - p) * 10}px)`,
              transform: `translateY(${(1 - p) * size * 0.45}px)`,
            }}
          >
            {w.t}
            {w.strike && (
              <span
                style={{
                  position: "absolute",
                  left: -4,
                  right: -4,
                  top: "52%",
                  height: size * 0.07,
                  borderRadius: 999,
                  background: C.secondary,
                  transform: `scaleX(${strike})`,
                  transformOrigin: "left",
                }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
};

export const Problem: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background accent={C.secondary} intensity={0.85} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 26,
          padding: 120,
        }}
      >
        <Line words={[{ t: "You came" }, { t: "to" }, { t: "build." }]} delay={6} size={108} />
        <Line
          words={[
            { t: "Not" },
            { t: "to" },
            { t: "babysit", strike: true },
            { t: "a" },
            { t: "board.", accent: true },
          ]}
          delay={26}
          size={108}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
