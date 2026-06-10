import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    LayoutDashboard,
    KanbanSquare,
    CalendarDays,
    BrainCircuit,
    FolderOpen,
    Settings,
    Plus,
    Zap,
    FileJson,
    FileSpreadsheet,
    ClipboardList,
    CornerDownLeft,
    Presentation,
} from 'lucide-react';
import { Task, Project } from '../types';

/**
 * Cursor-style command palette — Ctrl/Cmd+K from anywhere.
 * Fuzzy search across pages, quick actions, projects and tasks
 * with full keyboard navigation (↑↓ / Enter / Esc).
 */

type Group = 'Actions' | 'Pages' | 'Projects' | 'Tasks';

interface Command {
    id: string;
    group: Group;
    label: string;
    hint?: string;
    icon: React.ReactNode;
    keywords?: string;
    perform: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    tasks: Task[];
    activeProject: Project | null;
    onNavigate: (tab: string) => void;
    onSelectProject: (projectId: string) => void;
    onOpenTask: (task: Task) => void;
    onNewTask: () => void;
    onOpenFocusMode: () => void;
    onExportJSON: () => void;
    onExportCSV: () => void;
}

const GROUP_ORDER: Group[] = ['Actions', 'Pages', 'Projects', 'Tasks'];

const statusDot = (status: string) =>
    status === 'Done' ? 'bg-success' : status === 'In Progress' ? 'bg-primary' : 'bg-muted-soft';

const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    projects,
    tasks,
    activeProject,
    onNavigate,
    onSelectProject,
    onOpenTask,
    onNewTask,
    onOpenFocusMode,
    onExportJSON,
    onExportCSV,
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset + focus on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            // Wait for the panel animation to mount the input
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isOpen]);

    const allCommands = useMemo<Command[]>(() => {
        const run = (fn: () => void) => () => { fn(); onClose(); };
        const cmds: Command[] = [];

        // Quick actions
        if (activeProject) {
            cmds.push(
                { id: 'new-task', group: 'Actions', label: 'New Task', hint: 'Create a task in the current project', icon: <Plus size={16} />, keywords: 'create add todo', perform: run(onNewTask) },
                { id: 'focus', group: 'Actions', label: 'Enter Focus Mode', hint: 'Distraction-free timer', icon: <Zap size={16} />, keywords: 'pomodoro timer zen', perform: run(onOpenFocusMode) },
                { id: 'export-json', group: 'Actions', label: 'Export Project (JSON)', hint: 'Full backup of project + tasks', icon: <FileJson size={16} />, keywords: 'backup download save data', perform: run(onExportJSON) },
                { id: 'export-csv', group: 'Actions', label: 'Export Tasks (CSV)', hint: 'Spreadsheet-friendly task list', icon: <FileSpreadsheet size={16} />, keywords: 'backup download excel sheet', perform: run(onExportCSV) },
            );
        }

        // Pages
        const pages: Array<{ tab: string; label: string; icon: React.ReactNode; needsProject?: boolean }> = [
            { tab: 'projects', label: 'Projects', icon: <FolderOpen size={16} /> },
            { tab: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, needsProject: true },
            { tab: 'kanban', label: 'Kanban Board', icon: <KanbanSquare size={16} />, needsProject: true },
            { tab: 'timeline', label: 'Timeline', icon: <CalendarDays size={16} />, needsProject: true },
            { tab: 'canvas', label: 'Space (Canvas)', icon: <Presentation size={16} />, needsProject: true },
            { tab: 'ai', label: 'AI Manager', icon: <BrainCircuit size={16} />, needsProject: true },
            { tab: 'settings', label: 'Settings', icon: <Settings size={16} /> },
        ];
        pages.forEach(p => {
            if (p.needsProject && !activeProject) return;
            cmds.push({ id: `page-${p.tab}`, group: 'Pages', label: p.label, hint: 'Go to page', icon: p.icon, keywords: 'go navigate open view page', perform: run(() => onNavigate(p.tab)) });
        });

        // Projects
        projects.forEach(p => {
            cmds.push({
                id: `project-${p.id}`,
                group: 'Projects',
                label: p.name,
                hint: p.id === activeProject?.id ? 'Current project' : `Switch to ${p.key}`,
                icon: <FolderOpen size={16} />,
                keywords: `${p.key} ${p.description || ''} switch project`,
                perform: run(() => onSelectProject(p.id)),
            });
        });

        // Tasks (current project)
        tasks.forEach(t => {
            cmds.push({
                id: `task-${t.id}`,
                group: 'Tasks',
                label: t.title,
                hint: `${t.status} · ${t.priority}`,
                icon: (
                    <span className="relative inline-flex items-center justify-center">
                        <ClipboardList size={16} />
                        <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${statusDot(t.status)}`} />
                    </span>
                ),
                keywords: `${t.description || ''} ${(t.tags || []).map(x => x.name).join(' ')} ${t.status} ${t.priority}`,
                perform: run(() => onOpenTask(t)),
            });
        });

        return cmds;
    }, [activeProject, projects, tasks, onClose, onNavigate, onSelectProject, onOpenTask, onNewTask, onOpenFocusMode, onExportJSON, onExportCSV]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let result = allCommands;
        if (q) {
            const terms = q.split(/\s+/);
            result = allCommands.filter(c => {
                const haystack = `${c.label} ${c.keywords || ''}`.toLowerCase();
                return terms.every(t => haystack.includes(t));
            });
        }
        // Without a query keep the task list short — it's discoverable via typing
        if (!q) result = result.filter((c, _, arr) => c.group !== 'Tasks' || arr.filter(x => x.group === 'Tasks').indexOf(c) < 5);
        // Stable group ordering
        return [...result].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)).slice(0, 30);
    }, [query, allCommands]);

    // Clamp selection when results change
    useEffect(() => { setSelectedIndex(0); }, [query]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
            if (e.key === 'Enter') { e.preventDefault(); filtered[selectedIndex]?.perform(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, filtered, selectedIndex, onClose]);

    // Keep the selected row visible
    useEffect(() => {
        listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex, filtered]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[250] bg-ink/25 backdrop-blur-[2px] flex items-start justify-center px-4"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                        className="w-full max-w-xl mt-[16vh] bg-surface-card border border-hairline rounded-xl shadow-[0_24px_60px_-12px_rgba(38,37,30,0.35)] overflow-hidden"
                    >
                        {/* Search input */}
                        <div className="flex items-center gap-3 px-4 border-b border-hairline">
                            <Search size={18} className="text-muted shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search tasks, projects, pages or actions…"
                                className="w-full bg-transparent py-4 text-[15px] text-ink placeholder-muted-soft focus:outline-none"
                            />
                            <kbd className="text-[10px] font-mono text-muted-soft bg-surface-strong border border-hairline rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
                        </div>

                        {/* Results */}
                        <div ref={listRef} className="max-h-[46vh] overflow-y-auto py-2">
                            {filtered.length === 0 && (
                                <div className="px-4 py-10 text-center text-sm text-muted">
                                    No results for <span className="text-ink font-medium">"{query}"</span>
                                </div>
                            )}
                            {filtered.map((cmd, i) => {
                                const isFirstOfGroup = i === 0 || filtered[i - 1].group !== cmd.group;
                                const isSelected = i === selectedIndex;
                                return (
                                    <React.Fragment key={cmd.id}>
                                        {isFirstOfGroup && (
                                            <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-soft">{cmd.group}</p>
                                        )}
                                        <button
                                            data-selected={isSelected}
                                            onClick={cmd.perform}
                                            onMouseMove={() => setSelectedIndex(i)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-ink/[0.03]'}`}
                                        >
                                            <span className={`shrink-0 ${isSelected ? 'text-primary' : 'text-muted'}`}>{cmd.icon}</span>
                                            <span className={`text-sm truncate ${isSelected ? 'text-ink font-medium' : 'text-body'}`}>{cmd.label}</span>
                                            {cmd.hint && <span className="ml-auto text-[11px] text-muted-soft truncate shrink-0 max-w-[180px]">{cmd.hint}</span>}
                                            {isSelected && <CornerDownLeft size={13} className="text-primary shrink-0" />}
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Footer hints */}
                        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-hairline bg-canvas-soft text-[11px] text-muted-soft">
                            <span className="flex items-center gap-1.5"><kbd className="font-mono bg-surface-card border border-hairline rounded px-1 py-0.5">↑↓</kbd> navigate</span>
                            <span className="flex items-center gap-1.5"><kbd className="font-mono bg-surface-card border border-hairline rounded px-1 py-0.5">↵</kbd> select</span>
                            <span className="ml-auto font-mono">Ctrl K</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;
