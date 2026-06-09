import React, { useState } from 'react';
import { MoreHorizontal, Plus, Clock, MessageSquare, CheckSquare, X, History, Percent } from 'lucide-react';
import { Task, Status, WorkflowStatus, DEFAULT_WORKFLOW } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface KanbanBoardProps {
    tasks: Task[];
    onMoveTask: (taskId: string, newStatus: string) => void;
    onAddTask: (status: Status) => void;
    onEditTask: (task: Task) => void;
    onCompleteSprint: (sprintName: string) => void;
    onViewHistory: () => void;
    workflow?: WorkflowStatus[];
}

// Extracted Card Component for cleaner separation of drag logic vs visual logic
const TaskCard = ({ task, isDragging, onClick, columnColor }: { task: Task; isDragging: boolean; onClick: () => void; columnColor: string; }) => {
    // Light pastel chips with dark text — readable on the cream/white card.
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-primary/10 text-primary border border-primary/25';
            case 'Medium': return 'bg-amber-100 text-amber-700 border border-amber-200';
            case 'Low': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
            default: return 'bg-surface-strong text-body border border-hairline';
        }
    };

    const isOverdue = (() => {
        if (task.status === 'Done') return false;
        const dateStr = task.dueDate || task.endDate;
        if (!dateStr) return false;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const parts = dateStr.split('-');
        const d = parts.length === 3
            ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
            : new Date(dateStr);
        return d < today;
    })();

    const isDueToday = (() => {
        if (task.status === 'Done' || isOverdue) return false;
        const dateStr = task.dueDate || task.endDate;
        if (!dateStr) return false;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const parts = dateStr.split('-');
        const d = parts.length === 3
            ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
            : new Date(dateStr);
        return d.getTime() === today.getTime();
    })();

    return (
        <div
            onClick={onClick}
            className={`
                bg-surface-card border p-4 rounded-lg group relative
                overflow-hidden select-none w-full
                ${isOverdue ? 'border-error/40' : isDueToday ? 'border-amber-300' : 'border-hairline'}
                ${isDragging
                    ? 'shadow-[0_12px_28px_-12px_rgba(38,37,30,0.35)] ring-1 ring-primary scale-[1.02] z-50'
                    : 'hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-200'
                }
            `}
        >
            {/* Status color bar — turns red if overdue */}
            <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg transition-all duration-300"
                style={{ background: isOverdue ? '#cf2d56' : isDueToday ? '#c08532' : columnColor }}
            ></div>

            <div className="flex justify-between items-start mb-3 pt-2">
                <span className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                </span>
                <div className="flex items-center gap-1.5">
                    {isOverdue && (
                        <span className="text-[9px] font-bold text-error bg-error/10 border border-error/25 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Overdue
                        </span>
                    )}
                    {isDueToday && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Due Today
                        </span>
                    )}
                    {task.status === 'In Progress' && !isOverdue && !isDueToday && (
                        <span className="text-[10px] font-mono text-tl-read bg-tl-read/15 px-2 py-0.5 rounded">IN DEV</span>
                    )}
                </div>
                <button className="text-muted-soft hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal size={14} />
                </button>
            </div>

            <h3 className={`font-semibold text-sm mb-2 leading-snug ${task.status === 'Done' ? 'line-through text-muted-soft' : 'text-ink'}`}>
                {task.title}
            </h3>

            {task.status !== 'Done' && <p className="text-xs text-muted mb-4 line-clamp-2">{task.description}</p>}

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
                {task.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded border border-hairline bg-canvas-soft text-body">
                        {tag.name}
                    </span>
                ))}
            </div>

            {/* Progress Bar (Visible if > 0) */}
            {(task.progress || 0) > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-muted mb-1">
                        <span className="flex items-center gap-1"><Percent size={10} /> Progress</span>
                        <span>{task.progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-surface-strong rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${task.progress}%` }}></div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-hairline pt-3 mt-auto">
                <div className="flex -space-x-2">
                    {task.assignees.map((u, i) => (
                        <img key={i} src={u.avatar} alt={u.name} className={`w-6 h-6 rounded-full border-2 border-surface-card ${task.status === 'Done' ? 'grayscale opacity-50' : ''}`} />
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-muted text-xs">
                        <Clock size={12} />
                        <span>{task.estimatedTime}</span>
                    </div>
                    {task.subtasks && task.subtasks.length > 0 && (
                        <div className="flex items-center gap-1 text-muted text-xs" title={`${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} Subtasks`}>
                            <CheckSquare size={12} />
                            <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                        </div>
                    )}
                    {task.comments && task.comments.length > 0 && (
                        <div className="flex items-center gap-1 text-muted text-xs hover:text-ink transition-colors">
                            <MessageSquare size={12} />
                            <span>{task.comments.length}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onMoveTask, onAddTask, onEditTask, onCompleteSprint, onViewHistory, workflow }) => {
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [sprintName, setSprintName] = useState('');

    const activeWorkflow = (workflow && workflow.length > 0 ? workflow : DEFAULT_WORKFLOW)
        .slice().sort((a, b) => a.order - b.order);

    const handleDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        if (destination.droppableId !== source.droppableId) {
            onMoveTask(draggableId, destination.droppableId as Status);
        }
    };

    const handleCompleteClick = () => {
        const doneTasks = tasks.filter(t => t.status === 'Done');
        if (doneTasks.length === 0) {
            alert("No tasks in 'Done' to archive. Complete some tasks first!");
            return;
        }
        const date = new Date();
        setSprintName(`Sprint ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        setIsCompleteModalOpen(true);
    };

    const confirmCompleteSprint = (e: React.FormEvent) => {
        e.preventDefault();
        if (sprintName.trim()) {
            onCompleteSprint(sprintName);
            setIsCompleteModalOpen(false);
            setSprintName('');
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            {/* Sprint Completion Modal */}
            {isCompleteModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-surface-card border border-hairline p-6 rounded-xl w-full max-w-sm animate-pop-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="display text-lg text-ink">Complete sprint</h3>
                            <button onClick={() => setIsCompleteModalOpen(false)} className="text-muted hover:text-ink">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-body mb-4">
                            {tasks.filter(t => t.status === 'Done').length} tasks will be archived.
                            {' '}{tasks.filter(t => t.status !== 'Done').length} tasks will remain active.
                        </p>
                        <form onSubmit={confirmCompleteSprint}>
                            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">Sprint name</label>
                            <input
                                type="text"
                                value={sprintName}
                                onChange={(e) => setSprintName(e.target.value)}
                                className="w-full bg-surface-card border border-hairline-strong rounded-md px-4 py-2.5 text-ink focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none mb-6"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCompleteModalOpen(false)}
                                    className="flex-1 py-2 rounded-md text-sm font-medium text-body hover:bg-canvas-soft border border-hairline-strong transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 rounded-md text-sm font-medium bg-primary text-on-primary hover:bg-primary-active transition-colors"
                                >
                                    Complete
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 animate-slide-up">
                <div>
                    <h1 className="display text-[28px] text-ink mb-1">Sprint board</h1>
                    <p className="text-sm text-body">Manage your current active tasks</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onViewHistory}
                        className="p-2 text-muted hover:text-ink hover:bg-canvas-soft rounded-md transition-colors"
                        title="View Sprint History"
                    >
                        <History size={20} />
                    </button>
                    <button
                        onClick={handleCompleteClick}
                        className="bg-ink text-canvas px-4 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                        Complete sprint
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex h-full gap-6" style={{ minWidth: `${activeWorkflow.length * 320}px` }}>
                        {activeWorkflow.map((column) => {
                            const columnTasks = tasks.filter((task) => task.status === column.name);

                            return (
                                <div key={column.id} className="flex-1 flex flex-col min-w-[300px] h-full">
                                    {/* Column Header */}
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-2 h-2 rounded-full ${column.type === 'active' ? 'animate-pulse' : ''}`}
                                                style={{ background: column.color }}
                                            />
                                            <h2 className="text-xs font-semibold tracking-widest uppercase text-muted">{column.name}</h2>
                                            <span className="px-2 py-0.5 rounded-full bg-surface-strong text-[10px] font-semibold text-body">
                                                {columnTasks.length}
                                            </span>
                                        </div>
                                        <button className="text-muted hover:text-ink transition-colors">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>

                                    {/* Droppable Area */}
                                    <Droppable droppableId={column.name}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`flex-1 overflow-y-auto pr-2 custom-scrollbar rounded-lg transition-colors duration-300 flex flex-col gap-3 ${snapshot.isDraggingOver ? 'bg-ink/[0.04] border border-dashed border-hairline-strong' : ''}`}
                                            >
                                                {columnTasks.map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided, snapshot) => {
                                                            const originalStyle = provided.draggableProps.style || {};
                                                            const style = snapshot.isDropAnimating ? {
                                                                ...originalStyle,
                                                                transitionDuration: '0.2s',
                                                                transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)'
                                                            } : originalStyle;

                                                            return (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    style={style}
                                                                    className="outline-none"
                                                                >
                                                                    <TaskCard
                                                                        task={task}
                                                                        isDragging={snapshot.isDragging}
                                                                        onClick={() => onEditTask(task)}
                                                                        columnColor={column.color}
                                                                    />
                                                                </div>
                                                            );
                                                        }}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}

                                                <button
                                                    onClick={() => onAddTask(column.name as Status)}
                                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-dashed border-hairline-strong text-muted hover:text-ink hover:border-primary/50 hover:bg-canvas-soft transition-all mt-2 group"
                                                >
                                                    <Plus size={16} className="group-hover:scale-125 transition-transform" />
                                                    <span className="text-xs font-semibold">Add task</span>
                                                </button>
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
            </div>
        </div>
    );
};

export default KanbanBoard;
