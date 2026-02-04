import { Project, Task, User } from './types';

// Real application starts with empty states
export const USERS: User[] = [
  // Keeping one 'current user' for the session context
  // { id: 'u1', name: 'Developer', handle: '@me', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
];

export const PROJECTS: Project[] = [];

export const INITIAL_TASKS: Task[] = [];

export const TAG_COLORS = [
  { name: 'Critical', class: 'bg-red-500/20 text-red-400 border-red-500/50', dotClass: 'bg-red-500' },   // Red
  { name: 'High', class: 'bg-orange-500/20 text-orange-400 border-orange-500/50', dotClass: 'bg-orange-500' }, // Orange
  { name: 'Medium', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', dotClass: 'bg-yellow-500' }, // Yellow
  { name: 'Normal', class: 'bg-blue-500/20 text-blue-400 border-blue-500/50', dotClass: 'bg-blue-500' },    // Blue
  { name: 'Low', class: 'bg-zinc-700/20 text-zinc-400 border-zinc-700/50', dotClass: 'bg-zinc-500' },       // Gray
];