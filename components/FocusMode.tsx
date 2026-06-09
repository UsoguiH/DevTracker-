import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, StickyNote, Zap, Coffee, Minimize2, ChevronDown, ArrowRight } from 'lucide-react';
import { Task, Status } from '../types';

interface FocusModeProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

const FocusMode: React.FC<FocusModeProps> = ({ isOpen, onClose, tasks, onUpdateTask }) => {
    const activeTasks = tasks.filter(t => t.status !== 'Done');

    const [selectedTaskId, setSelectedTaskId] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<'focus' | 'break'>('focus');
    const [scratchpad, setScratchpad] = useState('');
    const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
    const [showExitChallenge, setShowExitChallenge] = useState(false);
    const [exitStep, setExitStep] = useState(0);
    const startTimeRef = React.useRef<number>(Date.now());

    useEffect(() => {
        if (isOpen) {
            startTimeRef.current = Date.now();
            setShowExitChallenge(false);
            setExitStep(0);
        }
    }, [isOpen]);

    const handleCloseAttempt = () => {
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed < 60000) {
            setIsActive(false);
            setShowExitChallenge(true);
            setExitStep(0);
        } else {
            onClose();
        }
    };

    useEffect(() => {
        if (exitStep === 2) {
            const timer = setTimeout(() => onClose(), 2500);
            return () => clearTimeout(timer);
        }
    }, [exitStep, onClose]);

    const funnyMessages = [
        "Giving up so soon? My grandmother codes for longer than this!",
        "It's been literally seconds. Are you allergic to focus?",
        "Rome wasn't built in a minute, and neither is this feature.",
        "Redirecting your attention... focus is a muscle, train it!",
        "I locked the door. You have to finish at least 60 seconds."
    ];
    const [randomMessage, setRandomMessage] = useState(funnyMessages[0]);

    useEffect(() => {
        if (showExitChallenge) setRandomMessage(funnyMessages[Math.floor(Math.random() * funnyMessages.length)]);
    }, [showExitChallenge]);

    useEffect(() => {
        const savedPad = localStorage.getItem('devtrack_scratchpad');
        if (savedPad) setScratchpad(savedPad);
    }, []);

    useEffect(() => { localStorage.setItem('devtrack_scratchpad', scratchpad); }, [scratchpad]);

    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(seconds => seconds - 1), 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    useEffect(() => {
        if (isOpen && !selectedTaskId && activeTasks.length > 0) setSelectedTaskId(activeTasks[0].id);
    }, [isOpen, activeTasks]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => { setIsActive(false); setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60); };
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
            onUpdateTask(selectedTaskId, { status: 'Done', progress: 100, completedAt: new Date().toISOString() });
            setIsActive(false);
            const currentIndex = activeTasks.findIndex(t => t.id === selectedTaskId);
            if (currentIndex !== -1 && currentIndex < activeTasks.length - 1) setSelectedTaskId(activeTasks[currentIndex + 1].id);
            else if (activeTasks.length > 1) { const next = activeTasks.find(t => t.id !== selectedTaskId); setSelectedTaskId(next ? next.id : ''); }
            else setSelectedTaskId('');
        } else {
            onUpdateTask(selectedTaskId, { status: nextStatus });
        }
    };

    if (!isOpen) return null;

    const currentTask = tasks.find(t => t.id === selectedTaskId);
    const progress = mode === 'focus' ? ((25 * 60 - timeLeft) / (25 * 60)) * 100 : ((5 * 60 - timeLeft) / (5 * 60)) * 100;
    const accentText = mode === 'focus' ? 'text-primary' : 'text-blue-500';

    return (
        <div className="fixed inset-0 z-[200] bg-canvas flex flex-col animate-fade-in text-ink overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-hairline bg-canvas z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${mode === 'focus' ? 'bg-primary text-on-primary' : 'bg-blue-500 text-white'}`}>
                        {mode === 'focus' ? <Zap size={20} fill="currentColor" /> : <Coffee size={20} />}
                    </div>
                    <h2 className="font-semibold text-lg tracking-wide uppercase text-ink">Focus Mode</h2>
                </div>
                <button onClick={handleCloseAttempt} className="p-2 text-muted hover:text-ink hover:bg-canvas-soft rounded-full transition-all">
                    <Minimize2 size={24} />
                </button>
            </div>

            {/* Main */}
            <div className="flex-1 flex flex-col md:flex-row relative">
                {/* Timer */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                    <div className="relative w-80 h-80 flex items-center justify-center mb-12">
                        <div className="absolute inset-0 rounded-full border-4 border-surface-strong"></div>
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="160" cy="160" r="156" stroke="currentColor" strokeWidth="4" fill="none"
                                strokeDasharray={980} strokeDashoffset={980 - (980 * progress) / 100}
                                className={`${accentText} transition-all duration-1000 ease-linear`} />
                        </svg>
                        <div className="text-center z-10">
                            <div className="text-8xl font-black font-mono tracking-tighter mb-2 tabular-nums text-ink">{formatTime(timeLeft)}</div>
                            <button onClick={switchMode} className="text-sm font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors">
                                {mode === 'focus' ? 'Focus Session' : 'Short Break'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 mb-12">
                        <button onClick={resetTimer} className="w-20 h-20 rounded-full flex items-center justify-center bg-surface-card border border-hairline text-muted hover:text-ink hover:bg-canvas-soft transition-all hover:scale-105">
                            <RotateCcw size={32} />
                        </button>
                        <button onClick={toggleTimer}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 ${isActive ? 'bg-ink text-canvas' : mode === 'focus' ? 'bg-primary text-on-primary' : 'bg-blue-500 text-white'}`}>
                            {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>
                    </div>
                </div>

                {/* Task context */}
                <div className="w-full md:w-[400px] border-l border-hairline bg-canvas-soft p-8 flex flex-col relative z-20">
                    <div className="mb-8">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-3">Currently Working On</label>
                        <div className="relative group">
                            <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}
                                className="w-full bg-surface-card border border-hairline-strong rounded-md px-4 py-4 pr-10 text-ink font-medium appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer">
                                <option value="" disabled>Select a task...</option>
                                {activeTasks.map(t => (<option key={t.id} value={t.id}>{t.title}</option>))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={20} />
                        </div>

                        {currentTask && (
                            <div className="mt-6 animate-fade-in">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${currentTask.priority === 'High' ? 'bg-primary/10 text-primary' : 'bg-surface-strong text-body'}`}>
                                        {currentTask.priority}
                                    </span>
                                    <span className="text-xs text-muted uppercase">{currentTask.estimatedTime} est.</span>
                                </div>
                                <p className="text-body text-sm leading-relaxed mb-6">{currentTask.description || "No description provided."}</p>
                                <button onClick={handleAdvanceTask}
                                    className="w-full py-4 bg-primary/10 border border-primary/25 hover:bg-primary hover:text-on-primary hover:border-primary text-primary rounded-md font-medium flex items-center justify-center gap-2 transition-all group">
                                    {getNextStatus(currentTask.status) === 'Done' ? (
                                        <><CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" /> Mark as Complete</>
                                    ) : (
                                        <><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /> Move to {getNextStatus(currentTask.status)}</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto">
                        <button onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}
                            className={`flex items-center justify-between w-full p-4 rounded-md border transition-all ${isScratchpadOpen ? 'bg-surface-card border-hairline' : 'bg-transparent border-dashed border-hairline-strong hover:border-muted text-muted'}`}>
                            <span className="flex items-center gap-2 font-semibold text-sm text-ink"><StickyNote size={18} /> Brain Dump</span>
                            <span className="text-[10px] uppercase font-bold text-muted">{isScratchpadOpen ? 'Hide' : 'Show'}</span>
                        </button>
                        {isScratchpadOpen && (
                            <div className="mt-2 animate-slide-up">
                                <textarea value={scratchpad} onChange={(e) => setScratchpad(e.target.value)} placeholder="Quick notes, distracting thoughts, or ideas..."
                                    className="w-full h-48 bg-surface-card border border-hairline rounded-md p-4 text-sm text-body focus:outline-none focus:border-primary resize-none custom-scrollbar" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Early Exit Challenge */}
            {showExitChallenge && (
                <div className="absolute inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="relative bg-surface-card border border-hairline p-8 rounded-xl max-w-sm w-full text-center shadow-sm animate-pop-in">
                        <h3 className="display text-3xl text-ink mb-3 tracking-tight pt-4">Leaving so soon?</h3>
                        <p className="text-body text-base font-medium mb-10 leading-relaxed px-2">"{randomMessage}"</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => { setShowExitChallenge(false); setIsActive(true); }}
                                className="w-full py-4 bg-primary text-on-primary font-bold text-lg rounded-full hover:bg-primary-active active:scale-95 transition-all">
                                STAY FOCUSED
                            </button>
                            <button onClick={onClose}
                                className="w-full py-4 bg-surface-card border border-hairline-strong text-body font-bold text-lg rounded-full transition-all duration-300 hover:bg-error hover:text-white hover:border-error active:scale-95">
                                Exit Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FocusMode;
