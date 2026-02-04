
export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 'To Do' | 'In Progress' | 'Testing' | 'Done';

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
}
