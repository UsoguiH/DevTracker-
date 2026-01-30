import React, { useMemo } from 'react';
import { 
  MoreHorizontal, 
  CalendarClock, 
  Users, 
  ChevronDown, 
  SlidersHorizontal,
  Rocket,
  Wrench,
  FileCode2,
  Palette,
  MessageSquare,
  Share2,
  CheckCircle2,
  Bug,
  Activity
} from 'lucide-react';
import { Task, Project } from '../types';

interface DashboardProps {
  tasks: Task[];
  project?: Project;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, project }) => {
  // Dynamic Calculations based on REAL data
  const stats = useMemo(() => {
    const total = tasks.length || 0;
    
    // Status Counts
    const done = tasks.filter(t => t.status === 'Done').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const testing = tasks.filter(t => t.status === 'Testing').length;
    const todo = tasks.filter(t => t.status === 'To Do').length;

    // "Bug" logic: Check tag objects for name 'bug'
    const bugs = tasks.filter(t => t.tags.some(tag => tag.name.toLowerCase().includes('bug'))).length;
    
    // Percentages
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const bugRate = total > 0 ? Math.round((bugs / total) * 100) : 0;
    
    // Sort upcoming tasks by due date (only showing those with dates)
    const upcoming = tasks
        .filter(t => t.status !== 'Done' && t.dueDate)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 7);

    // Project Age Calculation
    const daysActive = project 
        ? Math.max(0, Math.floor((new Date().getTime() - new Date(project.createdAt).getTime()) / (1000 * 3600 * 24)))
        : 0;
    
    // Unique Assignees (Team Size)
    const uniqueAssignees = new Set(tasks.flatMap(t => t.assignees.map(u => u.id))).size;

    // Status Distribution Data for Chart
    const statusData = [
        { label: 'To Do', count: todo, color: 'bg-zinc-600', textColor: 'text-zinc-400' },
        { label: 'In Progress', count: inProgress, color: 'bg-primary', textColor: 'text-primary' },
        { label: 'Testing', count: testing, color: 'bg-secondary', textColor: 'text-secondary' },
        { label: 'Done', count: done, color: 'bg-emerald-500', textColor: 'text-emerald-500' }
    ];
    
    const maxStatusCount = Math.max(...statusData.map(d => d.count), 1); // Avoid div by zero

    return { 
        total, 
        completionRate, 
        bugRate, 
        upcoming, 
        daysActive, 
        uniqueAssignees,
        statusData,
        maxStatusCount
    };
  }, [tasks, project]);

  const getTaskIcon = (title: string) => {
      const t = title.toLowerCase();
      if (t.includes('release') || t.includes('deploy')) return <Rocket size={14} />;
      if (t.includes('fix') || t.includes('bug')) return <Wrench size={14} />;
      if (t.includes('code') || t.includes('review')) return <FileCode2 size={14} />;
      if (t.includes('ui') || t.includes('design')) return <Palette size={14} />;
      if (t.includes('sync') || t.includes('meeting')) return <MessageSquare size={14} />;
      return <Share2 size={14} />;
  };

  const getTaskColor = (index: number) => {
      const colors = [
          'bg-primary shadow-primary/20', 
          'bg-secondary shadow-secondary/20', 
          'bg-white text-black border border-gray-200' 
      ];
      return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col h-full pb-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-end mb-6 gap-4 animate-slide-up">
            <div>
                <h1 className="text-4xl font-bold uppercase tracking-tight text-white">
                    {project ? project.name : 'DEVTRACK'}
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    {project ? project.description : 'Select a project to view statistics'}
                </p>
            </div>
            <div className="flex gap-3">
                <button className="px-4 py-2 bg-[#161616] rounded-full text-sm font-medium text-gray-300 border border-transparent hover:border-[#333] transition-all hover:scale-105 flex items-center gap-2">
                    Key: {project?.key || 'N/A'} <ChevronDown size={14} />
                </button>
                <button className="w-10 h-10 flex items-center justify-center bg-[#161616] rounded-full text-gray-300 hover:text-white transition-all hover:scale-110">
                    <SlidersHorizontal size={16} />
                </button>
            </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Card 1: Project Velocity (Real Data) */}
            <div className="col-span-1 lg:col-span-4 bg-[#161616] rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[280px] relative overflow-hidden animate-slide-up delay-100 hover:shadow-2xl transition-all duration-500 group">
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase">Project Velocity</h2>
                    <button className="text-gray-500 hover:text-white transition-colors"><MoreHorizontal size={20} /></button>
                </div>

                <div className="flex justify-around items-end h-full py-4 relative z-10">
                    {/* Completion Circle */}
                    <div className="text-center group-hover:scale-110 transition-transform duration-500">
                        <div className="text-primary text-xs font-bold mb-1 flex items-center justify-center gap-1">
                             <CheckCircle2 size={12} /> {stats.completionRate}%
                        </div>
                        <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path className="text-[#2C2C2C]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                <path className="text-primary transition-all duration-1000 ease-out" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${stats.completionRate}, 100`} strokeWidth="3"></path>
                            </svg>
                            <span className="absolute text-2xl font-bold text-white">{stats.completionRate}%</span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-gray-400">Completion</p>
                    </div>

                    {/* Bug Circle */}
                    <div className="text-center group-hover:scale-110 transition-transform duration-500 delay-100">
                        <div className="text-secondary text-xs font-bold mb-1 flex items-center justify-center gap-1">
                            <Bug size={12} /> {stats.bugRate}%
                        </div>
                        <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path className="text-[#2C2C2C]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                <path className="text-secondary transition-all duration-1000 ease-out" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${stats.bugRate}, 100`} strokeWidth="3"></path>
                            </svg>
                            <span className="absolute text-2xl font-bold text-white">{stats.bugRate}%</span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-gray-400">Bug Rate</p>
                    </div>
                </div>

                {/* Decorative Wave at bottom */}
                <div className="h-12 w-full absolute bottom-0 left-0 right-0 opacity-20 pointer-events-none">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                        <path d="M0 15 Q 20 18, 40 10 T 80 12 T 100 5" fill="none" stroke="#D1F45F" strokeWidth="2"></path>
                        <path d="M0 10 Q 25 5, 50 12 T 100 15" fill="none" opacity="0.7" stroke="#FF9F45" strokeWidth="2"></path>
                    </svg>
                </div>
            </div>

            {/* Card 2: Project Insights (Replacing Mock Repo Stats) */}
            <div className="col-span-1 lg:col-span-3 bg-[#161616] rounded-3xl p-6 shadow-xl flex flex-col min-h-[280px] animate-slide-up delay-200 hover:shadow-2xl transition-all duration-500">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase">Project Insights</h2>
                    <button className="text-gray-500 hover:text-white transition-colors"><MoreHorizontal size={20} /></button>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-6">
                    <div className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-[#2C2C2C] flex items-center justify-center text-secondary group-hover:scale-125 transition-transform duration-300">
                            <CalendarClock size={20} fill="currentColor" className="text-secondary/50" strokeWidth={2} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-white group-hover:text-secondary transition-colors">{stats.daysActive}</div>
                            <div className="text-xs text-gray-400">Days Active</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-[#2C2C2C] flex items-center justify-center text-primary group-hover:scale-125 transition-transform duration-300">
                            <Users size={20} className="text-primary" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-white group-hover:text-primary transition-colors">{stats.uniqueAssignees}</div>
                            <div className="text-xs text-gray-400">Active Contributors</div>
                        </div>
                    </div>
                </div>

                {/* Activity Dots Decorative */}
                <div className="grid grid-cols-8 gap-2 mt-4 opacity-50">
                    {Array.from({length: 16}).map((_, i) => (
                        <div 
                            key={i} 
                            className={`w-2 h-2 rounded-full transition-all duration-500 hover:scale-150 ${[0,2,5,7,8,10,13,15].includes(i) ? (i % 3 === 0 ? 'bg-primary' : 'bg-secondary') : 'bg-[#333]'}`} 
                        />
                    ))}
                </div>
            </div>

            {/* Card 3: Upcoming Deadlines (Real Data) */}
            <div className="col-span-1 lg:col-span-5 lg:row-span-2 bg-[#161616] rounded-3xl p-6 shadow-xl flex flex-col overflow-hidden animate-slide-up delay-300 hover:shadow-2xl transition-all duration-500">
                <div className="flex justify-between items-start mb-8">
                    <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase">Upcoming Deadlines</h2>
                    <button className="text-gray-500 hover:text-white transition-colors"><MoreHorizontal size={20} /></button>
                </div>

                <div className="flex-1 relative">
                    {/* Vertical Dashed Lines Background */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none px-4">
                        {[1,2,3,4,5].map(i => <div key={i} className="border-r border-dashed border-[#333] h-full w-px"></div>)}
                    </div>

                    <div className="space-y-6 relative z-10 pt-2 h-[450px] overflow-y-auto custom-scrollbar pr-2">
                        {stats.upcoming.length > 0 ? (
                            stats.upcoming.map((task, idx) => {
                                const date = new Date(task.dueDate);
                                const dateStr = !isNaN(date.getTime()) 
                                    ? `${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, '0')}` 
                                    : 'N/A';
                                    
                                const isRightAligned = idx % 2 !== 0;
                                const width = ['w-[60%]', 'w-[50%]', 'w-[70%]', 'w-[55%]'][idx % 4];
                                const colorClass = getTaskColor(idx);
                                const textColor = colorClass.includes('bg-white') ? 'text-black' : 'text-black';
                                
                                return (
                                    <div key={task.id} className="flex items-center group animate-slide-up" style={{ animationDelay: `${400 + (idx * 100)}ms` }}>
                                        <span className="w-12 text-xs font-medium text-gray-400 mr-2 shrink-0">{dateStr}</span>
                                        <div className={`flex-1 flex ${isRightAligned ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`${colorClass} ${textColor} ${width} h-10 rounded-full flex items-center justify-between px-2 relative shadow-lg hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer ${isRightAligned ? 'mr-4' : 'ml-4'}`}>
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${colorClass.includes('bg-white') ? 'bg-gray-200' : 'bg-black/10'}`}>
                                                    {getTaskIcon(task.title)}
                                                </div>
                                                <span className="text-xs font-bold mr-2 truncate ml-2">{task.title}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                                <Activity size={32} className="opacity-20" />
                                <p className="text-sm">No upcoming deadlines found.</p>
                                <p className="text-xs opacity-50">Create tasks with due dates to see them here.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-center text-xs mt-6 pt-4 border-t border-[#333]">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full ring-2 ring-primary bg-black"></div>
                            <span className="text-gray-400">Low/Med</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full ring-2 ring-secondary bg-black"></div>
                            <span className="text-gray-400">High</span>
                        </div>
                    </div>
                    <button className="text-primary hover:underline">View Calendar</button>
                </div>
            </div>

            {/* Card 4: Task Distribution Chart (Bottom Left) */}
            <div className="col-span-1 lg:col-span-4 bg-[#161616] rounded-3xl p-6 shadow-xl flex flex-col justify-between animate-slide-up delay-400 hover:shadow-2xl transition-all duration-500">
                 <div className="flex justify-between items-start mb-4">
                    <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase">Status Distribution</h2>
                    <button className="text-gray-500 hover:text-white transition-colors"><MoreHorizontal size={20} /></button>
                </div>
                
                <div className="flex-1 flex flex-col justify-end space-y-4">
                     {stats.statusData.map((data, index) => (
                         <div key={data.label} className="group">
                             <div className="flex justify-between text-xs mb-1">
                                 <span className={`${data.textColor} font-bold`}>{data.label}</span>
                                 <span className="text-gray-400">{data.count}</span>
                             </div>
                             <div className="h-3 w-full bg-[#2C2C2C] rounded-full overflow-hidden">
                                 <div 
                                     className={`h-full ${data.color} rounded-full transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-80`} 
                                     style={{ width: `${(data.count / stats.maxStatusCount) * 100}%` }}
                                 ></div>
                             </div>
                         </div>
                     ))}
                </div>
            </div>

             {/* Card 5: Quick Tips / Info (Bottom Middle) */}
            <div className="col-span-1 lg:col-span-3 bg-gradient-to-br from-primary/20 to-[#161616] rounded-3xl p-6 shadow-xl flex flex-col justify-center items-center text-center animate-slide-up delay-500 border border-primary/10">
                <div className="w-12 h-12 bg-primary text-black rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(209,244,95,0.4)]">
                    <Rocket size={24} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Boost Productivity</h3>
                <p className="text-xs text-gray-300 mb-4">
                    Try breaking down large tasks into smaller, manageable sub-tasks to improve flow.
                </p>
                <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:scale-105 transition-transform">
                    Learn Methodology
                </button>
            </div>

        </div>
    </div>
  );
};

export default Dashboard;