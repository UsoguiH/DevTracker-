import React, { useState, useEffect } from 'react';
import { X, FolderPlus, FolderPen } from 'lucide-react';
import { Project } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void;
  initialData?: Project | null;
}

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5 group-focus-within:text-primary transition-colors';
const inputCls = 'w-full bg-surface-card border border-hairline-strong rounded-md px-4 py-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300';

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({ name: '', description: '', key: '' });

  useEffect(() => {
    if (isOpen) {
      if (initialData) setFormData({ name: initialData.name, description: initialData.description, key: initialData.key });
      else setFormData({ name: '', description: '', key: '' });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const project: Project = {
      id: initialData ? initialData.id : `p${Date.now()}`,
      name: formData.name,
      description: formData.description,
      key: formData.key.toUpperCase() || formData.name.substring(0, 2).toUpperCase(),
      createdAt: initialData ? initialData.createdAt : new Date().toISOString()
    };
    onSubmit(project);
    setFormData({ name: '', description: '', key: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-card border border-hairline w-full max-w-md rounded-xl shadow-sm overflow-hidden animate-pop-in transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-hairline bg-canvas-soft">
          <h2 className="display text-xl text-ink flex items-center gap-2">
            {initialData ? <FolderPen size={22} className="text-primary" /> : <FolderPlus size={22} className="text-primary" />}
            {initialData ? 'Edit Project' : 'Create Project'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors hover:scale-110 duration-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label className={labelCls}>Project Name</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputCls} placeholder="e.g. Portfolio Website" autoFocus={!initialData} />
            </div>
            <div className="group">
              <label className={labelCls}>Key (Optional)</label>
              <input type="text" maxLength={3} value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} className={inputCls + ' uppercase placeholder-muted-soft'} placeholder="e.g. PW" />
              <p className="text-[10px] text-muted mt-1">Used for task IDs (e.g., PW-1)</p>
            </div>
            <div className="group">
              <label className={labelCls}>Description</label>
              <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputCls + ' resize-none'} placeholder="What is this project about?" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-md text-sm font-medium text-body hover:text-ink hover:bg-canvas-soft transition-colors duration-200">Cancel</button>
            <button type="submit" className="px-6 py-2.5 rounded-md text-sm font-medium bg-primary text-on-primary hover:bg-primary-active transition-all duration-300">
              {initialData ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
