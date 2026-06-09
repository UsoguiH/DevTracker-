import React, { useState, useMemo, useEffect } from 'react';
import { Download, Database, Smartphone, Layout, Bug, Share2, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { Task } from '../types';

interface TimelineProps {
    tasks: Task[];
}

const Timeline: React.FC<TimelineProps> = ({ tasks }) => {
  const [filter, setFilter] = useState<'All' | 'High' | 'In Progress'>('All');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
      const timer = setTimeout(() => setIsMounted(true), 100);
      return () => clearTimeout(timer);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
        if (filter === 'All') return true;
        if (filter === 'High') return t.priority === 'High';
        if (filter === 'In Progress') return t.status === 'In Progress';
        return true;
    });
  }, [tasks, filter]);

  const normalizeDate = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date(new Date().setHours(0,0,0,0));
    const parts = dateStr.split('-');
    if(parts.length === 3) return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    return new Date(new Date(dateStr).setHours(0,0,0,0));
  };

  const timelineData = useMemo(() => {
    let minTime = Infinity;
    let maxTime = -Infinity;

    if (filteredTasks.length === 0) {
        const today = new Date();
        today.setHours(0,0,0,0);
        minTime = today.getTime();
        maxTime = today.getTime() + (14 * 24 * 60 * 60 * 1000);
    } else {
        filteredTasks.forEach(t => {
            const start = normalizeDate(t.startDate).getTime();
            let end;
            if (t.endDate) end = normalizeDate(t.endDate).getTime() + (24 * 60 * 60 * 1000);
            else end = start + (t.durationDays || 1) * 24 * 60 * 60 * 1000;
            if(start < minTime) minTime = start;
            if(end > maxTime) maxTime = end;
        });
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
      const iconClass = `${textColorClass} opacity-90`;
      if (t.includes('db') || t.includes('schema')) return <Database size={16} className={iconClass} />;
      if (t.includes('auth') || t.includes('api')) return <Smartphone size={16} className={iconClass} />;
      if (t.includes('ui') || t.includes('design')) return <Layout size={16} className={iconClass} />;
      if (t.includes('bug') || t.includes('fix')) return <Bug size={16} className={iconClass} />;
      return <Share2 size={16} className={iconClass} />;
  };

  const getTaskStyle = (task: Task, index: number) => {
      const start = normalizeDate(task.startDate).getTime();
      let duration;
      if (task.endDate) duration = (normalizeDate(task.endDate).getTime() - start) + (24 * 60 * 60 * 1000);
      else duration = (task.durationDays || 1) * 24 * 60 * 60 * 1000;

      const offset = start - timelineData.minTime;
      const left = (offset / timelineData.totalDuration) * 100;
      const width = (duration / timelineData.totalDuration) * 100;

      // Status-based fill colors that read on cream.
      let bgClass = '', textClass = '', badgeBg = '', badgeText = '';
      switch (task.status) {
        case 'To Do':       bgClass = 'bg-muted-soft'; textClass = 'text-ink'; badgeBg = 'bg-black/10'; badgeText = 'text-ink'; break;
        case 'In Progress': bgClass = 'bg-blue-500';   textClass = 'text-white'; badgeBg = 'bg-black/20'; badgeText = 'text-white'; break;
        case 'Testing':     bgClass = 'bg-amber-400';  textClass = 'text-ink'; badgeBg = 'bg-black/15'; badgeText = 'text-ink'; break;
        case 'Done':        bgClass = 'bg-primary';    textClass = 'text-on-primary'; badgeBg = 'bg-black/25'; badgeText = 'text-on-primary'; break;
        default:            bgClass = 'bg-muted-soft'; textClass = 'text-ink'; badgeBg = 'bg-black/10'; badgeText = 'text-ink';
      }
      return { left: `${left}%`, width: `${width}%`, top: `${index * 72 + 20}px`, bgClass, textClass, badgeBg, badgeText };
  };

  const formatDay = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' });
  const formatDateNum = (date: Date) => date.getDate().toString();
  const minContainerWidth = Math.max(800, timelineData.dates.length * 90);

  return (
    <div className="h-full flex flex-col">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 animate-slide-up">
        <div>
            <h1 className="display text-[28px] mb-1 text-ink">Project Timeline</h1>
            <p className="text-body text-sm">Visual roadmap of your development journey</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-surface-card rounded-md p-1 border border-hairline">
                {(['All', 'High', 'In Progress'] as const).map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-5 py-1.5 rounded-[6px] text-sm font-medium transition-all duration-300 ${filter === f ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>
                        {f}
                    </button>
                ))}
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-surface-card border border-hairline-strong text-ink font-medium hover:bg-canvas-soft transition-all text-sm group">
                <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Export PDF</span>
            </button>
        </div>
       </div>

       <div className="flex-1 bg-surface-card rounded-xl border border-hairline flex flex-col overflow-hidden relative animate-slide-up delay-100">
            <div className="w-full overflow-x-auto custom-scrollbar flex-1 relative flex flex-col">
                <div style={{ minWidth: `${minContainerWidth}px` }} className="h-full relative flex flex-col">

                    {/* Header Row */}
                    <div className="flex border-b border-hairline bg-canvas-soft sticky top-0 z-30 h-16">
                        {timelineData.dates.map((date, i) => {
                            const isToday = new Date().toDateString() === date.toDateString();
                            return (
                                <div key={i} className={`flex-1 min-w-[90px] flex flex-col items-center justify-center relative border-r border-hairline-soft ${isToday ? 'bg-primary/5' : ''}`}>
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isToday ? 'text-primary' : 'text-muted'}`}>{formatDay(date)}</span>
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-primary text-on-primary' : 'text-body'}`}>{formatDateNum(date)}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Main Grid */}
                    <div className="flex-1 relative bg-canvas-soft">
                        <div className="absolute inset-0 flex pointer-events-none z-0">
                            {timelineData.dates.map((_, i) => (
                                <div key={i} className="flex-1 border-r border-dashed border-hairline-soft min-w-[90px] h-full"></div>
                            ))}
                        </div>

                        <div className="absolute top-0 bottom-0 w-px bg-primary z-20 pointer-events-none"
                             style={{ left: `${((new Date().getTime() - timelineData.minTime) / timelineData.totalDuration) * 100}%` }}>
                             <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rounded-full"></div>
                        </div>

                        <div className="relative w-full h-full py-4">
                             {filteredTasks.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
                                    <CalendarIcon size={48} className="mb-4 opacity-30" />
                                    <p className="text-lg font-medium">No tasks found</p>
                                    <p className="text-sm opacity-60">Try adjusting the filters or adding tasks with dates.</p>
                                </div>
                            ) : (
                                filteredTasks.map((task, idx) => {
                                    const style = getTaskStyle(task, idx);
                                    const progress = task.progress || 0;
                                    return (
                                        <div key={task.id} style={{ left: style.left, width: style.width, top: style.top }}
                                            className="absolute h-12 flex items-center group z-10 hover:z-50 px-1">
                                            <div className="w-full h-full rounded-full bg-surface-strong border border-hairline overflow-hidden relative hover:scale-[1.01] transition-all duration-300 cursor-pointer">
                                                <div className={`absolute left-0 top-0 bottom-0 ${style.bgClass} transition-all duration-[1500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${progress < 100 ? 'rounded-l-full' : 'rounded-full'}`}
                                                    style={{ width: isMounted ? `${Math.max(progress, 2)}%` : '0%' }}>
                                                    {progress > 0 && progress < 100 && <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50"></div>}
                                                </div>

                                                <div className="absolute inset-0 flex items-center justify-between px-4 z-20 pointer-events-none">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${style.textClass === 'text-ink' ? 'bg-black/10' : 'bg-black/20'}`}>
                                                            {getIcon(task.title, style.textClass)}
                                                        </div>
                                                        <span className={`text-sm font-semibold truncate tracking-tight ${style.textClass}`}>{task.title}</span>
                                                    </div>
                                                    <div className="flex items-center pl-2 shrink-0">
                                                        <div className={`text-[10px] font-bold ${style.badgeBg} ${style.badgeText} px-2.5 py-1 rounded-full flex items-center gap-1`}>{progress}%</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-surface-card border border-hairline px-5 py-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none scale-90 group-hover:scale-100 z-50 min-w-[200px] flex flex-col gap-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-semibold text-ink text-sm truncate max-w-[120px]">{task.title}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${task.priority === 'High' ? 'bg-primary/10 text-primary' : 'bg-surface-strong text-body'}`}>{task.priority}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-muted">
                                                    <div className="flex items-center gap-1">
                                                         <CalendarIcon size={10} />
                                                         <span>{normalizeDate(task.startDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                                    </div>
                                                    <ChevronRight size={10} className="text-muted-soft" />
                                                    <span>{task.endDate ? normalizeDate(task.endDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '...'}</span>
                                                </div>
                                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface-card border-t border-l border-hairline rotate-45"></div>
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

            {/* Footer */}
            <div className="flex justify-between items-center px-8 py-4 border-t border-hairline bg-canvas-soft text-xs font-medium">
                 <div className="flex items-center gap-6">
                    <span className="text-muted flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        {filteredTasks.length} Active Tasks
                    </span>
                    <span className="text-muted flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-surface-strong"></div>
                         {Math.round(filteredTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / (filteredTasks.length || 1))}% Completion
                    </span>
                </div>
                <div className="text-muted font-mono">
                    <span className="text-body">{new Date(timelineData.minTime).toLocaleDateString()}</span>
                    <span className="mx-2 text-muted-soft">——</span>
                    <span className="text-body">{new Date(timelineData.minTime + timelineData.totalDuration).toLocaleDateString()}</span>
                </div>
            </div>
       </div>
    </div>
  );
};

export default Timeline;
