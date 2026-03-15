import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, CheckCircle2, ArrowLeft, Sparkles, ClipboardList,
  AlertTriangle, Sun, Copy, Check, Zap, TrendingUp
} from 'lucide-react';
import { Task, User, Project, AIAction } from '../types';
import { processUserMessage } from '../lib/aiService';

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes scan {
    0% { top: 0%; opacity: 0; }
    15% { opacity: 1; }
    85% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes radar-ping {
    0% { transform: scale(0.6); opacity: 0.8; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes risk-wave {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
  @keyframes float-bubble {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
  }
  @keyframes calendar-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(158,245,163,0); }
    50% { box-shadow: 0 0 0 6px rgba(158,245,163,0.25); }
  }
  .card-chat:hover .bubble-user { animation: float-bubble 2s ease-in-out infinite; }
  .card-chat:hover .bubble-ai { animation: float-bubble 2s ease-in-out infinite; animation-delay: 0.4s; }
  .card-risk:hover .radar-ring-1 { animation: radar-ping 1.6s ease-out infinite; }
  .card-risk:hover .radar-ring-2 { animation: radar-ping 1.6s ease-out infinite; animation-delay: 0.4s; }
  .card-risk:hover .radar-ring-3 { animation: radar-ping 1.6s ease-out infinite; animation-delay: 0.8s; }
  .card-brief:hover .cal-today { animation: calendar-glow 1.5s ease-in-out infinite; }
  .group:hover .ai-dot-1 { animation: risk-wave 1.2s infinite ease-in-out; animation-delay: 0s; }
  .group:hover .ai-dot-2 { animation: risk-wave 1.2s infinite ease-in-out; animation-delay: 0.15s; }
  .group:hover .ai-dot-3 { animation: risk-wave 1.2s infinite ease-in-out; animation-delay: 0.3s; }
  @keyframes ai-scan-and-fix {
    0%   { transform: translate(0, 0) scale(1);    opacity: 0; border-color: #b59df4; }
    10%  { transform: translate(0, 0) scale(1);    opacity: 1; border-color: #b59df4; }
    25%  { transform: translate(44px, 0) scale(1); opacity: 1; border-color: #b59df4; }
    40%  { transform: translate(0px, 44px) scale(1); opacity: 1; border-color: #b59df4; }
    55%  { transform: translate(44px, 44px) scale(1);    opacity: 1; border-color: #b59df4; }
    65%  { transform: translate(44px, 44px) scale(0.85); opacity: 1; border-color: #ef4444; border-width: 3px; }
    75%  { transform: translate(44px, 44px) scale(1.15); opacity: 1; border-color: #22c55e; border-width: 3px; }
    85%  { transform: translate(44px, 44px) scale(1.15); opacity: 1; }
    95%, 100% { transform: translate(44px, 44px) scale(1.3); opacity: 0; }
  }
  @keyframes bug-resolve {
    0%, 55%   { background-color: #ef4444; box-shadow: 0 0 12px rgba(239,68,68,0.6); }
    75%, 100% { background-color: #22c55e; box-shadow: 0 0 12px rgba(34,197,94,0.6); }
  }
  .group:hover .ai-scanner { animation: ai-scan-and-fix 3s infinite ease-in-out; }
  .group:hover .bug-node   { animation: bug-resolve 3s infinite ease-in-out; }
`;

// ─── Analysis ─────────────────────────────────────────────────────────────────

interface BriefingData {
  stalledTasks: Task[]; overdueTasks: Task[]; todaysFocus: Task[];
  completionRate: number; highPriorityTodo: Task[]; totalActive: number;
  doneCount: number; inProgressCount: number; testingCount: number; todoCount: number;
}

function analyzeProject(tasks: Task[]): BriefingData {
  const now = new Date();
  const active = tasks.filter(t => !t.sprintId);
  const stalledTasks = active.filter(t => {
    if (t.status !== 'In Progress' || !t.startDate) return false;
    return (now.getTime() - new Date(t.startDate).getTime()) / 86400000 > 3;
  });
  const overdueTasks = active.filter(t => t.status !== 'Done' && t.endDate && new Date(t.endDate) < now);
  const highPriorityTodo = active.filter(t => t.status === 'To Do' && t.priority === 'High');
  const score = (t: Task) => {
    let s = 0;
    if (t.priority === 'High') s += 30;
    if (t.priority === 'Medium') s += 15;
    if (t.status === 'In Progress') s += 20;
    if (overdueTasks.includes(t)) s += 25;
    return s;
  };
  const todaysFocus = active.filter(t => t.status !== 'Done').sort((a, b) => score(b) - score(a)).slice(0, 3);
  const doneCount = active.filter(t => t.status === 'Done').length;
  return {
    stalledTasks, overdueTasks, todaysFocus,
    completionRate: active.length > 0 ? Math.round((doneCount / active.length) * 100) : 0,
    highPriorityTodo, totalActive: active.length, doneCount,
    inProgressCount: active.filter(t => t.status === 'In Progress').length,
    testingCount: active.filter(t => t.status === 'Testing').length,
    todoCount: active.filter(t => t.status === 'To Do').length,
  };
}

function riskScore(data: BriefingData): number {
  const r = Math.min(100, data.stalledTasks.length * 15 + data.overdueTasks.length * 20 + data.highPriorityTodo.length * 10);
  return r;
}

// ─── Shared: Back Button ──────────────────────────────────────────────────────

const BackBtn: React.FC<{ onClick: () => void; accent: string }> = ({ onClick, accent }) => (
  <motion.button
    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
    onClick={onClick}
    className="flex items-center gap-2 mb-5 group"
  >
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[#f4f5f0] text-xs font-semibold transition-all group-hover:gap-3"
      style={{ background: '#1f1f22', border: `1px solid ${accent}30` }}>
      <ArrowLeft size={13} style={{ color: accent }} className="group-hover:-translate-x-0.5 transition-transform" />
      <span style={{ color: accent }}>Back to Hub</span>
    </div>
  </motion.button>
);

// ─── Launcher Cards ────────────────────────────────────────────────────────────

type ActiveView = 'launcher' | 'chat' | 'planning' | 'risk' | 'briefing';

const CARDS: { id: ActiveView; label: string; desc: string; bg: string; textDark: boolean }[] = [
  { id: 'chat',     label: 'AI Chat',        desc: 'Natural language commands', bg: '#9ef5a3', textDark: true  },
  { id: 'risk',     label: 'Risk Radar',     desc: 'Detect project blockers',   bg: '#ffada8', textDark: true  },
  { id: 'planning', label: 'Sprint Planning',desc: 'AI-driven sprint setup',    bg: '#b59df4', textDark: true  },
  { id: 'briefing', label: 'Daily Briefing', desc: 'Morning standup summary',   bg: '#ffffff', textDark: true  },
];

// Card decorations — exact AICategories animations, scaled ~1.8×

// AI Chat → "Assign Task" check-off sequence (exact reference)
const ChatDecoration = () => (
  <div className="absolute -bottom-8 -right-4 w-36 h-32 bg-[#f6f7f2] rounded-[1.5rem] border-[5px] border-[#9ef5a3] p-4 shadow-lg rotate-[-5deg] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-[-2deg] group-hover:-translate-y-4 pointer-events-none">
    {/* Task 1 */}
    <div className="flex items-center gap-3 mb-3">
      <div className="relative w-5 h-5 rounded-full bg-[#1f1f22] flex items-center justify-center flex-shrink-0 transition-colors duration-300 group-hover:bg-[#b59df4]">
        <div className="w-2 h-2 rounded-full bg-[#9ef5a3] transition-all duration-300 group-hover:scale-0 group-hover:opacity-0" />
        <svg className="absolute w-3 h-3 text-[#f6f7f2] opacity-0 scale-50 transition-all duration-300 delay-150 group-hover:opacity-100 group-hover:scale-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="relative w-14 h-2.5 bg-[#e1e6de] rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-[#1f1f22]/20 w-0 transition-all duration-500 delay-150 ease-out group-hover:w-full rounded-full" />
      </div>
    </div>
    {/* Task 2 */}
    <div className="flex items-center gap-3 mb-3 transition-transform duration-300 delay-75 group-hover:translate-x-1">
      <div className="w-5 h-5 rounded-full bg-[#e1e6de] flex-shrink-0" />
      <div className="w-10 h-2.5 bg-[#e1e6de] rounded-full" />
    </div>
    {/* Task 3 */}
    <div className="flex items-center gap-3 transition-transform duration-300 delay-100 group-hover:translate-x-1">
      <div className="w-5 h-5 rounded-full border-2 border-[#b59df4] flex-shrink-0" />
      <div className="w-16 h-2.5 bg-[#b59df4]/30 rounded-full" />
    </div>
  </div>
);

// Risk Radar → AI Error Scanner Matrix (exact reference Card 5)
const RiskDecoration = () => (
  <div className="absolute -bottom-6 -right-4 w-44 h-32 bg-[#1f1f22] rounded-[1.5rem] p-4 shadow-lg rotate-[-3deg] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-0 group-hover:-translate-y-2 pointer-events-none">
    <div className="flex flex-col gap-3 relative mt-1 ml-1">
      {/* Row 1 */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#e1e6de]/10 border border-white/5" />
        <div className="w-8 h-8 rounded-lg bg-[#e1e6de]/10 border border-white/5" />
        <div className="w-8 h-8 rounded-lg bg-[#e1e6de]/10 border border-white/5" />
      </div>
      {/* Row 2 */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#e1e6de]/10 border border-white/5" />
        {/* Bug node */}
        <div className="bug-node w-8 h-8 rounded-lg bg-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.4)] relative flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#e1e6de]/10 border border-white/5" />
      </div>
      {/* AI scanner bracket */}
      <div className="ai-scanner absolute top-0 left-0 w-8 h-8 rounded-lg border-[2.5px] border-[#b59df4] opacity-0 pointer-events-none z-10 flex items-center justify-center">
        <div className="w-full h-[1.5px] bg-[#b59df4] shadow-[0_0_5px_#b59df4] absolute top-1/2 -translate-y-1/2 opacity-60" />
      </div>
    </div>
    {/* Dashboard lights */}
    <div className="absolute right-3 top-3 flex gap-1.5 opacity-40">
      <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
    </div>
  </div>
);

// Sprint Planning → "AI Brainstorm" chat bubbles with wave dots
const PlanDecoration = () => (
  <div className="absolute -bottom-4 -right-4 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-6 group-hover:-translate-x-3 pointer-events-none">
    {/* Sparkle on hover */}
    <svg className="absolute -top-10 left-4 w-14 h-14 text-[#1f1f22] opacity-0 scale-0 rotate-[-45deg] transition-all duration-500 delay-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-12 z-20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0l2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z" />
    </svg>
    {/* User bubble */}
    <div className="w-52 h-36 bg-[#f6f7f2] rounded-[1.5rem] rounded-br-sm shadow-md relative right-3 bottom-6 p-5 flex flex-col gap-3 transition-transform duration-500 group-hover:translate-y-3 group-hover:-rotate-2">
      <div className="w-28 h-3 bg-[#e1e6de] rounded-full" />
      <div className="w-18 h-3 bg-[#e1e6de] rounded-full" />
      <div className="w-20 h-3 bg-[#e1e6de] rounded-full" />
    </div>
    {/* AI bubble */}
    <div className="w-44 h-28 bg-[#1f1f22] rounded-[1.5rem] rounded-bl-sm absolute -bottom-10 -left-14 border-[7px] border-[#b59df4] flex items-center justify-center gap-3 transition-transform duration-500 group-hover:-translate-y-3 group-hover:rotate-2">
      <div className="ai-dot-1 w-4 h-4 rounded-full bg-[#9ef5a3] opacity-80" />
      <div className="ai-dot-2 w-4 h-4 rounded-full bg-[#b59df4] opacity-80" />
      <div className="ai-dot-3 w-4 h-4 rounded-full bg-[#f6f7f2] opacity-80" />
    </div>
  </div>
);

// Daily Briefing → "Generate Report" bar chart with laser scan
const BriefingDecoration = () => (
  <div className="absolute -bottom-10 -right-6 w-64 h-52 bg-[#1f1f22] rounded-[1.5rem] p-6 flex items-end gap-4 rotate-[4deg] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-0 overflow-hidden pointer-events-none">
    {/* Laser scan line */}
    <div className="absolute left-0 right-0 w-full h-[2px] bg-[#9ef5a3] shadow-[0_0_16px_3px_rgba(158,245,163,0.8)] z-20 hidden group-hover:block" style={{ animation: 'scan 1.5s ease-in-out infinite' }} />
    {/* Bar 1 */}
    <div className="w-full h-[40%] bg-[#b59df4] rounded-t-xl relative transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:h-[65%] group-hover:bg-[#c6b3f7]">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#f6f7f2] transition-transform duration-500 group-hover:-translate-y-1" />
    </div>
    {/* Bar 2 */}
    <div className="w-full h-[75%] bg-[#9ef5a3] rounded-t-xl relative transition-all duration-700 delay-75 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:h-[90%] group-hover:bg-[#b0f7b4]">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#9ef5a3] transition-transform duration-500 delay-75 group-hover:-translate-y-1 group-hover:scale-110" />
    </div>
    {/* Bar 3 (pattern) */}
    <div className="w-full h-[50%] rounded-t-xl relative transition-all duration-700 delay-100 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:h-[70%] bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.12)_3px,rgba(255,255,255,0.12)_6px)]">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white/40 transition-transform duration-500 delay-100 group-hover:-translate-y-1" />
    </div>
  </div>
);


const DECORATIONS: Record<ActiveView, React.ReactNode> = {
  launcher: null,
  chat: <ChatDecoration />,
  risk: <RiskDecoration />,
  planning: <PlanDecoration />,
  briefing: <BriefingDecoration />,
};

// ─── Launcher ─────────────────────────────────────────────────────────────────

const Launcher: React.FC<{ onSelect: (v: ActiveView) => void }> = ({ onSelect }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="h-full grid grid-cols-2 grid-rows-2 gap-4">
    {CARDS.map((card, i) => (
      <motion.div
        key={card.id}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.04 + i * 0.07, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        onClick={() => onSelect(card.id)}
        className={`group relative overflow-hidden rounded-[2rem] p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 card-${card.id}`}
        style={{ background: card.bg, boxShadow: `0 8px 32px ${card.bg}55` }}
      >
        {/* Label — AICategories style */}
        <div className={`flex items-center gap-2 text-lg font-medium tracking-wide z-10 relative ${card.textDark ? 'text-black' : 'text-[#f4f5f0]'}`}>
          {card.id === 'risk' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
          {card.label}
        </div>

        {DECORATIONS[card.id]}
      </motion.div>
    ))}
  </motion.div>
);

// ─── AI Chat View ─────────────────────────────────────────────────────────────

interface ChatMsg { id: string; role: 'user' | 'ai' | 'thinking' | 'action'; text: string; action?: AIAction; confirmed?: boolean; }

const AIChatView: React.FC<{ tasks: Task[]; onAction: (a: AIAction) => void; onBack: () => void }> = ({ tasks, onAction, onBack }) => {
  const ACCENT = '#9ef5a3';
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { id: 'init', role: 'ai', text: "Hey! I'm your AI Project Manager. Ask me to create tasks, analyze blockers, filter your board, or plan your next sprint." }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = ['Create 3 tasks for auth system', 'What are our blockers?', 'Show high priority tasks', 'Plan this sprint'];

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || thinking) return;
    setInput('');
    setMsgs(p => [...p, { id: `u${Date.now()}`, role: 'user', text: msg }]);
    setMsgs(p => [...p, { id: 'thinking', role: 'thinking', text: '' }]);
    setThinking(true);
    try {
      const action = await processUserMessage(msg, tasks);
      setMsgs(p => p.filter(m => m.role !== 'thinking'));
      if (action.intent === 'CREATE_TASKS') {
        setMsgs(p => [...p, { id: `a${Date.now()}`, role: 'action', text: action.summary || 'I can create these tasks for you.', action }]);
      } else {
        setMsgs(p => [...p, { id: `ai${Date.now()}`, role: 'ai', text: action.summary || 'Done.' }]);
        if (action.intent !== 'NONE') onAction(action);
      }
    } catch {
      setMsgs(p => p.filter(m => m.role !== 'thinking'));
      setMsgs(p => [...p, { id: `err${Date.now()}`, role: 'ai', text: 'Connection error. Please check the AI edge function.' }]);
    } finally { setThinking(false); }
    setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full bg-[#0f0f11] rounded-3xl p-5 overflow-hidden">
      <BackBtn onClick={onBack} accent={ACCENT} />

      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: '#1f1f22', border: `1px solid ${ACCENT}30` }}>
          <div className="ai-dot-1 w-2 h-2 rounded-full" style={{ background: ACCENT }} />
        </div>
        <div>
          <p className="font-bold text-white text-sm">AI Chat</p>
          <p className="text-[11px] text-gray-500">{tasks.filter(t => !t.sprintId).length} active tasks in context</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: `${ACCENT}15`, color: ACCENT }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />
          LIVE
        </div>
      </div>

      {/* Suggestions (shown when empty) */}
      {msgs.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              className="px-3 py-1.5 rounded-xl text-xs text-gray-400 transition-all hover:text-white hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0" style={{ scrollbarWidth: 'none' }}>
        {msgs.map(m => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {m.role === 'user' && (
              <div className="flex justify-end">
                <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-gray-200 leading-relaxed"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {m.text}
                </div>
              </div>
            )}
            {m.role === 'ai' && (
              <div className="flex items-start gap-2.5 max-w-[82%]">
                <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: ACCENT + '20', border: `1px solid ${ACCENT}40` }}>
                  <Sparkles size={10} style={{ color: ACCENT }} />
                </div>
                <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-gray-200 leading-relaxed"
                  style={{ background: `${ACCENT}0D`, border: `1px solid ${ACCENT}25` }}>
                  {m.text}
                </div>
              </div>
            )}
            {m.role === 'thinking' && (
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center animate-pulse" style={{ background: ACCENT + '15' }}>
                  <Sparkles size={10} style={{ color: ACCENT }} />
                </div>
                <div className="flex gap-1 px-4 py-3 rounded-2xl" style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}20` }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT + '80' }}
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </div>
            )}
            {m.role === 'action' && m.action && (
              <div className="flex items-start gap-2.5 max-w-[82%]">
                <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: ACCENT + '20' }}>
                  <Sparkles size={10} style={{ color: ACCENT }} />
                </div>
                <div className="rounded-2xl rounded-tl-sm overflow-hidden w-full" style={{ border: `1px solid ${ACCENT}30` }}>
                  <div className="px-4 py-3 text-sm text-gray-200" style={{ background: `${ACCENT}0D` }}>{m.text}</div>
                  {!m.confirmed ? (
                    <div className="flex gap-2 px-4 py-2.5" style={{ background: `${ACCENT}08`, borderTop: `1px solid ${ACCENT}15` }}>
                      <button onClick={() => { onAction(m.action!); setMsgs(p => p.map(x => x.id === m.id ? { ...x, confirmed: true } : x)); }}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold text-[#1f1f22] transition-all hover:opacity-90" style={{ background: ACCENT }}>
                        Accept & Create
                      </button>
                      <button onClick={() => setMsgs(p => p.filter(x => x.id !== m.id))}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/10 transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2.5 text-xs" style={{ color: ACCENT, borderTop: `1px solid ${ACCENT}15` }}>
                      <CheckCircle2 size={12} /> Tasks created and added to your board.
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex items-end gap-3 mt-4 px-3 py-2.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask me anything..." rows={1} disabled={thinking}
          className="flex-1 resize-none bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none leading-relaxed max-h-20"
          style={{ minHeight: 24 }} />
        <button onClick={() => send()} disabled={!input.trim() || thinking}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-25 flex-shrink-0"
          style={{ background: input.trim() && !thinking ? ACCENT : 'rgba(255,255,255,0.05)' }}>
          <Send size={13} style={{ color: input.trim() && !thinking ? '#1f1f22' : 'white' }} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Risk Radar View ──────────────────────────────────────────────────────────

const RiskRadarView: React.FC<{ tasks: Task[]; project: Project; onBack: () => void }> = ({ tasks, project, onBack }) => {
  const ACCENT = '#9ef5a3';
  const data = useMemo(() => analyzeProject(tasks), [tasks]);
  const risk = riskScore(data);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState('');
  const [loadingRec, setLoadingRec] = useState(false);

  const risks = [
    {
      id: 'stalled', label: 'Stalled Tasks', count: data.stalledTasks.length,
      severity: data.stalledTasks.length >= 3 ? 'high' : data.stalledTasks.length > 0 ? 'medium' : 'clear',
      tasks: data.stalledTasks, desc: 'In Progress for 3+ days without updates',
    },
    {
      id: 'overdue', label: 'Overdue', count: data.overdueTasks.length,
      severity: data.overdueTasks.length >= 2 ? 'high' : data.overdueTasks.length > 0 ? 'medium' : 'clear',
      tasks: data.overdueTasks, desc: 'Past their end date and not done',
    },
    {
      id: 'blocked', label: 'High-Priority Unstarted', count: data.highPriorityTodo.length,
      severity: data.highPriorityTodo.length >= 3 ? 'high' : data.highPriorityTodo.length > 0 ? 'medium' : 'clear',
      tasks: data.highPriorityTodo, desc: 'High priority tasks still in backlog',
    },
    {
      id: 'completion', label: 'Completion Rate', count: null,
      severity: data.completionRate < 25 ? 'high' : data.completionRate < 50 ? 'medium' : 'clear',
      tasks: [], desc: `${data.completionRate}% of active tasks completed`,
    },
  ];

  const SEV_STYLE: Record<string, { color: string; bg: string; label: string }> = {
    high:   { color: '#ef4444', bg: '#fee2e2', label: 'HIGH' },
    medium: { color: '#f59e0b', bg: '#fef3c7', label: 'MEDIUM' },
    clear:  { color: '#10b981', bg: '#d1fae5', label: 'CLEAR' },
  };

  const getAiRecommendations = async () => {
    setLoadingRec(true);
    try {
      const msg = `Risk analysis for ${project.name}: ${data.stalledTasks.length} stalled tasks, ${data.overdueTasks.length} overdue, ${data.highPriorityTodo.length} high-priority not started. Risk score: ${risk}/100. Give 3 specific, actionable recommendations to reduce project risk.`;
      const action = await processUserMessage(msg, tasks);
      setAiRec(action.summary || 'No recommendations generated.');
    } catch { setAiRec('Could not connect to AI. Check edge function.'); }
    finally { setLoadingRec(false); }
  };

  const riskColor = risk >= 60 ? '#ef4444' : risk >= 30 ? '#f59e0b' : ACCENT;
  const riskLabel = risk >= 60 ? 'HIGH RISK' : risk >= 30 ? 'MODERATE' : 'HEALTHY';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full bg-[#e1e6de] rounded-3xl p-5 overflow-hidden">
      <BackBtn onClick={onBack} accent="#10b981" />

      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#1f1f22]/10">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: '#1f1f22' }}>
          <AlertTriangle size={16} style={{ color: ACCENT }} />
        </div>
        <div>
          <p className="font-bold text-[#1f1f22] text-sm">Risk Radar</p>
          <p className="text-[11px] text-[#5a6355]">Project health scan for {project.name}</p>
        </div>

        {/* Risk Gauge */}
        <div className="ml-auto flex flex-col items-end">
          <span className="text-2xl font-black" style={{ color: riskColor }}>{risk}</span>
          <span className="text-[9px] font-bold tracking-widest" style={{ color: riskColor }}>{riskLabel}</span>
        </div>
      </div>

      {/* Risk Items */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0" style={{ scrollbarWidth: 'none' }}>
        {risks.map(r => {
          const sev = SEV_STYLE[r.severity];
          const isOpen = expanded === r.id;
          return (
            <motion.div key={r.id} layout className="rounded-2xl overflow-hidden cursor-pointer"
              style={{ background: sev.bg, border: `1px solid ${sev.color}30` }}
              onClick={() => setExpanded(isOpen ? null : r.id)}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: sev.color }}>
                  {sev.label}
                </span>
                <span className="text-sm font-semibold text-[#1f1f22] flex-1">{r.label}</span>
                {r.count !== null && (
                  <span className="text-lg font-black" style={{ color: sev.color }}>{r.count}</span>
                )}
                {r.count === null && (
                  <span className="text-sm font-black" style={{ color: sev.color }}>{data.completionRate}%</span>
                )}
                <motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="text-[#1f1f22]/40 text-xs">▶</motion.span>
              </div>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="px-4 pb-3 text-xs text-[#1f1f22]/60 mb-2">{r.desc}</div>
                    {r.tasks.slice(0, 4).map(t => (
                      <div key={t.id} className="mx-4 mb-1.5 flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#1f1f22]"
                        style={{ background: 'rgba(255,255,255,0.5)' }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sev.color }} />
                        <span className="flex-1 truncate font-medium">{t.title}</span>
                        <span className="text-[10px] opacity-50">{t.priority}</span>
                      </div>
                    ))}
                    {r.tasks.length > 4 && <p className="px-4 pb-3 text-[10px] text-[#1f1f22]/40">+{r.tasks.length - 4} more</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* AI Recommendations */}
        <div className="rounded-2xl overflow-hidden mt-1" style={{ background: '#1f1f22' }}>
          {!aiRec ? (
            <button onClick={getAiRecommendations} disabled={loadingRec}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ color: ACCENT }}>
              {loadingRec ? (
                <>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }}
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                  <span>AI is analyzing risks...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Get AI Recommendations
                </>
              )}
            </button>
          ) : (
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>AI Recommendations</p>
              <p className="text-sm text-gray-200 leading-relaxed">{aiRec}</p>
              <button onClick={() => setAiRec('')} className="mt-2 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">Regenerate</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Daily Briefing View ──────────────────────────────────────────────────────

const BriefingView: React.FC<{ tasks: Task[]; project: Project; user: User; onBack: () => void }> = ({ tasks, project, user, onBack }) => {
  const ACCENT = '#9ef5a3';
  const data = useMemo(() => analyzeProject(tasks), [tasks]);
  const [standup, setStandup] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const generateStandup = async () => {
    setLoading(true);
    try {
      const doneTasks = tasks.filter(t => t.status === 'Done' && t.completedAt);
      const recentDone = doneTasks.filter(t => {
        const d = new Date(t.completedAt!);
        return (Date.now() - d.getTime()) / 86400000 < 2;
      });
      const msg = `Generate a daily standup for ${user.name} on project ${project.name}.
Recently completed: ${recentDone.map(t => t.title).join(', ') || 'none'}.
Currently in progress: ${tasks.filter(t => t.status === 'In Progress').map(t => t.title).join(', ') || 'none'}.
Blockers: ${data.stalledTasks.map(t => t.title).join(', ') || 'none'}.
Format as: Yesterday: ... | Today: ... | Blockers: ...`;
      const action = await processUserMessage(msg, tasks);
      setStandup(action.summary || 'Standup generated.');
    } catch { setStandup('Could not generate standup. Check AI connection.'); }
    finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(standup);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const PRIO_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full bg-[#e1e6de] rounded-3xl p-5 overflow-hidden">
      <BackBtn onClick={onBack} accent={ACCENT} />

      {/* Greeting */}
      <div className="mb-5 pb-4 border-b border-[#1f1f22]/10">
        <div className="flex items-center gap-2.5 mb-1">
          <Sun size={18} style={{ color: '#f59e0b' }} />
          <h2 className="text-xl font-bold text-[#1f1f22]">{greeting}, {user.name.split(' ')[0]}</h2>
        </div>
        <p className="text-sm text-[#5a6355]">{project.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-0" style={{ scrollbarWidth: 'none' }}>

        {/* Today's Focus */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Zap size={13} className="text-[#f59e0b]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1f1f22]/50">Today's Focus</span>
          </div>
          <div className="space-y-2">
            {data.todaysFocus.length === 0 ? (
              <p className="text-sm text-[#5a6355] italic">No active tasks. You're all caught up!</p>
            ) : data.todaysFocus.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: i === 0 ? '#1f1f22' : 'rgba(28,28,28,0.07)' }}>
                <span className="text-xs font-black w-5 text-center" style={{ color: i === 0 ? ACCENT : '#5a6355' }}>#{i + 1}</span>
                <span className={`flex-1 text-sm font-medium truncate ${i === 0 ? 'text-white' : 'text-[#1f1f22]'}`}>{t.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: PRIO_COLOR[t.priority], background: PRIO_COLOR[t.priority] + '20' }}>{t.priority}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sprint Health */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <TrendingUp size={13} className="text-[#3b82f6]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1f1f22]/50">Sprint Health</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Done', val: data.doneCount, color: '#10b981' },
              { label: 'Active', val: data.inProgressCount + data.testingCount, color: '#3b82f6' },
              { label: 'Backlog', val: data.todoCount, color: '#6b7280' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: 'rgba(28,28,28,0.07)' }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] text-[#5a6355]">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-2.5 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(28,28,28,0.1)' }}>
            <motion.div className="h-full rounded-full" style={{ background: ACCENT }}
              initial={{ width: 0 }} animate={{ width: `${data.completionRate}%` }}
              transition={{ duration: 1, delay: 0.3, ease: [0.23, 1, 0.32, 1] }} />
          </div>
          <p className="text-[10px] text-[#5a6355] mt-1">{data.completionRate}% sprint completion</p>
        </div>

        {/* Standup Generator */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1f1f22' }}>
          {!standup ? (
            <button onClick={generateStandup} disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ color: ACCENT }}>
              {loading ? (
                <>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }}
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                  <span>Generating standup...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Daily Standup
                </>
              )}
            </button>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>Daily Standup</p>
                <button onClick={copy} className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
                  {copied ? <><Check size={10} className="text-green-400" /> Copied!</> : <><Copy size={10} /> Copy</>}
                </button>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{standup}</p>
              <button onClick={() => setStandup('')} className="mt-2 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">Regenerate</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Planning View ────────────────────────────────────────────────────────────

const PlanningView: React.FC<{ tasks: Task[]; project: Project; onAction: (a: AIAction) => void; onBack: () => void }> = ({ tasks, project, onAction, onBack }) => {
  const ACCENT = '#b59df4';
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AIAction | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const data = useMemo(() => analyzeProject(tasks), [tasks]);

  const generate = async () => {
    setLoading(true); setPlan(null); setConfirmed(false);
    try {
      const msg = `Create a sprint plan for ${project.name}. We have ${data.todoCount} To Do tasks, ${data.inProgressCount} in progress, ${data.highPriorityTodo.length} high priority not started. Generate 3-5 focused tasks for this sprint.`;
      const action = await processUserMessage(msg, tasks);
      if (action.intent === 'CREATE_TASKS') setPlan(action);
    } catch { }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full bg-[#e1e6de] rounded-3xl p-5 overflow-hidden">
      <BackBtn onClick={onBack} accent={ACCENT} />
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#1f1f22]/10">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: '#1f1f22' }}>
          <ClipboardList size={16} style={{ color: ACCENT }} />
        </div>
        <div>
          <p className="font-bold text-[#1f1f22] text-sm">Sprint Planning</p>
          <p className="text-[11px] text-[#5a6355]">AI-driven sprint setup for {project.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Backlog', val: data.todoCount, color: '#6b7280' },
          { label: 'Active', val: data.inProgressCount, color: '#3b82f6' },
          { label: 'High Pri', val: data.highPriorityTodo.length, color: '#ef4444' },
          { label: 'Done', val: data.doneCount, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: 'rgba(28,28,28,0.07)' }}>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[10px] text-[#5a6355] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {!plan && !loading && (
        <motion.button onClick={generate} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold transition-all mb-4"
          style={{ background: '#1f1f22', color: ACCENT }}>
          <Sparkles size={15} />
          Generate Sprint Plan with AI
        </motion.button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-4 rounded-2xl mb-4" style={{ background: 'rgba(28,28,28,0.07)' }}>
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: ACCENT }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
          ))}
          <span className="text-sm text-[#1f1f22]/60">AI is planning your sprint...</span>
        </div>
      )}

      {plan && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex-1 rounded-2xl overflow-hidden" style={{ background: '#1f1f22' }}>
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${ACCENT}20` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: ACCENT + '80' }}>Proposed Sprint Plan</p>
            <p className="text-sm text-gray-200">{plan.summary}</p>
          </div>
          <div className="p-3 space-y-2 overflow-y-auto max-h-48" style={{ scrollbarWidth: 'none' }}>
            {plan.payload?.tasks?.map((t: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}18` }}>
                <span className="text-[10px] font-bold w-4 text-center" style={{ color: ACCENT + '60' }}>{i + 1}</span>
                <p className="text-xs text-gray-200 flex-1">{t.title}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.priority === 'High' ? 'text-red-400 bg-red-500/10' : t.priority === 'Medium' ? 'text-amber-400 bg-amber-500/10' : 'text-gray-400 bg-gray-500/10'}`}>
                  {t.priority}
                </span>
              </motion.div>
            ))}
          </div>
          {!confirmed ? (
            <div className="flex gap-2 px-4 py-3" style={{ borderTop: `1px solid ${ACCENT}15` }}>
              <button onClick={() => { onAction(plan); setConfirmed(true); }}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-[#1f1f22] transition-all hover:opacity-90"
                style={{ background: ACCENT }}>
                Commit Sprint
              </button>
              <button onClick={() => setPlan(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/10 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                Regenerate
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 text-sm" style={{ color: ACCENT, borderTop: `1px solid ${ACCENT}15` }}>
              <CheckCircle2 size={13} /> Sprint committed! Tasks added to your board.
            </div>
          )}
        </motion.div>
      )}

      {!plan && !loading && (
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(28,28,28,0.07)' }}>
            <ClipboardList size={22} style={{ color: ACCENT }} />
          </div>
          <p className="text-sm font-medium text-[#1f1f22]">Ready to plan</p>
          <p className="text-xs text-[#5a6355] mt-1 max-w-xs">AI analyzes your backlog and proposes the highest-impact tasks for this sprint.</p>
        </div>
      )}
    </motion.div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

interface Props { tasks: Task[]; project: Project; user: User; onAIAction: (action: AIAction) => void; }

const AICommandCenter: React.FC<Props> = ({ tasks, project, user, onAIAction }) => {
  const [view, setView] = useState<ActiveView>('launcher');
  const data = useMemo(() => analyzeProject(tasks), [tasks]);

  return (
    <>
      <style>{STYLES}</style>
      <div className="h-full min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'launcher' && (
            <motion.div key="launcher" className="h-full"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}>
              <Launcher onSelect={setView} />
            </motion.div>
          )}
          {view === 'chat' && (
            <motion.div key="chat" className="h-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <AIChatView tasks={tasks} onAction={onAIAction} onBack={() => setView('launcher')} />
            </motion.div>
          )}
          {view === 'risk' && (
            <motion.div key="risk" className="h-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <RiskRadarView tasks={tasks} project={project} onBack={() => setView('launcher')} />
            </motion.div>
          )}
          {view === 'planning' && (
            <motion.div key="planning" className="h-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <PlanningView tasks={tasks} project={project} onAction={onAIAction} onBack={() => setView('launcher')} />
            </motion.div>
          )}
          {view === 'briefing' && (
            <motion.div key="briefing" className="h-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <BriefingView tasks={tasks} project={project} user={user} onBack={() => setView('launcher')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default AICommandCenter;
