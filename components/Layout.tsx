
import React, { useState, useMemo } from 'react';
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
  BrainCircuit
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
  activeProject,
  onUpdateProject,
  user,
  tasks,
  onViewTask
}) => {
  const [isHUDOpen, setIsHUDOpen] = useState(false);
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false);

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

  const NavItem = ({ id, icon: Icon, label, disabled = false, onClick, special = false }: { id?: string; icon: any; label: string; disabled?: boolean; onClick?: () => void; special?: boolean }) => {
    const isActive = activeTab === id;

    const base = 'group relative flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-300 mb-3';
    const variant = special
      ? 'bg-ink text-canvas hover:opacity-90'
      : isActive
        ? 'bg-primary text-on-primary'
        : disabled
          ? 'text-muted-soft cursor-not-allowed'
          : 'text-muted hover:text-ink hover:bg-canvas-soft';

    return (
      <button
        onClick={() => {
          if (onClick) onClick();
          else if (id && !disabled) setActiveTab(id);
        }}
        disabled={disabled}
        className={`${base} ${variant}`}
      >
        <Icon size={22} strokeWidth={isActive || special ? 2.4 : 2} />

        {/* Tooltip */}
        {!disabled && (
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-ink border border-ink rounded-md text-[13px] text-canvas font-medium whitespace-nowrap opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none z-50">
            {label}
            <div className="absolute top-1/2 -left-1 -mt-1 border-[4px] border-transparent border-r-ink border-b-ink transform rotate-45"></div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-canvas text-ink font-sans overflow-hidden selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-20 bg-surface-card border-r border-hairline flex flex-col items-center py-6 z-50">
        {/* Brand mark */}
        <div className="mb-6 w-9 h-9 rounded-md bg-primary flex items-center justify-center">
          <span className="w-3 h-3 rounded-[3px] bg-on-primary" />
        </div>

        {/* Nav Items */}
        <div className="flex-1 w-full flex flex-col items-center">
          <NavItem id="projects" icon={FolderOpen} label="Projects" />
          <div className="w-8 h-px bg-hairline my-3"></div>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" disabled={!activeProject} />
          <NavItem id="kanban" icon={KanbanSquare} label="Kanban Board" disabled={!activeProject} />
          <NavItem id="timeline" icon={CalendarDays} label="Timeline" disabled={!activeProject} />
          <NavItem id="ai" icon={BrainCircuit} label="AI Manager" disabled={!activeProject} />

          <div className="mt-3">
            <NavItem icon={Zap} label="Focus Mode" disabled={!activeProject} onClick={onOpenFocusMode} special={true} />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto">
          <NavItem id="settings" icon={Settings} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-20 border-b border-hairline bg-canvas/80 backdrop-blur-sm flex items-center justify-between px-8 z-40 sticky top-0">
          {/* Search */}
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            {activeTab === 'kanban' && (
              <div className="relative w-full group animate-fade-in">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors duration-300" size={19} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeProject ? `Search in ${activeProject.name}...` : 'Search projects...'}
                  className="w-full bg-surface-card border border-hairline-strong rounded-md py-2.5 pl-12 pr-4 text-sm text-ink placeholder-muted-soft focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                />
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-5">
            {activeTab === 'kanban' && (
              <div className="flex items-center gap-5 animate-fade-in">
                <button
                  onClick={onAddTask}
                  disabled={!activeProject}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-300
                        ${activeProject
                      ? 'bg-primary text-on-primary hover:bg-primary-active cursor-pointer'
                      : 'bg-surface-strong border border-hairline text-muted-soft cursor-not-allowed'}`}
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">New Task</span>
                </button>
                <div className="w-px h-8 bg-hairline"></div>
              </div>
            )}

            {/* HUD Toggle */}
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

            <div
              className="flex items-center gap-3 pl-2 cursor-pointer group"
              onClick={() => setActiveTab('settings')}
            >
              <div className="text-right hidden md:block">
                <div className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">{user.name}</div>
                <div className="text-xs text-muted">{user.handle}</div>
              </div>
              <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full border border-hairline-strong group-hover:border-primary transition-all duration-300" />
            </div>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 scroll-smooth relative">
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
