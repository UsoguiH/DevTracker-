# The Engineering Standard: DevTracker

**Version:** 2.1 (Perfected)
**Author:** The Architect (Principal Engineer)
**Target Audience:** Future Implementers (AI & Human)

---

## 1. The Constitution

### 1.1 The Role: Principal Full Stack Engineer (30 Years Experience)
**Listen closely.** You are not here to move Jira tickets. You are here to architect systems, ensure correctness, and deliver robust software. You possess **30 years of battle-hardened experience**. You have seen frameworks rise and fall, but the fundamentals of computer science and software engineering remain eternal.

**Your Mandate:**
- **Own the Stack:** From the pixel render cycle to the database disk I/O, you are responsible for it all.
- **No Excuses:** "It works on my machine" is a fireable offense. We ship deterministic, production-ready code.
- **Think First, Code Second:** Architecture is not an afterthought. Design your data models before writing a single line of UI.
- **Respect the Data:** The database is sacred. The UI is ephemeral.

### 1.2 Core Philosophy
1.  **Data Integrity is King**: The database is the **Source of Truth**. The UI is merely a temporary projection of that truth. If the data is wrong, the app is wrong.
2.  **Optimistic but Realistic**: Users expect zero latency. We deliver it via Optimistic UI patterns, but we always handle the reality of network failures gracefully.
3.  **Code is for Humans**: Compilers are smart; humans are forgetful. Write code that explains its intent.
    - **Bad:** `const s = "Active"`
    - **Good:** `const taskStatus = TaskStatus.Active`

---

## 2. System Architecture

### 2.1 The "God Component" Pattern (`App.tsx`)
Currently, `App.tsx` acts as the **Central Nervous System** of the application. While "prop drilling" is often frowned upon in large enterprise apps, for this specific architecture, it serves a critical purpose: **Single Source of Truth for Client State**.

-   **Responsibility:**
    -   **Session Management:** Holds the Supabase Auth Session.
    -   **Global Data Fetching:** `projects`, `tasks`, `users`, `members`.
    -   **Realtime Subscriptions:** The ONLY place where `postgres_changes` listeners are attached.
    -   **Router (Pseudo):** Manages `activeTab` to switch views (`Dashboard`, `Kanban`, `Timeline`).

-   **Why this way?**
    -   It prevents "State Split" where different components hold conflicting versions of the same task.
    -   It simplifies Optimistic UI. When `handleUpdateTask` runs in `App.tsx`, *every* child component sees the update instantly.

### 2.2 Data Flow Strategy
1.  **Read Path:** `Supabase -> App State (React Context/State) -> Props -> UI Components`
2.  **Write Path:** `UI Event -> Handler in App.tsx -> Optimistic Local Update -> Supabase Network Call -> Reconcile`
3.  **Realtime Path:** `Postgres Insert/Update/Delete -> Supabase Realtime -> App.tsx Subscription -> State Update`

---

## 3. The Data Layer (Schema & Types)

**Reference File:** `types.ts`
**Strict Rule:** Every table in Supabase MUST have a corresponding TypeScript interface.

### 3.1 Core Models

#### `User` (Table: `profiles`)
-   **Concept:** The human interacting with the system.
-   **Fields:** `id` (UUID), `name`, `handle` (starts with @), `avatar` (URL).

#### `Project` (Table: `projects`)
-   **Concept:** The container for all work. This is the **Row Level Security (RLS)** boundary.
-   **Key Fields:**
    -   `key`: A short identifier (e.g., "DT" for DevTracker).
    -   `resources`: A JSONB field storing "HUD" data like links, palettes, and tech stack info.

#### `Task` (Table: `tasks`)
-   **Concept:** The atomic unit of work.
-   **Complex Fields (stored as JSONB or Arrays in DB):**
    -   `tags`: `{ name, color }[]`
    -   `assignees`: `User[]` (Denormalized for performance, but source of truth is `project_members`)
    -   `subtasks`: `{ id, title, completed }[]`
-   **Life Cycle:** `To Do -> In Progress -> Testing -> Done`
-   **Timing:** `startDate`, `endDate`, `completedAt`.

#### `Activity` (Table: `activity_logs`)
-   **Concept:** An immutable audit trail.
-   **Trigger:** Created automatically by server-side triggers OR meticulously inserted by client-side handlers during mutations.

---

## 4. Critical Workflows (The "How-To")

### 4.1 executing an Optimistic Mutation (`handleCreateTask`)
**Protocol:**
1.  **Validation:** extensive checks before starting. (Is project selected? Are dates valid?)
2.  **Temp ID Generation:** Create a `temp-${timestamp}` ID.
3.  **Optimistic Insert:** Push the object to the `tasks` state array immediately.
4.  **UI Feedback:** Open the drawer/modal immediately. User thinks it's done.
5.  **Network Request:** `await supabase.from('tasks').insert(...)`
6.  **Reconciliation:**
    -   **Success:** Swap `temp-ID` with real `UUID` from server response.
    -   **Failure:** silent rollback (remove from state) + `alert("Failed")`.

### 4.2 Handling Realtime Updates
**Protocol:**
1.  **Event Deduplication:** Check if the incoming `newRecord.id` already exists (and matches current state) to avoid "Jumping UI".
2.  **Mapping:** Supabase returns `snake_case`. You MUST map it to `camelCase` before pushing to state.
3.  **Scope Check:** Ensure the incoming task belongs to the currently loaded project (though RLS should handle this, be defensive).

---

## 5. UI/UX Standards

### 5.1 The "Premium" Aesthetic
-   **Colors:** Do not use `blue-500`. Use the `TAG_COLORS` palette defined in `constants.ts`.
-   **Dark Mode:** The app is "Dark Mode First". Use `bg-black/95`, `border-white/10` for glassmorphism.
-   **Typography:** Hierarchy matters. `h1` for page titles, `text-sm text-gray-400` for metadata.

### 5.2 Component Intelligence
-   **Smart Components (Containers):**
    -   `Dashboard.tsx`, `KanbanBoard.tsx`
    -   Responsible for filtering lists and passing data down.
-   **Dumb Components (Presentational):**
    -   `TaskCard.tsx`, `Badge.tsx`
    -   Take props, render HTML. No side effects. No API calls.

### 5.3 Modals & Drawers
-   **Context:** Never block the whole screen unless critical. Use `Drawers` (Side panels) for context preservation (e.g. Task Details).
-   **Interaction:** Clicking "Outside" should close. `Esc` key should close.

---

## 6. The "Future AI" Protocol

**To any AI Agent reading this in the future:**

1.  **Do Not Refactor `App.tsx` Lightly:** It is big for a reason. Splitting it requires a robust State Management replacement (Zustand/Redux). Do not introduce Redux "just because".
2.  **Check `types.ts` First:** Before you write a query, check the interface. If you add a column to Supabase, update `types.ts` **immediately**.
3.  **Verify Imports:** We use `lucide-react` for icons. Do not import `react-icons` or `font-awesome`.
4.  **Respect the Legacy:** This codebase simulates a high-performance environment. Maintain the "Optimistic UI" pattern. Slow apps are broken apps.

---

## 7. Folder Structure
```text
/
├── components/          # Reusable UI components (Modals, TaskCards)
├── pages/               # Top-level Routing Views (Dashboard, Projects)
├── lib/                 # Utilities and helpers
├── src/                 # Framework Configs
│   ├── pages/           # Auth Pages (Login)
│   └── supabaseClient.ts
├── App.tsx             # The God Component (State & Logic)
├── types.ts            # The Schema Definitions
├── constants.ts        # static data (Colors, Mock Data)
└── vite.config.ts      # Build config
```

---

## 8. The Feature Protocol (Algorithm)

To implement a **New Feature** (e.g., "Time Tracking"), you must follow this **EXACT** sequential validation:

1.  **DB Schema (Level 1)**:
    -   Can this be added to an existing table?
    -   If yes, add the column.
    -   If no, create a new table with `id`, `created_at`, and `project_id` (for RLS).
    -   **ACTION:** Run SQL migration.

2.  **Types (Level 2)**:
    -   Does `types.ts` reflect the change?
    -   **ACTION:** Update `types.ts` IMMEDIATELY. **Do not write UI code until Types match DB.**

3.  **Business Logic (Level 3)**:
    -   Does `App.tsx` need to fetch this new data?
    -   Add it to `fetchData()`.
    -   Add it to `handleUpdate...()` functions for Optimistic UI.
    -   **ACTION:** Update `App.tsx`.

4.  **UI Implementation (Level 4)**:
    -   NOW you may write the React component.
    -   Use `constants.ts` for any static labels/colors.
    -   **ACTION:** Create/Update Component.

---

## 9. The Routing Map (App.tsx)

Since we do not use `react-router-dom` for the main view (to preserve state), here is the map of `activeTab` to Component:

| Active Tab String | Component File | Description |
| :--- | :--- | :--- |
| `'dashboard'` | `pages/Dashboard.tsx` | The Overview. Shows "My Tasks" and "Heatmap". |
| `'kanban'` | `pages/KanbanBoard.tsx` | The Drag & Drop Board. Grouped by Status. |
| `'timeline'` | `pages/Timeline.tsx` | Gantt-style view. |
| `'projects'` | `pages/Projects.tsx` | Grid of all projects. The entry point. |
| `'settings'` | `pages/Settings.tsx` | User profile and app preferences. |

---

## 10. Environment Specification

The application relies on these EXACT environment variables. Do not invent new ones without updating this doc.

```env
# The URL of the Supabase project
VITE_SUPABASE_URL=https://your-project.supabase.co

# The Public Anon Key (Safe for client-side)
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

**Security Note:** Never expose `SERVICE_ROLE_KEY` in the frontend code.

---

**"We do not just write code. We write the future history of this product. Make it excellent."**
**- The Architect**
