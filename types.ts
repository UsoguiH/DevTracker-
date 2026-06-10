
export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 'To Do' | 'In Progress' | 'Testing' | 'Done';

export interface WorkflowStatus {
  id: string;
  name: string;
  color: string; // hex value e.g. '#9ef5a3'
  type: 'start' | 'active' | 'done';
  order: number;
}

export const DEFAULT_WORKFLOW: WorkflowStatus[] = [
  { id: 'todo',       name: 'To Do',       color: '#71717a', type: 'start',  order: 0 },
  { id: 'inprogress', name: 'In Progress', color: '#3b82f6', type: 'active', order: 1 },
  { id: 'testing',    name: 'Testing',     color: '#f59e0b', type: 'active', order: 2 },
  { id: 'done',       name: 'Done',        color: '#9ef5a3', type: 'done',   order: 3 },
];

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  userId: string; // 'system' or userId
  description: string;
  type: 'status' | 'comment' | 'create' | 'update';
  createdAt: string;
}

export interface Tag {
  name: string;
  color: string; // Tailwind class string
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  tags: Tag[];
  assignees: User[];
  dueDate: string; // ISO date string
  estimatedTime: string;
  comments: Comment[];
  activity: Activity[];
  projectId: string; // Link to specific project
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  subtasks?: Subtask[];
  sprintId?: string;
  progress?: number; // 0 to 100
  completedAt?: string; // ISO String for heatmap
}

export interface ProjectResource {
  palette: { name: string; value: string }[];
  links: { label: string; url: string }[];
  commands: { label: string; command: string }[];
  stack: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  key: string; // e.g., 'DT' for DevTrack
  createdAt: string;
  resources?: ProjectResource; // The HUD Data
  workflow?: WorkflowStatus[]; // Custom kanban columns
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isThinking?: boolean;
  pendingAction?: AIAction; // For approval workflow
}

export interface AIAction {
  intent: 'CREATE_TASKS' | 'FILTER_VIEW' | 'INSIGHT' | 'NONE';
  payload?: any;
  summary?: string; // Natural language explanation of what was done
}

// ── Canvas / Space (infinite whiteboard) ────────────────────────────────────

export type BoardElementType = 'sticky' | 'rect' | 'ellipse' | 'diamond' | 'text' | 'draw';

export interface BoardElement {
  id: string;
  type: BoardElementType;
  x: number;          // world coords, top-left
  y: number;
  w: number;
  h: number;
  text?: string;
  color?: string;     // fill (stickies/shapes)
  points?: [number, number][]; // freehand strokes, absolute world coords
  fontSize?: number;
}

export interface BoardConnector {
  id: string;
  from: string;       // element id
  to: string;         // element id
  label?: string;
}

export interface BoardData {
  elements: BoardElement[];
  connectors: BoardConnector[];
}
