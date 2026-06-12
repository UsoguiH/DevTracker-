import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Task, User, WorkflowStatus } from '../../types';
import { J, TypeIcon, displayStatus } from './shared';

interface JiraTimelineProps {
    tasks: Task[];
    workflow: WorkflowStatus[];
    keyMap: Map<string, string>;
    currentUser: User;
    onOpenTask: (task: Task) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onQuickCreate: (data: Partial<Task>) => void;
}

type Zoom = 'weeks' | 'months' | 'quarters';
const DAY_W: Record<Zoom, number> = { weeks: 28, months: 9, quarters: 3.5 };
const ROW_H = 44;
const LEFT_W = 300;
const MS_DAY = 86400000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseDate = (iso?: string): Date | null => {
    if (!iso) return null;
    const p = iso.split('T')[0].split('-');
    if (p.length === 3) return new Date(+p[0], +p[1] - 1, +p[2]);
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : startOfDay(d);
};
const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / MS_DAY);

const taskSpan = (t: Task): { start: Date; end: Date } | null => {
    const end = parseDate(t.endDate) || parseDate(t.dueDate);
    const start = parseDate(t.startDate) || (end ? addDays(end, -(t.durationDays || 3)) : null);
    if (!start) return null;
    const safeEnd = end && end >= start ? end : addDays(start, t.durationDays || 3);
    return { start, end: safeEnd };
};

interface DragState {
    taskId: string;
    mode: 'move' | 'resize-start' | 'resize-end';
    originX: number;
    start: Date;
    end: Date;
    deltaDays: number;
    moved: boolean;
}

const JiraTimeline: React.FC<JiraTimelineProps> = ({
    tasks, workflow, keyMap, currentUser, onOpenTask, onUpdateTask, onQuickCreate
}) => {
    const [zoom, setZoom] = useState<Zoom>('months');
    const [drag, setDrag] = useState<DragState | null>(null);
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const dayW = DAY_W[zoom];
    const today = startOfDay(new Date());

    // Range: cover all task dates with breathing room, always include today.
    const { rangeStart, totalDays, months } = useMemo(() => {
        let min = addDays(today, -45), max = addDays(today, 100);
        tasks.forEach(t => {
            const span = taskSpan(t);
            if (span) {
                if (span.start < min) min = span.start;
                if (span.end > max) max = span.end;
            }
        });
        const start = new Date(min.getFullYear(), min.getMonth() - 1, 1);
        const endExclusive = new Date(max.getFullYear(), max.getMonth() + 3, 1);
        const list: { label: string; days: number }[] = [];
        for (let c = new Date(start); c < endExclusive; c = new Date(c.getFullYear(), c.getMonth() + 1, 1)) {
            list.push({
                label: c.toLocaleDateString('en-US', { month: 'short', year: c.getMonth() === 0 ? 'numeric' : undefined }),
                days: new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate(),
            });
        }
        return { rangeStart: start, totalDays: daysBetween(start, endExclusive), months: list };
    }, [tasks, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

    const px = (d: Date) => daysBetween(rangeStart, d) * dayW;

    const scrollToToday = () => {
        const el = scrollRef.current;
        if (el) el.scrollLeft = Math.max(0, px(today) - (el.clientWidth - LEFT_W) / 2);
    };
    useEffect(() => { scrollToToday(); }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

    // Drag / resize handling
    useEffect(() => {
        if (!drag) return;
        const onMove = (e: PointerEvent) => {
            const deltaDays = Math.round((e.clientX - drag.originX) / dayW);
            setDrag(d => d && { ...d, deltaDays, moved: d.moved || Math.abs(e.clientX - d.originX) > 3 });
        };
        const onUp = () => {
            setDrag(d => {
                if (d && d.moved && d.deltaDays !== 0) {
                    let { start, end } = d;
                    if (d.mode === 'move') { start = addDays(start, d.deltaDays); end = addDays(end, d.deltaDays); }
                    if (d.mode === 'resize-start') { start = addDays(start, d.deltaDays); if (start > end) start = end; }
                    if (d.mode === 'resize-end') { end = addDays(end, d.deltaDays); if (end < start) end = start; }
                    onUpdateTask(d.taskId, {
                        startDate: toISO(start),
                        endDate: toISO(end),
                        durationDays: daysBetween(start, end) || 1,
                    });
                }
                return null;
            });
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    }, [drag?.taskId, drag?.originX, dayW, onUpdateTask]); // eslint-disable-line react-hooks/exhaustive-deps

    const beginDrag = (e: React.PointerEvent, task: Task, mode: DragState['mode']) => {
        const span = taskSpan(task);
        if (!span) return;
        e.preventDefault();
        e.stopPropagation();
        setDrag({ taskId: task.id, mode, originX: e.clientX, start: span.start, end: span.end, deltaDays: 0, moved: false });
    };

    const submitCreate = () => {
        const t = newTitle.trim();
        if (!t) return;
        onQuickCreate({
            title: t, status: 'To Do', assignees: [currentUser],
            startDate: toISO(today), endDate: toISO(addDays(today, 3)), durationDays: 3,
        });
        setNewTitle('');
    };

    const barColor = (t: Task) => workflow.find(w => w.name === t.status)?.color || '#cfcdc4';

    const chartW = totalDays * dayW;

    return (
        <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 248px)' }}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-hairline shrink-0">
                <span className="text-[12px] text-muted">
                    Drag bars to reschedule · drag edges to change duration · click to open
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={scrollToToday} className="h-7 px-3 rounded-md border border-hairline-strong text-[12px] font-medium text-body hover:bg-canvas-soft transition-colors">
                        Today
                    </button>
                    <div className="flex rounded-md border border-hairline-strong overflow-hidden">
                        {(['weeks', 'months', 'quarters'] as Zoom[]).map(z => (
                            <button
                                key={z}
                                onClick={() => setZoom(z)}
                                className={`h-7 px-3 text-[12px] font-medium capitalize transition-colors ${zoom === z ? 'bg-ink text-canvas' : 'text-body hover:bg-canvas-soft'}`}
                            >
                                {z}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div ref={scrollRef} className="flex-1 overflow-auto custom-scrollbar relative">
                <div style={{ width: LEFT_W + chartW, minHeight: '100%' }}>
                    {/* Header row */}
                    <div className="flex sticky top-0 z-30 bg-surface-card border-b border-hairline" style={{ height: 36 }}>
                        <div className="sticky left-0 z-10 bg-surface-card border-r border-hairline flex items-center px-4 shrink-0" style={{ width: LEFT_W }}>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Work items</span>
                        </div>
                        <div className="flex">
                            {months.map((m, i) => (
                                <div key={i} className="border-r border-hairline-soft flex items-center px-2 shrink-0" style={{ width: m.days * dayW }}>
                                    <span className="text-[11px] font-medium text-muted whitespace-nowrap">{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="relative">
                        {/* Month gridlines + today marker, behind rows */}
                        <div className="absolute inset-y-0 pointer-events-none" style={{ left: LEFT_W, width: chartW }}>
                            {months.reduce<{ acc: number; nodes: React.ReactNode[] }>((s, m, i) => {
                                s.nodes.push(<div key={i} className="absolute inset-y-0 border-r border-hairline-soft" style={{ left: s.acc + m.days * dayW }} />);
                                s.acc += m.days * dayW;
                                return s;
                            }, { acc: 0, nodes: [] }).nodes}
                            <div className="absolute inset-y-0 w-px bg-primary z-10" style={{ left: px(today) + dayW / 2 }}>
                                <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
                            </div>
                        </div>

                        {tasks.map(task => {
                            const span = taskSpan(task);
                            const isDragging = drag?.taskId === task.id;
                            let start = span?.start, end = span?.end;
                            if (span && isDragging && drag) {
                                if (drag.mode !== 'resize-end') start = addDays(span.start, drag.mode === 'move' || drag.mode === 'resize-start' ? drag.deltaDays : 0);
                                if (drag.mode !== 'resize-start') end = addDays(span.end, drag.mode === 'move' || drag.mode === 'resize-end' ? drag.deltaDays : 0);
                                if (start! > end!) { if (drag.mode === 'resize-start') start = end; else end = start; }
                            }
                            const col = workflow.find(w => w.name === task.status);

                            return (
                                <div key={task.id} className="flex border-b border-hairline-soft group" style={{ height: ROW_H }}>
                                    {/* Left: work item cell */}
                                    <div
                                        onClick={() => onOpenTask(task)}
                                        className="sticky left-0 z-20 bg-surface-card group-hover:bg-canvas-soft border-r border-hairline flex items-center gap-2 px-4 shrink-0 cursor-pointer transition-colors"
                                        style={{ width: LEFT_W }}
                                    >
                                        <TypeIcon size={15} />
                                        <span className="text-[11px] font-mono text-muted shrink-0">{keyMap.get(task.id)}</span>
                                        <span className={`text-[13px] truncate ${task.status === 'Done' ? 'line-through text-muted-soft' : 'text-ink'}`}>{task.title}</span>
                                    </div>

                                    {/* Right: bar lane */}
                                    <div className="relative flex-1">
                                        {span && start && end ? (
                                            <div
                                                onPointerDown={e => beginDrag(e, task, 'move')}
                                                onClick={() => { if (!drag?.moved) onOpenTask(task); }}
                                                title={`${keyMap.get(task.id)} · ${displayStatus(task.status)}`}
                                                className={`absolute top-1/2 -translate-y-1/2 h-[22px] rounded-full cursor-grab active:cursor-grabbing flex items-center px-2 select-none ${isDragging ? 'ring-2 ring-primary z-20' : 'hover:ring-1 hover:ring-ink/30'}`}
                                                style={{
                                                    left: px(start),
                                                    width: Math.max((daysBetween(start, end) + 1) * dayW, 14),
                                                    background: barColor(task),
                                                    opacity: task.status === 'Done' ? 0.55 : 1,
                                                }}
                                            >
                                                {/* resize handles */}
                                                <span onPointerDown={e => beginDrag(e, task, 'resize-start')} className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-full" />
                                                <span onPointerDown={e => beginDrag(e, task, 'resize-end')} className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-full" />
                                                {(daysBetween(start, end) + 1) * dayW > 70 && (
                                                    <span className="text-[10px] font-semibold text-white/95 truncate drop-shadow-sm">{task.title}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => onUpdateTask(task.id, { startDate: toISO(today), endDate: toISO(addDays(today, 3)), durationDays: 3 })}
                                                className="absolute top-1/2 -translate-y-1/2 h-[22px] px-2.5 rounded-full border border-dashed border-hairline-strong text-[11px] text-muted opacity-0 group-hover:opacity-100 hover:border-primary hover:text-primary transition-all"
                                                style={{ left: px(today) - 30 }}
                                            >
                                                + Add dates
                                            </button>
                                        )}
                                        {col?.type === 'active' && span && !isDragging && (
                                            <span className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full animate-pulse" style={{ left: px(start!) - 8, background: col.color }} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Create row */}
                        <div className="flex" style={{ height: ROW_H }}>
                            <div className="sticky left-0 z-20 bg-surface-card border-r border-hairline flex items-center px-2 shrink-0" style={{ width: LEFT_W }}>
                                {creating ? (
                                    <div className="flex items-center gap-2 w-full pl-2">
                                        <TypeIcon size={15} />
                                        <input
                                            autoFocus
                                            value={newTitle}
                                            onChange={e => setNewTitle(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') submitCreate();
                                                if (e.key === 'Escape') { setCreating(false); setNewTitle(''); }
                                            }}
                                            onBlur={() => { if (!newTitle.trim()) setCreating(false); }}
                                            placeholder="What needs to be done?"
                                            className="flex-1 h-7 px-2 text-[13px] text-ink bg-surface-card border border-primary rounded-md outline-none placeholder-muted-soft"
                                        />
                                    </div>
                                ) : (
                                    <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-body hover:bg-canvas-soft w-full transition-colors">
                                        <Plus size={15} /> Create work item
                                    </button>
                                )}
                            </div>
                            <div className="flex-1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-hairline shrink-0">
                {workflow.map(w => (
                    <span key={w.id} className="flex items-center gap-1.5 text-[11px] text-muted">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: w.color }} />
                        {displayStatus(w.name)}
                    </span>
                ))}
                <span className="flex items-center gap-1.5 text-[11px] text-muted ml-auto">
                    <span className="w-px h-3 bg-primary" /> Today
                </span>
            </div>
        </div>
    );
};

export default JiraTimeline;
