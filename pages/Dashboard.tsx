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
    Activity,
    Flame,
    Plus
} from 'lucide-react';
import { Task, Project } from '../types';
import { useCountUp } from '../hooks/useCountUp';
import { useEffect, useState } from 'react';

interface DashboardProps {
    tasks: Task[];
    project?: Project;
    onAddMember: (projectId: string, projectName: string) => void;
}

/* ── Cutout-notch card system (cards.txt trick, editorial palette) ── */

// Reusable animated Bell Button Component with Color Toggle
const BellButton: React.FC<{
    defaultBtn: string;
    activeBtn: string;
    defaultIcon: string;
    activeIcon: string;
}> = ({ defaultBtn, activeBtn, defaultIcon, activeIcon }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isActive, setIsActive] = useState(false); // Tracks if the bell is toggled on

    const handleClick = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setIsActive((prev) => !prev); // Toggle the color state
        setTimeout(() => setIsAnimating(false), 600);
    };

    const currentBtnClass = isActive ? activeBtn : defaultBtn;
    const currentIconClass = isActive ? activeIcon : defaultIcon;

    return (
        <button
            onClick={handleClick}
            className={`w-[46px] h-[46px] ${currentBtnClass} rounded-full flex items-center justify-center transition-colors duration-300 cursor-pointer group`}
        >
            <svg
                className={`w-[20px] h-[20px] ${currentIconClass} transition-colors duration-300 ${isAnimating ? 'dt-animate-ring' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
        </button>
    );
};

// Reusable animated Arrow Button Component (Replicating GSAP Elastic ease)
const ArrowButton: React.FC<{
    btnClass: string;
    iconClass: string;
    onClick?: () => void;
}> = ({ btnClass, iconClass, onClick }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 800);
        onClick?.();
    };

    return (
        <button onClick={handleClick} className={`w-[46px] h-[46px] ${btnClass} rounded-full flex items-center justify-center transition-all cursor-pointer ${isAnimating ? 'dt-animate-arrow-btn' : ''}`}>
            <svg className={`w-[22px] h-[22px] ${iconClass} ${isAnimating ? 'dt-animate-arrow-icon' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7"></path>
                <path d="M7 7h10v10"></path>
            </svg>
        </button>
    );
};

// Plain circular notch action (relocated card actions, e.g. "more" / "add member")
const NotchAction: React.FC<{
    onClick?: (e: React.MouseEvent) => void;
    title?: string;
    children: React.ReactNode;
}> = ({ onClick, title, children }) => (
    <button
        title={title}
        onClick={onClick}
        className="w-[46px] h-[46px] bg-surface-card border border-hairline-strong hover:bg-surface-strong rounded-full flex items-center justify-center text-body hover:text-ink transition-colors duration-300 cursor-pointer"
    >
        {children}
    </button>
);

// Card shell with the top-right cutout notch. The notch paints the page
// canvas over the card; the two 32px squares restore the card color with a
// rounded corner, producing the smooth concave transition.
const NotchCard: React.FC<{
    className?: string;
    delay?: string;
    notchWidth?: number;
    notch: React.ReactNode;
    children: React.ReactNode;
}> = ({ className = '', delay = '0ms', notchWidth = 148, notch, children }) => (
    <div
        className={`relative bg-surface-card rounded-[40px] dt-anim-card ${className}`}
        style={{ animationDelay: delay }}
    >
        {/* CUTOUT AREA */}
        <div
            className="absolute top-0 right-0 h-[88px] bg-canvas rounded-bl-[36px] z-20 flex items-center justify-end pr-5 pb-3"
            style={{ width: notchWidth }}
        >
            <div className="absolute top-0 -left-[32px] w-[32px] h-[32px] bg-canvas">
                <div className="w-full h-full bg-surface-card rounded-tr-[32px]"></div>
            </div>
            <div className="absolute -bottom-[32px] right-0 w-[32px] h-[32px] bg-canvas">
                <div className="w-full h-full bg-surface-card rounded-tr-[32px]"></div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">{notch}</div>
        </div>
        {children}
    </div>
);

// Pop-in wrapper so entrance animation never conflicts with click animations
const NotchPop: React.FC<{ delay?: string; children: React.ReactNode }> = ({ delay = '0.4s', children }) => (
    <span className="dt-anim-btn inline-flex" style={{ animationDelay: delay }}>
        {children}
    </span>
);

const notchStyles = `
@keyframes dtSlideUpCard {
  from { transform: translateY(60px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes dtPopInBtn {
  from { transform: scale(0) rotate(-45deg); opacity: 0; }
  to { transform: scale(1) rotate(0); opacity: 1; }
}
/* Bell Ring CSS Animation */
@keyframes dtRingBell {
  0% { transform: rotate(0); }
  16% { transform: rotate(25deg); }
  33% { transform: rotate(-20deg); }
  50% { transform: rotate(15deg); }
  66% { transform: rotate(-10deg); }
  83% { transform: rotate(5deg); }
  100% { transform: rotate(0); }
}
.dt-animate-ring {
  animation: dtRingBell 0.6s ease-in-out;
  transform-origin: 50% 10%;
}
/* GSAP-Style Arrow Click Animations */
@keyframes dtArrowBtnSqueeze {
  0% { transform: scale(1); }
  25% { transform: scale(0.85); }
  100% { transform: scale(1); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); } /* Elastic Pop */
}
.dt-animate-arrow-btn {
  animation: dtArrowBtnSqueeze 0.8s forwards;
}
@keyframes dtArrowIconShoot {
  0% { transform: translate(0, 0); opacity: 1; }
  20% { transform: translate(25px, -25px); opacity: 0; animation-timing-function: ease-in; }
  21% { transform: translate(-25px, 25px); opacity: 0; }
  100% { transform: translate(0, 0); opacity: 1; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); } /* Back Out Easing */
}
.dt-animate-arrow-icon {
  animation: dtArrowIconShoot 0.8s forwards;
}
.dt-anim-card {
  animation: dtSlideUpCard 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
.dt-anim-btn {
  animation: dtPopInBtn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  opacity: 0;
}
`;

const Dashboard: React.FC<DashboardProps> = ({ tasks, project, onAddMember }) => {
    const stats = useMemo(() => {
        const total = tasks.length || 0;
        const done = tasks.filter(t => t.status === 'Done').length;
        const inProgress = tasks.filter(t => t.status === 'In Progress').length;
        const testing = tasks.filter(t => t.status === 'Testing').length;
        const todo = tasks.filter(t => t.status === 'To Do').length;
        const bugs = tasks.filter(t => t.tags.some(tag => tag.name.toLowerCase().includes('bug'))).length;
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
        const bugRate = total > 0 ? Math.round((bugs / total) * 100) : 0;

        const upcoming = tasks
            .filter(t => t.status !== 'Done' && t.dueDate)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 7);

        const daysActive = project
            ? Math.max(0, Math.floor((new Date().getTime() - new Date(project.createdAt).getTime()) / (1000 * 3600 * 24)))
            : 0;

        const uniqueAssignees = new Set(tasks.flatMap(t => t.assignees.map(u => u.id))).size;

        const statusData = [
            { label: 'To Do', count: todo, color: 'bg-muted-soft', textColor: 'text-muted' },
            { label: 'In Progress', count: inProgress, color: 'bg-blue-500', textColor: 'text-blue-600' },
            { label: 'Testing', count: testing, color: 'bg-amber-400', textColor: 'text-amber-600' },
            { label: 'Done', count: done, color: 'bg-primary', textColor: 'text-primary' }
        ];

        const maxStatusCount = Math.max(...statusData.map(d => d.count), 1);

        return { total, completionRate, bugRate, upcoming, daysActive, uniqueAssignees, statusData, maxStatusCount };
    }, [tasks, project]);

    const heatmapData = useMemo(() => {
        const days = [];
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setDate(today.getDate() - 364);
        const activityMap = new Map<string, number>();

        tasks.forEach(task => {
            if (task.completedAt) {
                const dateStr = task.completedAt.split('T')[0];
                activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
            }
        });

        for (let i = 0; i < 365; i++) {
            const d = new Date(oneYearAgo);
            d.setDate(oneYearAgo.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const count = activityMap.get(dateStr) || 0;
            days.push({ date: d, count, level: count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : 3 });
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

    // Deadline pills — readable on the cream canvas.
    const getTaskColor = (index: number) => {
        const colors = [
            'bg-ink text-canvas',
            'bg-primary text-on-primary',
            'bg-surface-card text-ink border border-hairline-strong'
        ];
        return colors[index % colors.length];
    };

    const animatedCompletionRate = useCountUp(stats.completionRate, 2000);
    const animatedDaysActive = useCountUp(stats.daysActive, 2000);
    const animatedUniqueAssignees = useCountUp(stats.uniqueAssignees, 2000);

    const [drawProgress, setDrawProgress] = useState(0);
    useEffect(() => {
        const timer = setTimeout(() => setDrawProgress(1), 100);
        return () => clearTimeout(timer);
    }, []);

    const getHeatmapColor = (level: number) => {
        switch (level) {
            case 0: return 'bg-surface-strong';
            case 1: return 'bg-primary/25';
            case 2: return 'bg-primary/55';
            case 3: return 'bg-primary';
            default: return 'bg-surface-strong';
        }
    };

    return (
        <div className="flex flex-col h-full pb-10">
            <style>{notchStyles}</style>

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-end mb-6 gap-4 animate-slide-up">
                <div>
                    <h1 className="display text-[36px] text-ink">{project ? project.name : 'DevTracker'}</h1>
                    <p className="text-body text-sm mt-1">{project ? project.description : 'Select a project to view statistics'}</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-surface-card border border-hairline-strong rounded-md text-sm font-medium text-body hover:border-primary transition-all flex items-center gap-2">
                        Key: {project?.key || 'N/A'} <ChevronDown size={14} />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center bg-surface-card border border-hairline-strong rounded-md text-body hover:text-ink transition-all">
                        <SlidersHorizontal size={16} />
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Card 1: Project Progress Gauge */}
                <NotchCard
                    className="col-span-1 lg:col-span-4 p-6 flex flex-col justify-between min-h-[280px] overflow-hidden"
                    delay="100ms"
                    notchWidth={148}
                    notch={
                        <>
                            <NotchPop delay="0.4s">
                                <BellButton
                                    defaultBtn="bg-surface-card border border-hairline-strong hover:bg-surface-strong"
                                    activeBtn="bg-ink hover:bg-[#3a3930]"
                                    defaultIcon="text-ink"
                                    activeIcon="text-canvas"
                                />
                            </NotchPop>
                            <NotchPop delay="0.5s">
                                <ArrowButton
                                    btnClass="bg-primary hover:bg-primary-active shadow-[0_0_15px_rgba(245,78,0,0.2)]"
                                    iconClass="text-on-primary"
                                />
                            </NotchPop>
                        </>
                    }
                >
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <h2 className="text-lg font-semibold text-ink tracking-tight">Project Progress</h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center relative z-10 -mt-4">
                        {(() => {
                            const completedCount = tasks.filter(t => t.status === 'Done').length;
                            const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
                            const pendingCount = tasks.filter(t => t.status === 'To Do' || t.status === 'Testing').length;
                            const totalCount = completedCount + inProgressCount + pendingCount || 1;

                            const completedAngle = (completedCount / totalCount) * 180;
                            const inProgressAngle = (inProgressCount / totalCount) * 180;

                            const pol2car = (cx: number, cy: number, r: number, angleDeg: number) => {
                                const angleRad = (angleDeg - 180) * (Math.PI / 180);
                                return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
                            };
                            const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
                                const start = pol2car(cx, cy, r, endAngle);
                                const end = pol2car(cx, cy, r, startAngle);
                                const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
                                return ["M", start.x, start.y, "A", r, r, 0, largeArc, 0, end.x, end.y].join(" ");
                            };

                            const cx = 100, cy = 100, r = 80, strokeWidth = 30;
                            const path1 = describeArc(cx, cy, r, 0, completedAngle);
                            const path2 = describeArc(cx, cy, r, completedAngle, completedAngle + inProgressAngle);
                            const path3 = describeArc(cx, cy, r, completedAngle + inProgressAngle, 180);

                            const totalCircumference = Math.PI * r;
                            const length1 = (completedAngle / 180) * totalCircumference;
                            const length2 = (inProgressAngle / 180) * totalCircumference;
                            const length3 = totalCircumference - length1 - length2;

                            const getStyle = (length: number) => ({
                                strokeDasharray: length,
                                strokeDashoffset: length * (1 - drawProgress),
                                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                            });

                            const colorCompleted = '#1f8a65';
                            const colorInProgress = '#9fc9a2';

                            return (
                                <div className="relative w-[240px] h-[160px] flex justify-center">
                                    <svg width="240" height="150" viewBox="0 -10 200 130" className="overflow-visible">
                                        <defs>
                                            <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                                <line x1="0" y1="0" x2="0" y2="10" style={{ stroke: '#cfcdc4', strokeWidth: 2 }} />
                                            </pattern>
                                        </defs>
                                        {completedCount > 0 && (
                                            <path d={path1} fill="none" stroke={colorCompleted} strokeWidth={strokeWidth} strokeLinecap="round" style={getStyle(length1)} />
                                        )}
                                        {pendingCount > 0 && (
                                            <path d={path3} fill="none" stroke="url(#diagonalHatch)" strokeWidth={strokeWidth} strokeLinecap="butt" style={getStyle(length3)} />
                                        )}
                                        {inProgressCount > 0 && (
                                            <path d={path2} fill="none" stroke={colorInProgress} strokeWidth={strokeWidth} strokeLinecap="round" style={getStyle(length2)} />
                                        )}
                                        {completedCount > 0 && (
                                            <path d={path1} fill="none" stroke={colorCompleted} strokeWidth={strokeWidth} strokeLinecap="round" style={getStyle(length1)} />
                                        )}
                                    </svg>

                                    <div className="absolute bottom-5 flex flex-col items-center">
                                        <span className="text-5xl font-semibold text-ink tracking-tighter">{animatedCompletionRate}%</span>
                                        <span className="text-xs text-muted font-medium uppercase tracking-wider">Project Progress</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-semibold text-muted mt-2 px-2">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#1f8a65]"></div><span>Completed</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#9fc9a2]"></div><span>In Progress</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-hairline-strong bg-surface-strong"></div><span>Pending</span></div>
                    </div>
                </NotchCard>

                {/* Card 2: Project Insights */}
                <NotchCard
                    className="col-span-1 lg:col-span-3 p-6 flex flex-col min-h-[280px]"
                    delay="200ms"
                    notchWidth={104}
                    notch={
                        <NotchPop delay="0.5s">
                            <NotchAction title="More">
                                <MoreHorizontal size={20} />
                            </NotchAction>
                        </NotchPop>
                    }
                >
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xs font-semibold text-muted tracking-wider uppercase">Project Insights</h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-6">
                        <div className="flex items-center gap-4 group cursor-pointer">
                            <div className="w-10 h-10 rounded-lg bg-canvas-soft flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                <CalendarClock size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <div className="text-3xl font-semibold text-ink group-hover:text-primary transition-colors">{animatedDaysActive}</div>
                                <div className="text-xs text-muted">Days Active</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 group cursor-pointer">
                            <div className="w-10 h-10 rounded-lg bg-canvas-soft flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                <Users size={20} />
                            </div>
                            <div>
                                <div className="text-3xl font-semibold text-ink group-hover:text-primary transition-colors">{animatedUniqueAssignees}</div>
                                <div className="text-xs text-muted">Active Contributors</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-8 gap-2 mt-4">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-500 ${[0, 2, 5, 7, 8, 10, 13, 15].includes(i) ? 'bg-primary' : 'bg-surface-strong'}`} />
                        ))}
                    </div>
                </NotchCard>

                {/* Card 3: Upcoming Deadlines */}
                <NotchCard
                    className="col-span-1 lg:col-span-5 lg:row-span-2 p-6 flex flex-col overflow-hidden"
                    delay="300ms"
                    notchWidth={104}
                    notch={
                        <NotchPop delay="0.6s">
                            <NotchAction title="More">
                                <MoreHorizontal size={20} />
                            </NotchAction>
                        </NotchPop>
                    }
                >
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-xs font-semibold text-muted tracking-wider uppercase">Upcoming Deadlines</h2>
                    </div>

                    <div className="flex-1 relative">
                        <div className="absolute inset-0 flex justify-between pointer-events-none px-4">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-r border-dashed border-hairline h-full w-px"></div>)}
                        </div>

                        <div className="space-y-6 relative z-10 pt-2 h-[450px] overflow-y-auto custom-scrollbar pr-2">
                            {stats.upcoming.length > 0 ? (
                                stats.upcoming.map((task, idx) => {
                                    const date = new Date(task.dueDate);
                                    const dateStr = !isNaN(date.getTime()) ? `${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, '0')}` : 'N/A';
                                    const isRightAligned = idx % 2 !== 0;
                                    const width = ['w-[60%]', 'w-[50%]', 'w-[70%]', 'w-[55%]'][idx % 4];
                                    const colorClass = getTaskColor(idx);
                                    const isLight = colorClass.includes('bg-surface-card');

                                    return (
                                        <div key={task.id} className="flex items-center group animate-slide-up" style={{ animationDelay: `${400 + (idx * 100)}ms` }}>
                                            <span className="w-12 text-xs font-medium text-muted mr-2 shrink-0">{dateStr}</span>
                                            <div className={`flex-1 flex ${isRightAligned ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`${colorClass} ${width} h-10 rounded-full flex items-center justify-between px-2 relative hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${isRightAligned ? 'mr-4' : 'ml-4'}`}>
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isLight ? 'bg-canvas-soft' : 'bg-black/15'}`}>
                                                        {getTaskIcon(task.title)}
                                                    </div>
                                                    <span className="text-xs font-semibold mr-2 truncate ml-2">{task.title}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted gap-2">
                                    <Activity size={32} className="opacity-30" />
                                    <p className="text-sm">No upcoming deadlines found.</p>
                                    <p className="text-xs opacity-60">Create tasks with due dates to see them here.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-xs mt-6 pt-4 border-t border-hairline">
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full ring-2 ring-primary bg-surface-card"></div><span className="text-muted">Low/Med</span></div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full ring-2 ring-ink bg-surface-card"></div><span className="text-muted">High</span></div>
                        </div>
                        <button className="text-primary font-medium hover:underline">View Calendar</button>
                    </div>
                </NotchCard>

                {/* Card 4: Status Distribution */}
                <NotchCard
                    className="col-span-1 lg:col-span-4 p-6 flex flex-col justify-between"
                    delay="400ms"
                    notchWidth={104}
                    notch={
                        <NotchPop delay="0.7s">
                            <NotchAction title="More">
                                <MoreHorizontal size={20} />
                            </NotchAction>
                        </NotchPop>
                    }
                >
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xs font-semibold text-muted tracking-wider uppercase">Status Distribution</h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-end space-y-4">
                        {stats.statusData.map((data) => (
                            <div key={data.label} className="group">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className={`${data.textColor} font-semibold`}>{data.label}</span>
                                    <span className="text-muted">{data.count}</span>
                                </div>
                                <div className="h-3 w-full bg-surface-strong rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${data.color} rounded-full group-hover:opacity-80`}
                                        style={{ width: `${(data.count / stats.maxStatusCount) * 100 * drawProgress}%`, transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </NotchCard>

                {/* Card 5: Team Collaboration */}
                <NotchCard
                    className="col-span-1 lg:col-span-3 p-6 flex flex-col overflow-hidden"
                    delay="500ms"
                    notchWidth={104}
                    notch={
                        <NotchPop delay="0.8s">
                            <NotchAction
                                title="Add Member"
                                onClick={(e) => { e.stopPropagation(); if (project) onAddMember(project.id, project.name); }}
                            >
                                <Plus size={20} />
                            </NotchAction>
                        </NotchPop>
                    }
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-ink tracking-tight">Team</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                        <div className="flex flex-col gap-4">
                            {(() => {
                                const membersMap = new Map();
                                tasks.forEach(t => {
                                    t.assignees.forEach(u => {
                                        if (!membersMap.has(u.id)) {
                                            membersMap.set(u.id, { user: u, currentTask: t.title, status: t.status });
                                        } else {
                                            const existing = membersMap.get(u.id);
                                            if (t.status === 'In Progress' && existing.status !== 'In Progress') {
                                                membersMap.set(u.id, { user: u, currentTask: t.title, status: t.status });
                                            }
                                        }
                                    });
                                });

                                const members = Array.from(membersMap.values());
                                if (members.length === 0) {
                                    return <div className="text-center text-muted text-sm py-4">No active members found.<br />Assign tasks to see them here!</div>;
                                }

                                return members.map(({ user, currentTask, status }) => {
                                    let statusColor = 'bg-surface-strong text-body border border-hairline';
                                    let statusLabel = 'Pending';
                                    let dotColor = 'bg-muted-soft';

                                    if (status === 'Done') { statusColor = 'bg-emerald-100 text-emerald-700 border border-emerald-200'; statusLabel = 'Completed'; dotColor = 'bg-emerald-500'; }
                                    else if (status === 'In Progress') { statusColor = 'bg-amber-100 text-amber-700 border border-amber-200'; statusLabel = 'In Progress'; dotColor = 'bg-amber-500'; }
                                    else if (status === 'Testing') { statusColor = 'bg-blue-100 text-blue-700 border border-blue-200'; statusLabel = 'Review'; dotColor = 'bg-blue-500'; }

                                    return (
                                        <div key={user.id} className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border border-hairline">
                                                    <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface-card ${dotColor}`}></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-semibold text-ink truncate">{user.name}</h3>
                                                <p className="text-xs text-muted truncate flex items-center gap-1">
                                                    <span className="opacity-70">Working on</span> <span className="font-medium text-body truncate max-w-[120px]">{currentTask}</span>
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider ${statusColor} shrink-0`}>{statusLabel}</span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </NotchCard>

                {/* Heatmap */}
                <NotchCard
                    className="col-span-1 lg:col-span-12 p-6"
                    delay="75ms"
                    notchWidth={104}
                    notch={
                        <NotchPop delay="0.6s">
                            <ArrowButton
                                btnClass="bg-primary hover:bg-primary-active shadow-[0_0_15px_rgba(245,78,0,0.2)]"
                                iconClass="text-on-primary"
                            />
                        </NotchPop>
                    }
                >
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Flame size={18} className="text-primary" />
                            <h2 className="text-xs font-semibold text-muted tracking-wider uppercase">Contribution Graph</h2>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted mr-[112px]">
                            <span>Less</span>
                            <div className="w-3 h-3 rounded-sm bg-surface-strong"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary/25"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary/55"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary"></div>
                            <span>More</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto pb-8 custom-scrollbar">
                        <div className="min-w-[800px] flex gap-1">
                            {Array.from({ length: 53 }).map((_, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col gap-1">
                                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                                        const dayData = heatmapData[weekIndex * 7 + dayIndex];
                                        if (!dayData) return null;
                                        return (
                                            <div key={dayIndex} className={`w-3 h-3 rounded-sm ${getHeatmapColor(dayData.level)} transition-all hover:scale-150 hover:z-10 relative group`}>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-ink text-canvas text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                                                    <span className="font-bold text-primary">{dayData.count} tasks</span> on {dayData.date.toLocaleDateString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </NotchCard>

            </div>
        </div>
    );
};

export default Dashboard;
