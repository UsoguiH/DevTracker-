
import React, { useState } from 'react';
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
import { User, Project } from '../types';
import ProjectHUD from './ProjectHUD';

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
  user
}) => {
  const [isHUDOpen, setIsHUDOpen] = useState(false);
  
  const NavItem = ({ id, icon: Icon, label, disabled = false, onClick, special = false }: { id?: string; icon: any; label: string; disabled?: boolean; onClick?: () => void; special?: boolean }) => {
    const isActive = activeTab === id;
    
    return (
      <button
        onClick={() => {
          if (onClick) {
            onClick();
          } else if (id && !disabled) {
            setActiveTab(id);
          }
        }}
        disabled={disabled}
        className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] mb-4
          ${special ? 'bg-white text-black hover:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : ''}
          ${!special && isActive 
            ? 'bg-primary text-black shadow-[0_0_25px_rgba(209,244,95,0.4)] scale-110' 
            : !special && disabled 
              ? 'text-gray-700 cursor-not-allowed' 
              : !special && 'text-gray-400 hover:text-white hover:bg-white/10 hover:scale-105'}`}
      >
        <Icon size={24} strokeWidth={isActive || special ? 2.5 : 2} />
        
        {/* Tooltip */}
        {!disabled && (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-surface-highlight border border-border rounded-lg text-sm text-white font-medium whitespace-nowrap opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none z-50 shadow-xl backdrop-blur-md">
            {label}
            {/* Arrow Tip */}
            <div className="absolute top-1/2 -left-1 -mt-1 border-[4px] border-transparent border-r-surface-highlight/50 border-b-surface-highlight/50 transform rotate-45"></div>
            </div>
        )}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-background text-gray-100 font-sans overflow-hidden selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-20 bg-surface/80 backdrop-blur-xl border-r border-border flex flex-col items-center py-8 z-50 shadow-2xl transition-all duration-300">
        {/* Nav Items */}
        <div className="flex-1 w-full flex flex-col items-center mt-4">
           <NavItem id="projects" icon={FolderOpen} label="Projects" />
           <div className="w-8 h-px bg-border/50 my-4"></div>
           <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" disabled={!activeProject} />
           <NavItem id="kanban" icon={KanbanSquare} label="Kanban Board" disabled={!activeProject} />
           <NavItem id="timeline" icon={CalendarDays} label="Timeline" disabled={!activeProject} />
           <NavItem id="ai" icon={BrainCircuit} label="AI Manager" disabled={!activeProject} />
           
           <div className="mt-4">
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
        <header className="h-20 border-b border-border bg-background/60 backdrop-blur-xl flex items-center justify-between px-8 z-40 transition-all duration-300 sticky top-0">
           {/* Search */}
           <div className="flex items-center gap-4 flex-1 max-w-xl">
              {activeTab === 'kanban' && (
                <div className="relative w-full group animate-fade-in">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors duration-300" size={20} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={activeProject ? `Search in ${activeProject.name}...` : "Search projects..."}
                      className="w-full bg-surface/50 border border-border/50 rounded-full py-2.5 pl-12 pr-4 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-surface transition-all duration-300"
                    />
                </div>
              )}
           </div>

           {/* Right Actions */}
           <div className="flex items-center gap-6">
              {activeTab === 'kanban' && (
                <div className="flex items-center gap-6 animate-fade-in">
                  <button 
                    onClick={onAddTask}
                    disabled={!activeProject}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 shadow-[0_0_15px_rgba(209,244,95,0.1)]
                        ${activeProject 
                            ? 'bg-primary text-black hover:opacity-90 hover:scale-105 hover:shadow-[0_0_20px_rgba(209,244,95,0.4)] cursor-pointer' 
                            : 'bg-surface border border-border text-gray-600 cursor-not-allowed'}`}
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">New Task</span>
                  </button>

                  <div className="w-px h-8 bg-border"></div>
                </div>
              )}

              {/* HUD Toggle */}
              {activeProject && (
                  <button 
                    onClick={() => setIsHUDOpen(!isHUDOpen)}
                    className={`p-2 rounded-full transition-all duration-300 ${isHUDOpen ? 'bg-surface-highlight text-primary shadow-[0_0_15px_rgba(209,244,95,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title="Toggle Project Resources"
                  >
                    <PanelRight size={20} />
                  </button>
              )}

              <button className="relative text-gray-400 hover:text-white transition-colors duration-300 hover:scale-110">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full shadow-[0_0_10px_rgba(255,159,69,0.8)]"></span>
              </button>

              <div 
                className="flex items-center gap-3 pl-2 cursor-pointer group" 
                onClick={() => setActiveTab('settings')}
              >
                 <div className="text-right hidden md:block">
                    <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.handle}</div>
                 </div>
                 <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full border border-border group-hover:border-primary transition-all duration-300 shadow-lg" />
              </div>
           </div>
        </header>

        {/* Page Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 scroll-smooth relative">
           {/* Background Grid Pattern */}
           <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
                style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
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
           <div key={activeTab} className="relative z-10 max-w-full h-full">
                {children}
           </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
