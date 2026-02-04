import React, { useMemo } from 'react';
import { X, History, CheckCircle2 } from 'lucide-react';
import { Task } from '../types';

interface SprintHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

const SprintHistoryModal: React.FC<SprintHistoryModalProps> = ({ isOpen, onClose, tasks }) => {
  const sprintGroups = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
        if (task.sprintId) {
            if (!groups[task.sprintId]) groups[task.sprintId] = [];
            groups[task.sprintId].push(task);
        }
    });
    return groups;
  }, [tasks]);

  const sprints = Object.keys(sprintGroups).sort().reverse(); 

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-3xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-pop-in">
        <div className="flex justify-between items-center p-6 border-b border-border bg-surface-highlight/20 backdrop-blur-xl shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History size={24} className="text-primary" />
            Sprint History
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {sprints.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <History size={48} className="mb-4 opacity-20" />
                    <p>No completed sprints yet.</p>
                </div>
            ) : (
                sprints.map(sprintName => (
                    <div key={sprintName} className="bg-background/50 border border-border rounded-2xl overflow-hidden">
                        <div className="bg-surface-highlight/50 px-6 py-4 flex justify-between items-center border-b border-border/50">
                            <h3 className="font-bold text-white text-lg">{sprintName}</h3>
                            <div className="text-xs text-gray-400 flex items-center gap-2">
                                <span className="bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">
                                    {sprintGroups[sprintName].length} Tasks
                                </span>
                            </div>
                        </div>
                        <div className="p-2">
                            {sprintGroups[sprintName].map(task => (
                                <div key={task.id} className="flex items-center gap-3 p-3 hover:bg-surface-highlight/30 rounded-xl transition-colors">
                                    <CheckCircle2 size={18} className="text-primary shrink-0" />
                                    <span className="text-gray-300 text-sm line-through flex-1">{task.title}</span>
                                    <div className="flex gap-2">
                                        {task.tags.map((tag, i) => (
                                            <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${tag.color} opacity-60`}>
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default SprintHistoryModal;