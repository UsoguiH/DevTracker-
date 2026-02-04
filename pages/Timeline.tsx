import React, { useState, useMemo, useEffect } from 'react';
import { Filter, Download, Database, Smartphone, Layout, Bug, Share2, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { Task } from '../types';

interface TimelineProps {
    tasks: Task[];
}

const Timeline: React.FC<TimelineProps> = ({ tasks }) => {
  const [filter, setFilter] = useState<'All' | 'High' | 'In Progress'>('All');
  const [isMounted, setIsMounted] = useState(false);

  // Trigger animation on mount for the "fluid" fill effect
  useEffect(() => {
      const timer = setTimeout(() => setIsMounted(true), 100);
      return () => clearTimeout(timer);
  }, []);
  
  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
        if (filter === 'All') return true;
        if (filter === 'High') return t.priority === 'High';
        if (filter === 'In Progress') return t.status === 'In Progress';
        return true;
    });
  }, [tasks, filter]);

  // Helper: Normalize date string to local midnight
  const normalizeDate = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date(new Date().setHours(0,0,0,0));
    const parts = dateStr.split('-');
    if(parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    }
    return new Date(new Date(dateStr).setHours(0,0,0,0));
  };

  // Calculate Dates Logic
  const timelineData = useMemo(() => {
    let minTime = Infinity;
    let maxTime = -Infinity;

    if (filteredTasks.length === 0) {
        const today = new Date();
        today.setHours(0,0,0,0);
        // Default view: 2 weeks
        minTime = today.getTime();
        maxTime = today.getTime() + (14 * 24 * 60 * 60 * 1000);
    } else {
        filteredTasks.forEach(t => {
            const start = normalizeDate(t.startDate).getTime();
            let end;
            if (t.endDate) {
                 end = normalizeDate(t.endDate).getTime() + (24 * 60 * 60 * 1000);
            } else {
                 const duration = (t.durationDays || 1) * 24 * 60 * 60 * 1000;
                 end = start + duration;
            }
            
            if(start < minTime) minTime = start;
            if(end > maxTime) maxTime = end;
        });

        // Add padding
        minTime -= (2 * 24 * 60 * 60 * 1000);
        maxTime += (4 * 24 * 60 * 60 * 1000);
    }

    const dates = [];
    let current = minTime;
    while(current <= maxTime) {
        dates.push(new Date(current));
        current += (24 * 60 * 60 * 1000);
    }

    return { dates, minTime, totalDuration: maxTime - minTime };
  }, [filteredTasks]);

  const getIcon = (title: string, textColorClass: string) => {
      const t = title.toLowerCase();
      // Adjust icon color based on background contrast needs
      const iconClass = `${textColorClass} drop-shadow-sm opacity-90`; 
      
      if (t.includes('db') || t.includes('schema')) return <Database size={16} className={iconClass} />;
      if (t.includes('auth') || t.includes('api')) return <Smartphone size={16} className={iconClass} />;
      if (t.includes('ui') || t.includes('design')) return <Layout size={16} className={iconClass} />;
      if (t.includes('bug') || t.includes('fix')) return <Bug size={16} className={iconClass} />;
      return <Share2 size={16} className={iconClass} />;
  };

  const getTaskStyle = (task: Task, index: number) => {
      const start = normalizeDate(task.startDate).getTime();
      let duration;
      
      if (task.endDate) {
          const end = normalizeDate(task.endDate).getTime();
          duration = (end - start) + (24 * 60 * 60 * 1000);
      } else {
          duration = (task.durationDays || 1) * 24 * 60 * 60 * 1000;
      }
      
      const offset = start - timelineData.minTime;
      const left = (offset / timelineData.totalDuration) * 100;
      const width = (duration / timelineData.totalDuration) * 100;

      // Status-based coloring to match Kanban
      let bgClass = '';
      let textClass = '';
      let badgeBg = '';
      let badgeText = '';

      switch (task.status) {
        case 'To Do':
            bgClass = 'bg-zinc-600'; // Gray
            textClass = 'text-white';
            badgeBg = 'bg-black/40';
            badgeText = 'text-white';
            break;
        case 'In Progress':
            bgClass = 'bg-blue-500'; // Blue
            textClass = 'text-white';
            badgeBg = 'bg-black/20';
            badgeText = 'text-white';
            break;
        case 'Testing':
            bgClass = 'bg-[#FF9F45]'; // Secondary (Orange)
            textClass = 'text-white';
            badgeBg = 'bg-black/20';
            badgeText = 'text-white';
            break;
        case 'Done':
            bgClass = 'bg-[#D1F45F]'; // Primary (Lime)
            textClass = 'text-black'; // Black text on bright lime
            badgeBg = 'bg-black/80';
            badgeText = 'text-[#D1F45F]';
            break;
        default:
            bgClass = 'bg-zinc-700';
            textClass = 'text-white';
            badgeBg = 'bg-black/40';
            badgeText = 'text-white';
      }
      
      return {
          left: `${left}%`,
          width: `${width}%`,
          top: `${index * 72 + 20}px`,
          bgClass,
          textClass,
          badgeBg,
          badgeText
      };
  };

  const formatDay = (date: Date) => {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  const formatDateNum = (date: Date) => {
      return date.getDate().toString();
  };

  const minContainerWidth = Math.max(800, timelineData.dates.length * 90);

  return (
    <div className="h-full flex flex-col">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 animate-slide-up">
        <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide mb-1 text-white">Project Timeline</h1>
            <p className="text-gray-400 text-sm">Visual roadmap of your development journey</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-surface-highlight/50 backdrop-blur-md rounded-full p-1 border border-white/5">
                {(['All', 'High', 'In Progress'] as const).map((f) => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${filter === f ? 'bg-primary text-black shadow-[0_0_15px_rgba(209,244,95,0.3)] scale-105' : 'text-gray-400 hover:text-white'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
            
             <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C1C1E] border border-white/10 text-white font-semibold hover:bg-[#2C2C2E] transition-all text-sm group">
                <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Export PDF</span>
            </button>
        </div>
       </div>

       <div className="flex-1 bg-[#050505] rounded-[32px] border border-white/10 flex flex-col overflow-hidden relative animate-slide-up delay-100 shadow-2xl">
            {/* Timeline Header Row */}
            <div className="w-full overflow-x-auto custom-scrollbar flex-1 relative flex flex-col">
                <div style={{ minWidth: `${minContainerWidth}px` }} className="h-full relative flex flex-col">
                    
                    {/* Header Row */}
                    <div className="flex border-b border-white/10 bg-[#121212]/80 backdrop-blur-xl sticky top-0 z-30 h-16 shadow-sm">
                        {timelineData.dates.map((date, i) => {
                            const isToday = new Date().toDateString() === date.toDateString();
                            return (
                                <div key={i} className={`flex-1 min-w-[90px] flex flex-col items-center justify-center relative border-r border-white/5 ${isToday ? 'bg-white/5' : ''}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isToday ? 'text-primary' : 'text-gray-500'}`}>
                                        {formatDay(date)}
                                    </span>
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-primary text-black shadow-[0_0_10px_rgba(209,244,95,0.4)]' : 'text-gray-300'}`}>
                                        {formatDateNum(date)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Main Grid Area */}
                    <div className="flex-1 relative bg-[#090909]">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none z-0">
                            {timelineData.dates.map((_, i) => (
                                <div key={i} className="flex-1 border-r border-dashed border-white/5 min-w-[90px] h-full"></div>
                            ))}
                        </div>

                        {/* Current Time Indicator Line */}
                        <div className="absolute top-0 bottom-0 w-px bg-primary z-20 shadow-[0_0_8px_rgba(209,244,95,0.5)] pointer-events-none" 
                             style={{ left: `${((new Date().getTime() - timelineData.minTime) / timelineData.totalDuration) * 100}%` }}>
                             <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rounded-full shadow-sm"></div>
                        </div>

                        {/* Tasks Container */}
                        <div className="relative w-full h-full py-4">
                             {filteredTasks.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                                    <CalendarIcon size={48} className="mb-4 opacity-20" />
                                    <p className="text-lg font-medium">No tasks found</p>
                                    <p className="text-sm opacity-50">Try adjusting the filters or adding tasks with dates.</p>
                                </div>
                            ) : (
                                filteredTasks.map((task, idx) => {
                                    const style = getTaskStyle(task, idx);
                                    const progress = task.progress || 0;
                                    
                                    return (
                                        <div 
                                            key={task.id}
                                            style={{ left: style.left, width: style.width, top: style.top }}
                                            className="absolute h-12 flex items-center group z-10 hover:z-50 px-1"
                                        >
                                            {/* The Bar Container (Solid, No Texture) */}
                                            <div className="w-full h-full rounded-full bg-[#1C1C1E] border border-white/10 overflow-hidden relative shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.01] cursor-pointer">
                                                
                                                {/* Progress Fill (Dynamic Status Color) */}
                                                <div 
                                                    className={`absolute left-0 top-0 bottom-0 ${style.bgClass} transition-all duration-[1500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${progress < 100 ? 'rounded-l-full' : 'rounded-full'}`}
                                                    style={{ width: isMounted ? `${Math.max(progress, 2)}%` : '0%' }}
                                                >
                                                    {/* Minimal highlight on the very edge for clarity of position */}
                                                    {progress > 0 && progress < 100 && (
                                                        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50"></div>
                                                    )}
                                                </div>

                                                {/* Content Layer */}
                                                <div className="absolute inset-0 flex items-center justify-between px-4 z-20 pointer-events-none">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/5 ${style.textClass === 'text-black' ? 'bg-black/10' : 'bg-black/20'}`}>
                                                            {getIcon(task.title, style.textClass)}
                                                        </div>
                                                        <span className={`text-sm font-bold truncate tracking-tight ${style.textClass}`}>
                                                            {task.title}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Percentage Pill */}
                                                    <div className="flex items-center pl-2 shrink-0">
                                                        <div className={`text-[10px] font-black ${style.badgeBg} ${style.badgeText} backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10 shadow-sm flex items-center gap-1`}>
                                                            {progress}%
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Apple-style Hover Popover (Positioned Bottom) */}
                                            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#1C1C1E] border border-white/10 px-5 py-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none scale-90 group-hover:scale-100 z-50 min-w-[200px] flex flex-col gap-1 backdrop-blur-xl">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-white text-sm truncate max-w-[120px]">{task.title}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${task.priority === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'}`}>{task.priority}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-gray-400">
                                                    <div className="flex items-center gap-1">
                                                         <CalendarIcon size={10} />
                                                         <span>{normalizeDate(task.startDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                                    </div>
                                                    <ChevronRight size={10} className="text-gray-600" />
                                                    <span>{task.endDate ? normalizeDate(task.endDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '...'}</span>
                                                </div>
                                                {/* Triangle Arrow (Pointing Up) */}
                                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1C1C1E] border-t border-l border-white/10 rotate-45 shadow-lg"></div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div style={{ height: `${filteredTasks.length * 72 + 100}px` }} className="w-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Stats */}
            <div className="flex justify-between items-center px-8 py-4 border-t border-white/10 bg-[#121212] text-xs font-medium backdrop-blur-md">
                 <div className="flex items-center gap-6">
                    <span className="text-gray-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#D1F45F]"></div>
                        {filteredTasks.length} Active Tasks
                    </span>
                    <span className="text-gray-400 flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-white/20"></div>
                         {Math.round(filteredTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / (filteredTasks.length || 1))}% Completion
                    </span>
                </div>
                <div className="text-gray-500 font-mono">
                    <span className="text-gray-300">{new Date(timelineData.minTime).toLocaleDateString()}</span>
                    <span className="mx-2 text-gray-600">——</span>
                    <span className="text-gray-300">{new Date(timelineData.minTime + timelineData.totalDuration).toLocaleDateString()}</span>
                </div>
            </div>
       </div>
    </div>
  );
};

export default Timeline;