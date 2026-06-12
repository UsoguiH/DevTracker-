import React from 'react';
import ReactDOM from 'react-dom/client';
import AICommandCenter, { AIChatView, ChatMsg } from './pages/AICommandCenter';
import Projects from './pages/Projects';
import KanbanBoard from './pages/KanbanBoard';
import Dashboard from './pages/Dashboard';
import TaskDetailDrawer from './components/TaskDetailDrawer';
import Layout from './components/Layout';
import { MorphPanel } from './components/ui/ai-input';
import BoardAIPanel, { BoardMsg } from './components/BoardAIPanel';
import Whiteboard from './pages/Whiteboard';
import JiraProject from './pages/JiraProject';

/**
 * Dev-only preview harness (no Supabase login needed) so reskinned screens can
 * be viewed/screenshotted in isolation.
 *   /preview.html                  → AI chat (empty hero)
 *   /preview.html?state=convo      → AI chat conversation
 *   /preview.html?view=projects    → Projects grid
 *   /preview.html?view=kanban      → Kanban board
 */

const AV = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80';
const user = { id: 'u1', name: 'You', handle: '@you', avatar: AV };

const mockProjects: any[] = [
  { id: 'p1', key: 'CA', name: 'Cafe App', description: 'Mobile ordering + loyalty for a coffee chain.', createdAt: '' },
  { id: 'p2', key: 'DE', name: 'DevTracker', description: '', createdAt: '' },
  { id: 'p3', key: 'AI', name: 'AI Therapist', description: 'Voice-first wellness companion.', createdAt: '' },
  { id: 'p4', key: 'AD', name: 'Admin Portal', description: 'Internal tools dashboard.', createdAt: '' },
  { id: 'p5', key: 'TA', name: 'Tasks API', description: '', createdAt: '' },
];

const mockTasks: any[] = [
  { id: 't1', projectId: 'p1', title: 'Document API Endpoints for Backend Services', description: 'Create comprehensive documentation for all API endpoints developed for order processing.', status: 'To Do', priority: 'Medium', endDate: '2026-05-20', tags: [{ name: 'Documentation' }, { name: 'AI Generated' }], assignees: [user], estimatedTime: '4h', progress: 0, comments: [], subtasks: [] },
  { id: 't2', projectId: 'p1', title: 'Design User Interface for Drive-Thru Experience', description: 'Create detailed wireframes and UI mockups for the Drive-Thru Experience, ensuring a user-friendly layout.', status: 'In Progress', priority: 'High', endDate: '2026-05-22', tags: [{ name: 'UI' }, { name: 'AI Generated' }], assignees: [user], estimatedTime: '6h', progress: 35, comments: [], subtasks: [] },
  { id: 't3', projectId: 'p1', title: 'Set up CI pipeline', description: 'GitHub Actions for tests + deploy.', status: 'In Progress', priority: 'Low', endDate: '2026-06-09', tags: [{ name: 'DevOps' }], assignees: [user], estimatedTime: '3h', progress: 60, comments: [], subtasks: [{ id: 's', title: 'x', completed: true }] },
  { id: 't4', projectId: 'p1', title: 'Write integration tests for checkout', description: 'Cover the full payment flow.', status: 'Testing', priority: 'Medium', endDate: '2026-06-30', tags: [{ name: 'QA' }], assignees: [user], estimatedTime: '5h', progress: 80, comments: [], subtasks: [] },
  { id: 't5', projectId: 'p1', title: 'Ship loyalty points feature', description: '', status: 'Done', priority: 'High', tags: [{ name: 'Feature' }], assignees: [user], estimatedTime: '8h', progress: 100, comments: [], subtasks: [] },
];

// fill project task counts so progress bars vary
for (let i = 0; i < 60; i++) mockTasks.push({ id: `f${i}`, projectId: 'p2', title: `t${i}`, status: i < 5 ? 'Done' : 'To Do', priority: 'Low', tags: [], assignees: [], estimatedTime: '', comments: [], subtasks: [] });

const params = new URLSearchParams(location.search);
const view = params.get('view');

const seed: ChatMsg[] = [
  { id: '1', role: 'user', text: 'Plan 4 tasks for a login system' },
  { id: '2', role: 'action', text: "Here's how I'd break the login system down — four tasks.", action: { intent: 'CREATE_TASKS', payload: { tasks: [{ title: 'Create user model & database schema', priority: 'High' }, { title: 'Implement POST /api/auth/login endpoint', priority: 'High' }, { title: 'Build the login form component', priority: 'Medium' }, { title: 'Add session persistence & logout', priority: 'Low' }] }, summary: '' } },
];

const root = ReactDOM.createRoot(document.getElementById('root')!);

let content: React.ReactNode;
if (view === 'projects') {
  content = (
    <div className="min-h-screen bg-canvas p-8">
      <Projects projects={mockProjects} tasks={mockTasks} onSelectProject={() => {}} onOpenCreateModal={() => {}} onEditProject={() => {}} onDeleteProject={() => {}} onInviteMember={() => {}} />
    </div>
  );
} else if (view === 'kanban') {
  content = (
    <div className="h-screen bg-canvas p-8">
      <KanbanBoard tasks={mockTasks.filter(t => t.projectId === 'p1')} onMoveTask={() => {}} onAddTask={() => {}} onEditTask={() => {}} onCompleteSprint={() => {}} onViewHistory={() => {}} />
    </div>
  );
} else if (view === 'dashboard') {
  content = (
    <div className="min-h-screen bg-canvas p-8">
      <Dashboard tasks={mockTasks.filter(t => t.projectId === 'p1')} project={{ id: 'p1', key: 'CA', name: 'Cafe App', description: 'Mobile ordering + loyalty for a coffee chain.', createdAt: '2026-03-01' } as any} onAddMember={() => {}} />
    </div>
  );
} else if (view === 'jira') {
  const jiraTasks = mockTasks
    .filter(t => t.projectId === 'p1')
    .map(t => ({ ...t, dueDate: t.endDate, tags: t.tags.map((tag: any) => ({ ...tag, color: tag.color || 'bg-emerald-800' })) }));
  content = (
    <div className="min-h-screen bg-canvas">
      <JiraProject
        project={{ id: 'p1', key: 'KAN', name: 'Cafe App', description: '', createdAt: '2026-03-01' } as any}
        tasks={jiraTasks}
        user={user as any}
        onMoveTask={() => {}}
        onQuickCreate={() => {}}
        onOpenTask={() => {}}
        onUpdateProject={() => {}}
        onUpdateTask={() => {}}
        onAddTask={() => {}}
        onCompleteSprint={() => {}}
        onViewHistory={() => {}}
      />
    </div>
  );
} else if (view === 'sidebar' || view === 'layout') {
  const proj: any = { id: 'p1', key: 'CA', name: 'Cafe App', description: 'Mobile ordering + loyalty for a coffee chain.', createdAt: '2026-03-01' };
  const LayoutPreview = () => {
    const [tab, setTab] = React.useState('dashboard');
    const [q, setQ] = React.useState('');
    return (
      <Layout
        activeTab={tab} setActiveTab={setTab} searchQuery={q} setSearchQuery={setQ}
        onAddTask={() => {}} onOpenFocusMode={() => {}} activeProject={proj}
        onUpdateProject={() => {}} user={user as any} tasks={mockTasks.filter(t => t.projectId === 'p1')} onViewTask={() => {}}
      >
        <div className="flex items-center justify-center h-full text-muted">
          <p className="text-lg">Page content for <span className="text-ink font-semibold">{tab}</span></p>
        </div>
        <MorphPanel onAIAction={() => {}} currentTasks={[]} />
      </Layout>
    );
  };
  content = <LayoutPreview />;
} else if (view === 'space') {
  const boardSeed: BoardMsg[] = [
    { role: 'user', text: 'Turn my project tasks into a planning board' },
    { role: 'assistant', text: 'I laid out your five tasks as a kanban-style planning board — three columns for To Do, In Progress, and Done, with each task as a sticky note under its column. The two high-priority ones are at the top of their columns.', meta: '+8 elements · 2 updated' },
    { role: 'user', text: 'nice, can you add a section for blocked work too?' },
  ];
  const emptyBoard: any = { elements: [], connectors: [] };
  content = (
    <div className="h-screen relative" style={{ background: '#f7f7f4' }}>
      <BoardAIPanel
        isOpen onClose={() => {}} board={emptyBoard} taskTitles={[]} projectName="Cafe App"
        onApply={() => ({ added: 0, updated: 0, removed: 0 })}
        previewSeed={params.get('state') === 'empty' ? [] : boardSeed}
        previewBusy={params.get('state') === 'busy'}
      />
    </div>
  );
} else if (view === 'whiteboard') {
  content = (
    <div className="h-screen bg-canvas">
      <Whiteboard projectId="p1" projectName="Cafe App" tasks={mockTasks.filter(t => t.projectId === 'p1')} />
    </div>
  );
} else if (view === 'app-chat') {
  // Claude chat mounted inside the real app shell (sidebar + header), tab = AI Manager.
  const proj: any = { id: 'p1', key: 'CA', name: 'Cafe App', description: 'Mobile ordering + loyalty.', createdAt: '2026-03-01' };
  const AppChat = () => {
    const [tab, setTab] = React.useState('ai');
    const [q, setQ] = React.useState('');
    return (
      <Layout activeTab={tab} setActiveTab={setTab} searchQuery={q} setSearchQuery={setQ}
        onAddTask={() => {}} onOpenFocusMode={() => {}} activeProject={proj}
        onUpdateProject={() => {}} user={user as any} tasks={mockTasks.filter(t => t.projectId === 'p1')} onViewTask={() => {}}>
        <AIChatView tasks={[]} onAction={() => {}} onBack={() => {}} previewSeed={params.get('state') === 'convo' ? seed : undefined}
          storageKey="devtrack-ai-chats-preview" />
      </Layout>
    );
  };
  content = <AppChat />;
} else if (view === 'app-hub') {
  // Full AI Manager hub (launcher + tool views) inside the real app shell.
  const proj: any = { id: 'p1', key: 'CA', name: 'Cafe App', description: 'Mobile ordering + loyalty.', createdAt: '2026-03-01' };
  const AppHub = () => {
    const [tab, setTab] = React.useState('ai');
    const [q, setQ] = React.useState('');
    return (
      <Layout activeTab={tab} setActiveTab={setTab} searchQuery={q} setSearchQuery={setQ}
        onAddTask={() => {}} onOpenFocusMode={() => {}} activeProject={proj}
        onUpdateProject={() => {}} user={user as any} tasks={mockTasks.filter(t => t.projectId === 'p1')} onViewTask={() => {}}>
        <AICommandCenter tasks={mockTasks.filter(t => t.projectId === 'p1')} project={proj} user={user as any} onAIAction={() => {}} />
      </Layout>
    );
  };
  content = <AppHub />;
} else if (view === 'task-drawer') {
  const drawerTask: any = {
    id: 't2', projectId: 'p1',
    title: 'Design User Interface for Drive-Thru Experience',
    description: 'Create detailed wireframes and high-fidelity UI mockups for the Drive-Thru ordering flow.\n\nFocus on a one-handed, glanceable layout that works in bright sunlight.',
    status: 'In Progress', priority: 'High',
    tags: [{ name: 'UI' }, { name: 'AI Generated' }, { name: 'Figma' }],
    assignees: [user, { id: 'u2', name: 'Sarah Chen', handle: '@sarah', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80' }],
    startDate: '2026-06-05', endDate: '2026-06-12', durationDays: 8, dueDate: '2026-06-12',
    estimatedTime: '6h', progress: 45,
    subtasks: [
      { id: 's1', title: 'Low-fidelity wireframes', completed: true },
      { id: 's2', title: 'High-fidelity mockups', completed: true },
      { id: 's3', title: 'Prototype the order flow', completed: false },
      { id: 's4', title: 'Accessibility / contrast review', completed: false },
    ],
    comments: [
      { id: 'c1', userId: 'u2', text: 'Love the glanceable layout direction — can we try a bigger CTA?', createdAt: '2026-06-08T10:30:00Z' },
      { id: 'c2', userId: 'u1', text: 'Yep, bumping it to 56px and adding a high-contrast variant.', createdAt: '2026-06-08T11:05:00Z' },
    ],
    activity: [
      { id: 'a1', userId: 'u1', description: 'created this task', type: 'create', createdAt: '2026-06-05T09:00:00Z' },
      { id: 'a2', userId: 'u1', description: 'moved task from To Do to In Progress', type: 'status', createdAt: '2026-06-06T14:00:00Z' },
    ],
  };
  content = (
    <div className="h-screen bg-canvas">
      <TaskDetailDrawer
        isOpen task={drawerTask} currentUser={user as any}
        allUsers={[user as any, { id: 'u2', name: 'Sarah Chen', handle: '@sarah', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80' }]}
        onClose={() => {}} onUpdateTask={() => {}} onAddComment={() => {}} onDeleteTask={() => {}}
      />
    </div>
  );
} else {
  content = (
    <div style={{ height: '100vh', background: '#FAF9F5' }}>
      <AIChatView tasks={[]} onAction={() => {}} onBack={() => {}} previewSeed={params.get('state') === 'convo' ? seed : undefined} />
    </div>
  );
}

root.render(content);
