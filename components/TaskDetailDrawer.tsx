
import React, { useState, useRef, useEffect } from 'react';
import {
    X, Calendar, Clock, Tag, User as UserIcon,
    Send, MessageSquare, CheckSquare, Trash2,
    AlertCircle, ChevronRight, MoreHorizontal,
    PlayCircle, Hourglass, CalendarDays, Plus,
    Percent, Check
} from 'lucide-react';
import { Task, User, Subtask, Status, Priority } from '../types';
import { TAG_COLORS } from '../constants';

interface TaskDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    currentUser: User;
    allUsers: User[];
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onAddComment: (taskId: string, text: string) => void;
    onDeleteTask: (taskId: string) => void;
}

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
    isOpen,
    onClose,
    task,
    currentUser,
    allUsers = [],
    onUpdateTask,
    onAddComment,
    onDeleteTask
}) => {
    // ... existing state ...

    // ... existing effects ...

    // ... inside return JSX ...
    <div className="flex items-center gap-2">
        <button
            onClick={() => onDeleteTask(task.id)}
            className="p-2 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-500 transition-colors"
            title="Delete Task"
        >
            <Trash2 size={20} />
        </button>
        <button
            onClick={onClose}
            className="p-2 hover:bg-surface-highlight rounded-full text-gray-400 hover:text-white transition-colors"
        >
            <X size={20} />
        </button>
    </div>
    const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
    const [newComment, setNewComment] = useState('');

    // Description State
    const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
    const [descriptionDraft, setDescriptionDraft] = useState('');

    // Tag State
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [selectedColorIndex, setSelectedColorIndex] = useState(3); // Default to Normal (Blue)

    // Subtask State
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const subtaskInputRef = useRef<HTMLInputElement>(null);
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);



    // Assignee Dropdown Ref
    const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
    const assigneeMenuRef = useRef<HTMLDivElement>(null);

    // Close on Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(event.target as Node)) {
                setIsAssigneeMenuOpen(false);
            }
        };

        if (isAssigneeMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAssigneeMenuOpen]);

    const commentsEndRef = useRef<HTMLDivElement>(null);
    const tagInputRef = useRef<HTMLInputElement>(null);

    const toggleAssignee = (userToToggle: User) => {
        if (!task) return;

        const isAssigned = task.assignees.some(u => u.id === userToToggle.id);
        let newAssignees;

        if (isAssigned) {
            newAssignees = task.assignees.filter(u => u.id !== userToToggle.id);
        } else {
            newAssignees = [...task.assignees, userToToggle];
        }

        onUpdateTask(task.id, { assignees: newAssignees });
    };

    useEffect(() => {
        if (task) {
            setDescriptionDraft(task.description);
            // Reset states when task changes
            setIsAddingTag(false);
            setNewTag('');
            setSelectedColorIndex(3);
            setNewSubtaskTitle('');
            setIsAddingSubtask(false);
        }
    }, [task]);

    // Focus tag input when adding
    useEffect(() => {
        if (isAddingTag && tagInputRef.current) {
            tagInputRef.current.focus();
        }
    }, [isAddingTag]);

    // Focus subtask input when clicking the + button
    useEffect(() => {
        if (isAddingSubtask && subtaskInputRef.current) {
            subtaskInputRef.current.focus();
        }
    }, [isAddingSubtask]);

    // Scroll to bottom of comments when tab changes or new comment added
    useEffect(() => {
        if (activeTab === 'comments' && isOpen) {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeTab, task?.comments, isOpen]);

    if (!isOpen || !task) return null;

    // Helper date functions
    const parseDateString = (dateStr: string) => {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    const formatDateString = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const handleStartDateChange = (val: string) => {
        const start = parseDateString(val);
        const duration = task.durationDays || 1;
        const end = new Date(start);
        end.setDate(start.getDate() + (duration - 1));

        onUpdateTask(task.id, {
            startDate: val,
            endDate: formatDateString(end)
        });
    };

    const handleDurationChange = (val: number) => {
        const duration = Math.max(1, val);
        const start = parseDateString(task.startDate || new Date().toISOString().split('T')[0]);
        const end = new Date(start);
        end.setDate(start.getDate() + (duration - 1));

        onUpdateTask(task.id, {
            durationDays: duration,
            endDate: formatDateString(end)
        });
    };

    const handleEndDateChange = (val: string) => {
        const end = parseDateString(val);
        const start = parseDateString(task.startDate || new Date().toISOString().split('T')[0]);

        // Calculate difference in days
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays > 0) {
            onUpdateTask(task.id, {
                endDate: val,
                durationDays: diffDays
            });
        } else {
            // If end date is before start date, treat as 1 day task starting on new end date
            onUpdateTask(task.id, {
                endDate: val,
                startDate: val,
                durationDays: 1
            });
        }
    };

    const handleSubmitComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        onAddComment(task.id, newComment);
        setNewComment('');
    };

    const handleDescriptionSave = () => {
        onUpdateTask(task.id, { description: descriptionDraft });
        setIsDescriptionEditing(false);
    };

    const handleAddTag = () => {
        if (newTag.trim()) {
            const tagToAdd = {
                name: newTag.trim(),
                color: TAG_COLORS[selectedColorIndex].class
            };
            const updatedTags = [...task.tags, tagToAdd];
            onUpdateTask(task.id, { tags: updatedTags });
            setNewTag('');
        }
        setIsAddingTag(false);
    };

    const handleRemoveTag = (tagIndexToRemove: number) => {
        const updatedTags = task.tags.filter((_, index) => index !== tagIndexToRemove);
        onUpdateTask(task.id, { tags: updatedTags });
    };

    // Subtask Handlers
    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;

        const newSubtask: Subtask = {
            id: `st${Date.now()}`,
            title: newSubtaskTitle.trim(),
            completed: false
        };

        const updatedSubtasks = [...(task.subtasks || []), newSubtask];
        onUpdateTask(task.id, { subtasks: updatedSubtasks });
        setNewSubtaskTitle('');
        setIsAddingSubtask(false); // Reset adding state
    };

    const toggleSubtask = (subtaskId: string) => {
        const updatedSubtasks = (task.subtasks || []).map(st =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        onUpdateTask(task.id, { subtasks: updatedSubtasks });
    };

    const deleteSubtask = (subtaskId: string) => {
        const updatedSubtasks = (task.subtasks || []).filter(st => st.id !== subtaskId);
        onUpdateTask(task.id, { subtasks: updatedSubtasks });
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    };

    const getStatusColor = (status: Status) => {
        switch (status) {
            case 'To Do': return 'bg-zinc-700 text-zinc-300 border-zinc-600';
            case 'In Progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
            case 'Testing': return 'bg-secondary/20 text-secondary border-secondary/50';
            case 'Done': return 'bg-primary/20 text-primary border-primary/50';
        }
    };

    const completedSubtasks = (task.subtasks || []).filter(st => st.completed).length;
    const totalSubtasks = (task.subtasks || []).length;
    const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    return (
        <>
            {/* Backdrop Overlay */}
            <div
                className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0A0A0A] border-l border-border shadow-2xl z-[150] animate-slide-in-right">
                {/* Header */}
                <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-surface-highlight rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(task.status)} uppercase tracking-wider`}>
                            {task.status}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-2 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete Task"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-surface-highlight rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex h-[calc(100vh-64px)]">
                    {/* Left Content Column */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 border-r border-border/50">
                        {/* Title */}
                        <input
                            type="text"
                            value={task.title}
                            onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
                            className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none mb-6 placeholder-gray-600"
                            placeholder="Task Title"
                        />

                        {/* Description */}
                        <div className="mb-8 group">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Description</label>
                            </div>
                            {isDescriptionEditing ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={descriptionDraft}
                                        onChange={(e) => setDescriptionDraft(e.target.value)}
                                        className="w-full min-h-[120px] bg-surface border border-border rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y"
                                        placeholder="Add a description..."
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setIsDescriptionEditing(false)}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDescriptionSave}
                                            className="px-3 py-1.5 text-xs font-bold bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => {
                                        setDescriptionDraft(task.description);
                                        setIsDescriptionEditing(true);
                                    }}
                                    className="min-h-[60px] p-4 rounded-xl border border-transparent hover:bg-surface hover:border-border cursor-pointer transition-all text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
                                >
                                    {task.description || <span className="text-gray-600 italic">Click to add description...</span>}
                                </div>
                            )}
                        </div>

                        {/* Subtasks Section */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <CheckSquare size={14} className="text-gray-500" />
                                    <label className="text-xs font-bold uppercase text-gray-500">Subtasks</label>
                                </div>
                                <span className="text-xs font-medium text-gray-400">
                                    {completedSubtasks}/{totalSubtasks}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-surface-highlight rounded-full mb-4 overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500 ease-out"
                                    style={{ width: `${subtaskProgress}%` }}
                                ></div>
                            </div>

                            <div className="space-y-1 mb-3">
                                {(task.subtasks || []).map(st => (
                                    <div key={st.id} className="group flex items-center gap-3 p-2 hover:bg-surface-highlight rounded-lg transition-colors">
                                        <button
                                            onClick={() => toggleSubtask(st.id)}
                                            className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-300 transform active:scale-75 ${st.completed ? 'bg-primary border-primary text-black scale-100' : 'border-gray-500 hover:border-primary bg-transparent text-transparent hover:scale-110'}`}
                                        >
                                            <Check size={12} strokeWidth={4} className={`transition-all duration-300 ${st.completed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                                        </button>
                                        <span className={`text-sm flex-1 truncate transition-all ${st.completed ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                                            {st.title}
                                        </span>
                                        <button
                                            onClick={() => deleteSubtask(st.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-gray-500 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleAddSubtask} className="flex items-center gap-2 px-2 relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddingSubtask(true);
                                        subtaskInputRef.current?.focus();
                                    }}
                                    className="transition-colors p-1 text-primary"
                                    title="Add Subtask"
                                >
                                    <Plus size={18} strokeWidth={3} />
                                </button>
                                <input
                                    ref={subtaskInputRef}
                                    type="text"
                                    value={newSubtaskTitle}
                                    onFocus={() => setIsAddingSubtask(true)}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    placeholder="Add a subtask..."
                                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none py-2"
                                />
                                {newSubtaskTitle.trim() && (
                                    <button
                                        type="submit"
                                        className="bg-primary text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:scale-105 transition-all animate-fade-in"
                                    >
                                        Add
                                    </button>
                                )}
                            </form>
                        </div>

                        {/* Activity & Comments Tabs */}
                        <div>
                            <div className="flex items-center gap-6 border-b border-border mb-4">
                                <button
                                    onClick={() => setActiveTab('comments')}
                                    className={`pb-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'comments' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                                >
                                    Comments ({task.comments?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`pb-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                                >
                                    Activity
                                </button>
                            </div>

                            <div className="min-h-[200px]">
                                {activeTab === 'comments' ? (
                                    <div className="space-y-4">
                                        <div className="space-y-4 mb-6">
                                            {task.comments?.length === 0 && (
                                                <div className="text-center py-8 text-gray-600 text-sm">
                                                    No comments yet. Start the discussion!
                                                </div>
                                            )}
                                            {task.comments?.map(comment => {
                                                const isMe = comment.userId === currentUser.id;
                                                return (
                                                    <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center shrink-0 border border-border">
                                                            <UserIcon size={14} className="text-gray-400" />
                                                        </div>
                                                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-primary text-black rounded-tr-none' : 'bg-surface-highlight text-gray-200 rounded-tl-none'}`}>
                                                            <p>{comment.text}</p>
                                                            <p className={`text-[10px] mt-1 ${isMe ? 'text-black/60' : 'text-gray-500'}`}>
                                                                {formatDate(comment.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={commentsEndRef} />
                                        </div>

                                        <form onSubmit={handleSubmitComment} className="relative">
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Write a comment..."
                                                className="w-full bg-surface border border-border rounded-full pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-lg"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newComment.trim()}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-black rounded-full hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </form>
                                    </div>
                                ) : (
                                    <div className="space-y-4 relative pl-4 border-l border-border/30 ml-2 py-2">
                                        {task.activity?.slice().reverse().map(act => (
                                            <div key={act.id} className="relative mb-6 last:mb-0">
                                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-surface border border-border"></div>
                                                <div className="text-sm">
                                                    <span className="font-bold text-gray-300">
                                                        {act.userId === currentUser.id ? 'You' : 'System'}
                                                    </span>
                                                    <span className="text-gray-500 mx-1">{act.description}</span>
                                                    <div className="text-[10px] text-gray-600 mt-0.5">{formatDate(act.createdAt)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!task.activity || task.activity.length === 0) && (
                                            <p className="text-sm text-gray-500 italic">No activity recorded yet.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar Metadata */}
                    <div className="w-64 bg-surface/30 p-6 border-l border-border/50 space-y-8 overflow-y-auto">
                        {/* Properties */}
                        <div className="space-y-4">

                            {/* Progress Slider (Improved iOS Style) */}
                            <div className="group bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="flex items-center justify-between mb-3 text-gray-400">
                                    <label className="flex items-center gap-2 text-xs font-bold uppercase">
                                        <Percent size={14} /> Progress
                                    </label>
                                    <span className="text-xl font-bold text-white tracking-tight">{task.progress || 0}%</span>
                                </div>
                                <div className="relative h-6 flex items-center">
                                    {/* Input Range (Invisible but clickable) */}
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={task.progress || 0}
                                        onChange={(e) => onUpdateTask(task.id, { progress: parseInt(e.target.value) })}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                    {/* Visual Track Background */}
                                    <div className="w-full h-2 bg-surface-highlight rounded-full overflow-hidden">
                                        {/* Visual Track Fill */}
                                        <div
                                            className="h-full bg-primary transition-all duration-300 ease-out"
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    </div>
                                    {/* Custom Thumb (Visual Only) */}
                                    <div
                                        className="absolute h-5 w-5 bg-white rounded-full shadow-lg border border-gray-200 pointer-events-none transition-all duration-300 ease-out z-10"
                                        style={{ left: `calc(${task.progress}% - 10px)` }}
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500 mb-2">
                                    <Clock size={14} /> Estimated Time
                                </label>
                                <input
                                    type="text"
                                    value={task.estimatedTime}
                                    onChange={(e) => onUpdateTask(task.id, { estimatedTime: e.target.value })}
                                    className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                />
                            </div>

                            <div className="group">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500 mb-2">
                                    <AlertCircle size={14} /> Priority
                                </label>
                                <select
                                    value={task.priority}
                                    onChange={(e) => onUpdateTask(task.id, { priority: e.target.value as Priority })}
                                    className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary appearance-none cursor-pointer"
                                >
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>

                            <div className="group relative" ref={assigneeMenuRef}>
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500 mb-2">
                                    <UserIcon size={14} /> Assignees
                                </label>

                                <div
                                    className="flex flex-wrap items-center gap-2 cursor-pointer min-h-[32px]"
                                    onClick={() => setIsAssigneeMenuOpen(!isAssigneeMenuOpen)}
                                >
                                    {(task.assignees || []).map((assignee, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-surface p-1 pr-3 rounded-full border border-border">
                                            <img
                                                src={assignee.avatar}
                                                alt={assignee.name}
                                                className="w-6 h-6 rounded-full bg-background object-cover"
                                            />
                                            <span className="text-xs font-bold text-gray-300">{assignee.name}</span>
                                        </div>
                                    ))}
                                    {(task.assignees || []).length === 0 && (
                                        <div className="w-6 h-6 rounded-full border border-dashed border-gray-600 flex items-center justify-center text-gray-500">
                                            <Plus size={12} />
                                        </div>
                                    )}
                                    {(task.assignees || []).length > 0 && (
                                        <div className="w-6 h-6 rounded-full border border-dashed border-gray-600 flex items-center justify-center text-gray-500 hover:text-white hover:border-white transition-colors">
                                            <Plus size={12} />
                                        </div>
                                    )}
                                </div>

                                {/* Custom Assignee Dropdown */}
                                {isAssigneeMenuOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#1C1C1E] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-pop-in">
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                            {allUsers.map(userItem => {
                                                const isSelected = (task.assignees || []).some(u => u.id === userItem.id);
                                                return (
                                                    <button
                                                        key={userItem.id}
                                                        onClick={() => toggleAssignee(userItem)}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isSelected ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-300 transform ${isSelected ? 'border-primary bg-primary text-black scale-100' : 'border-gray-500 hover:border-primary bg-transparent text-transparent hover:scale-110'}`}>
                                                            <Check size={12} strokeWidth={4} className={`transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                                                        </div>
                                                        <img src={userItem.avatar} className="w-6 h-6 rounded-full object-cover" />
                                                        <span className="truncate">{userItem.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Dates Section */}
                        <div className="space-y-4 pt-4 border-t border-border/50">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                                <Calendar size={14} /> Timeline
                            </label>
                            <div className="space-y-3">
                                <div className="group">
                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Start Date</label>
                                    <div className="relative">
                                        <PlayCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                                        <input
                                            type="date"
                                            value={task.startDate || ''}
                                            onChange={(e) => handleStartDateChange(e.target.value)}
                                            className="w-full bg-background/50 border border-border rounded-lg pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Duration (Days)</label>
                                    <div className="relative">
                                        <Hourglass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                                        <input
                                            type="number"
                                            min="1"
                                            value={task.durationDays || 1}
                                            onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
                                            className="w-full bg-background/50 border border-border rounded-lg pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">End Date</label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                                        <input
                                            type="date"
                                            value={task.endDate || ''}
                                            onChange={(e) => handleEndDateChange(e.target.value)}
                                            className="w-full bg-background/50 border border-border rounded-lg pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tags Section */}
                        <div className="pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between mb-3">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                                    <Tag size={14} /> Tags
                                </label>
                                <button
                                    onClick={() => setIsAddingTag(!isAddingTag)}
                                    className="text-primary hover:text-white transition-colors"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(task.tags || []).map((tag, i) => (
                                    <span key={i} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 group/tag cursor-default ${tag.color}`}>
                                        {tag.name}
                                        <button onClick={() => handleRemoveTag(i)} className="opacity-0 group-hover/tag:opacity-100 hover:text-red-500 transition-opacity">
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {isAddingTag && (
                                <div className="mt-3 bg-background/50 p-3 rounded-xl border border-border animate-fade-in">
                                    <input
                                        ref={tagInputRef}
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                        placeholder="Tag name..."
                                        className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none mb-2"
                                    />
                                    <div className="flex gap-2 mb-3">
                                        {TAG_COLORS.map((color, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedColorIndex(idx)}
                                                className={`w-5 h-5 rounded-full ${color.dotClass} ${selectedColorIndex === idx ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'} transition-all`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsAddingTag(false)} className="text-[10px] text-gray-500 hover:text-white">Cancel</button>
                                        <button onClick={handleAddTag} className="text-[10px] bg-primary text-black px-2 py-1 rounded font-bold">Add</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TaskDetailDrawer;
