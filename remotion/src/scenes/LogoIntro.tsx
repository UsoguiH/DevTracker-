import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../lib/Background";
import { Wordmark } from "../lib/ui";
import { C, FONT } from "../theme";
import { ramp, reveal } from "../lib/anim";

export const LogoIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = reveal(frame, fps, 6, { damping: 200, mass: 1.1, stiffness: 90 });
  const glow = interpolate(frame, [6, 30, 55], [0, 1, 0.55], {
    extrapolateRight: "clamp",
  });

  // tagline + underline sweep
  const tag = ramp(frame, 34, 58);
  const sweep = ramp(frame, 30, 70);

  // gentle push-in on the whole lockup
  const scale = interpolate(frame, [0, 75], [1.06, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Background intensity={interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" })} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            opacity: p,
            filter: `blur(${(1 - p) * 14}px)`,
            transform: `translateY(${(1 - p) * 30}px) scale(${0.94 + p * 0.06})`,
          }}
        >
          <Wordmark size={120} glow={glow} />
        </div>

        {/* sweeping underline */}
        <div
          style={{
            marginTop: 34,
            width: 520,
            height: 3,
            borderRadius: 999,
            background: `linear-gradient(90deg, transparent, ${C.primary}, transparent)`,
            transform: `scaleX(${sweep})`,
            opacity: sweep,
          }}
        />

        <div
          style={{
            marginTop: 30,
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 400,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: C.textDim,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 14}px)`,
          }}
        >
          Project management for builders
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
