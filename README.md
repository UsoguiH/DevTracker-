# DevTracker

**DevTracker** is a comprehensive project management application designed to help teams track tasks, manage projects, and organize sprints. Built for speed and reliability, it functions similarly to industry-standard tools like Linear, Jira, or Trello.

## Tech Stack

- **Frontend:** React (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Icons:** Lucide React
- **Drag & Drop:** @hello-pangea/dnd
- **Charts:** Recharts

## Key Features

- **Optimistic UI:** Instant feedback for actionable items.
- **Real-time Updates:** Stay in sync with your team automatically.
- **Multi-project Support:** Seamlessly switch between different workspaces.
- **Sprint Management:** Organize tasks into sprints and track history.
- **Focus Mode:** A minimal interface for deep work.
- **Team Management:** Invite and manage team members easily.

## Getting Started

### Prerequisites

- Node.js installed on your machine.

### Installation

1. Clone the repository and navigate to the project folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Ensure you have a `.env.local` file in the root directory with your Supabase credentials:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```
