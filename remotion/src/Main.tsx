import React from "react";
import { AbsoluteFill } from "remotion";
import {
  TransitionSeries,
  springTiming,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { C } from "./theme";

import { LogoIntro } from "./scenes/LogoIntro";
import { Problem } from "./scenes/Problem";
import { Idea } from "./scenes/Idea";
import { AICommandCenter } from "./scenes/AICommandCenter";
import { KanbanDemo } from "./scenes/KanbanDemo";
import { FeatureMontage } from "./scenes/FeatureMontage";
import { Outro } from "./scenes/Outro";

// Scene lengths (frames @ 30fps). Transitions overlap, so total is less than the sum.
const D = {
  intro: 90,
  problem: 100,
  idea: 150,
  ai: 180,
  kanban: 180,
  features: 170,
  outro: 120,
};

const soft = springTiming({ config: { damping: 200 }, durationInFrames: 22 });

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.intro}>
          <LogoIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={soft} presentation={fade()} />

        <TransitionSeries.Sequence durationInFrames={D.problem}>
          <Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={soft}
          presentation={slide({ direction: "from-right" })}
        />

        <TransitionSeries.Sequence durationInFrames={D.idea}>
          <Idea />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={soft} presentation={fade()} />

        <TransitionSeries.Sequence durationInFrames={D.ai}>
          <AICommandCenter />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={soft}
          presentation={slide({ direction: "from-right" })}
        />

        <TransitionSeries.Sequence durationInFrames={D.kanban}>
          <KanbanDemo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={soft}
          presentation={slide({ direction: "from-bottom" })}
        />

        <TransitionSeries.Sequence durationInFrames={D.features}>
          <FeatureMontage />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: 24 })}
          presentation={fade()}
        />

        <TransitionSeries.Sequence durationInFrames={D.outro}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

// Total duration accounting for transition overlaps (each overlap subtracts its duration).
export const MAIN_DURATION =
  D.intro + D.problem + D.idea + D.ai + D.kanban + D.features + D.outro -
  (22 + 22 + 22 + 22 + 22 + 24);
