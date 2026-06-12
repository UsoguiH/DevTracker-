import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { Status, Task, User, WorkflowStatus } from '../../types';
import { JAvatar, PriorityIcon, TypeIcon, displayStatus, statusChipStyle } from './shared';

interface JiraListProps {
    tasks: Task[];
    workflow: WorkflowStatus[];
    keyMap: Map<string, string>;
    currentUser: User;
    onMoveTask: (taskId: string, status: Status) => void;
    onQuickCreate: (data: Partial<Task>) => void;
    onOpenTask: (task: Task) => void;
    title?: string;
}

const JiraList: React.FC<JiraListProps> = ({
    tasks, workflow, keyMap, currentUser, onMoveTask, onQuickCreate, onOpenTask, title
}) => {
    const [search, setSearch] = useState('');
    const [statusMenuFor, setStatusMenuFor] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');

    const rows = useMemo(() => tasks.filter(t => {
        const q = search.trim().toLowerCase();
        return !q || `${t.title} ${keyMap.get(t.id) || ''}`.toLowerCase().includes(q);
    }), [tasks, search, keyMap]);

    const colOf = (status: string) => workflow.find(w => w.name === status);

    const submitCreate = () => {
        const t = newTitle.trim();
        if (!t) return;
        onQuickCreate({ title: t, status: 'To Do', assignees: [currentUser] });
        setNewTitle('');
    };

    const fmtDate = (iso?: string) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {title && <h2 className="display text-[20px] text-ink">{title}</h2>}
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search list"
                            className="w-[200px] h-8 pl-8 pr-2 rounded-md border border-hairline-strong text-[13px] text-ink placeholder-muted-soft bg-surface-card outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                    </div>
                </div>
                <span className="text-[12px] text-muted">{rows.length} work item{rows.length === 1 ? '' : 's'}</span>
            </div>

            <div className="border border-hairline rounded-xl overflow-hidden bg-surface-card">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-hairline bg-canvas-soft">
                            {['Type', 'Key', 'Summary', 'Status', 'Priority', 'Assignee', 'Due date'].map(h => (
                                <th key={h} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(task => {
                            const col = colOf(task.status);
                            return (
                                <tr
                                    key={task.id}
                                    onClick={() => onOpenTask(task)}
                                    className="border-b border-hairline-soft last:border-b-0 hover:bg-canvas-soft cursor-pointer transition-colors"
                                >
                                    <td className="px-3 py-2 w-10"><TypeIcon /></td>
                                    <td className="px-3 py-2 w-24 text-[12px] font-mono text-muted whitespace-nowrap">{keyMap.get(task.id)}</td>
                                    <td className="px-3 py-2 text-[14px] text-ink max-w-[360px] truncate">{task.title}</td>
                                    <td className="px-3 py-2 w-36 relative" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => setStatusMenuFor(statusMenuFor === task.id ? null : task.id)}
                                            className="h-6 pl-2 pr-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:opacity-80"
                                            style={statusChipStyle(col?.type || 'start')}
                                        >
                                            {displayStatus(task.status)} <ChevronDown size={12} />
                                        </button>
                                        {statusMenuFor === task.id && (
                                            <>
                                                <div className="fixed inset-0 z-30" onClick={() => setStatusMenuFor(null)} />
                                                <div className="absolute left-3 top-8 z-40 w-[180px] bg-surface-card rounded-lg border border-hairline shadow-[0_12px_28px_-12px_rgba(38,37,30,0.35)] py-1.5">
                                                    {workflow.map(w => (
                                                        <button
                                                            key={w.id}
                                                            onClick={() => { onMoveTask(task.id, w.name as Status); setStatusMenuFor(null); }}
                                                            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-canvas-soft"
                                                        >
                                                            <span className="h-5 px-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center" style={statusChipStyle(w.type)}>
                                                                {displayStatus(w.name)}
                                                            </span>
                                                            {task.status === w.name && <Check size={14} className="text-primary" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 w-28">
                                        <span className="flex items-center gap-1.5 text-[13px] text-body">
                                            <PriorityIcon p={task.priority} size={14} /> {task.priority}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 w-28">
                                        <span className="flex items-center gap-1.5">
                                            <JAvatar user={task.assignees[0]} size={22} />
                                            <span className="text-[13px] text-body truncate max-w-[90px]">{task.assignees[0]?.name || 'Unassigned'}</span>
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 w-24 text-[13px] text-body whitespace-nowrap">{fmtDate(task.dueDate)}</td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-3 py-10 text-center text-[13px] text-muted">
                                    No work items match your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Inline create row */}
                <div className="border-t border-hairline-soft">
                    {creating ? (
                        <div className="flex items-center gap-2 px-3 py-1.5">
                            <TypeIcon />
                            <input
                                autoFocus
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') submitCreate();
                                    if (e.key === 'Escape') { setCreating(false); setNewTitle(''); }
                                }}
                                placeholder="What needs to be done?"
                                className="flex-1 h-8 px-2 text-[14px] text-ink outline-none rounded-md border border-primary"
                            />
                            <button onClick={submitCreate} disabled={!newTitle.trim()} className="h-7 px-3 rounded-md text-[13px] font-medium bg-primary text-on-primary hover:bg-primary-active disabled:opacity-50">Create</button>
                        </div>
                    ) : (
                        <button onClick={() => setCreating(true)} className="w-full px-3 py-2 flex items-center gap-1.5 text-[14px] font-medium text-body hover:bg-canvas-soft transition-colors">
                            <Plus size={16} /> Create
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JiraList;
