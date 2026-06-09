
import React, { useState, useEffect } from 'react';
import {
    X, Copy, ExternalLink, Terminal, Palette,
    Layers, Plus, Trash2, Save, Edit2, Link as LinkIcon
} from 'lucide-react';
import { Project, ProjectResource } from '../types';

interface ProjectHUDProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
}

const editInput = 'bg-surface-card border border-hairline-strong rounded px-2 text-xs text-ink focus:outline-none focus:border-primary';
const addBtn = 'w-full py-2 border border-dashed border-hairline-strong rounded-lg text-xs text-muted hover:text-ink hover:border-primary/50 flex items-center justify-center gap-1';
const sectionH = 'text-xs font-bold text-muted uppercase mb-3 flex items-center gap-2';

const ProjectHUD: React.FC<ProjectHUDProps> = ({ isOpen, onClose, project, onUpdateProject }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [resources, setResources] = useState<ProjectResource>({ palette: [], links: [], commands: [], stack: [] });

    useEffect(() => {
        if (project) {
            setResources(project.resources || {
                palette: [{ name: 'Primary', value: '#f54e00' }, { name: 'Canvas', value: '#f7f7f4' }],
                links: [],
                commands: [{ label: 'Start Dev', command: 'npm run dev' }],
                stack: ['React', 'TypeScript']
            });
        }
    }, [project]);

    const handleSave = () => { onUpdateProject(project.id, { resources }); setIsEditing(false); };
    const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

    const addColor = () => setResources(prev => ({ ...prev, palette: [...prev.palette, { name: 'New Color', value: '#ffffff' }] }));
    const updateColor = (idx: number, field: 'name' | 'value', val: string) => {
        const newPalette = [...resources.palette];
        newPalette[idx] = { ...newPalette[idx], [field]: val };
        setResources(prev => ({ ...prev, palette: newPalette }));
    };
    const removeColor = (idx: number) => setResources(prev => ({ ...prev, palette: prev.palette.filter((_, i) => i !== idx) }));

    const addCommand = () => setResources(prev => ({ ...prev, commands: [...prev.commands, { label: 'New Command', command: '' }] }));
    const updateCommand = (idx: number, field: 'label' | 'command', val: string) => {
        const newCmds = [...resources.commands];
        newCmds[idx] = { ...newCmds[idx], [field]: val };
        setResources(prev => ({ ...prev, commands: newCmds }));
    };
    const removeCommand = (idx: number) => setResources(prev => ({ ...prev, commands: prev.commands.filter((_, i) => i !== idx) }));

    const addLink = () => setResources(prev => ({ ...prev, links: [...prev.links, { label: 'New Link', url: 'https://' }] }));
    const updateLink = (idx: number, field: 'label' | 'url', val: string) => {
        const newLinks = [...resources.links];
        newLinks[idx] = { ...newLinks[idx], [field]: val };
        setResources(prev => ({ ...prev, links: newLinks }));
    };
    const removeLink = (idx: number) => setResources(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== idx) }));

    const addStack = () => setResources(prev => ({ ...prev, stack: [...prev.stack, 'New Tech'] }));
    const updateStack = (idx: number, val: string) => {
        const newStack = [...resources.stack];
        newStack[idx] = val;
        setResources(prev => ({ ...prev, stack: newStack }));
    };
    const removeStack = (idx: number) => setResources(prev => ({ ...prev, stack: prev.stack.filter((_, i) => i !== idx) }));

    if (!isOpen) return null;

    return (
        <div className="absolute top-20 right-0 bottom-0 w-80 bg-surface-card border-l border-hairline shadow-sm z-30 flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="h-16 border-b border-hairline flex items-center justify-between px-6 bg-canvas-soft">
                <span className="font-semibold text-ink uppercase tracking-widest text-xs flex items-center gap-2">
                    <Layers size={14} className="text-primary" /> Project HUD
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        className={`p-2 rounded-md transition-colors ${isEditing ? 'text-primary hover:bg-primary/10' : 'text-muted hover:text-ink'}`}
                        title={isEditing ? "Save Changes" : "Edit Resources"}>
                        {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
                    </button>
                    <button onClick={onClose} className="p-2 text-muted hover:text-ink"><X size={18} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Palette */}
                <section>
                    <h3 className={sectionH}><Palette size={12} /> Palette</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {resources.palette.map((color, idx) => (
                            <div key={idx} className="flex items-center gap-3 group">
                                {isEditing ? (
                                    <div className="flex gap-2 w-full">
                                        <input type="color" value={color.value} onChange={(e) => updateColor(idx, 'value', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                                        <input type="text" value={color.name} onChange={(e) => updateColor(idx, 'name', e.target.value)} className={`flex-1 ${editInput}`} />
                                        <button onClick={() => removeColor(idx)} className="text-error hover:opacity-80"><Trash2 size={14} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-8 h-8 rounded-lg border border-hairline shrink-0 cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: color.value }} onClick={() => copyToClipboard(color.value)}></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-ink truncate">{color.name}</div>
                                            <div className="text-[10px] text-muted font-mono flex items-center gap-1 cursor-pointer hover:text-primary transition-colors" onClick={() => copyToClipboard(color.value)}>
                                                {color.value} <Copy size={8} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {isEditing && <button onClick={addColor} className={addBtn}><Plus size={12} /> Add Color</button>}
                    </div>
                </section>

                {/* Commands */}
                <section>
                    <h3 className={sectionH}><Terminal size={12} /> Environment</h3>
                    <div className="space-y-3">
                        {resources.commands.map((cmd, idx) => (
                            <div key={idx} className="bg-canvas-soft rounded-lg border border-hairline overflow-hidden group">
                                {isEditing ? (
                                    <div className="p-2 space-y-2">
                                        <input type="text" value={cmd.label} onChange={(e) => updateCommand(idx, 'label', e.target.value)} className={`w-full ${editInput} py-1`} placeholder="Label" />
                                        <div className="flex gap-2">
                                            <input type="text" value={cmd.command} onChange={(e) => updateCommand(idx, 'command', e.target.value)} className={`flex-1 ${editInput} py-1 font-mono`} placeholder="Command" />
                                            <button onClick={() => removeCommand(idx)} className="text-error hover:opacity-80"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-surface-strong px-3 py-1.5 text-[10px] font-bold text-muted flex justify-between items-center">
                                            {cmd.label}
                                            <button onClick={() => copyToClipboard(cmd.command)} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-ink"><Copy size={12} /></button>
                                        </div>
                                        <div className="px-3 py-2 text-xs font-mono text-primary truncate cursor-pointer hover:bg-canvas transition-colors" onClick={() => copyToClipboard(cmd.command)}>$ {cmd.command}</div>
                                    </>
                                )}
                            </div>
                        ))}
                        {isEditing && <button onClick={addCommand} className={addBtn}><Plus size={12} /> Add Command</button>}
                    </div>
                </section>

                {/* Links */}
                <section>
                    <h3 className={sectionH}><LinkIcon size={12} /> Warp Points</h3>
                    <div className="space-y-2">
                        {resources.links.map((link, idx) => (
                            <div key={idx}>
                                {isEditing ? (
                                    <div className="flex gap-2 items-center mb-2">
                                        <input type="text" value={link.label} onChange={(e) => updateLink(idx, 'label', e.target.value)} className={`w-1/3 ${editInput} py-1`} />
                                        <input type="text" value={link.url} onChange={(e) => updateLink(idx, 'url', e.target.value)} className={`flex-1 ${editInput} py-1`} />
                                        <button onClick={() => removeLink(idx)} className="text-error hover:opacity-80"><Trash2 size={14} /></button>
                                    </div>
                                ) : (
                                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-lg bg-surface-card border border-hairline hover:border-primary/50 hover:bg-canvas-soft transition-all group">
                                        <span className="text-sm text-body font-medium group-hover:text-ink">{link.label}</span>
                                        <ExternalLink size={14} className="text-muted group-hover:text-primary" />
                                    </a>
                                )}
                            </div>
                        ))}
                        {isEditing && <button onClick={addLink} className={addBtn}><Plus size={12} /> Add Link</button>}
                    </div>
                </section>

                {/* Stack */}
                <section>
                    <h3 className={sectionH}><Layers size={12} /> Tech Stack</h3>
                    <div className="flex flex-wrap gap-2">
                        {resources.stack.map((tech, idx) => (
                            <React.Fragment key={idx}>
                                {isEditing ? (
                                    <div className="flex items-center gap-1 bg-surface-card border border-hairline-strong rounded px-2 py-1">
                                        <input type="text" value={tech} onChange={(e) => updateStack(idx, e.target.value)} className="w-20 bg-transparent text-xs outline-none text-ink" />
                                        <button onClick={() => removeStack(idx)} className="text-error"><Trash2 size={10} /></button>
                                    </div>
                                ) : (
                                    <span className="px-3 py-1 bg-surface-strong border border-hairline rounded-full text-xs text-body hover:text-ink transition-colors cursor-default">{tech}</span>
                                )}
                            </React.Fragment>
                        ))}
                        {isEditing && <button onClick={addStack} className="px-3 py-1 border border-dashed border-hairline-strong rounded-full text-xs text-muted hover:text-ink hover:border-primary/50 flex items-center gap-1"><Plus size={10} /> Add</button>}
                    </div>
                </section>
            </div>

            <div className="p-4 border-t border-hairline bg-canvas-soft text-[10px] text-muted text-center">
                Project ID: <span className="font-mono text-body">{project.id}</span>
            </div>
        </div>
    );
};

export default ProjectHUD;
