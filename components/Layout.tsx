
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
  ChevronsRight
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
}

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
  onViewTask
}) => {
  const [isHUDOpen, setIsHUDOpen] = useState(false);
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // The sidebar highlights from this local mirror so the sliding pill moves
  // INSTANTLY; the heavy page swap is deferred via startTransition so it can't
  // block the indicator animation.
  const [localTab, setLocalTab] = useState(activeTab);
  useEffect(() => { setLocalTab(activeTab); }, [activeTab]);
  const navigate = (id: string) => {
    setLocalTab(id);                            // urgent: pill slides now
    startTransition(() => setActiveTab(id));    // deferred: page mounts after
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

  // ── SnowUI-style nav row: rounded pill, icon + label, sliding active bg ────
  const NavRow = ({ id, icon: Icon, label, disabled = false, onClick, index = 0 }:
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
        {/* sliding active pill */}
        {isActive && (
          <motion.span
            layoutId="nav-active"
            className="absolute inset-0 rounded-2xl bg-ink/[0.05]"
            transition={{ type: 'spring', stiffness: 520, damping: 40 }}
          />
        )}
        {/* active accent bar (brand orange) */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary z-10" />
        )}
        <Icon size={20} strokeWidth={isActive ? 2.4 : 2} className={`relative z-10 shrink-0 ${isActive ? 'text-primary' : ''}`} />
        {!collapsed && <span className="relative z-10 truncate">{label}</span>}
      </motion.button>
    );
  };

  const Caption = ({ children }: { children: React.ReactNode }) =>
    collapsed ? <div className="h-2" /> : (
      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-soft">{children}</p>
    );

  return (
    <div className="flex min-h-screen bg-canvas text-ink font-sans overflow-hidden selection:bg-primary/20">
      {/* ── Sidebar (SnowUI style) ──────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 212 }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="shrink-0 h-screen bg-surface-card border-r border-hairline flex flex-col justify-between py-7 px-4 z-50 overflow-hidden"
      >
        {/* Top: brand + nav */}
        <div className="flex flex-col gap-1 min-w-0">
          {/* Brand */}
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

          <Caption>Menu</Caption>
          <NavRow id="projects" icon={FolderOpen} label="Projects" index={0} />
          <NavRow id="dashboard" icon={LayoutDashboard} label="Dashboard" disabled={!activeProject} index={1} />
          <NavRow id="kanban" icon={KanbanSquare} label="Kanban" disabled={!activeProject} index={2} />
          <NavRow id="timeline" icon={CalendarDays} label="Timeline" disabled={!activeProject} index={3} />
          <NavRow id="canvas" icon={Presentation} label="Space" disabled={!activeProject} index={4} />
          <NavRow id="ai" icon={BrainCircuit} label="AI Manager" disabled={!activeProject} index={5} />

          <Caption>Focus</Caption>
          <NavRow icon={Zap} label="Focus Mode" disabled={!activeProject} onClick={onOpenFocusMode} index={6} />
        </div>

        {/* Bottom: settings + user */}
        <div className="flex flex-col gap-1 min-w-0">
          <NavRow id="settings" icon={Settings} label="Settings" index={6} />
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
      </motion.aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {/* Top Bar */}
        <header className="h-20 border-b border-hairline bg-canvas/80 backdrop-blur-sm flex items-center justify-between px-8 z-40 sticky top-0">
          {/* Title / breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[15px] font-semibold text-ink truncate">
              {activeProject ? activeProject.name : 'DevTracker'}
            </span>
            {activeProject && (
              <span className="text-[12px] font-medium text-muted bg-surface-strong px-2 py-0.5 rounded-full">{activeProject.key}</span>
            )}
          </div>

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

            {activeTab === 'kanban' && (
              <div className="relative w-full max-w-xs group animate-fade-in">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors duration-300" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full bg-surface-card border border-hairline-strong rounded-md py-2 pl-11 pr-4 text-sm text-ink placeholder-muted-soft focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                />
              </div>
            )}

            {activeTab === 'kanban' && (
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
        <div className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative ${activeTab === 'ai' ? '' : 'p-8'}`}>
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
