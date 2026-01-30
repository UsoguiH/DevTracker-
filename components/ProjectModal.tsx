import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { Project } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    key: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject: Project = {
      id: `p${Date.now()}`,
      name: formData.name,
      description: formData.description,
      key: formData.key.toUpperCase() || formData.name.substring(0, 2).toUpperCase(),
      createdAt: new Date().toISOString()
    };
    onSubmit(newProject);
    setFormData({ name: '', description: '', key: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-pop-in transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-border bg-surface-highlight/20 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderPlus size={24} className="text-primary" />
            Create Project
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors hover:scale-110 duration-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Project Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                placeholder="e.g. Portfolio Website"
                autoFocus
              />
            </div>

            <div className="group">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Key (Optional)</label>
              <input
                type="text"
                maxLength={3}
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary uppercase placeholder-gray-700 transition-all duration-300"
                placeholder="e.g. PW"
              />
              <p className="text-[10px] text-gray-500 mt-1">Used for task IDs (e.g., PW-1)</p>
            </div>

            <div className="group">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 group-focus-within:text-primary transition-colors">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 resize-none"
                placeholder="What is this project about?"
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
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(209,244,95,0.3)]"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;