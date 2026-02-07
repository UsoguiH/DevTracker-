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
    Activity,
    Flame
} from 'lucide-react';
import { Task, Project } from '../types';
import { useCountUp } from '../hooks/useCountUp';
import { useEffect, useState } from 'react';

interface DashboardProps {
    tasks: Task[];
    project?: Project;
    onAddMember: (projectId: string, projectName: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, project, onAddMember }) => {
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
            { label: 'In Progress', count: inProgress, color: 'bg-blue-500', textColor: 'text-blue-500' },
            { label: 'Testing', count: testing, color: 'bg-secondary', textColor: 'text-secondary' },
            { label: 'Done', count: done, color: 'bg-primary', textColor: 'text-primary' }
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

    // Heatmap Data Calculation
    const heatmapData = useMemo(() => {
        // Generate last 365 days
        const days = [];
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setDate(today.getDate() - 364);

        // Map of date string YYYY-MM-DD to count
        const activityMap = new Map<string, number>();

        tasks.forEach(task => {
            if (task.completedAt) {
                const dateStr = task.completedAt.split('T')[0];
                activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
            }
        });

        // Populate grid
        for (let i = 0; i < 365; i++) {
            const d = new Date(oneYearAgo);
            d.setDate(oneYearAgo.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const count = activityMap.get(dateStr) || 0;

            days.push({
                date: d,
                count,
                level: count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : 3
            });
        }
        return days;
    }, [tasks]);

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

    // Animation Hooks
    const animatedCompletionRate = useCountUp(stats.completionRate, 2000);
    const animatedDaysActive = useCountUp(stats.daysActive, 2000);
    const animatedUniqueAssignees = useCountUp(stats.uniqueAssignees, 2000);

    // Animate Gauge Drawing
    const [drawProgress, setDrawProgress] = useState(0);

    useEffect(() => {
        // Trigger drawing animation after mount
        const timer = setTimeout(() => setDrawProgress(1), 100);
        return () => clearTimeout(timer);
    }, []);

    const getHeatmapColor = (level: number) => {
        switch (level) {
            case 0: return 'bg-[#1C1C1E]'; // Empty
            case 1: return 'bg-[#D1F45F]/30'; // Low
            case 2: return 'bg-[#D1F45F]/60'; // Medium
            case 3: return 'bg-[#D1F45F] shadow-[0_0_8px_rgba(209,244,95,0.6)]'; // High
            default: return 'bg-[#1C1C1E]';
        }
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

                {/* Card 1: Project Progress Gauge (Moved from Bottom) */}
                <div className="col-span-1 lg:col-span-4 bg-[#161616] rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[280px] relative overflow-hidden animate-slide-up delay-100 hover:shadow-2xl transition-all duration-500 group border border-white/5">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <h2 className="text-lg font-bold text-white tracking-tight">Project Progress</h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center relative z-10 -mt-4">
                        {(() => {
                            // 1. Calculate Counts
                            const completedCount = tasks.filter(t => t.status === 'Done').length;
                            const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
                            const pendingCount = tasks.filter(t => t.status === 'To Do' || t.status === 'Testing').length;
                            const totalCount = completedCount + inProgressCount + pendingCount || 1; // Avoid div/0

                            // 2. Calculate Percentages for Angles (Total 180 degrees)
                            const completedAngle = (completedCount / totalCount) * 180;
                            const inProgressAngle = (inProgressCount / totalCount) * 180;
                            // const pendingAngle = (pendingCount / totalCount) * 180; // Not strictly needed for logic but good for completeness

                            // Helper to polar -> cartesian
                            const pol2car = (cx: number, cy: number, r: number, angleDeg: number) => {
                                const angleRad = (angleDeg - 180) * (Math.PI / 180); // -180 starts at left (West)
                                return {
                                    x: cx + r * Math.cos(angleRad),
                                    y: cy + r * Math.sin(angleRad)
                                };
                            };

                            // Helper to describe arc path
                            const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
                                const start = pol2car(cx, cy, r, endAngle);
                                const end = pol2car(cx, cy, r, startAngle);
                                const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
                                return [
                                    "M", start.x, start.y,
                                    "A", r, r, 0, largeArc, 0, end.x, end.y
                                ].join(" ");
                            };

                            const cx = 100;
                            const cy = 100; // Bottom center of the arc
                            const r = 80;
                            const strokeWidth = 30;

                            // Start angles accumulate
                            // Scale angles by drawProgress for animation effect
                            // Just kidding, simpler to animate strokeDashoffset. 
                            // Actually, calculating explicit arcs is easier if we just pass the raw angles 
                            // and let CSS animate path length, OR we can scale the inputs.
                            // Scaling inputs (angles) is safer for the custom arc logic we have.

                            // Paths - Static (Full length based on data)
                            const path1 = describeArc(cx, cy, r, 0, completedAngle);
                            const path2 = describeArc(cx, cy, r, completedAngle, completedAngle + inProgressAngle);
                            const path3 = describeArc(cx, cy, r, completedAngle + inProgressAngle, 180);

                            // Calculate Arc Lengths for DashArray Animation
                            // Arc length = (angle / 360) * 2 * PI * r
                            // But here we are using 180 deg view, so it's (angle/180) * PI * r
                            const totalCircumference = Math.PI * r;
                            const length1 = (completedAngle / 180) * totalCircumference;
                            const length2 = (inProgressAngle / 180) * totalCircumference;
                            const length3 = totalCircumference - length1 - length2;

                            // Animation: We set dasharray to [length, length]
                            // And animate dashoffset from length -> 0
                            // If drawProgress is 0, offset is length. If 1, offset is 0.

                            const getStyle = (length: number) => ({
                                strokeDasharray: length,
                                strokeDashoffset: length * (1 - drawProgress),
                                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                            });

                            // Colors (Green Theme - Restoration)
                            const colorCompleted = '#10B981'; // Emerald-500
                            const colorInProgress = '#064E3B'; // Emerald-900
                            const colorPending = '#374151'; // Gray-700

                            return (
                                <div className="relative w-[240px] h-[160px] flex justify-center">
                                    {/* Adjusted viewBox and height to move arc up */}
                                    <svg width="240" height="150" viewBox="0 -10 200 130" className="overflow-visible">
                                        <defs>
                                            <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                                <line x1="0" y1="0" x2="0" y2="10" style={{ stroke: '#4B5563', strokeWidth: 2 }} />
                                            </pattern>
                                        </defs>

                                        {/* 3 Segments */}
                                        {/* Completed */}
                                        {/* Completed */}
                                        {completedCount > 0 && (
                                            <path
                                                d={path1}
                                                fill="none"
                                                stroke={colorCompleted}
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="round"
                                                style={getStyle(length1)}
                                            />
                                        )}
                                        {/* Pending */}
                                        {pendingCount > 0 && (
                                            <path
                                                d={path3}
                                                fill="none"
                                                stroke="url(#diagonalHatch)"
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="butt"
                                                className="opacity-50"
                                                style={getStyle(length3)}
                                            />
                                        )}
                                        {/* In Progress */}
                                        {inProgressCount > 0 && (
                                            <path
                                                d={path2}
                                                fill="none"
                                                stroke={colorInProgress}
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="round"
                                                style={getStyle(length2)}
                                            />
                                        )}
                                        {/* Completed Re-draw for cap to be on top if needed */}
                                        {completedCount > 0 && (
                                            <path
                                                d={path1}
                                                fill="none"
                                                stroke={colorCompleted}
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="round"
                                                style={getStyle(length1)}
                                            />
                                        )}
                                    </svg>

                                    {/* Center Text - Pushed down slightly via absolute positioning */}
                                    <div className="absolute bottom-5 flex flex-col items-center">
                                        <span className="text-5xl font-bold text-white tracking-tighter transition-all duration-200">
                                            {animatedCompletionRate}%
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Project Progress</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 mt-2 px-2">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                            <span>Completed</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-[#064E3B]"></div>
                            <span>In Progress</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full border border-gray-600 opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxsaW5lIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxMCIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHRyYW5zZm9ybT0icm90YXRlKDQ1IDQgNCkiLz48L3N2Zz4=')]"></div>
                            <span>Pending</span>
                        </div>
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
                                <div className="text-3xl font-bold text-white group-hover:text-secondary transition-colors">{animatedDaysActive}</div>
                                <div className="text-xs text-gray-400">Days Active</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 group cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-[#2C2C2C] flex items-center justify-center text-primary group-hover:scale-125 transition-transform duration-300">
                                <Users size={20} className="text-primary" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-white group-hover:text-primary transition-colors">{animatedUniqueAssignees}</div>
                                <div className="text-xs text-gray-400">Active Contributors</div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Dots Decorative */}
                    <div className="grid grid-cols-8 gap-2 mt-4 opacity-50">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all duration-500 hover:scale-150 ${[0, 2, 5, 7, 8, 10, 13, 15].includes(i) ? (i % 3 === 0 ? 'bg-primary' : 'bg-secondary') : 'bg-[#333]'}`}
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
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-r border-dashed border-[#333] h-full w-px"></div>)}
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
                                        className={`h-full ${data.color} rounded-full group-hover:opacity-80`}
                                        style={{
                                            width: `${(data.count / stats.maxStatusCount) * 100 * drawProgress}%`,
                                            transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card 5: Team Collaboration (Dark Mode & Red Accents) */}
                <div className="col-span-1 lg:col-span-3 bg-[#161616] rounded-3xl p-6 shadow-xl flex flex-col animate-slide-up delay-500 hover:shadow-2xl transition-all duration-500 relative overflow-hidden group border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-white tracking-tight">Team Collaboration</h2>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (project) {
                                    onAddMember(project.id, project.name);
                                } else {
                                    console.warn('[Dashboard] Add Member clicked but no project active.');
                                }
                            }}
                            className="px-3 py-1.5 rounded-full border border-gray-700 text-xs font-semibold text-gray-300 flex items-center gap-1 transition-colors hover:bg-white/5 cursor-pointer z-50 relative"
                        >
                            <span>+</span> Add Member
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                        <div className="flex flex-col gap-4">
                            {(() => {
                                // Derive unique team members from tasks
                                const membersMap = new Map();
                                tasks.forEach(t => {
                                    t.assignees.forEach(u => {
                                        if (!membersMap.has(u.id)) {
                                            membersMap.set(u.id, {
                                                user: u,
                                                currentTask: t.title,
                                                status: t.status
                                            });
                                        } else {
                                            // Update if this task is more "active"
                                            const existing = membersMap.get(u.id);
                                            if (t.status === 'In Progress' && existing.status !== 'In Progress') {
                                                membersMap.set(u.id, {
                                                    user: u,
                                                    currentTask: t.title,
                                                    status: t.status
                                                });
                                            }
                                        }
                                    });
                                });

                                const members = Array.from(membersMap.values());

                                if (members.length === 0) {
                                    return (
                                        <div className="text-center text-gray-600 text-sm py-4">
                                            No active members found.
                                            <br />
                                            Assign tasks to see them here!
                                        </div>
                                    );
                                }

                                return members.map(({ user, currentTask, status }) => {
                                    let statusColor = 'bg-gray-800 text-gray-400 border border-gray-700'; // Default
                                    let statusLabel = 'Pending';
                                    let dotColor = 'bg-gray-500';

                                    // GREEN Theme STATUS Colors (Restored for consistency)
                                    if (status === 'Done') {
                                        statusColor = 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50';
                                        statusLabel = 'Completed';
                                        dotColor = 'bg-emerald-500';
                                    } else if (status === 'In Progress') {
                                        statusColor = 'bg-yellow-900/30 text-yellow-400 border border-yellow-900/50';
                                        statusLabel = 'In Progress';
                                        dotColor = 'bg-yellow-500';
                                    } else if (status === 'Testing') {
                                        statusColor = 'bg-blue-900/30 text-blue-400 border border-blue-900/50';
                                        statusLabel = 'Review';
                                        dotColor = 'bg-blue-500';
                                    }

                                    return (
                                        <div key={user.id} className="flex items-center gap-3 group/item">
                                            {/* Avatar */}
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-700 shadow-sm">
                                                    <img
                                                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                                                        alt={user.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                {/* Status Dot */}
                                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#161616] ${dotColor}`}></div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-gray-200 truncate">{user.name}</h3>
                                                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                                    <span className="opacity-60">Working on</span> <span className="font-medium text-gray-300 truncate max-w-[120px]">{currentTask}</span>
                                                </p>
                                            </div>

                                            {/* Status Badge */}
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusColor} shrink-0`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>

                {/* HEATMAP SECTION (Moved to Bottom) */}
                <div className="col-span-1 lg:col-span-12 bg-[#161616] rounded-3xl p-6 shadow-xl animate-slide-up delay-75 border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Flame size={18} className="text-primary" />
                            <h2 className="text-sm font-bold text-gray-200 tracking-wider uppercase">Contribution Graph</h2>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span>Less</span>
                            <div className="w-3 h-3 rounded-sm bg-[#1C1C1E]"></div>
                            <div className="w-3 h-3 rounded-sm bg-[#D1F45F]/30"></div>
                            <div className="w-3 h-3 rounded-sm bg-[#D1F45F]/60"></div>
                            <div className="w-3 h-3 rounded-sm bg-[#D1F45F]"></div>
                            <span>More</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto pb-8 custom-scrollbar">
                        <div className="min-w-[800px] flex gap-1">
                            {/* We need to group by week for the standard heatmap layout */}
                            {Array.from({ length: 53 }).map((_, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col gap-1">
                                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                                        const dayData = heatmapData[weekIndex * 7 + dayIndex];
                                        if (!dayData) return null;

                                        return (
                                            <div
                                                key={dayIndex}
                                                className={`w-3 h-3 rounded-sm ${getHeatmapColor(dayData.level)} transition-all hover:scale-150 hover:z-10 relative group`}
                                            >
                                                {/* Tooltip */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg border border-white/10">
                                                    <span className="font-bold text-primary">{dayData.count} tasks</span> on {dayData.date.toLocaleDateString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;