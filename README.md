# DevTracker

> **Your AI runs the project. You just build.**

Most project tools ask you to manage the tool. DevTracker flips that around — an AI project manager sits inside your workspace, watches what's happening, and moves the work forward so you don't have to babysit a board.

---

## The Idea

You've seen project management apps. Boards, tickets, sprints, standups, 14 tabs of "who's doing what." It's a second job.

**DevTracker replaces that second job with an AI.**

The AI is the PM. It assigns work, nudges when things slip, breaks big tasks into subtasks, writes the status updates, flags the bottleneck before it becomes one. You and your team ship. The AI handles the choreography.

---

## The Main Feature — AI Project Manager

Not a chatbot. Not a sidebar helper. A real PM that lives in your project.

Here's what it actually does:

- **Plans the work** — Drop in a goal ("ship onboarding v2 by Friday"). It generates tasks, estimates, assignees, and a timeline.
- **Assigns smartly** — Knows who's overloaded, who's idle, who's good at what. Distributes work accordingly.
- **Keeps things moving** — Sees a task sitting in *In Progress* for 3 days with no updates? It pings. Sees a blocker? It escalates.
- **Catches overdue before you do** — Built-in due-date alerts + AI reasoning about *why* something's slipping.
- **Writes the boring stuff** — Status reports, standup summaries, end-of-sprint reviews. Auto-generated, actually accurate.
- **Answers real questions** — "What's blocking the launch?" "Who's free this week?" "Are we on track?" — it knows, because it's been watching the whole time.

The goal: you open DevTracker and the project has already been managed. You just do the work.

---

## What's Inside

| View | What it's for |
|---|---|
| **Dashboard** | Your tasks, your day, your pulse. |
| **Kanban** | Drag and drop. The AI rebalances as you move things. |
| **Timeline** | Gantt-style. See the future. |
| **Projects** | Every project you touch, in one grid. |
| **AI Command Center** | Talk to your PM. Ask anything. |

Plus: custom workflows per project, real-time collaboration, overdue alerts, a proper activity log, and a dark mode that's actually dark.

---

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Supabase** — auth, database, realtime
- **Google Gemini** — the brain behind the PM
- **Tailwind** + custom design system
- **Framer Motion** — because snappy beats static

---

## Getting Started

```bash
# 1. Install
npm install

# 2. Add your keys
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and your Gemini key

# 3. Run
npm run dev
```

Open `http://localhost:5173`. Sign up. Create a project. Let the AI take the wheel.

---

## Scripts

```bash
npm run dev       # local dev server
npm run build     # production bundle
npm run preview   # preview the production build
```

---

## Why You'll Actually Use This

Because every other tool makes you *manage the project manager*. This one manages itself.

You came to ship software. DevTracker makes sure that's all you have to do.

---

**Built for people who'd rather write code than update tickets.**
