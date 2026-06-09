import React, { useState, useEffect } from 'react';
import { Folder, Plus, MoreVertical, Edit2, Trash2, AlertTriangle } from 'lucide-react';
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

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if (activeMenuId) document.addEventListener('click', handleClickOutside);
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
            {/* Delete Confirmation Modal */}
            {projectToDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={() => setProjectToDelete(null)}>
                    <div
                        className="bg-surface-card border border-hairline w-full max-w-md rounded-xl overflow-hidden animate-pop-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-6 text-error">
                                <AlertTriangle size={30} />
                            </div>
                            <h3 className="display text-2xl text-ink mb-2">Delete project?</h3>
                            <p className="text-body text-sm mb-8 leading-relaxed">
                                Are you sure you want to delete <span className="text-ink font-semibold">"{projectToDelete.name}"</span>?
                                <br />
                                This <span className="text-error font-semibold">cannot be undone</span> and will permanently remove the project and all {tasks.filter(t => t.projectId === projectToDelete.id).length} associated tasks.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setProjectToDelete(null)}
                                    className="flex-1 py-2.5 bg-surface-card hover:bg-canvas-soft text-ink rounded-md font-medium text-sm transition-colors border border-hairline-strong"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-2.5 bg-error hover:opacity-90 text-white rounded-md font-medium text-sm transition-opacity"
                                >
                                    Delete forever
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-8 animate-slide-up">
                <div>
                    <h1 className="display text-[36px] text-ink mb-1">My projects</h1>
                    <p className="text-body">Manage your active development initiatives</p>
                </div>
                <button
                    onClick={onOpenCreateModal}
                    className="bg-primary text-on-primary px-5 py-2.5 rounded-md font-medium text-sm hover:bg-primary-active transition-colors flex items-center gap-2"
                >
                    <Plus size={18} /> New project
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="bg-surface-card border border-hairline border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center animate-slide-up delay-100">
                    <div className="w-20 h-20 bg-canvas-soft rounded-full flex items-center justify-center mb-6">
                        <Folder size={36} className="text-muted-soft" />
                    </div>
                    <h3 className="display text-xl text-ink mb-2">No projects yet</h3>
                    <p className="text-body max-w-md mb-8">
                        Get started by creating your first project. Track tasks, manage sprints, and visualize your progress.
                    </p>
                    <button
                        onClick={onOpenCreateModal}
                        className="bg-primary text-on-primary px-8 py-3 rounded-md font-medium hover:bg-primary-active transition-colors"
                    >
                        Create project
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
                                className="bg-surface-card border border-hairline rounded-xl p-6 cursor-pointer group hover:border-primary/60 transition-all duration-300 animate-slide-up relative"
                                style={{ animationDelay: `${idx * 80}ms` }}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-ink rounded-lg flex items-center justify-center text-canvas font-semibold text-lg group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                                        {project.key}
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={(e) => toggleMenu(e, project.id)}
                                            className="p-2 rounded-md text-muted hover:text-ink hover:bg-canvas-soft transition-all"
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {activeMenuId === project.id && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-surface-card border border-hairline rounded-lg shadow-sm z-50 overflow-hidden animate-pop-in">
                                                <button
                                                    onClick={(e) => handleEditClick(e, project)}
                                                    className="w-full text-left px-4 py-3 text-sm text-body hover:text-ink hover:bg-canvas-soft flex items-center gap-2 transition-colors"
                                                >
                                                    <Edit2 size={16} /> Edit project
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onInviteMember(project.id, project.name);
                                                        setActiveMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-body hover:text-ink hover:bg-canvas-soft flex items-center gap-2 transition-colors"
                                                >
                                                    <Plus size={16} /> Invite member
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, project)}
                                                    className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/5 flex items-center gap-2 transition-colors"
                                                >
                                                    <Trash2 size={16} /> Delete project
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-[18px] font-semibold text-ink mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                                <p className="text-muted text-sm mb-6 line-clamp-2 h-10 pr-4">
                                    {project.description || 'No description provided.'}
                                </p>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted">Progress</span>
                                        <span className="text-ink font-semibold">{progress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-surface-strong rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-right pt-2">
                                        <span className="text-[11px] text-muted">{projectTaskCount} total tasks</span>
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
