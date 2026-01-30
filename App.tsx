import React, { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import KanbanBoard from './pages/KanbanBoard';
import Timeline from './pages/Timeline';
import Projects from './pages/Projects';
import Settings from './pages/Settings';
import TaskModal from './components/TaskModal';
import ProjectModal from './components/ProjectModal';
import TaskDetailDrawer from './components/TaskDetailDrawer';
import { Task, Status, Project, User, Activity } from './types';
import { TAG_COLORS } from './constants';
import { getCurrentUser, onAuthStateChange } from './lib/auth';
import * as db from './lib/db';

const App: React.FC = () => {
  // Application State
  const [activeTab, setActiveTab] = useState('projects');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialStatus, setInitialStatus] = useState<Status>('To Do');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Initialize user and load data
  useEffect(() => {
    let subscription: any;

    (async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const [projectsData, tasksData] = await Promise.all([
            db.getProjects(currentUser.id),
            Promise.resolve([])
          ]);
          setProjects(projectsData);

          if (projectsData.length > 0) {
            const allTasks: Task[] = [];
            for (const project of projectsData) {
              const projectTasks = await db.getTasks(project.id);
              allTasks.push(...projectTasks);
            }
            setTasks(allTasks);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    })();

    subscription = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Derived State
  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId), 
  [projects, activeProjectId]);

  const projectTasks = useMemo(() => 
    activeProjectId ? tasks.filter(t => t.projectId === activeProjectId) : [],
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

  // Effects
  useEffect(() => {
    // If no projects exist, ensure we are on the projects tab (unless on settings)
    if (projects.length === 0 && activeTab !== 'settings') {
        setActiveTab('projects');
        setActiveProjectId(null);
    }
  }, [projects, activeTab]);

  // Handlers
  const handleCreateProject = async (project: Project) => {
    try {
      if (!user) return;
      const created = await db.createProject(project, user.id);
      setProjects(prev => [...prev, created]);
      setActiveProjectId(created.id);
      setActiveTab('dashboard');
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleSelectProject = (projectId: string) => {
      setActiveProjectId(projectId);
      setActiveTab('dashboard');
      setSearchQuery('');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleClearData = () => {
      // Clear local state - data remains in Supabase
      setProjects([]);
      setTasks([]);
      setActiveProjectId(null);
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    if (!activeProjectId || !user) return;

    try {
      const newTask = await db.createTask(
        {
          ...taskData,
          projectId: activeProjectId,
          tags: taskData.tags || [],
          assignees: taskData.assignees || [],
          comments: [],
          activity: [],
        } as Task,
        user.id
      );

      setTasks(prev => [...prev, newTask]);
      setSelectedTask(newTask);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await db.updateTask(taskId, updates);

      setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t;

        const updatedTask = { ...t, ...updates };

        if (updates.status && updates.status !== t.status && user) {
          db.addActivity(taskId, user.id, `moved task from ${t.status} to ${updates.status}`, 'status');
          const newActivity: Activity = {
            id: `a${Date.now()}`,
            userId: user.id,
            description: `moved task from ${t.status} to ${updates.status}`,
            type: 'status',
            createdAt: new Date().toISOString()
          };
          updatedTask.activity = [...(updatedTask.activity || []), newActivity];
        }

        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(updatedTask);
        }
        return updatedTask;
      }));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleAddComment = async (taskId: string, text: string) => {
    try {
      if (!user) return;

      const newComment = await db.addComment(taskId, user.id, text);
      await db.addActivity(taskId, user.id, 'commented', 'comment');

      setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t;

        const newActivity: Activity = {
          id: `a${Date.now()}`,
          userId: user.id,
          description: 'commented',
          type: 'comment',
          createdAt: new Date().toISOString()
        };

        const updatedTask = {
          ...t,
          comments: [...(t.comments || []), newComment],
          activity: [...(t.activity || []), newActivity]
        };

        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(updatedTask);
        }
        return updatedTask;
      }));
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleMoveTask = (taskId: string, newStatus: Status) => {
    handleUpdateTask(taskId, { status: newStatus });
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p>Loading...</p>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p>Please sign in to continue.</p>
        </div>
      );
    }

    if (activeTab === 'settings') {
        return <Settings user={user} onUpdateUser={handleUpdateUser} onClearData={handleClearData} />;
    }

    if (activeTab === 'projects') {
        return (
            <Projects
                projects={projects}
                tasks={tasks}
                onSelectProject={handleSelectProject}
                onOpenCreateModal={() => setIsProjectModalOpen(true)}
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
            onEditTask={openTaskDetail} // Open Drawer on click
          />
        );
      case 'timeline':
        return <Timeline tasks={filteredTasks} />;
      default:
        return <Dashboard tasks={projectTasks} project={activeProject} />;
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddTask={() => openNewTaskModal()}
        activeProject={activeProject || null}
        user={user}
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
        onSubmit={handleCreateProject}
      />

      <TaskDetailDrawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        currentUser={user}
        onUpdateTask={handleUpdateTask}
        onAddComment={handleAddComment}
      />
    </>
  );
};

export default App;
