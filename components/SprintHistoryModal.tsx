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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-card border border-hairline w-full max-w-3xl h-[80vh] rounded-xl shadow-sm overflow-hidden flex flex-col animate-pop-in">
        <div className="flex justify-between items-center p-6 border-b border-hairline bg-canvas-soft shrink-0">
          <h2 className="display text-xl text-ink flex items-center gap-2">
            <History size={24} className="text-primary" />
            Sprint History
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {sprints.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted">
              <History size={48} className="mb-4 opacity-30" />
              <p>No completed sprints yet.</p>
            </div>
          ) : (
            sprints.map(sprintName => (
              <div key={sprintName} className="bg-canvas-soft border border-hairline rounded-lg overflow-hidden">
                <div className="bg-surface-strong/50 px-6 py-4 flex justify-between items-center border-b border-hairline">
                  <h3 className="font-semibold text-ink text-lg">{sprintName}</h3>
                  <div className="text-xs text-muted flex items-center gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
                      {sprintGroups[sprintName].length} Tasks
                    </span>
                  </div>
                </div>
                <div className="p-2">
                  {sprintGroups[sprintName].map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 hover:bg-surface-strong/40 rounded-md transition-colors">
                      <CheckCircle2 size={18} className="text-success shrink-0" />
                      <span className="text-body text-sm line-through flex-1">{task.title}</span>
                      <div className="flex gap-2">
                        {task.tags.map((tag, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded border border-hairline bg-canvas-soft text-muted">
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
