# DevTracker Project Guidelines

## Project Overview
**DevTracker** is a project management application designed to help teams track tasks, manage projects, and organize sprints. It functions similarly to tools like Linear, Jira, or Trello.

## Tech Stack
- **Frontend:** React (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Icons:** Lucide React
- **Drag & Drop:** @hello-pangea/dnd
- **Charts:** Recharts

## Architecture & Data Flow

### Centralized State (`App.tsx`)
- The `App.tsx` file currently serves as the main controller for the application.
- It handles:
    - **Authentication State:** (`session`, `user`)
    - **Data Fetching:** Fetches Projects, Tasks, Users, and Project Members.
    - **Realtime Subscriptions:** Listens for changes in the `tasks` table to keep the UI in sync.
    - **Optimistic UI:** Most actions (Create, Update, Delete) are applied to the local state *immediately* before the network request completes to ensure a snappy user experience.

### Data Model (`types.ts`)
- All shared interfaces are defined in `types.ts`.
- **Key Models:** `User`, `Project`, `Task`, `Comment`, `Activity`.
- **Relationship:** Projects have Members; Tasks belong to Projects; Tasks can be part of a Sprint.

### Directory Structure
- `src/pages`: Main views (Dashboard, KanbanBoard, Timeline, Projects, Login, Settings).
- `src/components`: Reusable UI components (Modals, Task Drawers, Layouts).
- `src/supabaseClient.ts`: Supabase client initialization.

## Coding Standards & Rules

1.  **Optimistic Updates:** When implementing data mutations (create/edit/delete), **always** update the local state immediately (Optimistic UI) before awaiting the Supabase response. Handle errors by reverting changes if necessary.
    
2.  **Supabase & RLS:** 
    - Respect Row Level Security (RLS). Ensure queries are scoped to the user's projects or permissions.
    - When adding new tables, ensure corresponding types are added to `types.ts`.

3.  **Styling:**
    - Use **Tailwind CSS** for strictly all styling.
    - Use strict dark/light mode tokens if applicable (currently appears tailored for a specific look).

4.  **Icons:** 
    - Use `lucide-react` for all icons.

5.  **Type Safety:**
    - Avoid `any`. Use the interfaces defined in `types.ts`.

6.  **Task Management:**
    - Tasks are the core unit. They have `status`, `priority`, `assignees`, and `tags`.
    - Comments and Activities are often fetched or handled alongside tasks.

## Key Features to Maintain
- **Multi-project support:** Users can switch between projects.
- **Sprint History:** archiving done tasks into sprints.
- **Focus Mode:** A minimal view for focused work.
- **Team Management:** Ability to invite users by handle.
