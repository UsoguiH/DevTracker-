# DevTrack — Launch Video

An Apple-style product film for DevTrack, built programmatically with [Remotion](https://remotion.dev). Every frame is React: spring physics, blur-in typography, depth/parallax, and live mockups of the app's real features (AI task decomposition, kanban flow, focus timer, contribution heatmap, timeline).

## Scenes

| # | Scene | What it shows |
|---|-------|---------------|
| 1 | Logo intro | Wordmark reveal with glow + sweep |
| 2 | Problem | "You came to build. Not to babysit a board." |
| 3 | Idea | Typewriter prompt into the AI input |
| 4 | AI Command Center | One goal → 4 cascading engineering tasks |
| 5 | Kanban | A card travels To Do → In Progress → Testing → Done |
| 6 | Feature montage | Focus Mode ring, heatmap wave, timeline bars |
| 7 | Outro | "Build. Don't babysit." + repo + license |

~28 seconds · 1920×1080 · 30fps.

## Commands

```bash
npm install          # first time

npm run dev          # open Remotion Studio (live preview + scrubbing)
npm run render       # render to out/devtrack.mp4 (H.264)
npm run render:hq    # higher quality (lower CRF)
npm run still        # export a poster frame to out/poster.png
```

Render a single scene while iterating by tweaking the composition, or use the Studio timeline to jump between scenes.

## Customizing

- **Brand colors / font** — `src/theme.ts`
- **Scene timing & transitions** — `src/Main.tsx`
- **Copy & content** — each file in `src/scenes/`
- **Shared motion helpers** — `src/lib/anim.ts`
- **Background ambience** — `src/lib/Background.tsx`

## Add music

Drop an audio file in `public/` and add `<Audio src={staticFile("track.mp3")} />` inside `src/Main.tsx`. Keep it under the composition duration (~28s).
