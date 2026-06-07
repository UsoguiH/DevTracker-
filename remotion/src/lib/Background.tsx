import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { drift } from "./anim";

/**
 * Ambient brand background: deep black with two slow-drifting brand glows,
 * a fine grid, and a subtle film grain. Used behind every scene for depth.
 */
export const Background: React.FC<{ accent?: string; intensity?: number }> = ({
  accent = C.primary,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();

  const x1 = 30 + drift(frame, 320) * 8;
  const y1 = 28 + drift(frame, 240, 1.2) * 6;
  const x2 = 72 + drift(frame, 280, 2.1) * 7;
  const y2 = 74 + drift(frame, 360, 0.5) * 6;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      {/* drifting glows */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 40% at ${x1}% ${y1}%, ${accent}22 0%, transparent 70%)`,
          opacity: intensity,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(38% 38% at ${x2}% ${y2}%, ${C.secondary}1A 0%, transparent 70%)`,
          opacity: intensity,
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(75% 75% at 50% 45%, transparent 55%, rgba(0,0,0,0.65) 100%)",
        }}
      />
      {/* fine grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.border}55 1px, transparent 1px), linear-gradient(90deg, ${C.border}55 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(70% 70% at 50% 50%, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(70% 70% at 50% 50%, black 0%, transparent 75%)",
          opacity: 0.5,
        }}
      />
      {/* film grain */}
      <AbsoluteFill style={{ opacity: 0.05, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
