<div align="center">

# DevTrack

**A project management workspace built for the way developers actually work.**

Kanban, timelines, focus sessions, and an AI architect that turns a one-line goal into a real engineering plan — wrapped in a fast, dark, keyboard-friendly UI.

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%26%20Edge-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-D1F45F.svg)](LICENSE)

</div>

---

## 🎬 Demo

A 28-second product tour — rendered programmatically with [Remotion](https://remotion.dev), so every frame is React.

<div align="center">

[![DevTrack demo](assets/devtrack-demo.gif)](https://github.com/UsoguiH/DevTracker-/raw/main/assets/devtrack-demo.mp4)

<sub>▶ <b><a href="https://github.com/UsoguiH/DevTracker-/raw/main/assets/devtrack-demo.mp4">Watch in full HD</a></b> &nbsp;·&nbsp; the GIF above is a lightweight preview</sub>

</div>

> Want to tweak it? The whole video is code — source lives in [`remotion/`](remotion). Run `cd remotion && npm run dev` to scrub it in Remotion Studio, or `npm run render` to rebuild it.

---

## Why DevTrack

Most project tools are built for managers reporting on developers. DevTrack is built for the developer running the project — the solo builder shipping side projects, the freelancer juggling client work, the small team that wants structure without ceremony.

It assumes you already think in tasks, sprints, and commits. So instead of dropdowns and approval chains, it gives you a fast board, a real timeline, a focus timer, and an AI that scaffolds the boring parts of planning so you can get back to building.

## Features

- **AI Command Center** — Describe a goal in plain English ("build a portfolio site with a contact form") and the AI architect decomposes it into 3–6 concrete, technical tasks with priorities, tags, and dates. Powered by an OpenAI model running on a Supabase Edge Function, with an approve-before-apply workflow so nothing lands on your board without your say-so.
- **Kanban board** — Smooth drag-and-drop columns with per-project **custom workflows**. Rename, recolor, and reorder stages to match how *your* project actually moves.
- **Timeline view** — A fluid, animated schedule of tasks by start/end date for spotting overlaps and gaps at a glance.
- **Focus Mode** — A built-in Pomodoro timer with a scratchpad and an "exit challenge" that makes you think twice before bailing on a session.
- **Sprint Replay** — Scrub through your board's history like a time-lapse to see how work actually flowed across the sprint.
- **Contribution heatmap** — A GitHub-style activity grid of completed work, with streak tracking to keep momentum visible.
- **Project HUD** — A per-project resource panel for your color palette, key links, shell commands, and tech stack — the stuff you keep re-looking-up, in one place.
- **Due-date & overdue alerts** — Surfaces what's slipping before it becomes a problem.
- **Team collaboration** — Invite members, assign tasks, comment, and follow a per-task activity feed.
- **Dashboards** — Live stats with count-up animations, priority breakdowns, and streaks.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS · `class-variance-authority` · `tailwind-merge` |
| Motion | `motion` (Framer Motion) |
| Charts | Recharts |
| Drag & drop | `@hello-pangea/dnd` |
| Icons | `lucide-react` |
| Dates | `date-fns` · `react-day-picker` |
| Backend | Supabase — Postgres, Auth, Edge Functions (Deno) |
| AI | OpenAI (via the `ai-architect` Edge Function) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)
- An OpenAI API key (only needed for the AI Command Center)

### 1. Clone & install

```bash
git clone https://github.com/UsoguiH/DevTracker-.git
cd DevTracker-
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> These come from your Supabase dashboard under **Project Settings → API**.

### 3. Run the dev server

```bash
npm run dev
```

The app starts on the Vite dev server (default `http://localhost:5173`).

### 4. Build for production

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```

## Supabase Setup

DevTrack expects a few tables and one Edge Function.

**Tables** (core): `profiles`, `projects`, `project_members`, `tasks`. The app maps Supabase `snake_case` columns to internal `camelCase`, and stores per-project workflows as JSON on the `projects` table.

**Auth**: email/password sign-up and Google OAuth are wired through Supabase Auth.

**AI Edge Function** — the `ai-architect` function lives in [`supabase/functions/ai-architect`](supabase/functions/ai-architect). Deploy it and give it your OpenAI key:

```bash
supabase functions deploy ai-architect
supabase secrets set OPENAI_API_KEY=sk-...
```

> Don't have an OpenAI key yet? The app ships with a mock AI service (`lib/mockAIService.ts`) so you can explore the planning flow without a live backend.

## Project Structure

```
.
├── App.tsx                  # Root state, routing, data fetching
├── pages/                   # Top-level views
│   ├── Dashboard.tsx        # Stats, streaks, activity
│   ├── KanbanBoard.tsx      # Drag-and-drop board
│   ├── Timeline.tsx         # Animated schedule
│   ├── AICommandCenter.tsx  # AI planning interface
│   ├── Projects.tsx         # Project switcher
│   └── Settings.tsx
├── components/              # Focus Mode, Sprint Replay, Heatmap, HUD, modals…
├── lib/                     # aiService (real) + mockAIService + utils
├── src/                     # Supabase client + auth pages
├── supabase/functions/      # ai-architect Edge Function (Deno)
├── hooks/                   # useCountUp, etc.
└── types.ts                 # Shared domain types
```

## Roadmap

- [ ] Offline-first sync
- [ ] Recurring tasks
- [ ] Calendar integrations (Google Calendar)
- [ ] Public read-only board sharing
- [ ] Per-project analytics export

## Contributing

Issues and pull requests are welcome. If you're planning a larger change, open an issue first so we can talk through the direction. Keep PRs focused and described, and match the existing TypeScript/Tailwind conventions.

## License

Released under the [MIT License](LICENSE).
