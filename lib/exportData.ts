import { Project, Task } from '../types';

/**
 * Data export / backup utilities.
 * Everything runs client-side — a Blob is generated and downloaded
 * straight from the browser, no server round-trip.
 */

function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().split('T')[0];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';

/** Full-fidelity JSON backup of a project + all its tasks (incl. archived sprints). */
export function exportProjectJSON(project: Project, tasks: Task[]) {
    const payload = {
        app: 'DevTracker',
        exportedAt: new Date().toISOString(),
        project,
        tasks,
    };
    download(`${slug(project.name)}-backup-${stamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function csvCell(v: unknown): string {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Spreadsheet-friendly CSV of a project's tasks. */
export function exportTasksCSV(project: Project, tasks: Task[]) {
    const header = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Tags', 'Assignees', 'Start Date', 'End Date', 'Progress', 'Sprint', 'Completed At'];
    const rows = tasks.map(t => [
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        (t.tags || []).map(x => x.name).join('; '),
        (t.assignees || []).map(a => a.name).join('; '),
        t.startDate ?? '',
        t.endDate ?? '',
        t.progress ?? '',
        t.sprintId ?? '',
        t.completedAt ?? '',
    ]);
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    download(`${slug(project.name)}-tasks-${stamp()}.csv`, csv, 'text/csv;charset=utf-8');
}
