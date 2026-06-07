import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../lib/Background";
import { C, FONT } from "../theme";
import { enter, ramp } from "../lib/anim";

const PROMPT = "Build a SaaS landing page with auth and billing";

export const Idea: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // typewriter
  const typed = Math.floor(
    interpolate(frame, [40, 110], [0, PROMPT.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const caret = Math.floor(frame / 8) % 2 === 0;
  const done = typed >= PROMPT.length;

  const send = ramp(frame, 116, 132);

  return (
    <AbsoluteFill>
      <Background intensity={0.8} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 50,
          padding: 120,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 88,
            letterSpacing: -2,
            color: C.text,
            textAlign: "center",
            ...enter(frame, fps, 6, { y: 30, blur: 12 }),
          }}
        >
          Just describe the <span style={{ color: C.primary }}>goal.</span>
        </div>

        {/* prompt input mock */}
        <div
          style={{
            width: 1080,
            background: C.surface,
            border: `1px solid ${done ? C.primary + "88" : C.border}`,
            borderRadius: 22,
            padding: "26px 30px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            boxShadow: done
              ? `0 0 60px ${C.primary}22, 0 30px 70px rgba(0,0,0,0.5)`
              : "0 30px 70px rgba(0,0,0,0.5)",
            ...enter(frame, fps, 22, { y: 36, blur: 14 }),
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `linear-gradient(145deg, ${C.primary}, #a8d63e)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#06160b">
              <path d="M12 2 9.2 9.2 2 12l7.2 2.8L12 22l2.8-7.2L22 12l-7.2-2.8z" />
            </svg>
          </div>
          <div
            style={{
              flex: 1,
              fontFamily: FONT,
              fontSize: 30,
              fontWeight: 500,
              color: C.text,
            }}
          >
            {PROMPT.slice(0, typed)}
            <span
              style={{
                opacity: caret && !done ? 1 : 0,
                color: C.primary,
                fontWeight: 300,
              }}
            >
              |
            </span>
          </div>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: C.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transform: `scale(${0.7 + send * 0.3})`,
              opacity: 0.4 + send * 0.6,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#06160b">
              <path d="M3 11l18-8-8 18-2-7-8-3z" />
            </svg>
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 26,
            fontWeight: 400,
            color: C.textDim,
            opacity: ramp(frame, 60, 80),
          }}
        >
          DevTrack's AI architect handles the planning.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
