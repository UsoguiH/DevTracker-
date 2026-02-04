
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
import SprintHistoryModal from './components/SprintHistoryModal';
import FocusMode from './components/FocusMode';
import { Task, Status, Project, User, Activity } from './types';
import { USERS, TAG_COLORS } from './constants';

const App: React.FC = () => {
  // Application State
  const [activeTab, setActiveTab] = useState('projects');
  
  // Persisted State using lazy initialization
  const [user, setUser] = useState<User>(() => {
    try {
        const saved = localStorage.getItem('devtrack_user');
        return saved ? JSON.parse(saved) : USERS[0];
    } catch (e) {
        return USERS[0];
    }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('devtrack_projects');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load projects", e);
      return [];
    }
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('devtrack_tasks');
      const loadedTasks = saved ? JSON.parse(saved) : [];
      
      // Migration & Backfill script
      return loadedTasks.map((t: any) => {
          // Backfill completedAt for Done tasks if missing (for Contribution Graph)
          let completedAt = t.completedAt;
          if (t.status === 'Done' && !completedAt) {
              // Fallback to endDate or a default recent date if missing
              completedAt = t.endDate ? t.endDate : new Date().toISOString(); 
          }

          return {
            ...t,
            progress: typeof t.progress === 'number' ? t.progress : 0, // Ensure progress exists
            completedAt,
            comments: Array.isArray(t.comments) ? t.comments : [],
            activity: Array.isArray(t.activity) ? t.activity : [],
            // Migrate string tags to Tag objects
            tags: Array.isArray(t.tags) 
                ? t.tags.map((tag: any) => 
                    typeof tag === 'string' 
                    ? { name: tag, color: TAG_COLORS[4].class } // Default to Gray/Low
                    : tag
                )
                : []
          };
      });
    } catch (e) {
      console.error("Failed to load tasks", e);
      return [];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // For Drawer
  const [initialStatus, setInitialStatus] = useState<Status>('To Do');
  
  // Project Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // Focus Mode State
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('devtrack_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('devtrack_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('devtrack_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Derived State
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

  // Effects
  useEffect(() => {
    // If no projects exist, ensure we are on the projects tab (unless on settings)
    if (projects.length === 0 && activeTab !== 'settings') {
        setActiveTab('projects');
        setActiveProjectId(null);
    }
  }, [projects, activeTab]);

  // Handlers
  const handleSaveProject = (project: Project) => {
    if (editingProject) {
        // Update existing
        setProjects(prev => prev.map(p => p.id === project.id ? project : p));
        setEditingProject(null);
    } else {
        // Create new
        setProjects(prev => [...prev, project]);
        setActiveProjectId(project.id);
        setActiveTab('dashboard'); // Auto-navigate to dashboard of new project
        setSearchQuery('');
    }
    setIsProjectModalOpen(false);
  };

  const handleUpdateProject = (projectId: string, updates: Partial<Project>) => {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
  };

  const handleEditProjectClick = (project: Project) => {
      setEditingProject(project);
      setIsProjectModalOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
      // 1. Remove Project
      setProjects(prev => prev.filter(p => p.id !== projectId));
      // 2. Remove all tasks associated with this project
      setTasks(prev => prev.filter(t => t.projectId !== projectId));
      
      // 3. Reset active state if needed
      if (activeProjectId === projectId) {
          setActiveProjectId(null);
          setActiveTab('projects');
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
      localStorage.clear();
      window.location.reload();
  };

  const handleCreateTask = (taskData: Partial<Task>) => {
    if (!activeProjectId) return;
    
    // Default dates if missing
    const startDate = taskData.startDate || new Date().toISOString().split('T')[0];
    const duration = taskData.durationDays || 3;
    let endDate = taskData.endDate;
    
    if (!endDate) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + duration);
        endDate = end.toISOString().split('T')[0];
    }

    // Handle completedAt if creating as Done immediately
    let completedAt = undefined;
    if (taskData.status === 'Done') {
        completedAt = new Date().toISOString();
    }

    const newTask: Task = {
        ...taskData,
        id: `t${Date.now()}`,
        projectId: activeProjectId,
        progress: taskData.progress || (taskData.status === 'Done' ? 100 : 0),
        completedAt,
        comments: [],
        startDate,
        endDate,
        durationDays: duration,
        activity: [{
            id: `a${Date.now()}`,
            userId: user.id,
            description: 'created this task',
            type: 'create',
            createdAt: new Date().toISOString()
        }],
    } as Task;
    
    setTasks(prev => [...prev, newTask]);
    // Optionally open the drawer immediately after creating
    if (!taskData.tags?.some(t => t.name === 'AI Generated')) {
         setSelectedTask(newTask);
    }
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
      setTasks(prev => prev.map(t => {
          if (t.id !== taskId) return t;
          
          // Logic for Contribution Graph: Track when task is completed
          let extraUpdates = {};
          if (updates.status === 'Done' && t.status !== 'Done') {
               extraUpdates = { 
                   completedAt: new Date().toISOString(),
                   progress: 100 
               };
          } else if (updates.status && updates.status !== 'Done' && t.status === 'Done') {
               // If moved back from Done, clear the completedAt date
               extraUpdates = { 
                   completedAt: undefined,
                   progress: t.progress === 100 ? 50 : t.progress
               };
          }

          const updatedTask = { ...t, ...updates, ...extraUpdates };
          
          // If status changed, add activity log
          if (updates.status && updates.status !== t.status) {
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
  };

  const handleAddComment = (taskId: string, text: string) => {
      setTasks(prev => prev.map(t => {
          if (t.id !== taskId) return t;
          
          const newComment = {
              id: `c${Date.now()}`,
              userId: user.id,
              text,
              createdAt: new Date().toISOString()
          };

          const newActivity: Activity = {
              id: `a${Date.now()}`,
              userId: user.id,
              description: `commented`,
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
  };

  const handleMoveTask = (taskId: string, newStatus: Status) => {
    handleUpdateTask(taskId, { status: newStatus });
  };

  const handleCompleteSprint = (sprintName: string) => {
      setTasks(prev => prev.map(t => {
          // Archive only Done tasks belonging to the current project that haven't been archived
          if (t.projectId === activeProjectId && !t.sprintId && t.status === 'Done') {
             const newActivity: Activity = {
                 id: `a${Date.now()}`,
                 userId: user.id,
                 description: `archived to ${sprintName}`,
                 type: 'update',
                 createdAt: new Date().toISOString()
             };
             return {
                 ...t,
                 sprintId: sprintName,
                 activity: [...(t.activity || []), newActivity]
             };
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
        onUpdateTask={handleUpdateTask}
        onAddComment={handleAddComment}
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
    </>
  );
};

export default App;
