import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, X, FastForward, ChevronRight, Clock, Zap } from 'lucide-react';
import { Task, WorkflowStatus, DEFAULT_WORKFLOW } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  workflow?: WorkflowStatus[];
}

const SPEEDS = [
  { label: '1d', days: 1 },
  { label: '3d', days: 3 },
  { label: '1w', days: 7 },
  { label: '2w', days: 14 },
];

const SprintReplay: React.FC<Props> = ({ isOpen, onClose, tasks, workflow }) => {
  const columns = useMemo(
    () => (workflow && workflow.length > 0 ? [...workflow] : [...DEFAULT_WORKFLOW]).sort((a, b) => a.order - b.order),
    [workflow]
  );

  // Build timeline bounds from task data
  const { minDate, maxDate, totalDays } = useMemo(() => {
    const dates: number[] = [];
    tasks.forEach(t => {
      if (t.startDate) dates.push(new Date(t.startDate).getTime());
      if (t.completedAt) dates.push(new Date(t.completedAt).getTime());
      if (t.createdAt) dates.push(new Date((t as any).createdAt).getTime());
    });
    if (dates.length === 0) {
      const now = Date.now();
      return { minDate: now - 14 * 86400000, maxDate: now, totalDays: 14 };
    }
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const days = Math.max(1, Math.ceil((max - min) / 86400000)) + 1;
    return { minDate: min, maxDate: max, totalDays: days };
  }, [tasks]);

  const [currentDay, setCurrentDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute task status at a given day offset
  const getTaskStatusAtDay = useCallback(
    (task: Task, dayOffset: number): string | null => {
      const cutoff = minDate + dayOffset * 86400000;

      // Task hasn't been created yet
      const createdMs = task.startDate
        ? new Date(task.startDate).getTime()
        : task.createdAt
        ? new Date((task as any).createdAt).getTime()
        : minDate;

      if (createdMs > cutoff) return null;

      // If task completed before cutoff → Done
      if (task.completedAt && new Date(task.completedAt).getTime() <= cutoff) {
        return columns.find(c => c.type === 'done')?.name ?? 'Done';
      }

      // Otherwise assume starting status (first non-done column)
      return columns.find(c => c.type === 'start')?.name ?? columns[0]?.name ?? 'To Do';
    },
    [minDate, columns]
  );

  // Current snapshot: tasks by column
  const snapshot = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach(c => (map[c.name] = []));
    tasks.forEach(t => {
      const status = getTaskStatusAtDay(t, currentDay);
      if (status && map[status]) map[status].push(t);
    });
    return map;
  }, [tasks, currentDay, getTaskStatusAtDay, columns]);

  // Playback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentDay(d => {
          if (d >= totalDays) {
            setIsPlaying(false);
            return d;
          }
          return d + SPEEDS[speedIdx].days;
        });
      }, 600);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speedIdx, totalDays]);

  const currentDate = new Date(minDate + currentDay * 86400000);
  const progress = totalDays > 0 ? Math.min(1, currentDay / totalDays) : 0;

  // Stats at current day
  const doneCount = snapshot[columns.find(c => c.type === 'done')?.name ?? 'Done']?.length ?? 0;
  const totalVisible = Object.values(snapshot).reduce((a, b) => a + b.length, 0);

  const getPriorityDot = (p: string) =>
    p === 'High' ? '#f97316' : p === 'Medium' ? '#eab308' : '#22c55e';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="sprint-replay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col"
      >
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between px-8 py-5 border-b border-white/8"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <Zap size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Sprint Replay</h2>
              <p className="text-xs text-gray-500 mt-0.5">Watch your sprint unfold day by day</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{doneCount}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Done</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-xl font-bold text-white">{totalVisible}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Active</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{Math.round(progress * 100)}%</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Through</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </motion.div>

        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div
            className="flex gap-5 h-full"
            style={{ minWidth: `${columns.length * 280}px` }}
          >
            {columns.map((col, ci) => {
              const colTasks = snapshot[col.name] || [];
              return (
                <motion.div
                  key={col.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.06 + 0.15 }}
                  className="flex-1 min-w-[260px] flex flex-col"
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: col.color }}
                      />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        {col.name}
                      </span>
                    </div>
                    <motion.span
                      key={colTasks.length}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${col.color}18`,
                        color: col.color,
                        border: `1px solid ${col.color}40`,
                      }}
                    >
                      {colTasks.length}
                    </motion.span>
                  </div>

                  {/* Column body */}
                  <div
                    className="flex-1 rounded-2xl p-2 overflow-y-auto custom-scrollbar flex flex-col gap-2"
                    style={{
                      background: `${col.color}06`,
                      border: `1px solid ${col.color}18`,
                    }}
                  >
                    <AnimatePresence initial={false}>
                      {colTasks.map((task, ti) => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, scale: 0.85, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, x: 20 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 300, delay: ti * 0.02 }}
                          className="bg-[#18181b] border border-white/8 rounded-xl p-3 group hover:border-white/20 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="w-2 h-2 rounded-full mt-1 shrink-0"
                              style={{ background: getPriorityDot(task.priority) }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-medium leading-snug ${
                                col.type === 'done' ? 'line-through text-gray-600' : 'text-gray-200'
                              }`}>
                                {task.title}
                              </p>
                              {task.assignees?.length > 0 && (
                                <div className="flex -space-x-1 mt-1.5">
                                  {task.assignees.slice(0, 3).map((u, i) => (
                                    <img
                                      key={i}
                                      src={u.avatar}
                                      alt={u.name}
                                      className="w-4 h-4 rounded-full border border-[#18181b]"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {colTasks.length === 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-[10px] text-gray-700 italic">Empty</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Controls bar */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="border-t border-white/8 px-8 py-5"
        >
          {/* Date display + progress bar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-400 shrink-0 w-36">
              <Clock size={13} />
              <span className="font-mono font-bold text-white text-sm">
                {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Scrubber */}
            <div className="flex-1 relative group">
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #d1f45f, #9ef5a3)', width: `${progress * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={totalDays}
                value={currentDay}
                onChange={e => { setIsPlaying(false); setCurrentDay(Number(e.target.value)); }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                style={{ height: '100%' }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(209,244,95,0.6)] border-2 border-black pointer-events-none transition-all"
                style={{ left: `calc(${progress * 100}% - 8px)` }}
              />
            </div>

            <span className="text-xs text-gray-600 shrink-0 font-mono">Day {currentDay}/{totalDays}</span>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-4">
            {/* Back to start */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentDay(0); }}
              className="p-2 text-gray-500 hover:text-white hover:bg-white/8 rounded-xl transition-all"
            >
              <SkipBack size={18} />
            </button>

            {/* Step back */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentDay(d => Math.max(0, d - SPEEDS[speedIdx].days)); }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/8 rounded-xl transition-all"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>

            {/* Play/Pause */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (currentDay >= totalDays) setCurrentDay(0);
                setIsPlaying(p => !p);
              }}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-black shadow-[0_0_20px_rgba(209,244,95,0.3)] hover:shadow-[0_0_28px_rgba(209,244,95,0.5)] transition-all"
            >
              {isPlaying ? <Pause size={20} strokeWidth={2.5} /> : <Play size={20} strokeWidth={2.5} className="ml-0.5" />}
            </motion.button>

            {/* Step forward */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentDay(d => Math.min(totalDays, d + SPEEDS[speedIdx].days)); }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/8 rounded-xl transition-all"
            >
              <ChevronRight size={18} />
            </button>

            {/* Skip to end */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentDay(totalDays); }}
              className="p-2 text-gray-500 hover:text-white hover:bg-white/8 rounded-xl transition-all"
            >
              <SkipForward size={18} />
            </button>

            {/* Speed selector */}
            <div className="flex items-center gap-1 ml-4 bg-white/5 rounded-xl p-1 border border-white/8">
              <FastForward size={12} className="text-gray-500 ml-1.5 mr-0.5" />
              {SPEEDS.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setSpeedIdx(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    i === speedIdx
                      ? 'bg-primary text-black'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SprintReplay;
