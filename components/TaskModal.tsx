

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar as CalendarIcon, User as UserIcon, PlayCircle, Hourglass, CalendarDays, Check, ChevronDown } from 'lucide-react';
import { Task, Priority, Status, User } from '../types';
import { TAG_COLORS } from '../constants';
import { format } from 'date-fns';
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

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5 group-focus-within:text-primary transition-colors';
const inputCls = 'w-full bg-surface-card border border-hairline-strong rounded-md px-4 py-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300';

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
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="group relative" ref={ref}>
      <label className={labelCls}>{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface-card border border-hairline-strong rounded-md px-4 py-3 text-ink cursor-pointer hover:border-primary/60 transition-all duration-300 flex items-center justify-between"
      >
        <span className={colorMap ? colorMap[value] : ''}>{value}</span>
        <ChevronDown size={16} className={`text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-surface-card border border-hairline rounded-lg shadow-sm z-[60] overflow-hidden animate-pop-in">
          <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${value === opt ? 'bg-primary/10 text-primary' : 'text-body hover:bg-canvas-soft hover:text-ink'}`}
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
    title: '', description: '', priority: 'Medium', status: initialStatus || 'To Do',
    estimatedTime: '2h', tags: [], assignees: [], startDate: new Date().toISOString().split('T')[0],
    durationDays: 3, progress: 0,
  });

  const [tagInput, setTagInput] = useState('');
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
  const assigneeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(event.target as Node)) setIsAssigneeMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parseDateString = (dateStr: string) => {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };
  const formatDateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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
        const start = new Date();
        const startStr = formatDateString(start);
        const duration = 3;
        const end = new Date(start);
        end.setDate(start.getDate() + (duration - 1));
        setFormData({
          title: '', description: '', priority: 'Medium', status: initialStatus || 'To Do',
          estimatedTime: '2h', tags: [], assignees: [], projectId: '', startDate: startStr,
          endDate: formatDateString(end), durationDays: duration, progress: 0, comments: [], activity: []
        });
      }
    }
    setIsAssigneeMenuOpen(false);
  }, [isOpen, initialData, initialStatus]);

  if (!isOpen) return null;

  const handleStartDateChange = (val: string) => {
    const start = parseDateString(val);
    const end = formData.endDate ? parseDateString(formData.endDate) : start;
    let newEndDate = end;
    if (start > end) newEndDate = start;
    const diffTime = newEndDate.getTime() - start.getTime();
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setFormData({ ...formData, startDate: val, endDate: formatDateString(newEndDate), durationDays: duration });
  };

  const handleDurationChange = (val: number) => {
    const duration = Math.max(1, val);
    const start = parseDateString(formData.startDate || new Date().toISOString().split('T')[0]);
    const end = new Date(start);
    end.setDate(start.getDate() + (duration - 1));
    setFormData({ ...formData, durationDays: duration, endDate: formatDateString(end) });
  };

  const handleEndDateChange = (val: string) => {
    const end = parseDateString(val);
    const start = parseDateString(formData.startDate || new Date().toISOString().split('T')[0]);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 0) setFormData({ ...formData, endDate: val, durationDays: diffDays });
    else setFormData({ ...formData, endDate: val, startDate: val, durationDays: 1 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = { name: tagInput.trim(), color: TAG_COLORS[4].class };
      setFormData({ ...formData, tags: [...(formData.tags || []), newTag] });
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setFormData({ ...formData, tags: formData.tags?.filter((_, i) => i !== index) });
  };

  const calendarPopover = 'w-auto p-0 bg-surface-card border-hairline text-ink z-[9999] pointer-events-auto';
  const calendarCls = 'bg-surface-card text-ink rounded-md border border-hairline';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-card border border-hairline w-full max-w-lg rounded-xl shadow-sm animate-pop-in transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-hairline bg-canvas-soft">
          <h2 className="display text-xl text-ink">{initialData ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors hover:scale-110 duration-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label className={labelCls}>Title</label>
              <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputCls} placeholder="e.g., Fix Navigation Bug" autoFocus />
            </div>

            <div className="group">
              <label className={labelCls}>Description</label>
              <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputCls + ' resize-none'} placeholder="Describe the task details..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectDropdown
                label="Status" value={formData.status || 'To Do'}
                options={['To Do', 'In Progress', 'Testing', 'Done']}
                onChange={(val) => setFormData({ ...formData, status: val as Status })}
                colorMap={{ 'To Do': 'text-muted', 'In Progress': 'text-blue-600', 'Testing': 'text-amber-600', 'Done': 'text-primary' }}
              />
              <SelectDropdown
                label="Priority" value={formData.priority || 'Medium'}
                options={['High', 'Medium', 'Low']}
                onChange={(val) => setFormData({ ...formData, priority: val as Priority })}
                colorMap={{ 'High': 'text-primary', 'Medium': 'text-amber-600', 'Low': 'text-emerald-600' }}
              />
            </div>

            {/* Timeline & Duration */}
            <div className="grid grid-cols-3 gap-3 bg-canvas-soft p-4 rounded-lg border border-hairline">
              <div className="group">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5 group-focus-within:text-primary transition-colors">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className={cn("w-full bg-surface-card border border-hairline-strong rounded-md pl-8 pr-2 py-2 text-ink text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 text-xs font-medium relative", !formData.startDate && "text-muted")}>
                      <PlayCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                      {formData.startDate ? format(parseDateString(formData.startDate), "PPP") : <span>Pick a date</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent disablePortal={true} className={calendarPopover} align="start">
                    <Calendar mode="range"
                      selected={{ from: formData.startDate ? parseDateString(formData.startDate) : undefined, to: formData.endDate ? parseDateString(formData.endDate) : undefined }}
                      onSelect={(_, selectedDay) => { if (selectedDay) handleStartDateChange(format(selectedDay, 'yyyy-MM-dd')); }}
                      initialFocus defaultMonth={formData.startDate ? parseDateString(formData.startDate) : new Date()} className={calendarCls} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="group">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5 group-focus-within:text-primary transition-colors">Duration (Days)</label>
                <div className="relative">
                  <Hourglass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={14} />
                  <input type="number" min="1" value={formData.durationDays} onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)} className="w-full bg-surface-card border border-hairline-strong rounded-md pl-8 pr-2 py-2 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 text-xs font-medium" />
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5 group-focus-within:text-primary transition-colors">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className={cn("w-full bg-surface-card border border-hairline-strong rounded-md pl-8 pr-2 py-2 text-ink text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 text-xs font-medium relative", !formData.endDate && "text-muted")}>
                      <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                      {formData.endDate ? format(parseDateString(formData.endDate), "PPP") : <span>Pick a date</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent disablePortal={true} className={calendarPopover} align="start">
                    <Calendar mode="range"
                      selected={{ from: formData.startDate ? parseDateString(formData.startDate) : undefined, to: formData.endDate ? parseDateString(formData.endDate) : undefined }}
                      onSelect={(_, selectedDay) => { if (selectedDay) handleEndDateChange(format(selectedDay, 'yyyy-MM-dd')); }}
                      initialFocus defaultMonth={formData.endDate ? parseDateString(formData.endDate) : undefined} className={calendarCls} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="group">
                <label className={labelCls}>Deadline (Optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className={cn("w-full bg-surface-card border border-hairline-strong rounded-md pl-10 pr-4 py-3 text-ink text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 text-sm relative", !formData.dueDate && "text-muted")}>
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={16} />
                      {formData.dueDate ? format(parseDateString(formData.dueDate), "PPP") : <span>Pick a deadline</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent disablePortal={true} className={calendarPopover} align="start">
                    <Calendar mode="single" selected={formData.dueDate ? parseDateString(formData.dueDate) : undefined}
                      onSelect={(date) => { if (date) setFormData({ ...formData, dueDate: format(date, 'yyyy-MM-dd') }); }}
                      initialFocus defaultMonth={formData.dueDate ? parseDateString(formData.dueDate) : undefined} className={calendarCls} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="group">
                <label className={labelCls}>Assignee</label>
                <div className="relative" ref={assigneeMenuRef}>
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none z-10" size={16} />
                  <div className="w-full bg-surface-card border border-hairline-strong rounded-md px-4 py-2 min-h-[48px] flex items-center pl-10 cursor-pointer hover:border-primary/60 transition-colors" onClick={() => setIsAssigneeMenuOpen(!isAssigneeMenuOpen)}>
                    <div className="flex flex-wrap gap-2">
                      {formData.assignees?.map((assignee, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-canvas-soft p-1 pr-3 rounded-full border border-hairline">
                          <img src={assignee.avatar} alt={assignee.name} className="w-5 h-5 rounded-full bg-surface-strong object-cover" />
                          <span className="text-xs font-semibold text-body">{assignee.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, assignees: formData.assignees?.filter(u => u.id !== assignee.id) }); }} className="ml-1 hover:text-error">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isAssigneeMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-full bg-surface-card border border-hairline rounded-lg shadow-sm z-[60] overflow-hidden animate-pop-in">
                      <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {availableUsers.map(userItem => {
                          const isSelected = (formData.assignees || []).some(u => u.id === userItem.id);
                          return (
                            <button type="button" key={userItem.id}
                              onClick={() => {
                                const current = formData.assignees || [];
                                const isAlreadySelected = current.some(u => u.id === userItem.id);
                                setFormData({ ...formData, assignees: isAlreadySelected ? current.filter(u => u.id !== userItem.id) : [...current, userItem] });
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'text-body hover:bg-canvas-soft hover:text-ink'}`}>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-300 ${isSelected ? 'border-primary bg-primary text-on-primary' : 'border-hairline-strong bg-transparent text-transparent'}`}>
                                <Check size={12} strokeWidth={4} className={`transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
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
              <label className={labelCls}>Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags?.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded border border-hairline bg-canvas-soft text-body flex items-center gap-1">
                    {tag.name}
                    <button type="button" onClick={() => removeTag(i)} className="hover:text-error">×</button>
                  </span>
                ))}
              </div>
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder="Type and press Enter to add tag..." className={inputCls + ' text-sm'} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-md text-sm font-medium text-body hover:text-ink hover:bg-canvas-soft transition-colors duration-200">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-md text-sm font-medium bg-primary text-on-primary hover:bg-primary-active transition-all duration-300 flex items-center gap-2">
              {initialData ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
