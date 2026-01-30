import React from 'react';
import { MoreHorizontal, Plus, Clock, MessageSquare } from 'lucide-react';
import { USERS } from '../constants';
import { Task, Status } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: Status) => void;
  onAddTask: (status: Status) => void;
  onEditTask: (task: Task) => void;
}

const columns: { id: Status; title: string; color: string }[] = [
  { id: 'To Do', title: 'To Do', color: 'bg-zinc-600' },
  { id: 'In Progress', title: 'In Progress', color: 'bg-primary' },
  { id: 'Testing', title: 'Testing', color: 'bg-secondary' },
  { id: 'Done', title: 'Done', color: 'bg-emerald-500' },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onMoveTask, onAddTask, onEditTask }) => {

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-orange-900/40 text-orange-400 border border-orange-900';
      case 'Medium': return 'bg-yellow-900/40 text-yellow-400 border border-yellow-900';
      case 'Low': return 'bg-green-900/40 text-green-400 border border-green-900';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Call update if status changed
    if (destination.droppableId !== source.droppableId) {
        onMoveTask(draggableId, destination.droppableId as Status);
    }
  };

  const handleCompleteSprint = () => {
    const doneTasks = tasks.filter(t => t.status === 'Done');
    if (doneTasks.length === 0) {
        alert("No tasks in 'Done' to complete!");
        return;
    }
    const confirm = window.confirm(`Archive ${doneTasks.length} completed tasks?`);
    if(confirm) {
        alert("Sprint completed! Tasks archived (Mock Action).");
    }
  };

  return (
    <div className="h-full flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 animate-slide-up">
        <div>
            <h1 className="text-2xl font-bold text-white mb-1">Sprint Board</h1>
            <p className="text-sm text-gray-400">Sprint 24 • Oct 24 - Nov 07</p>
        </div>
        <div className="flex items-center gap-3">
             <div className="flex -space-x-2 mr-4">
                 {USERS.map(user => (
                     <img key={user.id} src={user.avatar} className="w-8 h-8 rounded-full border-2 border-background" alt={user.name}/>
                 ))}
             </div>
             <button 
                onClick={handleCompleteSprint}
                className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors shadow-lg hover:shadow-white/20"
            >
                Complete Sprint
             </button>
        </div>
       </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-6 min-w-[1200px]">
            {columns.map((column, colIndex) => {
                const columnTasks = tasks.filter((task) => task.status === column.id);
                
                return (
                    <div 
                        key={column.id} 
                        className="flex-1 flex flex-col min-w-[300px] h-full animate-slide-up"
                        style={{ animationDelay: `${colIndex * 100}ms` }}
                    >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${column.id === 'In Progress' ? 'bg-primary animate-pulse' : column.id === 'Testing' ? 'bg-secondary' : column.id === 'Done' ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
                        <h2 className="text-xs font-bold tracking-widest uppercase text-gray-400">{column.title}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-surface-highlight text-[10px] font-bold text-gray-300">
                            {columnTasks.length}
                        </span>
                        </div>
                        <button className="text-gray-500 hover:text-white transition-colors">
                        <MoreHorizontal size={16} />
                        </button>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                            <div 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={`flex-1 overflow-y-auto pr-2 custom-scrollbar rounded-xl transition-colors duration-300 flex flex-col gap-3 ${snapshot.isDraggingOver ? 'bg-white/5 border border-dashed border-white/20' : ''}`}
                            >
                                {columnTasks.map((task, index) => (
                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                onClick={() => onEditTask(task)}
                                                style={{ 
                                                    ...provided.draggableProps.style,
                                                    // Merge styles properly to maintain transform while dragging
                                                    animationDelay: snapshot.isDragging ? '0s' : `${(colIndex * 100) + (index * 50)}ms` 
                                                }}
                                                className={`
                                                    bg-surface border border-border p-4 rounded-xl shadow-sm cursor-grab group relative 
                                                    transition-all duration-200 overflow-hidden
                                                    ${!snapshot.isDragging ? 'hover:border-primary/50 hover:bg-surface-highlight hover:translate-y-[-2px] hover:shadow-xl' : ''}
                                                    ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary rotate-2 bg-surface-highlight z-50 opacity-90 scale-105' : 'animate-fade-in'}
                                                `}
                                            >
                                                {/* Status Color Bar */}
                                                <div className={`absolute top-0 left-0 right-0 h-1.5 ${column.color}`}></div>

                                                <div className="flex justify-between items-start mb-3 pt-2">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                    </span>
                                                    {task.status === 'In Progress' && (
                                                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">IN DEV</span>
                                                    )}
                                                    <button className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </div>

                                                <h3 className={`font-semibold text-sm text-gray-100 mb-2 leading-snug ${task.status === 'Done' ? 'line-through text-gray-500' : ''}`}>
                                                    {task.title}
                                                </h3>
                                                
                                                {task.status !== 'Done' && <p className="text-xs text-gray-500 mb-4 line-clamp-2">{task.description}</p>}

                                                {/* Tags */}
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {task.tags.map((tag, i) => (
                                                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${tag.color}`}>
                                                            {tag.name}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                                                    <div className="flex -space-x-2">
                                                    {task.assignees.map((u, i) => (
                                                        <img key={i} src={u.avatar} alt={u.name} className={`w-6 h-6 rounded-full border-2 border-surface ${task.status === 'Done' ? 'grayscale opacity-50' : ''}`} />
                                                    ))}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                                                            <Clock size={12} />
                                                            <span>{task.estimatedTime}</span>
                                                        </div>
                                                        {task.comments && task.comments.length > 0 && (
                                                            <div className="flex items-center gap-1 text-gray-500 text-xs hover:text-white transition-colors">
                                                                <MessageSquare size={12} />
                                                                <span>{task.comments.length}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                
                                {/* Add Task Button inside column */}
                                <button 
                                    onClick={() => onAddTask(column.id)}
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-border text-gray-500 hover:text-white hover:border-primary/50 hover:bg-surface-highlight transition-all mt-2 group"
                                >
                                    <Plus size={16} className="group-hover:scale-125 transition-transform" />
                                    <span className="text-xs font-bold">Add Task</span>
                                </button>
                            </div>
                        )}
                    </Droppable>
                    </div>
                );
            })}
            </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default KanbanBoard;