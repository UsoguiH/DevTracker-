import { Easing, interpolate, spring } from "remotion";
import { EASE } from "../theme";

type SpringConfig = Parameters<typeof spring>[0]["config"];

/** A reusable spring 0→1 that starts at `delay` frames. */
export const reveal = (
  frame: number,
  fps: number,
  delay = 0,
  config: SpringConfig = { damping: 200, mass: 0.9, stiffness: 110 }
) => spring({ frame: frame - delay, fps, config, durationInFrames: undefined });

/** Eased 0→1 ramp between two frames. */
export const ramp = (
  frame: number,
  from: number,
  to: number,
  ease: readonly [number, number, number, number] = EASE.out
) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(ease[0], ease[1], ease[2], ease[3]),
  });

/**
 * Apple-style entrance: translateY + scale + blur + opacity driven by one spring.
 * Returns a style object ready to spread onto an element.
 */
export const enter = (
  frame: number,
  fps: number,
  delay = 0,
  opts: { y?: number; blur?: number; scaleFrom?: number } = {}
) => {
  const p = reveal(frame, fps, delay);
  const { y = 28, blur = 12, scaleFrom = 0.96 } = opts;
  return {
    opacity: p,
    filter: `blur(${(1 - p) * blur}px)`,
    transform: `translateY(${(1 - p) * y}px) scale(${scaleFrom + p * (1 - scaleFrom)})`,
  } as const;
};

/** Smooth looped sine in [-1, 1] for ambient drift. */
export const drift = (frame: number, period: number, phase = 0) =>
  Math.sin((frame / period) * Math.PI * 2 + phase);
