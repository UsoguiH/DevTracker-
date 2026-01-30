import React from 'react';
import { Folder, Plus } from 'lucide-react';
import { Project, Task } from '../types';

interface ProjectsProps {
  projects: Project[];
  tasks: Task[];
  onSelectProject: (projectId: string) => void;
  onOpenCreateModal: () => void;
}

const Projects: React.FC<ProjectsProps> = ({ projects, tasks, onSelectProject, onOpenCreateModal }) => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Projects</h1>
          <p className="text-gray-400">Manage your active development initiatives</p>
        </div>
        <button 
          onClick={onOpenCreateModal}
          className="bg-primary text-black px-6 py-3 rounded-full font-bold text-sm hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(209,244,95,0.3)] flex items-center gap-2"
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-surface border border-border border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center animate-slide-up delay-100">
            <div className="w-20 h-20 bg-surface-highlight rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Folder size={40} className="text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 max-w-md mb-8">
                Get started by creating your first project. Track tasks, manage sprints, and visualize your progress.
            </p>
            <button 
                onClick={onOpenCreateModal}
                className="bg-primary text-black px-8 py-3 rounded-xl font-bold hover:scale-105 hover:shadow-lg transition-all duration-300"
            >
                Create Project
            </button>
        </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, idx) => {
                  const projectTaskCount = tasks.filter(t => t.projectId === project.id).length;
                  const completedCount = tasks.filter(t => t.projectId === project.id && t.status === 'Done').length;
                  const progress = projectTaskCount === 0 ? 0 : Math.round((completedCount / projectTaskCount) * 100);

                  return (
                    <div 
                        key={project.id}
                        onClick={() => onSelectProject(project.id)}
                        className="bg-surface border border-border rounded-3xl p-6 cursor-pointer group hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-500 animate-slide-up"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-surface-highlight rounded-2xl flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all duration-300 shadow-lg">
                                {project.key}
                            </div>
                            <span className="text-xs bg-surface-highlight px-2 py-1 rounded-full text-gray-400 border border-border group-hover:border-primary/30 transition-colors">
                                {projectTaskCount} Tasks
                            </span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                        <p className="text-gray-500 text-sm mb-6 line-clamp-2 h-10">
                            {project.description || 'No description provided.'}
                        </p>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Progress</span>
                                <span className="text-white font-bold">{progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-surface-highlight rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                  );
              })}
          </div>
      )}
    </div>
  );
};

export default Projects;