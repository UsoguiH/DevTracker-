import { supabase } from './supabase';
import { Task, Project, Comment, Activity } from '../types';

export async function createProject(project: Omit<Project, 'id' | 'createdAt'>, userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ ...project, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return { ...data, createdAt: data.created_at };
}

export async function getProjects(userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(p => ({ ...p, createdAt: p.created_at }));
}

export async function updateProject(projectId: string, updates: Partial<Project>) {
  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId);

  if (error) throw error;
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
}

export async function createTask(task: Omit<Task, 'id' | 'comments' | 'activity'>, userId: string) {
  const taskData = {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate,
    start_date: task.startDate,
    duration_days: task.durationDays,
    estimated_time: task.estimatedTime,
    project_id: task.projectId,
    user_id: userId,
  };

  const { data: taskResult, error: taskError } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single();

  if (taskError) throw taskError;

  const newTask = {
    ...taskResult,
    dueDate: taskResult.due_date,
    startDate: taskResult.start_date,
    durationDays: taskResult.duration_days,
    estimatedTime: taskResult.estimated_time,
    projectId: taskResult.project_id,
    tags: task.tags || [],
    assignees: task.assignees || [],
    comments: [],
    activity: [],
  };

  if (task.tags && task.tags.length > 0) {
    const tagsData = task.tags.map(tag => ({
      task_id: newTask.id,
      name: tag.name,
      color: tag.color,
    }));

    const { error: tagsError } = await supabase
      .from('tags')
      .insert(tagsData);

    if (tagsError) throw tagsError;
    newTask.tags = task.tags;
  }

  const activityData = {
    task_id: newTask.id,
    user_id: userId,
    description: 'created this task',
    type: 'create',
  };

  await supabase.from('activity').insert([activityData]);

  return newTask;
}

export async function getTasks(projectId: string) {
  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (tasksError) throw tasksError;

  const tasks = await Promise.all(
    tasksData.map(async (task) => {
      const [tags, comments, activity] = await Promise.all([
        getTags(task.id),
        getComments(task.id),
        getActivity(task.id),
      ]);

      return {
        ...task,
        dueDate: task.due_date,
        startDate: task.start_date,
        durationDays: task.duration_days,
        estimatedTime: task.estimated_time,
        projectId: task.project_id,
        tags: tags,
        assignees: [],
        comments: comments,
        activity: activity,
      };
    })
  );

  return tasks;
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  const updateData: any = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.durationDays !== undefined) updateData.duration_days = updates.durationDays;
  if (updates.estimatedTime !== undefined) updateData.estimated_time = updates.estimatedTime;

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId);

  if (error) throw error;

  if (updates.tags !== undefined) {
    await supabase.from('tags').delete().eq('task_id', taskId);
    if (updates.tags.length > 0) {
      const tagsData = updates.tags.map(tag => ({
        task_id: taskId,
        name: tag.name,
        color: tag.color,
      }));
      await supabase.from('tags').insert(tagsData);
    }
  }
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}

export async function getTags(taskId: string) {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('task_id', taskId);

  if (error) throw error;
  return data.map(t => ({ name: t.name, color: t.color }));
}

export async function getComments(taskId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(c => ({
    id: c.id,
    userId: c.user_id,
    text: c.text,
    createdAt: c.created_at,
  }));
}

export async function addComment(taskId: string, userId: string, text: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert([{ task_id: taskId, user_id: userId, text }])
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, userId: data.user_id, text: data.text, createdAt: data.created_at };
}

export async function getActivity(taskId: string) {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(a => ({
    id: a.id,
    userId: a.user_id,
    description: a.description,
    type: a.type as any,
    createdAt: a.created_at,
  }));
}

export async function addActivity(taskId: string, userId: string, description: string, type: string) {
  const { error } = await supabase
    .from('activity')
    .insert([{ task_id: taskId, user_id: userId, description, type }]);

  if (error) throw error;
}
