import React, { useState } from 'react';
import { MoreHorizontal, Plus, Clock, MessageSquare, CheckSquare, X, History, Percent } from 'lucide-react';
import { USERS } from '../constants';
import { Task, Status } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface KanbanBoardProps {
    tasks: Task[];
    onMoveTask: (taskId: string, newStatus: Status) => void;
    onAddTask: (status: Status) => void;
    onEditTask: (task: Task) => void;
    onCompleteSprint: (sprintName: string) => void;
    onViewHistory: () => void;
}

const columns: { id: Status; title: string; color: string }[] = [
    { id: 'To Do', title: 'To Do', color: 'bg-zinc-600' },
    { id: 'In Progress', title: 'In Progress', color: 'bg-blue-500' },
    { id: 'Testing', title: 'Testing', color: 'bg-secondary' },
    { id: 'Done', title: 'Done', color: 'bg-primary' },
];

// Extracted Card Component for cleaner separation of drag logic vs visual logic
const TaskCard = ({ task, isDragging, onClick, columnColor }: { task: Task; isDragging: boolean; onClick: () => void; columnColor: string }) => {
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-orange-900/40 text-orange-400 border border-orange-900';
            case 'Medium': return 'bg-yellow-900/40 text-yellow-400 border border-yellow-900';
            case 'Low': return 'bg-green-900/40 text-green-400 border border-green-900';
            default: return 'bg-gray-800 text-gray-400';
        }
    };

    return (
        <div
            onClick={onClick}
            className={`
                bg-surface border border-border p-4 rounded-xl shadow-sm group relative 
                overflow-hidden select-none w-full
                ${isDragging
                    ? 'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] ring-1 ring-primary bg-surface-highlight scale-105 z-50'
                    : 'hover:border-primary/50 hover:bg-surface-highlight hover:-translate-y-1 hover:shadow-xl transition-all duration-200'
                }
            `}
        >
            {/* Status Color Bar */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${columnColor}`}></div>

            <div className="flex justify-between items-start mb-3 pt-2">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                </span>
                {task.status === 'In Progress' && (
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">IN DEV</span>
                )}
                <button className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal size={14} />
                </button>
            </div>

            <h3 className={`font-semibold text-sm text-gray-100 mb-2 leading-snug ${task.status === 'Done' ? 'line-through text-gray-500' : ''}`}>
                {task.title}
            </h3>

            {task.status !== 'Done' && <p className="text-xs text-gray-500 mb-4 line-clamp-2">{task.description}</p>}

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
                {task.tags.map((tag, i) => (
                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${tag.color}`}>
                        {tag.name}
                    </span>
                ))}
            </div>

            {/* Progress Bar (Visible if > 0) */}
            {(task.progress || 0) > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span className="flex items-center gap-1"><Percent size={10} /> Progress</span>
                        <span>{task.progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-primary/70 rounded-full" style={{ width: `${task.progress}%` }}></div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                <div className="flex -space-x-2">
                    {task.assignees.map((u, i) => (
                        <img key={i} src={u.avatar} alt={u.name} className={`w-6 h-6 rounded-full border-2 border-surface ${task.status === 'Done' ? 'grayscale opacity-50' : ''}`} />
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Clock size={12} />
                        <span>{task.estimatedTime}</span>
                    </div>
                    {/* Subtask Indicator */}
                    {task.subtasks && task.subtasks.length > 0 && (
                        <div className="flex items-center gap-1 text-gray-500 text-xs" title={`${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} Subtasks`}>
                            <CheckSquare size={12} />
                            <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                        </div>
                    )}
                    {task.comments && task.comments.length > 0 && (
                        <div className="flex items-center gap-1 text-gray-500 text-xs hover:text-white transition-colors">
                            <MessageSquare size={12} />
                            <span>{task.comments.length}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onMoveTask, onAddTask, onEditTask, onCompleteSprint, onViewHistory }) => {
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [sprintName, setSprintName] = useState('');

    const handleDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) {
            return;
        }

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // Call update if status changed
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
        // Set default sprint name
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
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-surface border border-border p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-pop-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Complete Sprint</h3>
                            <button onClick={() => setIsCompleteModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            {tasks.filter(t => t.status === 'Done').length} tasks will be archived.
                            {tasks.filter(t => t.status !== 'Done').length} tasks will remain active.
                        </p>
                        <form onSubmit={confirmCompleteSprint}>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Sprint Name</label>
                            <input
                                type="text"
                                value={sprintName}
                                onChange={(e) => setSprintName(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none mb-6"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCompleteModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl text-sm font-bold text-gray-400 hover:bg-surface-highlight transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-primary text-black hover:opacity-90 transition-opacity"
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
                    <h1 className="text-2xl font-bold text-white mb-1">Sprint Board</h1>
                    <p className="text-sm text-gray-400">Manage your current active tasks</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 mr-4">
                        {/* 
                 {USERS.map(user => (
                     <img key={user.id} src={user.avatar} className="w-8 h-8 rounded-full border-2 border-background" alt={user.name}/>
                 ))} 
                 */}
                    </div>
                    <button
                        onClick={onViewHistory}
                        className="p-2 text-gray-400 hover:text-white hover:bg-surface-highlight rounded-full transition-colors mr-2"
                        title="View Sprint History"
                    >
                        <History size={20} />
                    </button>
                    <button
                        onClick={handleCompleteClick}
                        className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors shadow-lg hover:shadow-white/20"
                    >
                        Complete Sprint
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex h-full gap-6 min-w-[1200px]">
                        {columns.map((column) => {
                            const columnTasks = tasks.filter((task) => task.status === column.id);

                            return (
                                <div
                                    key={column.id}
                                    className="flex-1 flex flex-col min-w-[300px] h-full"
                                >
                                    {/* Column Header */}
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${column.id === 'In Progress' ? 'bg-blue-500 animate-pulse' : column.id === 'Testing' ? 'bg-secondary' : column.id === 'Done' ? 'bg-primary' : 'bg-zinc-600'}`}></div>
                                            <h2 className="text-xs font-bold tracking-widest uppercase text-gray-400">{column.title}</h2>
                                            <span className="px-2 py-0.5 rounded-full bg-surface-highlight text-[10px] font-bold text-gray-300">
                                                {columnTasks.length}
                                            </span>
                                        </div>
                                        <button className="text-gray-500 hover:text-white transition-colors">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>

                                    {/* Droppable Area */}
                                    <Droppable droppableId={column.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`flex-1 overflow-y-auto pr-2 custom-scrollbar rounded-xl transition-colors duration-300 flex flex-col gap-3 ${snapshot.isDraggingOver ? 'bg-white/5 border border-dashed border-white/20' : ''}`}
                                            >
                                                {columnTasks.map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided, snapshot) => {
                                                            // Animation Speed Customization
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

                                                {/* Add Task Button inside column */}
                                                <button
                                                    onClick={() => onAddTask(column.id)}
                                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-border text-gray-500 hover:text-white hover:border-primary/50 hover:bg-surface-highlight transition-all mt-2 group"
                                                >
                                                    <Plus size={16} className="group-hover:scale-125 transition-transform" />
                                                    <span className="text-xs font-bold">Add Task</span>
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