import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Calendar, Clock, Tag, User as UserIcon, 
  Send, MessageSquare, History, CheckCircle2, 
  AlertCircle, ChevronRight, MoreHorizontal,
  PlayCircle, Hourglass
} from 'lucide-react';
import { Task, User, Comment, Activity, Status, Priority } from '../types';
import { TAG_COLORS } from '../constants';

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUser: User;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddComment: (taskId: string, text: string) => void;
}

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ 
  isOpen, 
  onClose, 
  task, 
  currentUser,
  onUpdateTask,
  onAddComment
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [newComment, setNewComment] = useState('');
  
  // Description State
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  
  // Tag State
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(3); // Default to Normal (Blue)

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
        setDescriptionDraft(task.description);
        // Reset states when task changes
        setIsAddingTag(false);
        setNewTag('');
        setSelectedColorIndex(3);
    }
  }, [task]);

  // Focus tag input when adding
  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
        tagInputRef.current.focus();
    }
  }, [isAddingTag]);

  // Scroll to bottom of comments when tab changes or new comment added
  useEffect(() => {
    if (activeTab === 'comments' && isOpen) {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, task?.comments, isOpen]);

  if (!isOpen || !task) return null;

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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
        case 'To Do': return 'bg-zinc-700 text-zinc-300 border-zinc-600';
        case 'In Progress': return 'bg-primary/20 text-primary border-primary/50';
        case 'Testing': return 'bg-secondary/20 text-secondary border-secondary/50';
        case 'Done': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    }
  };

  return (
    <>
      {/* Backdrop with Fade In */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer with Slide In Right */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-[#121212] border-l border-border shadow-2xl z-[110] flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#161616]">
            <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500 border border-border px-2 py-1 rounded bg-black/20">
                    {task.id.slice(-4).toUpperCase()}
                </span>
                <select 
                    value={task.status}
                    onChange={(e) => onUpdateTask(task.id, { status: e.target.value as Status })}
                    className={`text-xs font-bold px-3 py-1 rounded-full border appearance-none cursor-pointer outline-none ${getStatusColor(task.status)}`}
                >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Testing">Testing</option>
                    <option value="Done">Done</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                    <MoreHorizontal size={20} />
                </button>
                <button 
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 md:p-8 space-y-8">
                
                {/* Title & Description */}
                <div>
                    <input 
                        className="w-full bg-transparent text-2xl font-bold text-white mb-4 focus:outline-none focus:ring-0 placeholder-gray-600"
                        value={task.title}
                        onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
                    />
                    
                    <div className="group relative">
                        {isDescriptionEditing ? (
                            <div className="space-y-2">
                                <textarea 
                                    value={descriptionDraft}
                                    onChange={(e) => setDescriptionDraft(e.target.value)}
                                    className="w-full min-h-[120px] bg-[#0a0a0a] border border-border rounded-xl p-4 text-gray-300 text-sm focus:border-primary outline-none resize-y"
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={() => setIsDescriptionEditing(false)}
                                        className="text-xs font-bold text-gray-400 hover:text-white px-3 py-2"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleDescriptionSave}
                                        className="text-xs font-bold bg-primary text-black px-4 py-2 rounded-lg hover:bg-primary/90"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                onClick={() => setIsDescriptionEditing(true)}
                                className="min-h-[80px] text-gray-400 text-sm leading-relaxed whitespace-pre-wrap hover:bg-[#1a1a1a] p-2 -ml-2 rounded-lg cursor-text transition-colors border border-transparent hover:border-border/50"
                            >
                                {task.description || <span className="italic text-gray-600">Add a description...</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-6 bg-[#161616] p-4 rounded-xl border border-border/50">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Assignees</label>
                        <div className="flex items-center gap-2">
                            {task.assignees.map((u, i) => (
                                <img key={i} src={u.avatar} className="w-6 h-6 rounded-full border border-gray-600" alt={u.name} />
                            ))}
                            <button className="w-6 h-6 rounded-full border border-dashed border-gray-500 flex items-center justify-center text-gray-500 hover:text-white hover:border-white text-xs">
                                +
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Priority</label>
                        <select 
                            value={task.priority}
                            onChange={(e) => onUpdateTask(task.id, { priority: e.target.value as Priority })}
                            className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer hover:text-primary transition-colors block w-full"
                        >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Start Date</label>
                        <div className="flex items-center gap-2 text-sm text-gray-300 group cursor-pointer hover:text-primary transition-colors">
                            <PlayCircle size={14} />
                            <input 
                                type="date" 
                                value={task.startDate || new Date().toISOString().split('T')[0]}
                                onChange={(e) => onUpdateTask(task.id, { startDate: e.target.value })}
                                className="bg-transparent focus:outline-none text-white w-full cursor-pointer" 
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Duration (Days)</label>
                        <div className="flex items-center gap-2 text-sm text-gray-300 group cursor-pointer hover:text-primary transition-colors">
                            <Hourglass size={14} />
                            <input 
                                type="number"
                                min="1" 
                                value={task.durationDays || 1}
                                onChange={(e) => onUpdateTask(task.id, { durationDays: parseInt(e.target.value) || 1 })}
                                className="bg-transparent focus:outline-none text-white w-full cursor-pointer" 
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Due Date</label>
                        <div className="flex items-center gap-2 text-sm text-gray-300 group cursor-pointer hover:text-primary transition-colors">
                            <Calendar size={14} />
                            <input 
                                type="date" 
                                value={task.dueDate}
                                onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value })}
                                className="bg-transparent focus:outline-none text-white w-full cursor-pointer" 
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Est. Hours</label>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Clock size={14} />
                            <input 
                                value={task.estimatedTime}
                                onChange={(e) => onUpdateTask(task.id, { estimatedTime: e.target.value })}
                                className="bg-transparent focus:outline-none text-white w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Tags */}
                <div>
                     <label className="text-[10px] font-bold uppercase text-gray-500 mb-2 block">Tags</label>
                     <div className="flex flex-wrap gap-2">
                        {task.tags.map((tag, index) => (
                            <span key={index} className={`${tag.color} border px-3 py-1 rounded-full text-xs flex items-center gap-1 group cursor-pointer transition-colors`}>
                                <Tag size={10} /> {tag.name}
                                <button 
                                    onClick={() => handleRemoveTag(index)}
                                    className="opacity-0 group-hover:opacity-100 text-current hover:font-bold ml-1 transition-opacity"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        
                        {isAddingTag ? (
                            <div className="flex flex-col gap-2 p-2 bg-[#1a1a1a] border border-border rounded-xl animate-fade-in z-10">
                                <input
                                    ref={tagInputRef}
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddTag();
                                        if (e.key === 'Escape') setIsAddingTag(false);
                                    }}
                                    className="bg-black/50 border border-border text-white text-xs px-2 py-1.5 rounded-lg w-32 focus:outline-none focus:border-primary"
                                    placeholder="Tag name"
                                />
                                <div className="flex gap-1.5 justify-between">
                                    {TAG_COLORS.map((color, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => setSelectedColorIndex(idx)}
                                            className={`w-4 h-4 rounded-full cursor-pointer transition-transform hover:scale-125 ${color.class.split(' ')[0].replace('/20', '')} ${selectedColorIndex === idx ? 'ring-2 ring-white scale-110' : ''}`}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                                <button 
                                    onClick={handleAddTag}
                                    className="text-[10px] font-bold bg-primary text-black rounded py-1 hover:opacity-90 mt-1"
                                >
                                    Add
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAddingTag(true)}
                                className="text-xs text-gray-500 hover:text-primary px-2 py-1 flex items-center gap-1 border border-transparent hover:border-primary/20 rounded-full transition-all"
                            >
                                + Add Tag
                            </button>
                        )}
                     </div>
                </div>

            </div>
        </div>

        {/* Footer: Tabs & Input */}
        <div className="bg-[#161616] border-t border-border flex flex-col h-[350px]">
            {/* Tabs */}
            <div className="flex border-b border-border">
                <button 
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'comments' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <MessageSquare size={14} /> Comments 
                    <span className="bg-[#333] text-white text-[10px] px-1.5 rounded-full">{task.comments.length}</span>
                    {activeTab === 'comments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'activity' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <History size={14} /> Activity
                    {activeTab === 'activity' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0f0f0f]">
                {activeTab === 'comments' ? (
                    <div className="space-y-4">
                        {task.comments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                No comments yet. Start the conversation!
                            </div>
                        ) : (
                            task.comments.map(comment => (
                                <div key={comment.id} className="flex gap-3 animate-fade-in">
                                    <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center text-xs font-bold border border-border text-gray-400 shrink-0">
                                        {comment.userId === currentUser.id ? 'ME' : 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline justify-between mb-1">
                                            <span className="text-xs font-bold text-gray-300">
                                                {comment.userId === currentUser.id ? currentUser.name : 'Unknown User'}
                                            </span>
                                            <span className="text-[10px] text-gray-600">{formatDate(comment.createdAt)}</span>
                                        </div>
                                        <div className="text-sm text-gray-400 leading-relaxed bg-[#1a1a1a] p-3 rounded-r-xl rounded-bl-xl border border-border/50">
                                            {comment.text}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>
                ) : (
                    <div className="space-y-4 pl-2">
                        {task.activity.slice().reverse().map((log, index) => (
                            <div key={log.id} className="flex gap-4 relative animate-fade-in">
                                {/* Timeline Line */}
                                {index !== task.activity.length - 1 && (
                                    <div className="absolute left-[11px] top-6 bottom-[-20px] w-px bg-border"></div>
                                )}
                                
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${log.type === 'status' ? 'bg-secondary/20 text-secondary' : 'bg-zinc-800 text-gray-400'}`}>
                                    {log.type === 'status' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">
                                        <span className="font-bold text-gray-300">{log.userId === currentUser.id ? 'You' : 'Someone'}</span> {log.description}
                                    </p>
                                    <p className="text-[10px] text-gray-600 mt-0.5">{formatDate(log.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                         {task.activity.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-sm">No activity recorded.</div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area (Only for Comments) */}
            {activeTab === 'comments' && (
                <form onSubmit={handleSubmitComment} className="p-4 bg-[#161616] border-t border-border">
                    <div className="relative">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full bg-[#0a0a0a] border border-border rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        <button 
                            type="submit"
                            disabled={!newComment.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-black rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>
    </>
  );
};

export default TaskDetailDrawer;
