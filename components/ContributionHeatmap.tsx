import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Zap, TrendingUp, Target, X } from 'lucide-react';
import { Task } from '../types';

interface HeatmapDay {
  date: Date;
  dateStr: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  tasks: Task[];
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['','Mon','','Wed','','Fri',''];

const COLORS = [
  'transparent',
  'rgba(209,244,95,0.18)',
  'rgba(209,244,95,0.40)',
  'rgba(209,244,95,0.68)',
  '#d1f45f',
];

const GLOWS = [
  'none',
  'none',
  'none',
  '0 0 6px rgba(209,244,95,0.35)',
  '0 0 10px rgba(209,244,95,0.65)',
];

interface Props { tasks: Task[] }

const ContributionHeatmap: React.FC<Props> = ({ tasks }) => {
  const [mounted, setMounted] = useState(false);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const { weeks, monthLabels, stats } = useMemo(() => {
    // Build task-by-date map
    const taskMap = new Map<string, Task[]>();
    tasks.forEach(t => {
      if (!t.completedAt) return;
      const key = t.completedAt.split('T')[0];
      if (!taskMap.has(key)) taskMap.set(key, []);
      taskMap.get(key)!.push(t);
    });

    // Date range: last 52 full weeks + partial current week
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 363);
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    const weeksArr: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];
    const d = new Date(start);
    today.setHours(23, 59, 59, 999);

    while (d <= today) {
      const key = d.toISOString().split('T')[0];
      const dayTasks = taskMap.get(key) || [];
      const count = dayTasks.length;
      const level = (count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4) as 0|1|2|3|4;
      currentWeek.push({ date: new Date(d), dateStr: key, count, level, tasks: dayTasks });
      if (currentWeek.length === 7) { weeksArr.push(currentWeek); currentWeek = []; }
      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length) weeksArr.push(currentWeek);

    // Month labels
    const monthPos: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeksArr.forEach((week, i) => {
      const m = week[0]?.date.getMonth() ?? -1;
      if (m !== lastMonth && m >= 0) { monthPos.push({ label: MONTH_LABELS[m], col: i }); lastMonth = m; }
    });

    // Stats
    const allDone = Array.from(taskMap.values()).flat().length;
    let streak = 0;
    const check = new Date(); check.setHours(0,0,0,0);
    while (true) {
      const k = check.toISOString().split('T')[0];
      if ((taskMap.get(k)?.length ?? 0) > 0) { streak++; check.setDate(check.getDate() - 1); }
      else break;
    }
    let bestWeek = 0;
    weeksArr.forEach(w => { const s = w.reduce((acc, x) => acc + x.count, 0); if (s > bestWeek) bestWeek = s; });

    return { weeks: weeksArr, monthLabels: monthPos, stats: { total: allDone, streak, bestWeek } };
  }, [tasks]);

  return (
    <div className="bg-[#111113] rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
      {/* Ambient glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
            <Flame size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Contribution Graph</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tasks shipped over the past year</p>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex gap-3">
          {[
            { icon: <Target size={12} />, value: stats.total, label: 'Total', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
            { icon: <Flame size={12} className="text-orange-400" />, value: stats.streak, label: 'Streak', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
            { icon: <TrendingUp size={12} className="text-blue-400" />, value: stats.bestWeek, label: 'Best Week', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          ].map(({ icon, value, label, color, bg }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${bg} transition-all hover:scale-105`}>
              <div className={color}>{icon}</div>
              <div>
                <div className={`text-base font-bold ${color}`}>{value}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider leading-none">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid area */}
      <div className="flex gap-3 relative z-10">
        {/* Day labels */}
        <div className="flex flex-col shrink-0 pt-5" style={{ gap: '3px' }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="text-[9px] text-gray-600 flex items-center" style={{ height: '13px' }}>{d}</div>
          ))}
        </div>

        {/* Weeks + month labels */}
        <div className="flex-1 overflow-x-auto pb-1 custom-scrollbar" ref={containerRef}>
          {/* Month labels row */}
          <div className="flex mb-1.5" style={{ gap: '3px' }}>
            {weeks.map((_, i) => {
              const ml = monthLabels.find(m => m.col === i);
              return (
                <div key={i} className="text-[9px] text-gray-600 shrink-0 font-medium" style={{ width: '13px' }}>
                  {ml?.label || ''}
                </div>
              );
            })}
          </div>

          {/* Week columns */}
          <div className="flex" style={{ gap: '3px' }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col shrink-0" style={{ gap: '3px' }}>
                {week.map((day, di) => {
                  const isSelected = selectedDay?.dateStr === day.dateStr;
                  const isFuture = day.date > new Date();
                  return (
                    <motion.button
                      key={di}
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={mounted ? { opacity: isFuture ? 0.15 : 1, scale: 1 } : {}}
                      transition={{ delay: wi * 0.008 + di * 0.002, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                      onClick={() => !isFuture && setSelectedDay(isSelected ? null : day)}
                      whileHover={!isFuture ? { scale: 1.6, zIndex: 10 } : {}}
                      className="shrink-0 rounded-[3px] focus:outline-none relative"
                      style={{
                        width: '13px',
                        height: '13px',
                        background: isFuture ? 'transparent' : COLORS[day.level],
                        border: isFuture ? '1px solid rgba(255,255,255,0.04)' : isSelected ? '1.5px solid #d1f45f' : 'none',
                        boxShadow: isSelected ? '0 0 0 2px rgba(209,244,95,0.3)' : GLOWS[day.level],
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end pr-1">
            <span className="text-[9px] text-gray-600">Less</span>
            {COLORS.map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-[3px] border border-white/5"
                style={{ background: i === 0 ? '#1a1a1d' : c, boxShadow: GLOWS[i] }} />
            ))}
            <span className="text-[9px] text-gray-600">More</span>
          </div>
        </div>

        {/* Day detail panel */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, width: 0, x: 16 }}
              animate={{ opacity: 1, width: 196, x: 0 }}
              exit={{ opacity: 0, width: 0, x: 16 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="w-[196px] bg-[#18181b] rounded-2xl border border-white/8 p-4 h-full flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs font-bold text-white">
                      {selectedDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {selectedDay.count > 0
                        ? <><span className="text-primary font-bold">{selectedDay.count}</span> task{selectedDay.count !== 1 ? 's' : ''} completed</>
                        : 'No tasks completed'}
                    </p>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="text-gray-600 hover:text-white transition-colors mt-0.5">
                    <X size={13} />
                  </button>
                </div>

                <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar mt-2">
                  <AnimatePresence>
                    {selectedDay.tasks.map((t, i) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-2 group/item"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 group-hover/item:scale-125 transition-transform" />
                        <span className="text-[10px] text-gray-300 leading-snug line-clamp-2">{t.title}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {selectedDay.count === 0 && (
                    <div className="flex flex-col items-center justify-center h-16 text-gray-700">
                      <Zap size={16} className="mb-1 opacity-40" />
                      <p className="text-[10px]">Rest day</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ContributionHeatmap;
