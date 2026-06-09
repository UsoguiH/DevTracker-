import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, CheckCircle2, ArrowLeft, Sparkles, ClipboardList,
  AlertTriangle, Sun, Copy, Check, Zap, TrendingUp,
  Plus, ArrowUp, ChevronDown, ChevronLeft, Pencil,
  Search, Mic, PanelLeft, SquarePen, SlidersHorizontal, MoreHorizontal,
  RefreshCw, Paperclip, X, Trash2, LogOut
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

export interface ChatMsg { id: string; role: 'user' | 'ai' | 'thinking' | 'action'; text: string; action?: AIAction; confirmed?: boolean; }

// ── DevTracker AI Chat — styled to feel exactly like ChatGPT ──────────────────
// Dark canvas (#212121), centered 768px conversation column, user messages in a
// gray pill on the right, assistant replies as bare full-width text on the left,
// and a rounded pill composer with a +, a growing textarea, and a circular
// up-arrow send button. Empty state is the ChatGPT "hero": a centered heading
// with the composer and suggestion chips beneath it.

// An original AI mark for DevTracker PM — a clean-room geometric "spark",
// not any third-party brand logo.
const PmLogo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="DevTracker PM">
    <defs>
      <linearGradient id="pmGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6ee7b7" />
        <stop offset="1" stopColor="#14b8a6" />
      </linearGradient>
    </defs>
    <path
      d="M16 2c1.85 5.1 4.9 8.15 10 10-5.1 1.85-8.15 4.9-10 10-1.85-5.1-4.9-8.15-10-10 5.1-1.85 8.15-4.9 10-10Z"
      fill="url(#pmGrad)"
    />
  </svg>
);

// ── Tiny Markdown renderer (bold, italic, inline code, bullet/numbered lists,
// headings) so the PM's replies render like ChatGPT without a heavy dependency.
const renderInline = (text: string, kp: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={`${kp}b${i}`} className="font-semibold text-white">{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<code key={`${kp}c${i}`} className="px-1.5 py-0.5 rounded bg-white/10 text-[13px] font-mono">{m[3]}</code>);
    else if (m[4] !== undefined) nodes.push(<em key={`${kp}i${i}`}>{m[4]}</em>);
    last = m.index + m[0].length; i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

const Markdown: React.FC<{ text: string }> = ({ text }) => {
  const lines = (text || '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0, k = 0;
  const special = (l: string) => /^(#{1,3})\s|^\s*[-*]\s|^\s*\d+\.\s/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const cls = h[1].length === 1 ? 'text-lg font-semibold' : h[1].length === 2 ? 'text-[16px] font-semibold' : 'text-[15px] font-semibold';
      blocks.push(<p key={k} className={cls}>{renderInline(h[2], `h${k}`)}</p>); k++; i++; continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
      blocks.push(<ul key={k} className="list-disc pl-5 space-y-1">{items.map((it, j) => <li key={j}>{renderInline(it, `u${k}_${j}`)}</li>)}</ul>); k++; continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      blocks.push(<ol key={k} className="list-decimal pl-5 space-y-1">{items.map((it, j) => <li key={j}>{renderInline(it, `o${k}_${j}`)}</li>)}</ol>); k++; continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !special(lines[i])) { para.push(lines[i]); i++; }
    blocks.push(<p key={k}>{renderInline(para.join(' '), `p${k}`)}</p>); k++;
  }
  return <div className="space-y-2.5">{blocks}</div>;
};

interface Convo { id: string; title: string; msgs: ChatMsg[]; }

const MODELS = [
  { id: 'haiku', name: 'DevTracker PM', desc: 'Fast — great for planning' },
  { id: 'sonnet', name: 'DevTracker PM Max', desc: 'Smarter — deeper reasoning' },
] as const;

export const AIChatView: React.FC<{
  tasks: Task[];
  onAction: (a: AIAction) => void;
  onBack: () => void;
  previewSeed?: ChatMsg[]; // dev-only: pre-populate the thread for screenshots
}> = ({ tasks, onAction, onBack, previewSeed }) => {
  const titleFrom = (ms: ChatMsg[]) => ms.find(m => m.role === 'user')?.text.slice(0, 38) || 'New chat';

  // ── Conversations (threads) — makes New chat + history fully functional ──
  const [convos, setConvos] = useState<Convo[]>(() =>
    previewSeed && previewSeed.length
      ? [{ id: 'seed', title: titleFrom(previewSeed), msgs: previewSeed }]
      : [{ id: 'c0', title: 'New chat', msgs: [] }]
  );
  const [activeId, setActiveId] = useState<string>(previewSeed?.length ? 'seed' : 'c0');

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [model, setModel] = useState<'haiku' | 'sonnet'>('haiku');
  const [menu, setMenu] = useState<null | 'model' | 'plus' | 'tools' | 'account'>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [listening, setListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);

  const active = convos.find(c => c.id === activeId) ?? convos[0];
  const msgs = active.msgs;
  const isEmpty = msgs.length === 0;

  const SUGGESTIONS = [
    'Plan 4 tasks for a login system',
    'What are my blockers right now?',
    'Show me high priority work',
    'Draft this sprint for me',
  ];
  const TOOLS = [
    { label: 'Plan a sprint', prompt: 'Draft a focused sprint plan for this project with 3-5 tasks.' },
    { label: 'Find blockers', prompt: 'Analyze my tasks and list the current blockers and risks.' },
    { label: 'Daily standup', prompt: 'Write a daily standup summary for me (Yesterday / Today / Blockers).' },
    { label: 'Prioritize backlog', prompt: 'Look at my backlog and tell me the 3 highest-impact things to do next.' },
  ];

  // Update only the active conversation's messages (keeps send() unchanged).
  const setMsgs = (updater: ChatMsg[] | ((p: ChatMsg[]) => ChatMsg[])) => {
    setConvos(prev => prev.map(c => {
      if (c.id !== activeId) return c;
      const next = typeof updater === 'function' ? (updater as (p: ChatMsg[]) => ChatMsg[])(c.msgs) : updater;
      return { ...c, msgs: next, title: titleFrom(next) };
    }));
  };

  // Grow the textarea with its content, then snap back when empty.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || thinking) return;
    // Snapshot the conversation BEFORE this turn so the PM has memory.
    const history = msgs
      .filter(m => m.role === 'user' || m.role === 'ai' || m.role === 'action')
      .slice(-10)
      .map(m => ({ role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', text: m.text }));
    setInput('');
    setMenu(null);
    setMsgs(p => [...p, { id: `u${Date.now()}`, role: 'user', text: msg }]);
    setMsgs(p => [...p, { id: 'thinking', role: 'thinking', text: '' }]);
    setThinking(true);
    try {
      const action = await processUserMessage(msg, tasks, model, history);
      setMsgs(p => p.filter(m => m.role !== 'thinking'));
      if (action.intent === 'CREATE_TASKS') {
        setMsgs(p => [...p, { id: `a${Date.now()}`, role: 'action', text: action.summary || 'Here are the tasks I put together.', action }]);
      } else {
        setMsgs(p => [...p, { id: `ai${Date.now()}`, role: 'ai', text: action.summary || 'Done.' }]);
        if (action.intent !== 'NONE') onAction(action);
      }
    } catch {
      setMsgs(p => p.filter(m => m.role !== 'thinking'));
      setMsgs(p => [...p, { id: `err${Date.now()}`, role: 'ai', text: 'I hit a connection error. Make sure the local AI server is running (npm run ai-server).' }]);
    } finally { setThinking(false); }
    setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);
  };

  // ── Button actions ──────────────────────────────────────────────────────
  const newChat = () => {
    const id = `c${Date.now()}`;
    setConvos(prev => [{ id, title: 'New chat', msgs: [] }, ...prev]);
    setActiveId(id);
    setInput('');
    setMenu(null);
    setTimeout(() => taRef.current?.focus(), 0);
  };
  const openConvo = (id: string) => { setActiveId(id); setSearchOpen(false); setSearch(''); };
  const clearAll = () => { setConvos([{ id: 'c0', title: 'New chat', msgs: [] }]); setActiveId('c0'); setMenu(null); };

  const copyMsg = (m: ChatMsg) => {
    navigator.clipboard?.writeText(m.text).catch(() => {});
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 1500);
  };
  const regenerate = (id: string) => {
    const idx = msgs.findIndex(m => m.id === id);
    if (idx < 0) return;
    let u = -1;
    for (let i = idx - 1; i >= 0; i--) { if (msgs[i].role === 'user') { u = i; break; } }
    if (u < 0) return;
    const text = msgs[u].text;
    setMsgs(p => p.slice(0, u)); // drop old user turn + its answer, then re-ask
    send(text);
  };
  const editUser = (text: string) => { setInput(text); taRef.current?.focus(); };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setInput(prev => (prev ? prev + ' ' : '') + `[attached: ${f.name}]`);
    setMenu(null);
    e.target.value = '';
  };

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice dictation is not supported in this browser.'); return; }
    if (listening) { recogRef.current?.stop(); return; }
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => setInput(Array.from(e.results).map((x: any) => x[0].transcript).join(''));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    r.start();
    setListening(true);
  };

  const visibleConvos = convos
    .filter(c => c.msgs.length > 0)
    .filter(c => c.title.toLowerCase().includes(search.trim().toLowerCase()));

  // Small inline icon button for message hover actions.
  const IconBtn: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({ title, onClick, children }) => (
    <button type="button" title={title} onClick={onClick}
      className="w-7 h-7 rounded-md flex items-center justify-center text-[#b4b4b4] hover:bg-white/10 hover:text-white transition-colors">
      {children}
    </button>
  );

  // The rounded composer — textarea on top, a functional toolbar row beneath.
  const canSend = !!input.trim() && !thinking;
  const composer = (
    <div className="bg-[#303030] rounded-[28px] px-2.5 pt-3 pb-2 shadow-[0_2px_14px_rgba(0,0,0,0.35)]">
      <input ref={fileRef} type="file" className="hidden" onChange={onPickFile} />
      <textarea
        ref={taRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder="Message your project manager"
        rows={1}
        disabled={thinking}
        className="w-full resize-none bg-transparent text-[16px] text-[#ececec] placeholder-[#8e8e8e] outline-none leading-6 px-2.5 mb-1"
        style={{ maxHeight: 200 }}
      />
      <div className="flex items-center gap-1.5">
        {/* + menu */}
        <div className="relative">
          <button type="button" title="Add" onClick={() => setMenu(menu === 'plus' ? null : 'plus')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#ececec] hover:bg-white/10 transition-colors">
            <Plus size={20} />
          </button>
          {menu === 'plus' && (
            <div className="absolute bottom-full mb-2 left-0 z-50 w-56 bg-[#2a2a2a] border border-white/10 rounded-2xl p-1.5 shadow-xl">
              <button onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">
                <Paperclip size={16} /> Attach a file
              </button>
            </div>
          )}
        </div>
        {/* Tools menu */}
        <div className="relative">
          <button type="button" onClick={() => setMenu(menu === 'tools' ? null : 'tools')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full text-[14px] text-[#ececec] hover:bg-white/10 transition-colors">
            <SlidersHorizontal size={17} /> Tools
          </button>
          {menu === 'tools' && (
            <div className="absolute bottom-full mb-2 left-0 z-50 w-60 bg-[#2a2a2a] border border-white/10 rounded-2xl p-1.5 shadow-xl">
              {TOOLS.map(t => (
                <button key={t.label} onClick={() => send(t.prompt)} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" title="Dictate" onClick={toggleMic}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: listening ? '#ef4444' : 'transparent', color: listening ? '#fff' : '#ececec' }}>
            <Mic size={19} className={listening ? 'animate-pulse' : ''} />
          </button>
          <button onClick={() => send()} disabled={!canSend} title="Send"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: canSend ? '#ffffff' : '#676767' }}>
            <ArrowUp size={20} style={{ color: canSend ? '#000' : '#2f2f2f' }} />
          </button>
        </div>
      </div>
    </div>
  );

  // One conversation row, with copy / regenerate / edit on hover.
  const renderMsg = (m: ChatMsg) => {
    if (m.role === 'user') {
      return (
        <div key={m.id} className="group flex flex-col items-end">
          <div className="max-w-[80%] bg-[#303030] text-[#ececec] rounded-3xl px-5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
            {m.text}
          </div>
          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconBtn title="Copy" onClick={() => copyMsg(m)}>{copiedId === m.id ? <Check size={15} /> : <Copy size={15} />}</IconBtn>
            <IconBtn title="Edit" onClick={() => editUser(m.text)}><Pencil size={15} /></IconBtn>
          </div>
        </div>
      );
    }
    if (m.role === 'ai') {
      return (
        <div key={m.id} className="group">
          <div className="text-[15px] leading-7 text-[#ececec]"><Markdown text={m.text} /></div>
          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconBtn title="Copy" onClick={() => copyMsg(m)}>{copiedId === m.id ? <Check size={15} /> : <Copy size={15} />}</IconBtn>
            <IconBtn title="Regenerate" onClick={() => regenerate(m.id)}><RefreshCw size={15} /></IconBtn>
          </div>
        </div>
      );
    }
    if (m.role === 'thinking') {
      return (
        <div key={m.id} className="flex items-center">
          <motion.span className="w-3.5 h-3.5 rounded-full bg-[#ececec]"
            animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.1, repeat: Infinity }} />
        </div>
      );
    }
    if (m.role === 'action' && m.action) {
      const taskList = m.action.payload?.tasks as any[] | undefined;
      return (
        <div key={m.id} className="group space-y-3">
          <div className="text-[15px] leading-7 text-[#ececec]"><Markdown text={m.text} /></div>
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#2a2a2a] max-w-xl">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <ClipboardList size={14} className="text-gray-400" /> Proposed tasks
            </div>
            <div className="p-2 space-y-1">
              {(taskList || []).map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.04]">
                  <span className="text-[11px] font-bold w-4 text-center text-gray-500">{i + 1}</span>
                  <span className="flex-1 text-sm text-[#ececec] truncate">{t.title}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.priority === 'High' ? 'text-red-300 bg-red-500/15' : t.priority === 'Medium' ? 'text-amber-300 bg-amber-500/15' : 'text-gray-300 bg-white/10'}`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
            {!m.confirmed ? (
              <div className="flex gap-2 px-3 py-3 border-t border-white/10">
                <button onClick={() => { onAction(m.action!); setMsgs(p => p.map(x => x.id === m.id ? { ...x, confirmed: true } : x)); }}
                  className="flex-1 py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-gray-200 transition-colors">
                  Add to board
                </button>
                <button onClick={() => setMsgs(p => p.filter(x => x.id !== m.id))}
                  className="px-4 py-2 rounded-full text-sm font-medium text-gray-300 border border-white/15 hover:bg-white/10 transition-colors">
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-emerald-400 border-t border-white/10">
                <CheckCircle2 size={15} /> Added to your board.
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconBtn title="Copy" onClick={() => copyMsg(m)}>{copiedId === m.id ? <Check size={15} /> : <Copy size={15} />}</IconBtn>
            <IconBtn title="Regenerate" onClick={() => regenerate(m.id)}><RefreshCw size={15} /></IconBtn>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full bg-[#212121] rounded-3xl overflow-hidden text-[#ececec]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Click-away layer for any open dropdown */}
      {menu && <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-[#171717]">
          <div className="flex items-center justify-between px-3 h-12">
            <button onClick={() => setSidebarOpen(false)} title="Close sidebar" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <PanelLeft size={20} />
            </button>
            <button onClick={newChat} title="New chat" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <SquarePen size={19} />
            </button>
          </div>

          <div className="px-2 space-y-0.5">
            <button onClick={newChat} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[14px] hover:bg-white/10 transition-colors">
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center"><SquarePen size={14} className="text-black" /></span>
              New chat
            </button>
            {!searchOpen ? (
              <button onClick={() => setSearchOpen(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[14px] hover:bg-white/10 transition-colors">
                <span className="w-6 h-6 flex items-center justify-center"><Search size={16} /></span>
                Search chats
              </button>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5">
                <Search size={16} className="text-[#8e8e8e]" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats"
                  className="flex-1 bg-transparent text-sm outline-none placeholder-[#8e8e8e]" />
                <button onClick={() => { setSearchOpen(false); setSearch(''); }}><X size={15} className="text-[#8e8e8e] hover:text-white" /></button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-3 px-2 min-h-0" style={{ scrollbarWidth: 'none' }}>
            <p className="px-2.5 py-2 text-xs font-medium text-[#8e8e8e]">Chats</p>
            {visibleConvos.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-[#6b6b6b]">{search ? 'No matches.' : 'No chats yet.'}</p>
            )}
            {visibleConvos.map(c => (
              <button key={c.id} onClick={() => openConvo(c.id)}
                className={`group w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[14px] transition-colors text-left ${c.id === activeId ? 'bg-white/10' : 'hover:bg-white/10'}`}>
                <span className="flex-1 truncate">{c.title}</span>
                <MoreHorizontal size={16} className="opacity-0 group-hover:opacity-60 shrink-0" />
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-white/5">
            <button onClick={onBack} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-black text-[11px] font-bold">You</span>
              <div className="text-left leading-tight">
                <p className="text-[14px]">You</p>
                <p className="text-xs text-[#8e8e8e]">Claude Code · Free</p>
              </div>
            </button>
          </div>
        </aside>
      )}

      {/* ── Main column ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-1 px-3 h-12 shrink-0">
          {!sidebarOpen && (
            <>
              <button onClick={() => setSidebarOpen(true)} title="Open sidebar" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                <PanelLeft size={20} />
              </button>
              <button onClick={newChat} title="New chat" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                <SquarePen size={19} />
              </button>
            </>
          )}
          {/* Model switcher */}
          <div className="relative">
            <button onClick={() => setMenu(menu === 'model' ? null : 'model')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-semibold text-[18px]">
              {MODELS.find(x => x.id === model)?.name} <ChevronDown size={17} className="text-[#8e8e8e]" />
            </button>
            {menu === 'model' && (
              <div className="absolute top-full mt-1 left-0 z-50 w-64 bg-[#2a2a2a] border border-white/10 rounded-2xl p-1.5 shadow-xl">
                {MODELS.map(mo => (
                  <button key={mo.id} onClick={() => { setModel(mo.id); setMenu(null); }}
                    className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{mo.name}</p>
                      <p className="text-xs text-[#8e8e8e]">{mo.desc}</p>
                    </div>
                    {model === mo.id && <Check size={16} className="mt-0.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Account menu */}
          <div className="relative ml-auto">
            <button onClick={() => setMenu(menu === 'account' ? null : 'account')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-black text-xs font-bold">
              You
            </button>
            {menu === 'account' && (
              <div className="absolute top-full mt-1 right-0 z-50 w-56 bg-[#2a2a2a] border border-white/10 rounded-2xl p-1.5 shadow-xl">
                <button onClick={() => { setMenu(null); onBack(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">
                  <LogOut size={16} /> Back to AI hub
                </button>
                <button onClick={clearAll} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-white/10 transition-colors">
                  <Trash2 size={16} /> Clear conversations
                </button>
              </div>
            )}
          </div>
        </div>

        {isEmpty ? (
          // ── Hero / empty state ────────────────────────────────────────────
          <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-8">
            <PmLogo size={40} />
            <h1 className="text-[28px] sm:text-[32px] font-semibold mt-4 mb-7 text-center">
              What can I help you ship?
            </h1>
            <div className="w-full max-w-3xl">{composer}</div>
            <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-2xl">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="px-4 py-2 rounded-full text-sm text-[#ececec] border border-white/15 hover:bg-white/5 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // ── Active conversation ───────────────────────────────────────────
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'none' }}>
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {msgs.map(renderMsg)}
              </div>
            </div>
            <div className="shrink-0 pb-2 px-4">
              <div className="max-w-3xl mx-auto">{composer}</div>
              <p className="text-center text-[11px] text-[#8e8e8e] mt-2">
                Powered by Claude Code · review tasks before adding them to your board.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
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
