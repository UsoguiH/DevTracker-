import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../lib/Background";
import { Wordmark } from "../lib/ui";
import { C, FONT } from "../theme";
import { enter, ramp } from "../lib/anim";

const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {Array.from({ length: 26 }).map((_, i) => {
        const x = random(`px-${i}`) * 100;
        const baseY = random(`py-${i}`) * 100;
        const speed = 0.4 + random(`ps-${i}`) * 0.8;
        const y = (baseY - frame * speed * 0.25 + 100) % 100;
        const size = 2 + random(`pz-${i}`) * 4;
        const op = 0.1 + random(`po-${i}`) * 0.4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: 999,
              background: C.primary,
              opacity: op,
              boxShadow: `0 0 ${size * 3}px ${C.primary}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glow = interpolate(frame, [8, 40], [0, 0.7], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Background intensity={1} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <div style={enter(frame, fps, 6, { y: 24, blur: 14 })}>
          <Wordmark size={104} glow={glow} />
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 64,
            letterSpacing: -2,
            color: C.text,
            textAlign: "center",
            ...enter(frame, fps, 18, { y: 26 }),
          }}
        >
          Build. <span style={{ color: C.primary }}>Don't babysit.</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: FONT,
            fontSize: 26,
            color: C.textDim,
            opacity: ramp(frame, 34, 52),
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill={C.textDim}>
            <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
          </svg>
          github.com/UsoguiH/DevTracker-
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 18,
            color: C.border,
            letterSpacing: 3,
            textTransform: "uppercase",
            opacity: ramp(frame, 44, 60),
          }}
        >
          Open source · MIT
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
