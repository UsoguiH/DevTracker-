import React, { useEffect, useMemo, useState } from 'react';
import {
    AlignJustify, Archive, BarChart3, Calendar as CalendarIcon, CalendarDays, ChevronDown,
    ChevronLeft, ChevronRight, ClipboardList, Code2, FileText, GitBranch, GitCommit,
    GitPullRequest, Globe, KanbanSquare, Link2, MoreHorizontal, Package, Plus, Shield,
    Table, Target, UploadCloud, Briefcase
} from 'lucide-react';
import { Project, Status, Task, User, WorkflowStatus } from '../types';
import KanbanBoard from './KanbanBoard';
import JiraList from '../components/jira/JiraList';
import JiraTimeline from '../components/jira/JiraTimeline';
import { JAvatar, displayStatus, keyMapOf, statusChipStyle, uniqueAssignees, workflowOf } from '../components/jira/shared';

interface JiraProjectProps {
    project: Project;
    tasks: Task[];
    user: User;
    onMoveTask: (taskId: string, status: Status) => void;
    onQuickCreate: (data: Partial<Task>) => void;
    onOpenTask: (task: Task) => void;
    onUpdateProject: (project: Project) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onAddTask: (status: Status) => void;
    onCompleteSprint: (sprintName: string) => void;
    onViewHistory: () => void;
    onTabChange?: (tab: string) => void;
    requestedTab?: string;
}

const CORE_TABS = [
    { id: 'summary', label: 'Summary', icon: Globe },
    { id: 'list', label: 'List', icon: Table },
    { id: 'board', label: 'Kanban', icon: KanbanSquare },
    { id: 'code', label: 'Code', icon: Code2 },
    { id: 'forms', label: 'Forms', icon: ClipboardList },
    { id: 'timeline', label: 'Timeline', icon: CalendarDays },
    { id: 'docs', label: 'Docs', icon: FileText },
    { id: 'development', label: 'Development', icon: GitBranch },
];

// Views available from the "+" menu. Hovering shows the preview pane;
// "Add to navigation" pins the view as a tab.
const VIEWS = [
    { id: 'all-work', label: 'All work', icon: Briefcase, desc: 'View all the work items in your space. Use built-in filters and text search to find work items.' },
    { id: 'archived', label: 'Archived work items', icon: Archive, desc: 'Browse work items that were archived from your boards and restore them when needed.' },
    { id: 'backlog', label: 'Backlog', icon: AlignJustify, desc: 'Plan upcoming work. Prioritize the backlog and pull items into the board when ready.' },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon, desc: 'See work items laid out on a monthly calendar by due date to spot crunch weeks early.' },
    { id: 'deployments', label: 'Deployments', icon: UploadCloud, desc: 'Track deployments across environments once a CI/CD provider is connected.', badge: 'MOVING SOON' },
    { id: 'goals', label: 'Goals', icon: Target, desc: 'Connect work to goals so everyone understands why the work matters.' },
    { id: 'releases', label: 'Releases', icon: Package, desc: 'Bundle work items into versions and track what ships in each release.' },
    { id: 'reports', label: 'Reports', icon: BarChart3, desc: 'Burnups, velocity and cycle-time charts generated from your board activity.' },
    { id: 'security', label: 'Security', icon: Shield, desc: 'Surface vulnerabilities from connected security tools next to your work.', badge: 'MOVING SOON' },
    { id: 'shortcuts', label: 'Shortcuts', icon: Link2, desc: 'Pin links your team uses all the time — docs, dashboards, repos — to the project nav.' },
];

const JiraProject: React.FC<JiraProjectProps> = ({
    project, tasks, user, onMoveTask, onQuickCreate, onOpenTask, onUpdateProject,
    onUpdateTask, onAddTask, onCompleteSprint, onViewHistory, onTabChange, requestedTab
}) => {
    const storageKey = `devtrack-jira-tabs-${project.id}`;
    const [activeTab, setActiveTab] = useState(requestedTab || 'board');
    const [extraTabs, setExtraTabs] = useState<string[]>(() => {
        try {
            const stored: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
            // A deep-linked extra view is pinned from the very first render — no flash.
            if (requestedTab && VIEWS.some(v => v.id === requestedTab) && !stored.includes(requestedTab)) {
                stored.push(requestedTab);
            }
            return stored;
        } catch { return []; }
    });
    const [viewsOpen, setViewsOpen] = useState(false);
    const [previewView, setPreviewView] = useState(VIEWS[0]);
    const [integrationNote, setIntegrationNote] = useState<string | null>(null);

    useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(extraTabs)); }, [extraTabs, storageKey]);
    useEffect(() => { onTabChange?.(activeTab); }, [activeTab, onTabChange]);
    // Sidebar deep-links land here; extra views (Backlog, Calendar, …) get
    // pinned to the tab bar so the active view is visible.
    useEffect(() => {
        if (!requestedTab) return;
        if (VIEWS.some(v => v.id === requestedTab)) {
            setExtraTabs(prev => (prev.includes(requestedTab) ? prev : [...prev, requestedTab]));
        }
        setActiveTab(requestedTab);
    }, [requestedTab]);

    const workflow = useMemo(() => workflowOf(project), [project]);
    const keyMap = useMemo(() => keyMapOf(tasks, project.key || 'KAN'), [tasks, project.key]);

    const addToNavigation = (viewId: string) => {
        setExtraTabs(prev => (prev.includes(viewId) ? prev : [...prev, viewId]));
        setViewsOpen(false);
        setActiveTab(viewId);
    };

    const removeFromNavigation = (viewId: string) => {
        setExtraTabs(prev => prev.filter(v => v !== viewId));
        if (activeTab === viewId) setActiveTab('board');
    };

    const listProps = {
        tasks, workflow, keyMap, currentUser: user,
        onMoveTask, onQuickCreate, onOpenTask,
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'board':
                // The original sprint board, untouched — same design, same behavior.
                return (
                    <div className="h-[calc(100vh-230px)]">
                        <KanbanBoard
                            tasks={tasks}
                            onMoveTask={onMoveTask}
                            onAddTask={onAddTask}
                            onEditTask={onOpenTask}
                            onCompleteSprint={onCompleteSprint}
                            onViewHistory={onViewHistory}
                            workflow={project.workflow ?? undefined}
                        />
                    </div>
                );
            case 'list':
                return <JiraList {...listProps} />;
            case 'summary':
                return <JiraSummary tasks={tasks} workflow={workflow} />;
            case 'timeline':
                return (
                    <JiraTimeline
                        tasks={tasks} workflow={workflow} keyMap={keyMap} currentUser={user}
                        onOpenTask={onOpenTask} onUpdateTask={onUpdateTask} onQuickCreate={onQuickCreate}
                    />
                );
            case 'code':
                return <EmptyState icon={Code2} title="Connect your code" cta="Connect repository"
                    desc="Link commits, branches and pull requests to work items by connecting a source-code provider."
                    note={integrationNote} onCta={() => setIntegrationNote('Code integrations aren’t connected in this workspace yet.')} />;
            case 'forms':
                return <EmptyState icon={ClipboardList} title="Gather work requests with forms" cta="Create form"
                    desc="Build a form that creates work items on this board so requests arrive with everything you need."
                    note={integrationNote} onCta={() => setIntegrationNote('Forms aren’t enabled in this workspace yet.')} />;
            case 'docs':
                return <EmptyState icon={FileText} title="Keep specs next to the work" cta="Create doc"
                    desc="Draft specs, notes and decisions in docs that live alongside this project’s board."
                    note={integrationNote} onCta={() => setIntegrationNote('Docs aren’t enabled in this workspace yet.')} />;
            case 'development':
                return <DevelopmentPanel note={integrationNote} onCta={() => setIntegrationNote('Development tools aren’t connected in this workspace yet.')} />;
            case 'all-work':
                return <JiraList {...listProps} title="All work" />;
            case 'backlog':
                return <JiraList {...listProps} tasks={tasks.filter(t => t.status !== 'Done')} title="Backlog" />;
            case 'calendar':
                return <JiraCalendar tasks={tasks} workflow={workflow} keyMap={keyMap} onOpenTask={onOpenTask} />;
            default: {
                const view = VIEWS.find(v => v.id === activeTab);
                if (view) {
                    return <EmptyState icon={view.icon} title={view.label} desc={view.desc} cta="Learn more"
                        note={integrationNote} onCta={() => setIntegrationNote(`${view.label} isn’t available in this workspace yet.`)} />;
                }
                return null;
            }
        }
    };

    return (
        <div className="min-h-full bg-canvas px-8 pt-3 pb-10">
            {/* Title */}
            <div className="flex items-center justify-between mb-3 animate-slide-up">
                <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-md flex items-center justify-center bg-primary text-on-primary text-[11px] font-bold">
                        {(project.key || 'P').slice(0, 2)}
                    </span>
                    <h1 className="display text-[28px] text-ink">{project.name}</h1>
                </div>
                <button className="w-8 h-8 rounded-md hover:bg-surface-strong flex items-center justify-center text-body transition-colors">
                    <MoreHorizontal size={18} />
                </button>
            </div>

            {/* Tab bar — white toolbar so it reads clearly against the cream canvas */}
            <div className="inline-flex flex-wrap items-center gap-1 w-fit max-w-full bg-surface-card border border-hairline rounded-xl px-2 mb-6 relative z-40 animate-fade-in">
                {CORE_TABS.map(tab => (
                    <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setIntegrationNote(null); }} icon={tab.icon} label={tab.label} />
                ))}
                {extraTabs.map(id => {
                    const view = VIEWS.find(v => v.id === id);
                    if (!view) return null;
                    return (
                        <TabButton
                            key={id} active={activeTab === id} icon={view.icon} label={view.label}
                            onClick={() => { setActiveTab(id); setIntegrationNote(null); }}
                            onRemove={() => removeFromNavigation(id)}
                        />
                    );
                })}

                {/* "+" opens the Views menu */}
                <div className="relative">
                    <button
                        onClick={() => { setViewsOpen(o => !o); setPreviewView(VIEWS[0]); }}
                        className="px-2 py-2 my-1.5 rounded-md hover:bg-canvas-soft flex items-center text-body transition-colors"
                        title="More views"
                    >
                        <Plus size={16} />
                    </button>

                    {viewsOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setViewsOpen(false)} />
                            <div className="absolute left-0 top-11 z-40 flex bg-surface-card rounded-xl border border-hairline shadow-[0_24px_48px_-24px_rgba(38,37,30,0.4)] overflow-hidden animate-pop-in">
                                {/* Left: views list */}
                                <div className="w-[280px] max-h-[380px] overflow-y-auto custom-scrollbar py-2 border-r border-hairline-soft">
                                    <p className="px-4 pt-1.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Views</p>
                                    {VIEWS.map(view => (
                                        <button
                                            key={view.id}
                                            onMouseEnter={() => setPreviewView(view)}
                                            onClick={() => addToNavigation(view.id)}
                                            className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${previewView.id === view.id ? 'bg-canvas-soft' : 'hover:bg-canvas-soft/60'}`}
                                        >
                                            <view.icon size={16} className="text-body" />
                                            <span className="text-[14px] text-ink flex-1">{view.label}</span>
                                            {view.badge && (
                                                <span className="px-1.5 py-0.5 rounded bg-[#c08532]/15 text-[#8a5f24] text-[10px] font-bold tracking-wide">{view.badge}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Right: preview pane */}
                                <div className="w-[300px] p-6 flex flex-col">
                                    <div className="h-[120px] rounded-lg bg-[#9fbbe0]/30 mb-5 flex items-center justify-center overflow-hidden">
                                        <div className="w-[200px] h-[88px] bg-surface-card rounded-md border border-hairline p-2.5">
                                            <div className="flex gap-1 mb-2">
                                                <span className="w-7 h-2 rounded-sm bg-primary" />
                                                <span className="w-5 h-2 rounded-sm bg-surface-strong" />
                                                <span className="w-6 h-2 rounded-sm bg-surface-strong" />
                                            </div>
                                            <div className="flex gap-1.5">
                                                {['#807d72', '#c08532', '#9fc9a2'].map((dot, i) => (
                                                    <div key={i} className="flex-1 bg-canvas-soft rounded-[3px] p-1.5 border border-hairline-soft">
                                                        <span className="block w-2 h-2 rounded-full mb-1.5" style={{ background: dot }} />
                                                        <span className="block w-full h-1.5 rounded-sm bg-surface-strong" />
                                                        <span className="block w-2/3 h-1.5 rounded-sm bg-surface-strong mt-1" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-[16px] font-semibold text-ink mb-1.5">{previewView.label}</h3>
                                    <p className="text-[13px] leading-relaxed text-body mb-4 flex-1">{previewView.desc}</p>
                                    <button
                                        onClick={() => addToNavigation(previewView.id)}
                                        disabled={extraTabs.includes(previewView.id)}
                                        className="self-start h-8 px-3 rounded-md text-[13px] font-medium bg-primary text-on-primary hover:bg-primary-active disabled:opacity-50 transition-colors"
                                    >
                                        {extraTabs.includes(previewView.id) ? 'Added to navigation' : 'Add to navigation'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {renderTab()}
        </div>
    );
};

/* ── Tab button ── */
const TabButton: React.FC<{
    active: boolean; icon: any; label: string; onClick: () => void; onRemove?: () => void;
}> = ({ active, icon: Icon, label, onClick, onRemove }) => (
    <button
        onClick={onClick}
        className={`group px-3 py-2 my-1.5 flex items-center gap-1.5 text-[14px] font-medium rounded-md whitespace-nowrap transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-body hover:bg-canvas-soft'}`}
    >
        <Icon size={15} />
        {label}
        {onRemove && (
            <span
                onClick={e => { e.stopPropagation(); onRemove(); }}
                className="ml-0.5 hidden group-hover:inline-flex w-4 h-4 rounded-full hover:bg-surface-strong items-center justify-center text-[10px]"
                title={`Remove ${label} from navigation`}
            >
                ✕
            </span>
        )}
    </button>
);

/* ── Summary tab ── */
const JiraSummary: React.FC<{ tasks: Task[]; workflow: WorkflowStatus[] }> = ({ tasks, workflow }) => {
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const now = Date.now();
    const overdue = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate).getTime() < now).length;
    const doneLast7 = tasks.filter(t => t.completedAt && now - new Date(t.completedAt).getTime() < 7 * 86400000).length;

    const segments = workflow.map(w => ({
        label: displayStatus(w.name),
        count: tasks.filter(t => t.status === w.name).length,
        color: w.color,
    }));

    let acc = 0;
    const stops = segments.filter(s => s.count > 0).map(s => {
        const from = (acc / Math.max(total, 1)) * 360;
        acc += s.count;
        const to = (acc / Math.max(total, 1)) * 360;
        return `${s.color} ${from}deg ${to}deg`;
    }).join(', ');

    const priorities = (['High', 'Medium', 'Low'] as const).map(p => ({
        p, count: tasks.filter(t => t.priority === p).length,
    }));
    const maxPriority = Math.max(...priorities.map(x => x.count), 1);

    const members = uniqueAssignees(tasks).map(u => ({
        user: u, count: tasks.filter(t => t.assignees.some(a => a.id === u.id)).length,
    })).sort((a, b) => b.count - a.count);

    const tiles = [
        { label: 'total work items', value: total, color: '#9fbbe0' },
        { label: 'completed last 7 days', value: doneLast7, color: '#9fc9a2' },
        { label: 'in progress', value: inProgress, color: '#c08532' },
        { label: 'overdue', value: overdue, color: '#cf2d56' },
    ];

    const card = 'bg-surface-card border border-hairline rounded-xl';

    return (
        <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {tiles.map(t => (
                    <div key={t.label} className={`${card} p-4 flex items-center gap-3`}>
                        <span className="w-2 h-10 rounded-full shrink-0" style={{ background: t.color }} />
                        <div>
                            <div className="text-[26px] font-semibold leading-tight text-ink tracking-tight">{t.value}</div>
                            <div className="text-[12px] text-muted">{t.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Status overview */}
                <div className={`${card} p-5`}>
                    <h3 className="text-[15px] font-semibold text-ink mb-1">Status overview</h3>
                    <p className="text-[12px] text-muted mb-5">A snapshot of the status of your work items.</p>
                    <div className="flex items-center gap-8">
                        <div className="relative w-[140px] h-[140px] rounded-full shrink-0" style={{ background: total ? `conic-gradient(${stops})` : '#e6e5e0' }}>
                            <div className="absolute inset-[22px] bg-surface-card rounded-full flex flex-col items-center justify-center">
                                <span className="text-[24px] font-semibold leading-none text-ink">{total}</span>
                                <span className="text-[11px] text-muted">Total</span>
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            {segments.map(s => (
                                <div key={s.label} className="flex items-center gap-2 text-[13px] text-body">
                                    <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: s.color }} />
                                    {s.label}: <span className="font-semibold text-ink">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Priority breakdown */}
                <div className={`${card} p-5`}>
                    <h3 className="text-[15px] font-semibold text-ink mb-1">Priority breakdown</h3>
                    <p className="text-[12px] text-muted mb-5">How work is distributed across priorities.</p>
                    <div className="space-y-4 pt-2">
                        {priorities.map(({ p, count }) => (
                            <div key={p}>
                                <div className="flex justify-between text-[12px] text-body mb-1">
                                    <span>{p}</span><span>{count}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-surface-strong overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${(count / maxPriority) * 100}%`, background: p === 'High' ? '#cf2d56' : p === 'Medium' ? '#c08532' : '#9fbbe0' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Team workload */}
            <div className={`${card} p-5`}>
                <h3 className="text-[15px] font-semibold text-ink mb-1">Team workload</h3>
                <p className="text-[12px] text-muted mb-4">How work items are assigned across the team.</p>
                {members.length === 0 ? (
                    <p className="text-[13px] text-muted py-4">No assigned work items yet.</p>
                ) : members.map(({ user: u, count }) => (
                    <div key={u.id} className="flex items-center gap-3 py-2">
                        <JAvatar user={u} size={26} />
                        <span className="text-[13px] text-ink w-36 truncate">{u.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-surface-strong overflow-hidden">
                            <div className="h-full rounded-full bg-[#9fbbe0]" style={{ width: `${(count / Math.max(total, 1)) * 100}%` }} />
                        </div>
                        <span className="text-[12px] text-muted w-10 text-right">{Math.round((count / Math.max(total, 1)) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ── Calendar view ── */
const JiraCalendar: React.FC<{
    tasks: Task[]; workflow: WorkflowStatus[]; keyMap: Map<string, string>; onOpenTask: (t: Task) => void;
}> = ({ tasks, workflow, keyMap, onOpenTask }) => {
    const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

    const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstWeekday = cursor.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const tasksOn = (d: Date) => tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due.getFullYear() === d.getFullYear() && due.getMonth() === d.getMonth() && due.getDate() === d.getDate();
    });

    const today = new Date();
    const isToday = (d: Date) => d.toDateString() === today.toDateString();

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="display text-[20px] text-ink">{monthLabel}</h2>
                <div className="flex items-center gap-1">
                    <button onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))} className="w-8 h-8 rounded-md hover:bg-surface-strong flex items-center justify-center text-body"><ChevronLeft size={16} /></button>
                    <button onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="h-8 px-3 rounded-md border border-hairline-strong text-[13px] font-medium text-body hover:bg-canvas-soft">Today</button>
                    <button onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))} className="w-8 h-8 rounded-md hover:bg-surface-strong flex items-center justify-center text-body"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 border-l border-t border-hairline rounded-xl overflow-hidden bg-surface-card">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] border-r border-b border-hairline bg-canvas-soft text-muted">{d}</div>
                ))}
                {cells.map((d, i) => (
                    <div key={i} className="min-h-[92px] p-1.5 border-r border-b border-hairline-soft bg-surface-card">
                        {d && (
                            <>
                                <span className={`inline-flex items-center justify-center text-[12px] mb-1 ${isToday(d) ? 'w-6 h-6 rounded-full bg-primary text-on-primary font-semibold' : 'text-body'}`}>
                                    {d.getDate()}
                                </span>
                                {tasksOn(d).slice(0, 3).map(t => {
                                    const col = workflow.find(w => w.name === t.status);
                                    return (
                                        <button key={t.id} onClick={() => onOpenTask(t)} className="w-full text-left mb-1 px-1.5 py-1 rounded text-[11px] font-medium truncate block hover:opacity-80" style={statusChipStyle(col?.type || 'start')} title={`${keyMap.get(t.id)} ${t.title}`}>
                                            {keyMap.get(t.id)} · {t.title}
                                        </button>
                                    );
                                })}
                                {tasksOn(d).length > 3 && <span className="text-[11px] text-muted">+{tasksOn(d).length - 3} more</span>}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ── Empty states for integration tabs ── */
const EmptyState: React.FC<{
    icon: any; title: string; desc: string; cta: string; note: string | null; onCta: () => void;
}> = ({ icon: Icon, title, desc, cta, note, onCta }) => (
    <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="w-16 h-16 rounded-full bg-[#9fbbe0]/25 flex items-center justify-center mb-5">
            <Icon size={28} className="text-ink" />
        </div>
        <h3 className="display text-[20px] text-ink mb-2">{title}</h3>
        <p className="text-[14px] text-body max-w-[400px] leading-relaxed mb-5">{desc}</p>
        <button onClick={onCta} className="h-9 px-4 rounded-md text-[14px] font-medium bg-primary text-on-primary hover:bg-primary-active transition-colors">{cta}</button>
        {note && <p className="mt-4 text-[13px] px-3 py-2 rounded-md bg-[#c08532]/12 text-[#8a5f24] border border-[#c08532]/25">{note}</p>}
    </div>
);

const DevelopmentPanel: React.FC<{ note: string | null; onCta: () => void }> = ({ note, onCta }) => (
    <div className="max-w-[640px]">
        <div className="bg-surface-card border border-hairline rounded-xl divide-y divide-hairline-soft mb-6">
            {[
                { icon: GitBranch, label: 'Branches', count: 0 },
                { icon: GitCommit, label: 'Commits', count: 0 },
                { icon: GitPullRequest, label: 'Pull requests', count: 0 },
            ].map(row => (
                <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                    <row.icon size={16} className="text-body" />
                    <span className="text-[14px] text-ink flex-1">{row.label}</span>
                    <span className="text-[13px] font-semibold text-muted">{row.count}</span>
                    <ChevronDown size={14} className="-rotate-90 text-muted-soft" />
                </div>
            ))}
        </div>
        <EmptyState
            icon={GitBranch} title="Connect your development tools" cta="Connect tools"
            desc="See branches, commits and pull requests linked to work items once a Git provider is connected."
            note={note} onCta={onCta}
        />
    </div>
);

export default JiraProject;
