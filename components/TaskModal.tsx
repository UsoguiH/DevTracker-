

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar as CalendarIcon, Clock, Tag, User as UserIcon, PlayCircle, Hourglass, CalendarDays, Plus, Check, ChevronDown } from 'lucide-react';
import { Task, Priority, Status, User } from '../types';
import { TAG_COLORS } from '../constants';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => void;
  initialData?: Task | null;
  initialStatus?: Status;
  availableUsers?: User[];
}

const SelectDropdown: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  colorMap?: Record<string, string>;
}> = ({ label, value, options, onChange, colorMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="group relative" ref={ref}>
      <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white cursor-pointer hover:border-primary/50 transition-all duration-300 flex items-center justify-between"
      >
        <span className={colorMap ? colorMap[value] : ''}>{value}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-[#1C1C1E] border border-white/10 rounded-xl shadow-2xl z-[60] overflow-hidden animate-pop-in">
          <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${value === opt ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <span className={colorMap ? colorMap[opt] : ''}>{opt}</span>
                {value === opt && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, initialData, initialStatus, availableUsers = [] }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'Medium',
    status: initialStatus || 'To Do',
    estimatedTime: '2h',
    tags: [],
    assignees: [],
    startDate: new Date().toISOString().split('T')[0],
    durationDays: 3,
    progress: 0,
  });

  const [tagInput, setTagInput] = useState('');
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
  const assigneeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(event.target as Node)) {
        setIsAssigneeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper to safely parse YYYY-MM-DD to Date object without TZ issues
  const parseDateString = (dateStr: string) => {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const formatDateString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          startDate: initialData.startDate || new Date().toISOString().split('T')[0],
          endDate: initialData.endDate,
          durationDays: initialData.durationDays || 1,
          progress: initialData.progress || 0
        });
      } else {
        // Default new task
        const start = new Date();
        const startStr = formatDateString(start);
        const duration = 3;
        const end = new Date(start);
        end.setDate(start.getDate() + (duration - 1));

        setFormData({
          title: '',
          description: '',
          priority: 'Medium',
          status: initialStatus || 'To Do',
          estimatedTime: '2h',
          tags: [],
          assignees: [], // FIXED: Was USERS[0]
          projectId: '',
          startDate: startStr,
          endDate: formatDateString(end),
          durationDays: duration,
          progress: 0,
          comments: [],
          activity: []
        });
      }
    }
    setIsAssigneeMenuOpen(false); // Reset menu state
  }, [isOpen, initialData, initialStatus]);

  if (!isOpen) return null;

  // Sync Logic
  const handleStartDateChange = (val: string) => {
    const start = parseDateString(val);
    const end = formData.endDate ? parseDateString(formData.endDate) : start;

    let newEndDate = end;

    // If new start date is after current end date, reset end date to start date
    if (start > end) {
      newEndDate = start;
    }

    const diffTime = newEndDate.getTime() - start.getTime();
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    setFormData({
      ...formData,
      startDate: val,
      endDate: formatDateString(newEndDate),
      durationDays: duration
    });
  };

  const handleDurationChange = (val: number) => {
    const duration = Math.max(1, val);
    const start = parseDateString(formData.startDate || new Date().toISOString().split('T')[0]);
    const end = new Date(start);
    end.setDate(start.getDate() + (duration - 1));

    setFormData({
      ...formData,
      durationDays: duration,
      endDate: formatDateString(end)
    });
  };

  const handleEndDateChange = (val: string) => {
    const end = parseDateString(val);
    const start = parseDateString(formData.startDate || new Date().toISOString().split('T')[0]);

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 0) {
      setFormData({
        ...formData,
        endDate: val,
        durationDays: diffDays
      });
    } else {
      setFormData({
        ...formData,
        endDate: val,
        startDate: val,
        durationDays: 1
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = {
        name: tagInput.trim(),
        color: TAG_COLORS[4].class
      };
      setFormData({ ...formData, tags: [...(formData.tags || []), newTag] });
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setFormData({ ...formData, tags: formData.tags?.filter((_, i) => i !== index) });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-lg rounded-3xl shadow-2xl animate-pop-in transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-border bg-surface-highlight/20 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors hover:scale-110 duration-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                placeholder="e.g., Fix Navigation Bug"
                autoFocus
              />
            </div>

            <div className="group">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 resize-none"
                placeholder="Describe the task details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectDropdown
                label="Status"
                value={formData.status || 'To Do'}
                options={['To Do', 'In Progress', 'Testing', 'Done']}
                onChange={(val) => setFormData({ ...formData, status: val as Status })}
                colorMap={{
                  'To Do': 'text-zinc-400',
                  'In Progress': 'text-blue-400',
                  'Testing': 'text-yellow-400',
                  'Done': 'text-primary'
                }}
              />

              <SelectDropdown
                label="Priority"
                value={formData.priority || 'Medium'}
                options={['High', 'Medium', 'Low']}
                onChange={(val) => setFormData({ ...formData, priority: val as Priority })}
                colorMap={{
                  'High': 'text-red-400',
                  'Medium': 'text-orange-400',
                  'Low': 'text-green-400'
                }}
              />
            </div>

            {/* Timeline & Duration Section */}
            <div className="grid grid-cols-3 gap-3 bg-surface-highlight/10 p-4 rounded-xl border border-border/50">
              <div className="group">
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full bg-background/50 border border-border rounded-xl pl-8 pr-2 py-2 text-white text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 text-xs font-medium relative",
                        !formData.startDate && "text-muted-foreground"
                      )}
                    >
                      <PlayCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors pointer-events-none" size={14} />
                      {formData.startDate ? format(parseDateString(formData.startDate), "PPP") : <span>Pick a date</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent disablePortal={true} className="w-auto p-0 bg-[#0A0A0A] border-border text-white z-[9999] pointer-events-auto" align="start">
                    <Calendar
                      mode="range"
                      selected={{
                        from: formData.startDate ? parseDateString(formData.startDate) : undefined,
                        to: formData.endDate ? parseDateString(formData.endDate) : undefined
                      }}
                      onSelect={(_, selectedDay) => {
                        if (selectedDay) {
                          handleStartDateChange(format(selectedDay, 'yyyy-MM-dd'));
                        }
                      }}
                      initialFocus
                      defaultMonth={formData.startDate ? parseDateString(formData.startDate) : new Date()}
                      className="bg-[#0A0A0A] text-white rounded-md border border-border"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="group">
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Duration (Days)</label>
                <div className="relative">
                  <Hourglass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={14} />
                  <input
                    type="number"
                    min="1"
                    value={formData.durationDays}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
                    className="w-full bg-background/50 border border-border rounded-xl pl-8 pr-2 py-2 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 text-xs font-medium"
                  />
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full bg-background/50 border border-border rounded-xl pl-8 pr-2 py-2 text-white text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 text-xs font-medium relative",
                        !formData.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors pointer-events-none" size={14} />
                      {formData.endDate ? format(parseDateString(formData.endDate), "PPP") : <span>Pick a date</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent disablePortal={true} className="w-auto p-0 bg-[#0A0A0A] border-border text-white z-[9999] pointer-events-auto" align="start">
                    <Calendar
                      mode="range"
                      selected={{
                        from: formData.startDate ? parseDateString(formData.startDate) : undefined,
                        to: formData.endDate ? parseDateString(formData.endDate) : undefined
                      }}
                      onSelect={(_, selectedDay) => {
                        if (selectedDay) {
                          handleEndDateChange(format(selectedDay, 'yyyy-MM-dd'));
                        }
                      }}
                      initialFocus
                      defaultMonth={formData.endDate ? parseDateString(formData.endDate) : undefined}
                      className="bg-[#0A0A0A] text-white rounded-md border border-border"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Deadline (Optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full bg-background/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 text-sm relative",
                        !formData.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors pointer-events-none" size={16} />
                      {formData.dueDate ? format(parseDateString(formData.dueDate), "PPP") : <span>Pick a deadline</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent disablePortal={true} className="w-auto p-0 bg-[#0A0A0A] border-border text-white z-[9999] pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate ? parseDateString(formData.dueDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, dueDate: format(date, 'yyyy-MM-dd') });
                        }
                      }}
                      initialFocus
                      defaultMonth={formData.dueDate ? parseDateString(formData.dueDate) : undefined}
                      className="bg-[#0A0A0A] text-white rounded-md border border-border"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="group">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Assignee</label>
                <div className="relative" ref={assigneeMenuRef}>

                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors pointer-events-none" size={16} />

                  <div
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 min-h-[48px] flex items-center pl-10 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setIsAssigneeMenuOpen(!isAssigneeMenuOpen)}
                  >
                    <div className="flex flex-wrap gap-2">
                      {formData.assignees?.map((assignee, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-surface p-1 pr-3 rounded-full border border-border">
                          <img
                            src={assignee.avatar}
                            alt={assignee.name}
                            className="w-5 h-5 rounded-full bg-background object-cover"
                          />
                          <span className="text-xs font-bold text-gray-300">{assignee.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData({ ...formData, assignees: formData.assignees?.filter(u => u.id !== assignee.id) });
                            }}
                            className="ml-1 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isAssigneeMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-full bg-[#1C1C1E] border border-white/10 rounded-xl shadow-2xl z-[60] overflow-hidden animate-pop-in">
                      <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {availableUsers.map(userItem => {
                          const isSelected = (formData.assignees || []).some(u => u.id === userItem.id);
                          return (
                            <button
                              type="button"
                              key={userItem.id}
                              onClick={() => {
                                const current = formData.assignees || [];
                                const isAlreadySelected = current.some(u => u.id === userItem.id);
                                setFormData({
                                  ...formData,
                                  assignees: isAlreadySelected
                                    ? current.filter(u => u.id !== userItem.id)
                                    : [...current, userItem]
                                });
                              }}
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
            </div>

            <div className="group">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags?.map((tag, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${tag.color}`}>
                    {tag.name}
                    <button type="button" onClick={() => removeTag(i)} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type and press Enter to add tag..."
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 text-sm"
              />
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-surface-highlight transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(209,244,95,0.3)] flex items-center gap-2"
            >
              {initialData ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
