import React, { useState, useMemo } from 'react';
import { Filter, Download, MoreHorizontal, Database, Smartphone, Layout, Bug, Share2 } from 'lucide-react';
import { Task } from '../types';

interface TimelineProps {
    tasks: Task[];
}

const Timeline: React.FC<TimelineProps> = ({ tasks }) => {
  const [filter, setFilter] = useState<'All' | 'High' | 'In Progress'>('All');
  
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
    // Parse "YYYY-MM-DD" parts to avoid UTC shifting
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
            const duration = (t.durationDays || 1) * 24 * 60 * 60 * 1000;
            const end = start + duration;
            if(start < minTime) minTime = start;
            if(end > maxTime) maxTime = end;
        });

        // Add padding: 1 day before, 2 days after
        minTime -= (1 * 24 * 60 * 60 * 1000);
        maxTime += (2 * 24 * 60 * 60 * 1000);
    }

    const dates = [];
    let current = minTime;
    while(current <= maxTime) {
        dates.push(new Date(current));
        current += (24 * 60 * 60 * 1000);
    }

    return { dates, minTime, totalDuration: maxTime - minTime };
  }, [filteredTasks]);

  const getIcon = (title: string) => {
      const t = title.toLowerCase();
      if (t.includes('db') || t.includes('schema')) return <Database size={14} className="text-blue-500" />;
      if (t.includes('auth') || t.includes('api')) return <Smartphone size={14} className="text-secondary" />;
      if (t.includes('ui') || t.includes('design')) return <Layout size={14} className="text-black" />;
      if (t.includes('bug') || t.includes('fix')) return <Bug size={14} className="text-white" />;
      return <Share2 size={14} className="text-white" />;
  };

  const getTaskStyle = (task: Task, index: number) => {
      const start = normalizeDate(task.startDate).getTime();
      const duration = (task.durationDays || 1) * 24 * 60 * 60 * 1000;
      
      const offset = start - timelineData.minTime;
      // Calculate percentages relative to the total timeline duration
      const left = (offset / timelineData.totalDuration) * 100;
      const width = (duration / timelineData.totalDuration) * 100;

      const baseColors = [
          { bg: 'bg-primary', text: 'text-black', shadow: 'shadow-[0_4px_10px_rgba(209,244,95,0.2)]' },
          { bg: 'bg-secondary', text: 'text-black', shadow: 'shadow-[0_4px_10px_rgba(255,159,69,0.2)]' },
          { bg: 'bg-white', text: 'text-black', shadow: '' },
          { bg: 'bg-surface-highlight', text: 'text-white', shadow: '', border: 'border border-border' },
      ];

      const colorTheme = baseColors[index % baseColors.length];
      
      return {
          left: `${left}%`,
          width: `${width}%`,
          top: `${index * 60}px`,
          ...colorTheme
      };
  };

  const formatDateHeader = (date: Date) => {
     return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Min width logic: Ensure at least 60px per day column for readability
  const minContainerWidth = Math.max(800, timelineData.dates.length * 80);

  return (
    <div className="h-full flex flex-col">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-slide-up">
        <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide mb-1 text-white">Projects Timeline</h1>
            <p className="text-gray-400 text-sm">Manage development sprints & task dependencies</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-surface rounded-full p-1 border border-border">
                {(['All', 'High', 'In Progress'] as const).map((f) => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-surface-highlight text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
            
             <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black font-semibold hover:opacity-90 transition-opacity text-sm shadow-[0_0_15px_rgba(209,244,95,0.3)]">
                <Download size={14} />
                <span>Export</span>
            </button>
        </div>
       </div>

       <div className="flex-1 bg-surface rounded-3xl border border-border p-6 md:p-8 shadow-sm flex flex-col overflow-hidden relative animate-slide-up delay-100">
            <div className="flex justify-between items-center mb-8">
                <h2 className="font-bold text-lg tracking-wide text-white">TIMELINE VIEW</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(209,244,95,0.5)]"></span>
                        <span className="text-gray-400">Low/Med</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(255,159,69,0.5)]"></span>
                        <span className="text-gray-400">High</span>
                    </div>
                    <button className="ml-2 text-gray-400 hover:text-white transition-colors">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="relative flex-1 w-full overflow-x-auto custom-scrollbar">
                <div style={{ minWidth: `${minContainerWidth}px` }} className="h-full relative">
                    
                    {/* Background Grid Lines & Headers */}
                     <div className="absolute inset-0 grid pointer-events-none z-0" style={{ gridTemplateColumns: `repeat(${timelineData.dates.length}, 1fr)` }}>
                        {timelineData.dates.map((date, i) => (
                             <div key={i} className="border-r border-dashed border-gray-800 h-full relative">
                                {/* Date Header */}
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-500 font-bold whitespace-nowrap">
                                    {formatDateHeader(date)}
                                </div>
                             </div>
                        ))}
                    </div>

                    {/* Tasks Container */}
                    <div className="relative h-full pt-4 pb-20 overflow-y-auto custom-scrollbar">
                        {filteredTasks.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                                <p>No tasks found for this period.</p>
                            </div>
                        ) : (
                            filteredTasks.map((task, idx) => {
                                const style = getTaskStyle(task, idx);
                                return (
                                    <div 
                                        key={task.id}
                                        style={{ left: style.left, width: style.width, top: style.top }}
                                        className={`absolute h-10 rounded-full flex items-center px-3 justify-between group cursor-pointer hover:scale-[1.01] hover:z-20 transition-all z-10 ${style.bg} ${style.text} ${style.shadow} ${style.border || ''}`}
                                    >
                                        <div className="w-6 h-6 bg-black/10 rounded-full flex items-center justify-center shrink-0">
                                            {getIcon(task.title)}
                                        </div>
                                        <span className="text-xs font-bold ml-2 truncate flex-1">{task.title}</span>
                                        <span className="text-[10px] font-bold bg-black/10 px-1.5 py-0.5 rounded-full ml-auto whitespace-nowrap hidden sm:inline-block">
                                            {task.durationDays}d
                                        </span>
                                        
                                        {/* Tooltip on Hover */}
                                        <div className="absolute top-[-50px] left-1/2 transform -translate-x-1/2 bg-surface-highlight border border-border px-3 py-2 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl flex flex-col gap-1 items-center">
                                            <div className="font-bold">{task.title}</div>
                                            <div className="text-[10px] text-gray-400">
                                                {normalizeDate(task.startDate).toLocaleDateString()} • {task.durationDays} Days
                                            </div>
                                            <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-highlight border-b border-r border-border transform rotate-45"></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {/* Spacer for bottom scrolling */}
                        <div style={{ top: `${filteredTasks.length * 60 + 40}px` }} className="absolute w-full h-10"></div>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex justify-between items-center border-t border-border pt-4">
                 <div className="text-xs font-mono text-gray-400">
                    Total Tasks: <span className="text-white font-bold">{filteredTasks.length}</span>
                </div>
                <div className="text-[10px] text-gray-500">
                    {new Date(timelineData.minTime + (1 * 24 * 60 * 60 * 1000)).toLocaleDateString()} - {new Date(timelineData.minTime + timelineData.totalDuration - (2 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                </div>
            </div>
       </div>
    </div>
  );
};

export default Timeline;
