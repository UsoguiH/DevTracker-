import React from 'react';
import { Check } from 'lucide-react';
import { Priority, Task, User, WorkflowStatus, DEFAULT_WORKFLOW, Project } from '../../types';

/* Shared primitives for the project Workspace (Jira-style layout, editorial palette). */

// design.md tokens — cream canvas, warm ink, Cursor Orange accent
export const J = {
    text: '#26251e',        // ink
    sub: '#5a5852',         // body
    faint: '#807d72',       // muted
    accent: '#f54e00',      // Cursor Orange — scarce CTA
    accentActive: '#d04200',
    border: '#e6e5e0',      // hairline
    borderSoft: '#efeee8',  // hairline-soft
    borderStrong: '#cfcdc4',
    colBg: '#fafaf7',       // canvas-soft
    green: '#1f8a65',       // success
};

// The app's "Testing" status reads as "In Review" on this page only.
export const displayStatus = (name: string) => (name === 'Testing' ? 'In Review' : name);

export const workflowOf = (project?: Project | null): WorkflowStatus[] =>
    [...((project?.workflow && project.workflow.length > 0) ? project.workflow : DEFAULT_WORKFLOW)]
        .sort((a, b) => a.order - b.order);

// Stable issue keys (KAN-1 …) derived from task order within the project.
export const keyMapOf = (tasks: Task[], projectKey: string): Map<string, string> => {
    const map = new Map<string, string>();
    tasks.forEach((t, i) => map.set(t.id, `${projectKey}-${i + 1}`));
    return map;
};

// Status chip colors by workflow column type — tinted to the editorial palette
export const statusChipStyle = (type: WorkflowStatus['type']): React.CSSProperties => {
    switch (type) {
        case 'done': return { background: '#e2f1ea', color: '#1f8a65' };
        case 'active': return { background: '#e6edf8', color: '#44608a' };
        default: return { background: '#e6e5e0', color: '#5a5852' };
    }
};

// Work-item type icon: orange square with a white check
export const TypeIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
    <span
        className="inline-flex items-center justify-center rounded-[3px] shrink-0"
        style={{ width: size, height: size, background: J.accent }}
    >
        <Check size={size * 0.7} className="text-white" strokeWidth={3.5} />
    </span>
);

export const PriorityIcon: React.FC<{ p: Priority; size?: number }> = ({ p, size = 16 }) => {
    if (p === 'High') {
        return (
            <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="#cf2d56" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 9.5 8 5l4.5 4.5" />
                <path d="M3.5 13 8 8.5l4.5 4.5" opacity="0.55" />
            </svg>
        );
    }
    if (p === 'Low') {
        return (
            <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="#5b7db1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 6.5 8 11l4.5-4.5" />
            </svg>
        );
    }
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="#c08532" strokeWidth="2.4" strokeLinecap="round">
            <path d="M3.5 6h9" />
            <path d="M3.5 10h9" />
        </svg>
    );
};

const AVATAR_BG = ['#dfa88f', '#9fc9a2', '#9fbbe0', '#c0a8dd', '#c08532'];

export const JAvatar: React.FC<{ user?: User | null; size?: number; ring?: boolean }> = ({ user, size = 24, ring = false }) => {
    const style: React.CSSProperties = { width: size, height: size };
    if (!user) {
        return (
            <span className={`inline-flex items-center justify-center rounded-full bg-surface-strong text-muted shrink-0 ${ring ? 'ring-2 ring-surface-card' : ''}`} style={style}>
                <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" /></svg>
            </span>
        );
    }
    if (user.avatar) {
        return <img src={user.avatar} alt={user.name} className={`rounded-full object-cover shrink-0 ${ring ? 'ring-2 ring-surface-card' : ''}`} style={style} />;
    }
    const bg = AVATAR_BG[(user.name?.charCodeAt(0) || 0) % AVATAR_BG.length];
    return (
        <span
            className={`inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0 ${ring ? 'ring-2 ring-surface-card' : ''}`}
            style={{ ...style, background: bg, fontSize: size * 0.45 }}
        >
            {(user.name || '?').charAt(0).toUpperCase()}
        </span>
    );
};

export const uniqueAssignees = (tasks: Task[]): User[] => {
    const seen = new Map<string, User>();
    tasks.forEach(t => t.assignees.forEach(u => { if (!seen.has(u.id)) seen.set(u.id, u); }));
    return Array.from(seen.values());
};
