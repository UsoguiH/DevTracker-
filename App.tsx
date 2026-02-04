
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './src/supabaseClient';
import Login from './src/pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import KanbanBoard from './pages/KanbanBoard';
import Timeline from './pages/Timeline';
import Projects from './pages/Projects';
import Settings from './pages/Settings';
import TaskModal from './components/TaskModal';
import ProjectModal from './components/ProjectModal';
import TaskDetailDrawer from './components/TaskDetailDrawer';
import SprintHistoryModal from './components/SprintHistoryModal';
import FocusMode from './components/FocusMode';
import InviteMemberModal from './components/InviteMemberModal';
import { Task, Status, Project, User, Activity } from './types';
import { USERS, TAG_COLORS } from './constants';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Application State
  const [activeTab, setActiveTab] = useState('projects');

  // Data State
  const [user, setUser] = useState<User>({ id: 'loading', name: 'Loading...', handle: '@loading', avatar: '' });
  const [allUsers, setAllUsers] = useState<User[]>([]); // Keep for fallback/legacy
  const [projectMembers, setProjectMembers] = useState<Record<string, User[]>>({}); // New: Map projectId -> User[]
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');



  const fetchData = async (userId: string) => {
    setIsLoading(true);
    try {
      const [profileRes, allProfilesRes, projectsRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('profiles').select('*'), // Fetch ALL potential team members
        supabase.from('projects').select('*').order('created_at', { ascending: true }),
        supabase.from('tasks').select('*')
      ]);

      if (profileRes.data) setUser(profileRes.data);
      if (allProfilesRes.data) setAllUsers(allProfilesRes.data);

      if (projectsRes.data) {
        // Map Supabase snake_case to internal camelCase
        const mappedProjects = projectsRes.data.map((p: any) => ({
          ...p,
          createdAt: p.created_at
        }));
        setProjects(mappedProjects);

        // Fetch Project Members
        const projectIds = projectsRes.data.map((p: Project) => p.id);
        if (projectIds.length > 0) {
          const { data: members } = await supabase
            .from('project_members')
            .select('project_id, user:profiles(*)')
            .in('project_id', projectIds);

          if (members) {
            const membersMap: Record<string, User[]> = {};
            projectIds.forEach((pid: string) => membersMap[pid] = []);

            members.forEach((m: any) => {
              if (m.user) {
                if (!membersMap[m.project_id]) membersMap[m.project_id] = [];
                if (!membersMap[m.project_id].some((u: User) => u.id === m.user.id)) {
                  membersMap[m.project_id].push(m.user);
                }
              }
            });
            setProjectMembers(membersMap);
          }
        }
      }

      if (tasksRes.data) {
        // ... (existing parsing logic) ...
        const parsedTasks = tasksRes.data.map((t: any) => ({
          ...t,
          projectId: t.project_id,
          startDate: t.start_date,
          endDate: t.end_date,
          durationDays: t.duration_days,
          estimatedTime: t.estimated_time,
          completedAt: t.completed_at,
          sprintId: t.sprint_id,
          tags: (typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags) || [],
          assignees: (typeof t.assignees === 'string' ? JSON.parse(t.assignees) : t.assignees) || [],
          subtasks: (typeof t.subtasks === 'string' ? JSON.parse(t.subtasks) : t.subtasks) || [],
        }));
        setTasks(parsedTasks);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ... (inside return JSX) ...



  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialStatus, setInitialStatus] = useState<Status>('To Do');

  // Project Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Focus Mode State
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);



  // --- Derived State ---
  const activeProject = useMemo(() =>
    projects.find(p => p.id === activeProjectId),
    [projects, activeProjectId]);

  const projectTasks = useMemo(() =>
    activeProjectId ? tasks.filter(t => t.projectId === activeProjectId && !t.sprintId) : [],
    [tasks, activeProjectId]);

  const archivedTasks = useMemo(() =>
    activeProjectId ? tasks.filter(t => t.projectId === activeProjectId && t.sprintId) : [],
    [tasks, activeProjectId]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return projectTasks;
    const lowerQuery = searchQuery.toLowerCase();
    return projectTasks.filter(t =>
      t.title.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.name.toLowerCase().includes(lowerQuery))
    );
  }, [projectTasks, searchQuery]);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
      } else {
        setIsLoading(false); // Stop loading if no session
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
      } else {
        setProjects([]);
        setTasks([]);
        setUser(USERS[0]);
        setIsLoading(false);
      }
    });

    // --- Realtime Subscription ---
    const tasksChannel = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT') {
            const parsedTask = {
              ...newRecord,
              projectId: newRecord.project_id,
              startDate: newRecord.start_date,
              endDate: newRecord.end_date,
              durationDays: newRecord.duration_days,
              estimatedTime: newRecord.estimated_time,
              completedAt: newRecord.completed_at,
              sprintId: newRecord.sprint_id,
              tags: newRecord.tags || [],
              assignees: newRecord.assignees || [],
              subtasks: newRecord.subtasks || [],
              comments: []
            };

            setTasks((prev) => {
              if (prev.some(t => t.id === parsedTask.id)) return prev;
              return [...prev, parsedTask];
            });
          }

          if (eventType === 'UPDATE') {
            setTasks((prev) => prev.map((t) => {
              if (t.id === newRecord.id) {
                return {
                  ...t,
                  ...newRecord,
                  projectId: newRecord.project_id,
                  startDate: newRecord.start_date,
                  endDate: newRecord.end_date,
                  durationDays: newRecord.duration_days,
                  estimatedTime: newRecord.estimated_time,
                  completedAt: newRecord.completed_at,
                  sprintId: newRecord.sprint_id,
                  tags: newRecord.tags,
                  assignees: newRecord.assignees,
                  subtasks: newRecord.subtasks,
                };
              }
              return t;
            }));

            setSelectedTask(prev => {
              if (prev && prev.id === newRecord.id) {
                return {
                  ...prev,
                  ...newRecord,
                  projectId: newRecord.project_id,
                  startDate: newRecord.start_date,
                  endDate: newRecord.end_date,
                  durationDays: newRecord.duration_days,
                  estimatedTime: newRecord.estimated_time,
                  completedAt: newRecord.completed_at,
                  sprintId: newRecord.sprint_id,
                  tags: newRecord.tags,
                  assignees: newRecord.assignees,
                  subtasks: newRecord.subtasks,
                };
              }
              return prev;
            });
          }

          if (eventType === 'DELETE') {
            setTasks((prev) => prev.filter(t => t.id !== oldRecord.id));
            setSelectedTask(prev => (prev && prev.id === oldRecord.id ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(tasksChannel);
    };
  }, []);

  // --- Effects ---
  useEffect(() => {
    if (projects.length === 0 && activeTab !== 'settings' && !isLoading) {
      // Only redirect if NOT loading and NO projects
    }
  }, [projects, activeTab, isLoading]);


  // --- Handlers (Supabase Integrated) ---

  const handleSaveProject = async (projectData: Project) => {
    if (editingProject) {
      // Update
      const { error } = await supabase.from('projects').update({
        name: projectData.name,
        description: projectData.description,
        key: projectData.key,
        resources: projectData.resources
      }).eq('id', projectData.id);

      if (!error) {
        setProjects(prev => prev.map(p => p.id === projectData.id ? projectData : p));
        setEditingProject(null);
      }
    } else {
      // Create
      if (!session?.user?.id) {
        alert("You must be logged in to create a project.");
        return;
      }

      const { data, error } = await supabase.from('projects').insert({
        user_id: session.user.id, // Use real Auth ID
        name: projectData.name,
        description: projectData.description,
        key: projectData.key,
        resources: projectData.resources || {}
      }).select().single();

      console.log('Create Project Result:', { data, error }); // Debug log

      if (data && !error) {
        // [New] Auto-add creator to project_members
        await supabase.from('project_members').insert({
          project_id: data.id,
          user_id: session.user.id,
          role: 'owner'
        });

        // Optimistic update for members
        setProjectMembers(prev => ({
          ...prev,
          [data.id]: [user] // Start with just me
        }));

        const mappedProject = { ...data, createdAt: data.created_at };
        setProjects(prev => [...prev, mappedProject]);
        setActiveProjectId(data.id);
        setActiveTab('dashboard');
        setSearchQuery('');
      } else {
        console.error("Failed to create project:", error);
        alert(`Failed to create project: ${error?.message || 'Unknown error'}`);
        // Keep modal open so custom can retry
        return;
      }
    }
    setIsProjectModalOpen(false);
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));

    await supabase.from('projects').update(updates).eq('id', projectId);
  };

  const handleEditProjectClick = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    // Optimistic
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setActiveTab('projects');
    }

    await supabase.from('projects').delete().eq('id', projectId);
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setActiveTab('dashboard');
    setSearchQuery('');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    await supabase.from('profiles').update({
      name: updatedUser.name,
      handle: updatedUser.handle,
      avatar: updatedUser.avatar
    }).eq('id', user.id);
  };

  const handleClearData = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    if (!activeProjectId) return;

    // Preparation
    const startDate = taskData.startDate || new Date().toISOString().split('T')[0];
    const duration = taskData.durationDays || 3;
    let endDate = taskData.endDate;
    if (!endDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + duration);
      endDate = end.toISOString().split('T')[0];
    }

    let completedAt = undefined;
    if (taskData.status === 'Done') {
      completedAt = new Date().toISOString();
    }

    const assignees = taskData.assignees || [user];

    // --- Optimistic UI Update ---
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      projectId: activeProjectId,
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      status: taskData.status || 'To Do',
      priority: taskData.priority || 'Medium',
      tags: taskData.tags || [],
      assignees: assignees,
      startDate: startDate,
      endDate: endDate,
      durationDays: duration,
      estimatedTime: taskData.estimatedTime || '',
      progress: taskData.progress || (taskData.status === 'Done' ? 100 : 0),
      comments: [],
      activity: [],
      completedAt: completedAt,
      subtasks: []
    } as Task;

    setTasks(prev => [...prev, optimisticTask]);
    if (!taskData.tags?.some(t => t.name === 'AI Generated')) {
      setSelectedTask(optimisticTask); // Open immediately
    }

    // --- DB Insert ---
    const { data, error } = await supabase.from('tasks').insert({
      project_id: activeProjectId,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      tags: taskData.tags || [],
      assignees: assignees,
      start_date: startDate,
      end_date: endDate,
      duration_days: duration,
      estimated_time: taskData.estimatedTime,
      progress: taskData.progress || (taskData.status === 'Done' ? 100 : 0),
      completed_at: completedAt,
      subtasks: []
    }).select().single();

    if (data && !error) {
      const mappedTask = {
        ...data,
        projectId: data.project_id,
        startDate: data.start_date,
        endDate: data.end_date,
        durationDays: data.duration_days,
        estimatedTime: data.estimated_time,
        completedAt: data.completed_at,
        sprintId: data.sprint_id,
        tags: typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags,
        assignees: typeof data.assignees === 'string' ? JSON.parse(data.assignees) : data.assignees,
        subtasks: typeof data.subtasks === 'string' ? JSON.parse(data.subtasks) : data.subtasks,
      };

      setTasks(prev => prev.map(t => t.id === tempId ? mappedTask : t));

      // Update selectedTask if it was the temp one
      if (selectedTask?.id === tempId) {
        setSelectedTask(mappedTask);
      }

      // Log Activity
      await supabase.from('activity_logs').insert({
        task_id: data.id,
        user_id: user.id,
        description: 'created this task',
        type: 'create'
      });
    } else {
      // Revert if error
      setTasks(prev => prev.filter(t => t.id !== tempId));
      if (selectedTask?.id === tempId) setSelectedTask(null);
      alert("Failed to create task");
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic UI
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      // Logic for Contribution Graph
      let extraUpdates = {};
      if (updates.status === 'Done' && t.status !== 'Done') {
        extraUpdates = { completedAt: new Date().toISOString(), progress: 100 };
      } else if (updates.status && updates.status !== 'Done' && t.status === 'Done') {
        extraUpdates = { completedAt: null, progress: t.progress === 100 ? 50 : t.progress };
      }

      const updatedTask = { ...t, ...updates, ...extraUpdates };

      // Sync selectedTask if it's the one being modified
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updatedTask);
      }

      return updatedTask;
    }));

    // DB Update
    const dbUpdates: any = {};
    // Map fields explicitly to ensure everything is saved
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.tags) dbUpdates.tags = updates.tags;
    if (updates.assignees) dbUpdates.assignees = updates.assignees;
    if (updates.subtasks) dbUpdates.subtasks = updates.subtasks;
    if (updates.estimatedTime) dbUpdates.estimated_time = updates.estimatedTime;
    if (updates.startDate) dbUpdates.start_date = updates.startDate;
    if (updates.endDate) dbUpdates.end_date = updates.endDate;
    if (updates.durationDays) dbUpdates.duration_days = updates.durationDays;

    // Determine completed_at based on status change
    const task = tasks.find(t => t.id === taskId);
    if (updates.status === 'Done' && task?.status !== 'Done') {
      dbUpdates.completed_at = new Date().toISOString();
      dbUpdates.progress = 100;
    } else if (updates.status && updates.status !== 'Done' && task?.status === 'Done') {
      dbUpdates.completed_at = null;
    }

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('tasks').update(dbUpdates).eq('id', taskId);

      if (updates.status && updates.status !== task?.status) {
        await supabase.from('activity_logs').insert({
          task_id: taskId,
          user_id: user.id,
          description: `moved task from ${task?.status} to ${updates.status}`,
          type: 'status'
        });
      }
    }
  };

  const handleAddComment = async (taskId: string, text: string) => {
    const { data, error } = await supabase.from('comments').insert({
      task_id: taskId,
      user_id: user.id,
      text: text
    }).select().single();

    if (data && !error) {
      // Re-fetch task to get comments? Or simpler: append locally if we had comment structure in task
      // But now comments are separate table.
      // We need to update the UI to fetch comments separately or join them.
      // For now, let's just re-fetch the task list or rely on the Fact that the UI expects comments IN task.
      // This is a breaking change in data model (Embedded vs Relational).
      // I will fetch comments for the selected task within TaskDetailDrawer ideally.
      // But to keep App.tsx working, I'll update local state with a mocked comment object
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          comments: [...(t.comments || []), {
            id: data.id,
            userId: user.id,
            text: text,
            createdAt: data.created_at
          }]
        };
      }));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    // Optimistic Update
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null); // Close drawer if open

    // DB Delete
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  const handleMoveTask = (taskId: string, newStatus: Status) => {
    handleUpdateTask(taskId, { status: newStatus });
  };

  const handleCompleteSprint = async (sprintName: string) => {
    // Logic to archive
    const tasksToArchive = tasks.filter(t => t.projectId === activeProjectId && !t.sprintId && t.status === 'Done');

    for (const t of tasksToArchive) {
      await supabase.from('tasks').update({ sprint_id: sprintName }).eq('id', t.id);
      await supabase.from('activity_logs').insert({
        task_id: t.id,
        user_id: user.id,
        description: `archived to ${sprintName}`,
        type: 'update'
      });
    }

    setTasks(prev => prev.map(t => {
      if (t.projectId === activeProjectId && !t.sprintId && t.status === 'Done') {
        return { ...t, sprintId: sprintName };
      }
      return t;
    }));
  };


  const openNewTaskModal = (status: Status = 'To Do') => {
    if (!activeProjectId) {
      alert("Please select or create a project first!");
      return;
    }
    setInitialStatus(status);
    setIsTaskModalOpen(true);
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  /* New Modal State */
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteProject, setInviteProject] = useState<{ id: string, name: string } | null>(null);

  const handleOpenInvite = (projectId: string, projectName: string) => { // Updated Signature
    setInviteProject({ id: projectId, name: projectName });
    setIsInviteModalOpen(true);
  };

  const handleInviteByUserHandle = async (handle: string) => {
    if (!inviteProject) return;

    // 1. Find user by HANDLE (not email)
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('*') // Fetch full profile for UI
      .ilike('handle', `@${handle.replace('@', '')}`) // Case Insensitive Search
      .single();

    if (userError || !userProfile) {
      console.error("Invite Error:", userError);
      throw new Error("User not found! Check the handle.");
    }

    // 2. Check if already member
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', inviteProject.id)
      .eq('user_id', userProfile.id)
      .single();

    if (existingMember) {
      throw new Error("User is already a member of this project.");
    }

    // 3. Add to project_members
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: inviteProject.id,
        user_id: userProfile.id,
        role: 'member'
      });

    if (memberError) {
      throw new Error(memberError.message);
    }

    // 4. Optimistic Update (Show immediately)
    setProjectMembers(prev => ({
      ...prev,
      [inviteProject.id]: [...(prev[inviteProject.id] || []), userProfile]
    }));
  };

  const renderContent = () => {
    if (activeTab === 'settings') {
      return <Settings user={user} onUpdateUser={handleUpdateUser} onClearData={handleClearData} />;
    }

    if (activeTab === 'projects') {
      return (
        <Projects
          projects={projects}
          tasks={tasks}
          onSelectProject={handleSelectProject}
          onOpenCreateModal={() => {
            setEditingProject(null);
            setIsProjectModalOpen(true);
          }}
          onEditProject={handleEditProjectClick}
          onDeleteProject={handleDeleteProject}
          onInviteMember={handleOpenInvite}
        />
      );
    }

    if (!activeProject) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p>No project selected.</p>
          <button onClick={() => setActiveTab('projects')} className="text-primary hover:underline mt-2">Go to Projects</button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard tasks={projectTasks} project={activeProject} />;
      case 'kanban':
        return (
          <KanbanBoard
            tasks={filteredTasks}
            onMoveTask={handleMoveTask}
            onAddTask={openNewTaskModal}
            onEditTask={openTaskDetail}
            onCompleteSprint={handleCompleteSprint}
            onViewHistory={() => setIsHistoryModalOpen(true)}
          />
        );
      case 'timeline':
        return <Timeline tasks={filteredTasks} />;
      default:
        return <Dashboard tasks={projectTasks} project={activeProject} />;
    }
  };


  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-primary"><Loader2 className="animate-spin" size={48} /></div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddTask={() => openNewTaskModal()}
        activeProject={activeProject || null}
        onUpdateProject={handleUpdateProject}
        user={user}
        onOpenFocusMode={() => setIsFocusModeOpen(true)}
      >
        {renderContent()}
      </Layout>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        initialStatus={initialStatus}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={handleSaveProject}
        initialData={editingProject}
      />

      <TaskDetailDrawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        currentUser={user}
        allUsers={selectedTask ? (projectMembers[selectedTask.projectId] || [user]) : []} // Filtered Scope
        onUpdateTask={handleUpdateTask}
        onAddComment={handleAddComment}
        onDeleteTask={handleDeleteTask}
      />

      <SprintHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        tasks={archivedTasks}
      />

      <FocusMode
        isOpen={isFocusModeOpen}
        onClose={() => setIsFocusModeOpen(false)}
        tasks={projectTasks}
        onUpdateTask={handleUpdateTask}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={handleInviteByUserHandle}
        projectName={inviteProject?.name || ''}
      />
    </>
  );
};

export default App;
