import React, { useState, useEffect } from 'react';
import { Save, Bell, Shield, Smartphone, Mail, User as UserIcon, LogOut, Workflow, DatabaseBackup, FileJson, FileSpreadsheet } from 'lucide-react';
import { User, Project, WorkflowStatus, DEFAULT_WORKFLOW } from '../types';
import WorkflowEditor from '../components/WorkflowEditor';

interface SettingsProps {
    user: User;
    onUpdateUser: (updatedUser: User) => void;
    onClearData: () => void;
    activeProject?: Project | null;
    onUpdateProject?: (projectId: string, updates: Partial<Project>) => Promise<void>;
    taskCount?: number;
    onExportJSON?: () => void;
    onExportCSV?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser, onClearData, activeProject, onUpdateProject, taskCount = 0, onExportJSON, onExportCSV }) => {
    const [formData, setFormData] = useState<User>(user);
    const [isDirty, setIsDirty] = useState(false);
    const [showSaved, setShowSaved] = useState(false);

    useEffect(() => { setFormData(user); }, [user]);

    const handleChange = (field: keyof User, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setShowSaved(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateUser(formData);
        setIsDirty(false);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 3000);
    };

    const card = 'bg-surface-card border border-hairline rounded-xl p-8';
    const label = 'block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5 group-focus-within:text-primary transition-colors';
    const input = 'w-full bg-surface-card border border-hairline-strong rounded-md px-4 py-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300';

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <h1 className="display text-[36px] text-ink mb-1 animate-slide-up">Settings</h1>
            <p className="text-body mb-8 animate-slide-up delay-100">Manage your profile and application preferences.</p>

            <div className="grid gap-8">
                {/* Profile */}
                <div className={`${card} animate-slide-up delay-100`}>
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-hairline">
                        <div className="p-3 bg-canvas-soft rounded-lg text-primary"><UserIcon size={24} /></div>
                        <div>
                            <h2 className="text-xl font-semibold text-ink">Profile Information</h2>
                            <p className="text-sm text-muted">Update your public profile details.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <img src={formData.avatar} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-hairline object-cover transition-transform duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0 rounded-full bg-ink/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-not-allowed">
                                        <span className="text-xs font-bold text-canvas">Preview Only</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 w-full space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className={label}>Display Name</label>
                                        <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className={input} placeholder="Your Name" />
                                    </div>
                                    <div className="group">
                                        <label className={label}>Handle</label>
                                        <input type="text" value={formData.handle} onChange={(e) => handleChange('handle', e.target.value)} className={input} placeholder="@handle" />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className={label}>Avatar URL</label>
                                    <input type="text" value={formData.avatar} onChange={(e) => handleChange('avatar', e.target.value)} className={input + ' font-mono text-xs text-body'} placeholder="https://..." />
                                    <p className="text-[10px] text-muted mt-1">Paste a direct image link. Support for uploads coming soon.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-hairline">
                            <button type="submit" disabled={!isDirty}
                                className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium text-sm transition-all duration-300 ${isDirty ? 'bg-primary text-on-primary hover:bg-primary-active' : 'bg-surface-strong text-muted-soft cursor-not-allowed'}`}>
                                <Save size={18} />
                                {showSaved ? 'Saved!' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Notifications & Privacy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className={`${card} animate-slide-up delay-200`}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-canvas-soft rounded-lg text-primary"><Bell size={24} /></div>
                            <h2 className="text-lg font-semibold text-ink">Notifications</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-canvas-soft rounded-md border border-hairline">
                                <div className="flex items-center gap-3"><Mail size={18} className="text-muted" /><span className="text-sm font-medium text-ink">Email Alerts</span></div>
                                <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-on-primary rounded-full"></div></div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-canvas-soft rounded-md border border-hairline">
                                <div className="flex items-center gap-3"><Smartphone size={18} className="text-muted" /><span className="text-sm font-medium text-ink">Push Notifications</span></div>
                                <div className="w-10 h-6 bg-surface-strong rounded-full relative cursor-pointer border border-hairline-strong"><div className="absolute left-1 top-1 w-4 h-4 bg-muted-soft rounded-full"></div></div>
                            </div>
                        </div>
                    </div>

                    <div className={`${card} animate-slide-up delay-300`}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-canvas-soft rounded-lg text-ink"><Shield size={24} /></div>
                            <h2 className="text-lg font-semibold text-ink">Privacy</h2>
                        </div>
                        <p className="text-sm text-body mb-6 leading-relaxed">
                            Your project data is stored securely in your Supabase workspace and synced across your devices.
                        </p>
                        <div className="flex items-center gap-2 text-xs font-mono text-success bg-success/10 p-3 rounded-md border border-success/20">
                            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                            Cloud Sync: Connected
                        </div>
                    </div>
                </div>

                {/* Workflow */}
                {activeProject && onUpdateProject && (
                    <div className={`${card} animate-slide-up delay-300`}>
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-hairline">
                            <div className="p-3 bg-canvas-soft rounded-lg text-primary"><Workflow size={24} /></div>
                            <div>
                                <h2 className="text-xl font-semibold text-ink">Project Workflow</h2>
                                <p className="text-sm text-muted">Customize kanban columns for <span className="text-ink font-semibold">{activeProject.name}</span></p>
                            </div>
                        </div>
                        <WorkflowEditor
                            workflow={activeProject.workflow ?? DEFAULT_WORKFLOW}
                            onSave={async (newWorkflow: WorkflowStatus[]) => { await onUpdateProject(activeProject.id, { workflow: newWorkflow }); }}
                        />
                    </div>
                )}

                {/* Data Export */}
                {activeProject && onExportJSON && onExportCSV && (
                    <div className={`${card} animate-slide-up delay-300`}>
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-hairline">
                            <div className="p-3 bg-canvas-soft rounded-lg text-primary"><DatabaseBackup size={24} /></div>
                            <div>
                                <h2 className="text-xl font-semibold text-ink">Data Export</h2>
                                <p className="text-sm text-muted">Download a local copy of <span className="text-ink font-semibold">{activeProject.name}</span> — {taskCount} task{taskCount === 1 ? '' : 's'}, archived sprints included.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onClick={onExportJSON}
                                className="flex items-start gap-4 p-5 bg-canvas-soft border border-hairline rounded-lg text-left hover:border-primary/50 hover:-translate-y-0.5 transition-all group">
                                <FileJson size={22} className="text-muted group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-ink text-sm mb-1">JSON Backup</h3>
                                    <p className="text-xs text-muted leading-relaxed">Full-fidelity backup of the project and every task — tags, assignees, subtasks and all.</p>
                                </div>
                            </button>
                            <button onClick={onExportCSV}
                                className="flex items-start gap-4 p-5 bg-canvas-soft border border-hairline rounded-lg text-left hover:border-primary/50 hover:-translate-y-0.5 transition-all group">
                                <FileSpreadsheet size={22} className="text-muted group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-ink text-sm mb-1">CSV Spreadsheet</h3>
                                    <p className="text-xs text-muted leading-relaxed">Task list in spreadsheet format — opens straight in Excel, Numbers or Google Sheets.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Account */}
                <div className={`${card} animate-slide-up delay-400`}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-error/10 rounded-lg text-error"><LogOut size={24} /></div>
                        <div>
                            <h2 className="text-xl font-semibold text-ink">Session</h2>
                            <p className="text-sm text-muted">Manage your active session.</p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-error/5 border border-error/15 rounded-lg">
                        <div>
                            <h3 className="font-semibold text-ink mb-1">Sign Out</h3>
                            <p className="text-sm text-muted">Securely log out of your account. Your data is saved in the cloud.</p>
                        </div>
                        <button onClick={onClearData}
                            className="flex items-center gap-2 px-6 py-3 bg-surface-card hover:bg-error/10 text-error border border-error/25 rounded-md font-medium text-sm transition-all">
                            <LogOut size={18} />
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
