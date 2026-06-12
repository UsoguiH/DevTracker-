
import React, { useState, useMemo, useEffect, startTransition } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  KanbanSquare,
  CalendarDays,
  Settings,
  Search,
  Bell,
  Plus,
  FolderOpen,
  Zap,
  PanelRight,
  BrainCircuit,
  Presentation,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronRight,
  Layers,
  Inbox,
  Github,
  UserPlus,
  PenSquare,
  AlignJustify,
  Calendar,
  Archive,
  Check
} from 'lucide-react';
import { User, Project, Task } from '../types';
import ProjectHUD from './ProjectHUD';
import OverdueAlertsPanel from './OverdueAlertsPanel';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddTask: () => void;
  onOpenFocusMode: () => void;
  onOpenCommandPalette: () => void;
  activeProject: Project | null;
  onUpdateProject?: (projectId: string, updates: Partial<Project>) => void;
  user: User;
  tasks: Task[];
  onViewTask: (task: Task) => void;
  showNewTask?: boolean;
  projects?: Project[];
  onSelectProject?: (projectId: string) => void;
  onInvite?: () => void;
  workspaceTab?: string;
  onOpenWorkspaceTab?: (tab: string) => void;
  onViewArchive?: () => void;
}

const SECTIONS_KEY = 'devtrack-sidebar-sections';

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onAddTask,
  onOpenFocusMode,
  onOpenCommandPalette,
  activeProject,
  onUpdateProject,
  user,
  tasks,
  onViewTask,
  showNewTask = false,
  projects = [],
  onSelectProject,
  onInvite,
  workspaceTab = 'board',
  onOpenWorkspaceTab,
  onViewArchive
}) => {
  const [isHUDOpen, setIsHUDOpen] = useState(false);
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // 'pro' = Linear-style sections; 'simple' = the original SnowUI sidebar
  const [mode, setMode] = useState<'simple' | 'pro'>(() =>
    (localStorage.getItem('devtrack-sidebar-mode') === 'simple' ? 'simple' : 'pro'));
  useEffect(() => { localStorage.setItem('devtrack-sidebar-mode', mode); }, [mode]);
  const [sections, setSections] = useState<Record<string, boolean>>(() => {
    try { return { workspace: true, project: true, shortcuts: true, ...JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}') }; }
    catch { return { workspace: true, project: true, shortcuts: true }; }
  });
  useEffect(() => { localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections)); }, [sections]);
  const toggleSection = (id: string) => setSections(s => ({ ...s, [id]: !s[id] }));

  // The sidebar highlights from this local mirror so the active pill moves
  // INSTANTLY; the heavy page swap is deferred via startTransition so it can't
  // block the indicator animation.
  const [localTab, setLocalTab] = useState(activeTab);
  useEffect(() => { setLocalTab(activeTab); }, [activeTab]);
  const navigate = (id: string) => {
    setLocalTab(id);                            // urgent: pill slides now
    startTransition(() => setActiveTab(id));    // deferred: page mounts after
  };
  // Deep-links switch synchronously — startTransition here reads as lag.
  const openWorkspaceTab = (tab: string) => {
    setLocalTab('jira');
    onOpenWorkspaceTab?.(tab);
  };

  const alertCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parseDate = (s: string | undefined) => {
      if (!s) return null;
      const p = s.split('-');
      if (p.length === 3) return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      const d = new Date(s); d.setHours(0, 0, 0, 0); return isNaN(d.getTime()) ? null : d;
    };
    const active = tasks.filter(t => t.status !== 'Done' && (t.dueDate || t.endDate));
    const overdue = active.filter(t => { const d = parseDate(t.dueDate || t.endDate); return d !== null && d < today; }).length;
    const dueToday = active.filter(t => { const d = parseDate(t.dueDate || t.endDate); return d !== null && d.getTime() === today.getTime(); }).length;
    return { overdue, dueToday, total: overdue + dueToday };
  }, [tasks]);

  /* ── Linear-style compact nav row ─────────────────────────────────────── */
  const NavRow = ({ id, icon: Icon, label, disabled = false, onClick, index = 0, depth = 0, badge, activeOverride }:
    {
      id?: string; icon: any; label: string; disabled?: boolean; onClick?: () => void;
      index?: number; depth?: number; badge?: number; activeOverride?: boolean;
    }) => {
    const isActive = activeOverride ?? (!!id && localTab === id);
    return (
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.03 + index * 0.025, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        onClick={() => { if (disabled) return; if (onClick) onClick(); else if (id) navigate(id); }}
        disabled={disabled}
        title={collapsed ? label : undefined}
        className={`group relative w-full flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2'} rounded-lg text-[14px] tracking-[-0.01em] transition-colors duration-150
          ${disabled
            ? 'text-muted-soft cursor-not-allowed'
            : isActive
              ? 'text-ink font-medium'
              : 'text-body hover:text-ink hover:bg-ink/[0.04]'}`}
        style={!collapsed && depth > 0 ? { paddingLeft: 10 + depth * 22 } : undefined}
      >
        {isActive && (
          <motion.span
            layoutId="nav-active"
            className="absolute inset-0 rounded-lg bg-ink/[0.05]"
            transition={{ type: 'spring', stiffness: 520, damping: 40 }}
          />
        )}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-primary z-10" />
        )}
        <Icon size={collapsed ? 19 : 16} strokeWidth={isActive ? 2.3 : 2} className={`relative z-10 shrink-0 ${isActive ? 'text-primary' : 'text-muted group-hover:text-body'}`} />
        {!collapsed && <span className="relative z-10 truncate flex-1 text-left">{label}</span>}
        {!collapsed && badge !== undefined && badge > 0 && (
          <span className="relative z-10 text-[11px] font-semibold text-muted tabular-nums">{badge > 99 ? '99+' : badge}</span>
        )}
      </motion.button>
    );
  };

  /* ── Section header — editorial caption; collapsible only when asked ───── */
  const Section = ({ id, label, children, collapsible = true }:
    { id: string; label: string; children: React.ReactNode; collapsible?: boolean }) => {
    if (collapsed) return <>{children}</>;
    const open = !collapsible || sections[id] !== false;
    return (
      <div className="mt-5">
        {collapsible ? (
          <button
            onClick={() => toggleSection(id)}
            className="w-full flex items-center gap-1.5 px-2.5 pb-1 rounded-md group"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-soft group-hover:text-muted transition-colors">{label}</span>
            {open
              ? <ChevronDown size={11} className="text-muted-soft group-hover:text-muted" />
              : <ChevronRight size={11} className="text-muted-soft group-hover:text-muted" />}
          </button>
        ) : (
          <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-soft">{label}</p>
        )}
        {open && <div className="flex flex-col gap-px mt-0.5 animate-fade-in">{children}</div>}
      </div>
    );
  };

  /* ── Simple-mode row — the original SnowUI pill style, unchanged ───────── */
  const SimpleNavRow = ({ id, icon: Icon, label, disabled = false, onClick, index = 0 }:
    { id?: string; icon: any; label: string; disabled?: boolean; onClick?: () => void; index?: number }) => {
    const isActive = !!id && localTab === id;
    return (
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 + index * 0.04, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        onClick={() => { if (onClick) onClick(); else if (id && !disabled) navigate(id); }}
        disabled={disabled}
        title={collapsed ? label : undefined}
        className={`group relative w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-2xl text-[14px] transition-colors duration-200
          ${disabled
            ? 'text-muted-soft cursor-not-allowed'
            : isActive
              ? 'text-ink'
              : 'text-body hover:text-ink hover:bg-ink/[0.03]'}`}
      >
        {isActive && (
          <motion.span
            layoutId="nav-active"
            className="absolute inset-0 rounded-2xl bg-ink/[0.05]"
            transition={{ type: 'spring', stiffness: 520, damping: 40 }}
          />
        )}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary z-10" />
        )}
        <Icon size={20} strokeWidth={isActive ? 2.4 : 2} className={`relative z-10 shrink-0 ${isActive ? 'text-primary' : ''}`} />
        {!collapsed && <span className="relative z-10 truncate">{label}</span>}
      </motion.button>
    );
  };

  const SimpleCaption = ({ children }: { children: React.ReactNode }) =>
    collapsed ? <div className="h-2" /> : (
      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-soft">{children}</p>
    );

  /* ── Simple / Pro mode switch ───────────────────────────────────────────── */
  const ModeToggle = () => collapsed ? (
    <button
      onClick={() => setMode(m => (m === 'simple' ? 'pro' : 'simple'))}
      title={mode === 'simple' ? 'Switch to Pro mode' : 'Switch to Simple mode'}
      className="self-center p-1.5 mb-1 rounded-lg hover:bg-ink/[0.04] text-muted hover:text-ink transition-colors"
    >
      <Layers size={17} />
    </button>
  ) : (
    <div className="flex p-0.5 rounded-lg bg-canvas-soft border border-hairline mx-1 mb-1.5">
      {(['simple', 'pro'] as const).map(m => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`flex-1 py-1 rounded-md text-[11.5px] font-medium capitalize transition-colors
            ${mode === m ? 'bg-surface-card text-ink border border-hairline' : 'text-muted hover:text-ink'}`}
        >
          {m} mode
        </button>
      ))}
    </div>
  );

  const ProjectGlyph = ({ p, size = 18 }: { p: Project; size?: number }) => (
    <span
      className="rounded-[5px] bg-primary text-on-primary font-bold inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {(p.key || p.name).slice(0, 2).toUpperCase()}
    </span>
  );

  // Nested rows under the active project — planning tools that complement the
  // Board (which already holds Kanban / List / Timeline / Summary)
  const projectChildren = [
    { id: 'backlog', label: 'Backlog', icon: AlignJustify },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  return (
    <div className="flex min-h-screen bg-canvas text-ink font-sans overflow-hidden selection:bg-primary/20">
      {/* ── Sidebar (Linear-style structure, editorial palette) ───────────── */}
      <motion.aside
        animate={{ width: collapsed ? (mode === 'simple' ? 76 : 64) : (mode === 'simple' ? 212 : 236) }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className={`shrink-0 h-screen bg-surface-card border-r border-hairline flex flex-col z-50 overflow-hidden ${mode === 'simple' ? 'justify-between py-7 px-4' : ''}`}
      >
        {mode === 'simple' ? (
          <>
            {/* ── Simple mode — the original SnowUI sidebar ─────────────── */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-8 mb-5 px-1`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-primary inline-flex items-center justify-center shrink-0">
                    <span className="w-3 h-3 rounded-[3px] bg-on-primary" />
                  </span>
                  {!collapsed && <span className="text-[16px] font-semibold tracking-tight truncate">DevTracker</span>}
                </div>
                {!collapsed && (
                  <button onClick={() => setCollapsed(true)} className="text-muted-soft hover:text-ink transition-colors" title="Collapse">
                    <ChevronsLeft size={18} />
                  </button>
                )}
              </div>
              {collapsed && (
                <button onClick={() => setCollapsed(false)} className="self-center mb-1 text-muted-soft hover:text-ink transition-colors" title="Expand">
                  <ChevronsRight size={18} />
                </button>
              )}

              <SimpleCaption>Menu</SimpleCaption>
              <SimpleNavRow id="projects" icon={FolderOpen} label="Projects" index={0} />
              <SimpleNavRow id="dashboard" icon={LayoutDashboard} label="Dashboard" disabled={!activeProject} index={1} />
              <SimpleNavRow id="jira" icon={KanbanSquare} label="Workspace" disabled={!activeProject} index={2} />
              <SimpleNavRow id="canvas" icon={Presentation} label="Space" disabled={!activeProject} index={3} />
              <SimpleNavRow id="ai" icon={BrainCircuit} label="AI Manager" disabled={!activeProject} index={4} />

              <SimpleCaption>Focus</SimpleCaption>
              <SimpleNavRow icon={Zap} label="Focus Mode" disabled={!activeProject} onClick={onOpenFocusMode} index={5} />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <ModeToggle />
              <SimpleNavRow id="settings" icon={Settings} label="Settings" index={6} />
              <div className="h-px bg-hairline my-2 mx-1" />
              <button
                onClick={() => navigate('settings')}
                title="Account"
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2 rounded-xl hover:bg-ink/[0.03] transition-colors group`}
              >
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover bg-surface-strong border border-hairline shrink-0" />
                {!collapsed && (
                  <div className="text-left leading-tight min-w-0">
                    <p className="text-[14px] text-ink truncate group-hover:text-primary transition-colors">{user.name}</p>
                    <p className="text-[12px] text-muted truncate">{user.handle}</p>
                  </div>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
        {/* Workspace switcher + quick actions */}
        <div className={`flex items-center gap-1 ${collapsed ? 'justify-center px-2' : 'px-3'} pt-4 pb-2 relative`}>
          {collapsed ? (
            <button onClick={() => setCollapsed(false)} title="Expand" className="p-1.5 rounded-lg hover:bg-ink/[0.04] text-muted hover:text-ink transition-colors">
              <ChevronsRight size={17} />
            </button>
          ) : (
            <>
              <button
                onClick={() => setSwitcherOpen(o => !o)}
                className="flex items-center gap-2 pl-1 pr-1.5 py-1.5 rounded-lg hover:bg-ink/[0.04] transition-colors min-w-0 flex-1"
                title="Switch project"
              >
                {activeProject
                  ? <ProjectGlyph p={activeProject} />
                  : <span className="w-[18px] h-[18px] rounded-[5px] bg-primary inline-flex items-center justify-center shrink-0"><span className="w-2 h-2 rounded-[2px] bg-on-primary" /></span>}
                <span className="text-[14px] font-semibold tracking-[-0.02em] truncate">{activeProject ? activeProject.name : 'DevTracker'}</span>
                <ChevronDown size={13} className="text-muted-soft shrink-0" />
              </button>
              <button onClick={onOpenCommandPalette} title="Search (Ctrl+K)" className="p-1.5 rounded-lg hover:bg-ink/[0.04] text-muted hover:text-ink transition-colors shrink-0">
                <Search size={15} />
              </button>
              <button onClick={onAddTask} disabled={!activeProject} title="New task" className="p-1.5 rounded-lg hover:bg-ink/[0.04] text-muted hover:text-ink disabled:text-muted-soft transition-colors shrink-0">
                <PenSquare size={15} />
              </button>
            </>
          )}

          {/* Project switcher dropdown */}
          {switcherOpen && !collapsed && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
              <div className="absolute left-3 top-12 z-50 w-[210px] bg-surface-card border border-hairline rounded-xl shadow-[0_24px_48px_-24px_rgba(38,37,30,0.4)] py-1.5 animate-pop-in">
                <p className="px-3 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-soft">Projects</p>
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onSelectProject?.(p.id); setSwitcherOpen(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-canvas-soft transition-colors"
                  >
                    <ProjectGlyph p={p} size={20} />
                    <span className="text-[13px] text-ink truncate flex-1 text-left">{p.name}</span>
                    {activeProject?.id === p.id && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                ))}
                <div className="h-px bg-hairline-soft my-1.5 mx-3" />
                <button
                  onClick={() => { navigate('projects'); setSwitcherOpen(false); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2.5 text-[13px] text-body hover:bg-canvas-soft hover:text-ink transition-colors"
                >
                  <FolderOpen size={15} className="text-muted" /> View all projects
                </button>
              </div>
            </>
          )}
        </div>

        {/* Scrollable nav */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${collapsed ? 'px-2' : 'px-3'} pb-2 min-w-0`}>
          {/* Top-level */}
          <div className="flex flex-col gap-px">
            <NavRow icon={Inbox} label="Inbox" badge={alertCounts.total} onClick={() => setIsAlertsPanelOpen(p => !p)} index={0} activeOverride={isAlertsPanelOpen} />
          </div>

          <Section id="workspace" label="Workspace" collapsible={false}>
            <NavRow id="projects" icon={FolderOpen} label="Projects" index={1} />
            <NavRow id="dashboard" icon={LayoutDashboard} label="Dashboard" disabled={!activeProject} index={2} />
            <NavRow id="jira" icon={KanbanSquare} label="Board" disabled={!activeProject} index={3} />
            <NavRow id="canvas" icon={Presentation} label="Space" disabled={!activeProject} index={4} />
            <NavRow id="ai" icon={BrainCircuit} label="AI Manager" disabled={!activeProject} index={5} />
          </Section>

          {activeProject && (
            <Section id="project" label="Your project">
              {projectChildren.map((c, i) => (
                <NavRow
                  key={c.id}
                  icon={c.icon}
                  label={c.label}
                  index={6 + i}
                  onClick={() => openWorkspaceTab(c.id)}
                  activeOverride={localTab === 'jira' && workspaceTab === c.id}
                />
              ))}
              <NavRow
                icon={Archive}
                label="Archived sprints"
                index={8}
                disabled={!onViewArchive}
                onClick={onViewArchive}
              />
            </Section>
          )}

          <Section id="shortcuts" label="Shortcuts">
            <NavRow icon={Zap} label="Focus Mode" disabled={!activeProject} onClick={onOpenFocusMode} index={10} />
            <NavRow icon={UserPlus} label="Invite people" disabled={!activeProject || !onInvite} onClick={onInvite} index={11} />
            <NavRow icon={Github} label="Connect GitHub" disabled={!activeProject} onClick={() => openWorkspaceTab('development')} index={12}
              activeOverride={localTab === 'jira' && workspaceTab === 'development'} />
          </Section>
        </div>

        {/* Bottom: settings + user */}
        <div className={`flex flex-col gap-px ${collapsed ? 'px-2' : 'px-3'} pb-4 pt-2 min-w-0 border-t border-hairline-soft`}>
          <ModeToggle />
          <NavRow id="settings" icon={Settings} label="Settings" index={13} />
          <button
            onClick={() => navigate('settings')}
            title="Account"
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2 rounded-lg hover:bg-ink/[0.04] transition-colors group`}
          >
            <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover bg-surface-strong border border-hairline shrink-0" />
            {!collapsed && (
              <div className="text-left leading-tight min-w-0">
                <p className="text-[13px] text-ink truncate group-hover:text-primary transition-colors">{user.name}</p>
                <p className="text-[11.5px] text-muted truncate">{user.handle}</p>
              </div>
            )}
          </button>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} title="Collapse sidebar"
              className="self-start mt-1 px-2.5 py-1 rounded-md text-[11.5px] text-muted-soft hover:text-ink hover:bg-ink/[0.04] transition-colors">
              ‹ Collapse
            </button>
          )}
        </div>
          </>
        )}
      </motion.aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-hairline bg-canvas/80 backdrop-blur-sm flex items-center justify-end px-8 z-40 sticky top-0">
          {/* Right Actions */}
          <div className="flex items-center gap-5">
            {/* Command Palette trigger */}
            <button
              onClick={onOpenCommandPalette}
              className="hidden md:flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-md border border-hairline-strong bg-surface-card text-muted hover:text-ink hover:border-primary/50 transition-all duration-300 group"
              title="Command Palette (Ctrl+K)"
            >
              <Search size={15} className="group-hover:text-primary transition-colors" />
              <span className="text-[13px]">Jump to…</span>
              <kbd className="text-[10px] font-mono bg-surface-strong border border-hairline rounded px-1.5 py-0.5 text-muted-soft">Ctrl K</kbd>
            </button>

            {showNewTask && (
              <button
                onClick={onAddTask}
                disabled={!activeProject}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-300
                  ${activeProject ? 'bg-primary text-on-primary hover:bg-primary-active cursor-pointer' : 'bg-surface-strong border border-hairline text-muted-soft cursor-not-allowed'}`}
              >
                <Plus size={18} />
                <span className="hidden sm:inline">New Task</span>
              </button>
            )}

            {activeProject && (
              <button
                onClick={() => setIsHUDOpen(!isHUDOpen)}
                className={`p-2 rounded-md transition-all duration-300 ${isHUDOpen ? 'bg-surface-strong text-primary' : 'text-muted hover:text-ink hover:bg-canvas-soft'}`}
                title="Toggle Project Resources"
              >
                <PanelRight size={20} />
              </button>
            )}

            <button
              onClick={() => setIsAlertsPanelOpen(prev => !prev)}
              className={`relative transition-all duration-300 hover:scale-110 ${alertCounts.total > 0 ? 'text-error' : 'text-muted hover:text-ink'}`}
            >
              {alertCounts.overdue > 0 && (
                <span className="absolute -inset-2 rounded-full border border-error/30 animate-ping opacity-60 pointer-events-none"></span>
              )}
              <Bell size={20} />
              {alertCounts.total > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-error text-white text-[9px] font-black rounded-full">
                  {alertCounts.total > 9 ? '9+' : alertCounts.total}
                </span>
              ) : (
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        {/* Overdue Alerts Panel */}
        <OverdueAlertsPanel
          isOpen={isAlertsPanelOpen}
          onClose={() => setIsAlertsPanelOpen(false)}
          tasks={tasks}
          onViewTask={onViewTask}
        />

        {/* Page Content Scrollable Area */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative ${activeTab === 'ai' || activeTab === 'jira' ? '' : 'p-8'}`}>
          {/* Background dot grid — warm ink, very subtle */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(#26251e 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          {/* HUD Component */}
          {activeProject && onUpdateProject && (
            <ProjectHUD
              isOpen={isHUDOpen}
              onClose={() => setIsHUDOpen(false)}
              project={activeProject}
              onUpdateProject={onUpdateProject}
            />
          )}

          {/* Content Wrapper */}
          <div key={activeTab} className="relative z-10 max-w-full h-full animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
