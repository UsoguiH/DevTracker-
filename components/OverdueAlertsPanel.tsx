
import React, { useMemo, useState, useEffect } from 'react';
import { X, AlertTriangle, Clock, Flame, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { Task } from '../types';

interface OverdueAlertsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    onViewTask: (task: Task) => void;
}

const parseTaskDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
};

type AlertTask = Task & { daysOffset: number };

const OverdueAlertsPanel: React.FC<OverdueAlertsPanelProps> = ({ isOpen, onClose, tasks, onViewTask }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => setMounted(true), 30);
            return () => clearTimeout(t);
        } else {
            setMounted(false);
        }
    }, [isOpen]);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const { overdue, dueToday, dueSoon, healthScore } = useMemo(() => {
        const activeTasks = tasks.filter(t => t.status !== 'Done' && (t.dueDate || t.endDate));

        const overdue: AlertTask[] = activeTasks
            .filter(t => {
                const date = parseTaskDate(t.dueDate || t.endDate);
                return date !== null && date < today;
            })
            .map(t => ({ ...t, daysOffset: Math.floor((today.getTime() - parseTaskDate(t.dueDate || t.endDate)!.getTime()) / 86400000) }))
            .sort((a, b) => b.daysOffset - a.daysOffset);

        const dueToday: AlertTask[] = activeTasks
            .filter(t => {
                const date = parseTaskDate(t.dueDate || t.endDate);
                return date !== null && date.getTime() === today.getTime();
            })
            .map(t => ({ ...t, daysOffset: 0 }));

        const dueSoon: AlertTask[] = activeTasks
            .filter(t => {
                const date = parseTaskDate(t.dueDate || t.endDate);
                if (!date) return false;
                const diff = Math.floor((date.getTime() - today.getTime()) / 86400000);
                return diff > 0 && diff <= 3;
            })
            .map(t => ({ ...t, daysOffset: Math.floor((parseTaskDate(t.dueDate || t.endDate)!.getTime() - today.getTime()) / 86400000) }))
            .sort((a, b) => a.daysOffset - b.daysOffset);

        const healthScore = Math.max(0, Math.min(100, 100 - (overdue.length * 20) - (dueToday.length * 5)));

        return { overdue, dueToday, dueSoon, healthScore };
    }, [tasks, today]);

    const totalAlerts = overdue.length + dueToday.length;

    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (healthScore / 100) * circumference;
    const healthColor = healthScore >= 70 ? '#1f8a65' : healthScore >= 40 ? '#c08532' : '#cf2d56';
    const healthLabel = healthScore >= 70 ? 'On Track' : healthScore >= 40 ? 'At Risk' : 'Critical';

    const TaskAlertCard = ({ task, tier }: { task: AlertTask; tier: 'overdue' | 'today' | 'soon' }) => {
        const pillText = tier === 'overdue' ? `${task.daysOffset}d late` : tier === 'today' ? 'Due Today' : `${task.daysOffset}d left`;

        const tierConfig = {
            overdue: { borderColor: 'border-l-error', bg: 'hover:bg-error/5', pillBg: 'bg-error/10 text-error border-error/25' },
            today: { borderColor: 'border-l-amber-400', bg: 'hover:bg-amber-50', pillBg: 'bg-amber-100 text-amber-700 border-amber-200' },
            soon: { borderColor: 'border-l-amber-300', bg: 'hover:bg-amber-50', pillBg: 'bg-amber-50 text-amber-700 border-amber-200' },
        }[tier];

        const priorityConfig = {
            High: 'text-primary bg-primary/10',
            Medium: 'text-amber-700 bg-amber-100',
            Low: 'text-emerald-700 bg-emerald-100',
        }[task.priority] || 'text-muted bg-surface-strong';

        return (
            <button
                onClick={() => { onViewTask(task); onClose(); }}
                className={`w-full text-left p-3.5 rounded-lg border-l-[3px] bg-canvas-soft ${tierConfig.borderColor} ${tierConfig.bg} border border-hairline transition-all duration-200 group cursor-pointer`}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate leading-tight">{task.title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierConfig.pillBg}`}>{pillText}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${priorityConfig}`}>{task.priority}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <div className="flex -space-x-1.5">
                            {task.assignees.slice(0, 2).map(u => (
                                <img key={u.id} src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&size=24`} alt={u.name} className="w-6 h-6 rounded-full border-2 border-surface-card" />
                            ))}
                        </div>
                        <ChevronRight size={14} className="text-muted group-hover:text-ink ml-1 transition-colors" />
                    </div>
                </div>
            </button>
        );
    };

    const SectionHeader = ({ icon: Icon, label, count, color }: { icon: any; label: string; count: number; color: string }) => (
        <div className="flex items-center gap-2 mb-3">
            <Icon size={12} className={color} />
            <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${color}`}>{label}</span>
            <div className="flex-1 h-px bg-hairline"></div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-strong ${color}`}>{count}</span>
        </div>
    );

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className={`fixed inset-0 z-40 transition-all duration-500 ${mounted ? 'bg-ink/40 backdrop-blur-sm' : 'bg-transparent'}`} onClick={onClose} />

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-[420px] z-50 flex flex-col bg-surface-card border-l border-hairline transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${mounted ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-hairline">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
                            <Flame size={16} className="text-error" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-ink tracking-tight">Deadline Alerts</h2>
                            <p className="text-[11px] text-muted mt-0.5">
                                {totalAlerts > 0 ? `${totalAlerts} item${totalAlerts > 1 ? 's' : ''} need${totalAlerts === 1 ? 's' : ''} attention` : 'All tasks on track'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-canvas-soft text-muted hover:text-ink transition-all duration-200">
                        <X size={16} />
                    </button>
                </div>

                {/* Health Score Card */}
                <div className="mx-5 mt-5 bg-canvas-soft rounded-lg p-4 border border-hairline flex items-center gap-4">
                    <div className="relative w-[64px] h-[64px] shrink-0">
                        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                            <circle cx="32" cy="32" r={radius} fill="none" stroke="#e6e5e0" strokeWidth="5" />
                            <circle cx="32" cy="32" r={radius} fill="none" stroke={healthColor} strokeWidth="5" strokeLinecap="round"
                                strokeDasharray={circumference} strokeDashoffset={mounted ? strokeDashoffset : circumference}
                                style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1) 0.1s, stroke 0.6s ease' }} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[13px] font-black text-ink">{healthScore}</span>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-ink">Deadline Health</p>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                style={{ color: healthColor, background: `${healthColor}18`, border: `1px solid ${healthColor}40` }}>
                                {healthLabel}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-error"></div><span className="text-[10px] text-muted">{overdue.length} overdue</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div><span className="text-[10px] text-muted">{dueToday.length} today</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-300"></div><span className="text-[10px] text-muted">{dueSoon.length} soon</span></div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto mt-5 px-5 pb-6 space-y-6 custom-scrollbar">
                    {totalAlerts === 0 && dueSoon.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                            <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                                <div className="absolute inset-0 rounded-full bg-success/10 animate-ping opacity-30"></div>
                                <div className="w-20 h-20 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                                    <CheckCircle2 size={36} className="text-success" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-ink mb-2">All Clear!</h3>
                            <p className="text-sm text-muted max-w-[240px] leading-relaxed">No overdue or upcoming deadlines. You're absolutely crushing it.</p>
                        </div>
                    ) : (
                        <>
                            {overdue.length > 0 && (
                                <div>
                                    <SectionHeader icon={AlertTriangle} label="Overdue" count={overdue.length} color="text-error" />
                                    <div className="space-y-2">{overdue.map(t => <TaskAlertCard key={t.id} task={t} tier="overdue" />)}</div>
                                </div>
                            )}
                            {dueToday.length > 0 && (
                                <div>
                                    <SectionHeader icon={Clock} label="Due Today" count={dueToday.length} color="text-amber-600" />
                                    <div className="space-y-2">{dueToday.map(t => <TaskAlertCard key={t.id} task={t} tier="today" />)}</div>
                                </div>
                            )}
                            {dueSoon.length > 0 && (
                                <div>
                                    <SectionHeader icon={Zap} label="Due Soon" count={dueSoon.length} color="text-amber-600" />
                                    <div className="space-y-2">{dueSoon.map(t => <TaskAlertCard key={t.id} task={t} tier="soon" />)}</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default OverdueAlertsPanel;
