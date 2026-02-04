import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, CheckCircle2, StickyNote, Zap, Coffee, Minimize2, ChevronDown, ArrowRight } from 'lucide-react';
import { Task, Status } from '../types';

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

const FocusMode: React.FC<FocusModeProps> = ({ isOpen, onClose, tasks, onUpdateTask }) => {
  // Filter for active tasks
  const activeTasks = tasks.filter(t => t.status !== 'Done');
  
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [scratchpad, setScratchpad] = useState('');
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  // Load scratchpad from local storage
  useEffect(() => {
      const savedPad = localStorage.getItem('devtrack_scratchpad');
      if (savedPad) setScratchpad(savedPad);
  }, []);

  // Save scratchpad
  useEffect(() => {
      localStorage.setItem('devtrack_scratchpad', scratchpad);
  }, [scratchpad]);

  // Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(seconds => seconds - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play a sound or notification here ideally
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Auto-select first active task if none selected when opening
  useEffect(() => {
      if (isOpen && !selectedTaskId && activeTasks.length > 0) {
          setSelectedTaskId(activeTasks[0].id);
      }
  }, [isOpen, activeTasks]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
      setIsActive(false);
      setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchMode = () => {
      setIsActive(false);
      const newMode = mode === 'focus' ? 'break' : 'focus';
      setMode(newMode);
      setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getNextStatus = (status: Status): Status => {
      if (status === 'To Do') return 'In Progress';
      if (status === 'In Progress') return 'Testing';
      return 'Done';
  };

  const handleAdvanceTask = () => {
      if (!selectedTaskId || !currentTask) return;
      
      const nextStatus = getNextStatus(currentTask.status);
      
      if (nextStatus === 'Done') {
          onUpdateTask(selectedTaskId, { 
              status: 'Done', 
              progress: 100,
              completedAt: new Date().toISOString()
          });
          setIsActive(false);
          
          // Auto-select next task
          const currentIndex = activeTasks.findIndex(t => t.id === selectedTaskId);
          if (currentIndex !== -1 && currentIndex < activeTasks.length - 1) {
              setSelectedTaskId(activeTasks[currentIndex + 1].id);
          } else if (activeTasks.length > 1) {
               // Try to find one that isn't the current one (since current is becoming Done)
               const next = activeTasks.find(t => t.id !== selectedTaskId);
               setSelectedTaskId(next ? next.id : '');
          } else {
              setSelectedTaskId('');
          }
      } else {
          onUpdateTask(selectedTaskId, { status: nextStatus });
          // Optional: If moving to In Progress, ensure timer starts? 
          // For now, leaving timer control manual to user.
      }
  };

  if (!isOpen) return null;

  const currentTask = tasks.find(t => t.id === selectedTaskId);
  const progress = mode === 'focus' 
    ? ((25 * 60 - timeLeft) / (25 * 60)) * 100 
    : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] flex flex-col animate-fade-in text-white overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#050505] z-10">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${mode === 'focus' ? 'bg-primary text-black' : 'bg-blue-500 text-white'}`}>
                    {mode === 'focus' ? <Zap size={20} fill="currentColor" /> : <Coffee size={20} />}
                </div>
                <h2 className="font-bold text-lg tracking-wide uppercase">Focus Mode</h2>
            </div>
            <button 
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
                <Minimize2 size={24} />
            </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row relative">
            
            {/* Left Column: Timer & Controls */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                
                {/* Timer Circle */}
                <div className="relative w-80 h-80 flex items-center justify-center mb-12">
                     {/* Outer Ring */}
                     <div className="absolute inset-0 rounded-full border-4 border-[#1C1C1E]"></div>
                     
                     {/* Progress Ring */}
                     <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                         <circle
                             cx="160" cy="160" r="156"
                             stroke="currentColor"
                             strokeWidth="4"
                             fill="none"
                             strokeDasharray={980}
                             strokeDashoffset={980 - (980 * progress) / 100}
                             className={`${mode === 'focus' ? 'text-primary' : 'text-blue-500'} transition-all duration-1000 ease-linear`}
                         />
                     </svg>
                     
                     {/* Time */}
                     <div className="text-center z-10">
                         <div className="text-8xl font-black font-mono tracking-tighter mb-2 tabular-nums">
                             {formatTime(timeLeft)}
                         </div>
                         <button 
                            onClick={switchMode}
                            className="text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                         >
                             {mode === 'focus' ? 'Focus Session' : 'Short Break'}
                         </button>
                     </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 mb-12">
                     <button 
                        onClick={resetTimer}
                        className="w-20 h-20 rounded-full flex items-center justify-center bg-[#1C1C1E] text-gray-400 hover:text-white hover:bg-[#2C2C2E] transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:scale-105"
                     >
                         <RotateCcw size={32} />
                     </button>
                     <button 
                        onClick={toggleTimer}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-[0_0_30px_rgba(0,0,0,0.5)]
                            ${isActive 
                                ? 'bg-white text-black' 
                                : mode === 'focus' ? 'bg-primary text-black shadow-[0_0_20px_rgba(209,244,95,0.4)]' : 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                            }
                        `}
                     >
                         {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                     </button>
                </div>
            </div>

            {/* Right Column: Task Context */}
            <div className="w-full md:w-[400px] border-l border-white/5 bg-[#0A0A0A] p-8 flex flex-col relative z-20">
                <div className="mb-8">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-3">Currently Working On</label>
                    
                    <div className="relative group">
                         <select
                            value={selectedTaskId}
                            onChange={(e) => setSelectedTaskId(e.target.value)}
                            className="w-full bg-[#1C1C1E] border border-white/10 rounded-2xl px-4 py-4 pr-10 text-white font-medium appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                         >
                             <option value="" disabled>Select a task...</option>
                             {activeTasks.map(t => (
                                 <option key={t.id} value={t.id}>{t.title}</option>
                             ))}
                         </select>
                         <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                    </div>

                    {currentTask && (
                        <div className="mt-6 animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${currentTask.priority === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700/30 text-gray-400'}`}>
                                    {currentTask.priority}
                                </span>
                                <span className="text-xs text-gray-500 uppercase">{currentTask.estimatedTime} est.</span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                {currentTask.description || "No description provided."}
                            </p>
                            
                            <button 
                                onClick={handleAdvanceTask}
                                className="w-full py-4 bg-primary/10 border border-primary/20 hover:bg-primary hover:text-black hover:border-primary text-primary rounded-xl font-bold flex items-center justify-center gap-2 transition-all group"
                            >
                                {getNextStatus(currentTask.status) === 'Done' ? (
                                    <>
                                        <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                                        Mark as Complete
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                        Move to {getNextStatus(currentTask.status)}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-auto">
                    <button 
                        onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}
                        className={`flex items-center justify-between w-full p-4 rounded-xl border transition-all
                            ${isScratchpadOpen ? 'bg-[#1C1C1E] border-white/10' : 'bg-transparent border-dashed border-gray-700 hover:border-gray-500 text-gray-500'}
                        `}
                    >
                        <span className="flex items-center gap-2 font-bold text-sm">
                            <StickyNote size={18} /> Brain Dump
                        </span>
                        <span className="text-[10px] uppercase font-bold text-gray-600">
                            {isScratchpadOpen ? 'Hide' : 'Show'}
                        </span>
                    </button>
                    
                    {isScratchpadOpen && (
                        <div className="mt-2 animate-slide-up">
                            <textarea
                                value={scratchpad}
                                onChange={(e) => setScratchpad(e.target.value)}
                                placeholder="Quick notes, distracting thoughts, or ideas..."
                                className="w-full h-48 bg-[#1C1C1E] border border-white/10 rounded-xl p-4 text-sm text-gray-300 focus:outline-none focus:border-primary/50 resize-none custom-scrollbar"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default FocusMode;