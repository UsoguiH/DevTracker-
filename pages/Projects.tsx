import React, { useState, useRef, useEffect } from 'react';
import { Folder, Plus, MoreVertical, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';
import { Project, Task } from '../types';

interface ProjectsProps {
    projects: Project[];
    tasks: Task[];
    onSelectProject: (projectId: string) => void;
    onOpenCreateModal: () => void;
    onEditProject: (project: Project) => void;
    onDeleteProject: (projectId: string) => void;
    onInviteMember: (projectId: string, email: string) => void;
}

const Projects: React.FC<ProjectsProps> = ({
    projects,
    tasks,
    onSelectProject,
    onOpenCreateModal,
    onEditProject,
    onDeleteProject,
    onInviteMember
}) => {
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if (activeMenuId) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeMenuId]);

    const toggleMenu = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === projectId ? null : projectId);
    };

    const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setProjectToDelete(project);
        setActiveMenuId(null);
    };

    const handleEditClick = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        onEditProject(project);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (projectToDelete) {
            onDeleteProject(projectToDelete.id);
            setProjectToDelete(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto relative">
            {/* Custom Delete Confirmation Modal */}
            {projectToDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setProjectToDelete(null)}>
                    <div
                        className="bg-[#1A0505] border border-red-900/50 w-full max-w-md rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.2)] overflow-hidden animate-pop-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500 animate-pulse">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Delete Project?</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                Are you sure you want to delete <span className="text-white font-bold">"{projectToDelete.name}"</span>?
                                <br />
                                This action <span className="text-red-400 font-bold">cannot be undone</span> and will permanently remove the project and all {tasks.filter(t => t.projectId === projectToDelete.id).length} associated tasks.
                            </p>

                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setProjectToDelete(null)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors border border-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                                >
                                    Delete Forever
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                className="bg-surface border border-border rounded-3xl p-6 cursor-pointer group hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-500 animate-slide-up relative"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-surface-highlight rounded-2xl flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all duration-300 shadow-lg">
                                        {project.key}
                                    </div>

                                    {/* More Actions Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => toggleMenu(e, project.id)}
                                            className="p-2 rounded-full text-gray-500 hover:text-white hover:bg-surface-highlight transition-all"
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {activeMenuId === project.id && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1C1C1E] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-pop-in">
                                                <button
                                                    onClick={(e) => handleEditClick(e, project)}
                                                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                                                >
                                                    <Edit2 size={16} /> Edit Project
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onInviteMember(project.id, project.name); // Just Open Modal
                                                        setActiveMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 flex items-center gap-2 transition-colors"
                                                >
                                                    <Plus size={16} /> Invite Member
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, project)}
                                                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                                >
                                                    <Trash2 size={16} /> Delete Project
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                                        <p className="text-gray-500 text-sm mb-6 line-clamp-2 h-10 pr-4">
                                            {project.description || 'No description provided.'}
                                        </p>
                                    </div>
                                </div>

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
                                    <div className="text-right pt-2">
                                        <span className="text-[10px] text-gray-500">{projectTaskCount} Total Tasks</span>
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