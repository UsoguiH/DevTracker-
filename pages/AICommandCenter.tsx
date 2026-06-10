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
import ClaudeLogo from '../components/ClaudeLogo';

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
  @keyframes claude-think { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(0.8) rotate(20deg); } }
  @keyframes claude-shimmer { 0% { background-position: 150% 0; } 100% { background-position: -50% 0; } }
  .claude-thinking-star { animation: claude-think 1.4s ease-in-out infinite; transform-origin: center; }
  .claude-shimmer-text {
    background: linear-gradient(90deg, #9C998D 0%, #9C998D 35%, #29261B 50%, #9C998D 65%, #9C998D 100%);
    background-size: 200% 100%;
    -webkit-background-clip: text; background-clip: text; color: transparent;
    animation: claude-shimmer 2s linear infinite;
  }
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

// ── DevTracker AI Chat — styled to feel exactly like Claude.ai ────────────────
// Full-screen ivory canvas (#FAF9F5), warm beige sidebar with Recents, serif
// assistant prose (Tiempos-style), beige user bubbles on the right, and the
// rounded white composer with +, Tools, a model picker and a terracotta
// square send button. Empty state is the Claude "hero": the starburst with a
// serif greeting and the composer beneath it.

// Claude.ai light palette (shared with the Space copilot dock).
const CL = {
  bg: '#FAF9F5',
  sidebar: '#F2F0E8',
  surface: '#FFFFFF',
  bubble: '#F0EEE5',
  hover: '#EBE8DE',
  hairline: '#E8E6DC',
  hairlineStrong: '#DAD7CB',
  ink: '#29261B',
  body: '#52504A',
  muted: '#73716C',
  faint: '#9C998D',
  terracotta: '#D97757',
  send: '#C96442',
  sendHover: '#B85B3D',
};

const CL_SERIF = '"Source Serif 4", "Tiempos Text", Georgia, serif';

// ── Tiny Markdown renderer (bold, italic, inline code, bullet/numbered lists,
// headings) so the PM's replies render like ChatGPT without a heavy dependency.
const renderInline = (text: string, kp: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={`${kp}b${i}`} className="font-semibold">{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<code key={`${kp}c${i}`} className="px-1.5 py-0.5 rounded bg-[#29261B]/[0.06] text-[13px] font-mono text-[#B3500F]">{m[3]}</code>);
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
  { id: 'haiku', name: 'Claude Haiku 4.5', desc: 'Fastest for daily planning' },
  { id: 'sonnet', name: 'Claude Sonnet 4.6', desc: 'Smartest for complex work' },
] as const;

export const AIChatView: React.FC<{
  tasks: Task[];
  onAction: (a: AIAction) => void;
  onBack: () => void;
  previewSeed?: ChatMsg[]; // dev-only: pre-populate the thread for screenshots
  storageKey?: string;     // persist conversations to localStorage under this key
}> = ({ tasks, onAction, onBack, previewSeed, storageKey }) => {
  const titleFrom = (ms: ChatMsg[]) => ms.find(m => m.role === 'user')?.text.slice(0, 38) || 'New chat';

  // ── Conversations (threads) — persisted so Recents survive reloads ──────
  const initialRef = useRef<Convo[] | null>(null);
  if (initialRef.current === null) {
    if (previewSeed && previewSeed.length) {
      initialRef.current = [{ id: 'seed', title: titleFrom(previewSeed), msgs: previewSeed }];
    } else {
      let saved: Convo[] | null = null;
      if (storageKey) {
        try {
          const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null');
          if (Array.isArray(parsed) && parsed.length && parsed.every(c => c && typeof c.id === 'string' && Array.isArray(c.msgs))) {
            saved = parsed;
          }
        } catch { /* corrupted storage — start fresh */ }
      }
      initialRef.current = saved ?? [{ id: 'c0', title: 'New chat', msgs: [] }];
    }
  }
  const [convos, setConvos] = useState<Convo[]>(initialRef.current);
  const [activeId, setActiveId] = useState<string>(initialRef.current[0].id);

  // Save on every change (drop transient "thinking" rows, keep the last 30 chats).
  useEffect(() => {
    if (!storageKey || previewSeed) return;
    try {
      const toSave = convos
        .map(c => ({ ...c, msgs: c.msgs.filter(m => m.role !== 'thinking') }))
        .slice(0, 30);
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch { /* storage full/unavailable — chat still works, just not persisted */ }
  }, [convos, storageKey, previewSeed]);

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
      className="w-7 h-7 rounded-md flex items-center justify-center text-[#73716C] hover:bg-[#29261B]/[0.06] hover:text-[#29261B] transition-colors">
      {children}
    </button>
  );

  // The Claude.ai composer — white card, textarea on top, +/Tools and the
  // model picker + terracotta square send button beneath.
  const canSend = !!input.trim() && !thinking;
  const composer = (
    <div className="rounded-2xl"
      style={{ background: CL.surface, border: `1px solid ${CL.hairlineStrong}`, boxShadow: '0 4px 24px -12px rgba(41,38,27,0.18)' }}>
      <input ref={fileRef} type="file" className="hidden" onChange={onPickFile} />
      <textarea
        ref={taRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder={isEmpty ? 'How can I help you today?' : 'Reply to Claude…'}
        rows={1}
        disabled={thinking}
        className="w-full resize-none bg-transparent text-[15px] outline-none leading-6 px-4 pt-3.5 pb-1 placeholder:text-[#A6A39A]"
        style={{ maxHeight: 200, color: CL.ink }}
      />
      <div className="flex items-center gap-1 px-2.5 pb-2.5 pt-1">
        {/* + menu */}
        <div className="relative">
          <button type="button" title="Add" onClick={() => setMenu(menu === 'plus' ? null : 'plus')}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F5F4EE]"
            style={{ border: `1px solid ${CL.hairline}`, color: CL.muted }}>
            <Plus size={15} />
          </button>
          {menu === 'plus' && (
            <div className="absolute bottom-full mb-2 left-0 z-50 w-56 rounded-xl p-1.5"
              style={{ background: CL.surface, border: `1px solid ${CL.hairline}`, boxShadow: '0 12px 32px -8px rgba(41,38,27,0.18)' }}>
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[#F5F4EE] transition-colors" style={{ color: CL.body }}>
                <Paperclip size={15} /> Attach a file
              </button>
            </div>
          )}
        </div>
        {/* Tools menu */}
        <div className="relative">
          <button type="button" onClick={() => setMenu(menu === 'tools' ? null : 'tools')}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] transition-colors hover:bg-[#F5F4EE]"
            style={{ border: `1px solid ${CL.hairline}`, color: CL.muted }}>
            <SlidersHorizontal size={14} /> Tools
          </button>
          {menu === 'tools' && (
            <div className="absolute bottom-full mb-2 left-0 z-50 w-60 rounded-xl p-1.5"
              style={{ background: CL.surface, border: `1px solid ${CL.hairline}`, boxShadow: '0 12px 32px -8px rgba(41,38,27,0.18)' }}>
              {TOOLS.map(t => (
                <button key={t.label} onClick={() => send(t.prompt)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[#F5F4EE] transition-colors" style={{ color: CL.body }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" title="Dictate" onClick={toggleMic}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F5F4EE]"
            style={{ background: listening ? '#ef4444' : 'transparent', color: listening ? '#fff' : CL.muted }}>
            <Mic size={15} className={listening ? 'animate-pulse' : ''} />
          </button>
          {/* Model picker — lives in the composer like Claude.ai */}
          <div className="relative">
            <button onClick={() => setMenu(menu === 'model' ? null : 'model')}
              className="flex items-center gap-1 px-2 h-8 rounded-lg text-[12.5px] transition-colors hover:bg-[#F5F4EE]" style={{ color: CL.faint }}>
              {MODELS.find(x => x.id === model)?.name} <ChevronDown size={12} />
            </button>
            {menu === 'model' && (
              <div className="absolute bottom-full mb-2 right-0 z-50 w-64 rounded-xl p-1.5"
                style={{ background: CL.surface, border: `1px solid ${CL.hairline}`, boxShadow: '0 12px 32px -8px rgba(41,38,27,0.18)' }}>
                {MODELS.map(mo => (
                  <button key={mo.id} onClick={() => { setModel(mo.id); setMenu(null); }}
                    className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-[#F5F4EE] transition-colors text-left">
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: CL.ink }}>{mo.name}</p>
                      <p className="text-xs" style={{ color: CL.faint }}>{mo.desc}</p>
                    </div>
                    {model === mo.id && <Check size={15} className="mt-0.5" style={{ color: CL.terracotta }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => send()} disabled={!canSend} title="Send"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={canSend ? { background: CL.send, color: '#fff' } : { background: '#E8E5DB', color: '#B3B0A4', cursor: 'not-allowed' }}
            onMouseEnter={e => { if (canSend) e.currentTarget.style.background = CL.sendHover; }}
            onMouseLeave={e => { if (canSend) e.currentTarget.style.background = CL.send; }}>
            <ArrowUp size={15} strokeWidth={2.5} />
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
          <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap"
            style={{ background: CL.bubble, color: CL.ink }}>
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
          <div className="text-[16px]" style={{ fontFamily: CL_SERIF, color: CL.ink, lineHeight: 1.65 }}><Markdown text={m.text} /></div>
          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconBtn title="Copy" onClick={() => copyMsg(m)}>{copiedId === m.id ? <Check size={15} /> : <Copy size={15} />}</IconBtn>
            <IconBtn title="Regenerate" onClick={() => regenerate(m.id)}><RefreshCw size={15} /></IconBtn>
          </div>
        </div>
      );
    }
    if (m.role === 'thinking') {
      return (
        <div key={m.id} className="flex items-center gap-2.5">
          <ClaudeLogo size={15} className="claude-thinking-star shrink-0" style={{ color: CL.terracotta }} />
          <span className="claude-shimmer-text text-[13px] font-medium">Thinking…</span>
        </div>
      );
    }
    if (m.role === 'action' && m.action) {
      const taskList = m.action.payload?.tasks as any[] | undefined;
      return (
        <div key={m.id} className="group space-y-3">
          <div className="text-[16px]" style={{ fontFamily: CL_SERIF, color: CL.ink, lineHeight: 1.65 }}><Markdown text={m.text} /></div>
          <div className="rounded-xl overflow-hidden max-w-xl" style={{ background: CL.surface, border: `1px solid ${CL.hairline}` }}>
            <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{ borderBottom: `1px solid ${CL.hairline}`, color: CL.muted }}>
              <ClaudeLogo size={12} style={{ color: CL.terracotta }} /> Proposed tasks
            </div>
            <div className="p-2 space-y-1">
              {(taskList || []).map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#F5F4EE]">
                  <span className="text-[11px] font-bold w-4 text-center" style={{ color: CL.faint }}>{i + 1}</span>
                  <span className="flex-1 text-sm truncate" style={{ color: CL.ink }}>{t.title}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.priority === 'High' ? 'text-[#B3500F] bg-[#D97757]/15' : t.priority === 'Medium' ? 'text-amber-700 bg-amber-500/15' : 'text-[#73716C] bg-[#29261B]/[0.06]'}`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
            {!m.confirmed ? (
              <div className="flex gap-2 px-3 py-3" style={{ borderTop: `1px solid ${CL.hairline}` }}>
                <button onClick={() => { onAction(m.action!); setMsgs(p => p.map(x => x.id === m.id ? { ...x, confirmed: true } : x)); }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ background: CL.send }}
                  onMouseEnter={e => { e.currentTarget.style.background = CL.sendHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = CL.send; }}>
                  Add to board
                </button>
                <button onClick={() => setMsgs(p => p.filter(x => x.id !== m.id))}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F0EEE5]"
                  style={{ color: CL.body, border: `1px solid ${CL.hairlineStrong}` }}>
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#618A5C]" style={{ borderTop: `1px solid ${CL.hairline}` }}>
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
    <div className="flex h-full w-full overflow-hidden" style={{ background: CL.bg, color: CL.ink, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes claude-think { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(0.8) rotate(20deg); } }
        @keyframes claude-shimmer { 0% { background-position: 150% 0; } 100% { background-position: -50% 0; } }
        .claude-thinking-star { animation: claude-think 1.4s ease-in-out infinite; transform-origin: center; }
        .claude-shimmer-text {
          background: linear-gradient(90deg, #9C998D 0%, #9C998D 35%, #29261B 50%, #9C998D 65%, #9C998D 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: claude-shimmer 2s linear infinite;
        }
      `}</style>
      {/* Click-away layer for any open dropdown */}
      {menu && <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside className="hidden md:flex w-[268px] shrink-0 flex-col" style={{ background: CL.sidebar, borderRight: `1px solid ${CL.hairline}` }}>
          <div className="flex items-center justify-between pl-4 pr-2 h-12">
            <button onClick={onBack} title="Back to AI hub" className="flex items-center gap-2">
              <ClaudeLogo size={16} style={{ color: CL.terracotta }} />
              <span className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: CL.ink }}>Claude</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} title="Close sidebar"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#29261B]/[0.06] transition-colors" style={{ color: CL.muted }}>
              <PanelLeft size={17} />
            </button>
          </div>

          <div className="px-2 space-y-0.5 mt-1">
            <button onClick={newChat} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[14px] font-medium transition-colors hover:bg-[#EBE8DE]"
              style={{ color: CL.send }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: CL.terracotta }}>
                <Plus size={14} strokeWidth={2.5} />
              </span>
              New chat
            </button>
            {!searchOpen ? (
              <button onClick={() => setSearchOpen(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[14px] transition-colors hover:bg-[#EBE8DE]"
                style={{ color: CL.body }}>
                <span className="w-6 h-6 flex items-center justify-center"><Search size={15} /></span>
                Search chats
              </button>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: '#EBE8DE' }}>
                <Search size={15} style={{ color: CL.faint }} />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A6A39A]" style={{ color: CL.ink }} />
                <button onClick={() => { setSearchOpen(false); setSearch(''); }}><X size={14} style={{ color: CL.faint }} /></button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-4 px-2 min-h-0" style={{ scrollbarWidth: 'none' }}>
            <p className="px-2.5 py-1.5 text-xs font-medium" style={{ color: CL.faint }}>Recents</p>
            {visibleConvos.length === 0 && (
              <p className="px-2.5 py-1.5 text-xs" style={{ color: CL.faint }}>{search ? 'No matches.' : 'No chats yet.'}</p>
            )}
            {visibleConvos.map(c => (
              <button key={c.id} onClick={() => openConvo(c.id)}
                className={`group w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13.5px] transition-colors text-left ${c.id === activeId ? 'bg-[#EBE8DE]' : 'hover:bg-[#EBE8DE]'}`}
                style={{ color: CL.body }}>
                <span className="flex-1 truncate">{c.title}</span>
                <MoreHorizontal size={15} className="opacity-0 group-hover:opacity-50 shrink-0" />
              </button>
            ))}
          </div>

          <div className="p-2" style={{ borderTop: `1px solid ${CL.hairline}` }}>
            <button onClick={onBack} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#EBE8DE] transition-colors">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: CL.ink }}>Y</span>
              <div className="text-left leading-tight">
                <p className="text-[13.5px]" style={{ color: CL.ink }}>You</p>
                <p className="text-xs" style={{ color: CL.faint }}>Claude Code · Free plan</p>
              </div>
            </button>
          </div>
        </aside>
      )}

      {/* ── Main column ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="relative z-10 flex items-center gap-1 px-3 h-12 shrink-0">
          {!sidebarOpen && (
            <>
              <button onClick={() => setSidebarOpen(true)} title="Open sidebar"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#29261B]/[0.06] transition-colors" style={{ color: CL.muted }}>
                <PanelLeft size={17} />
              </button>
              <button onClick={newChat} title="New chat"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#29261B]/[0.06] transition-colors" style={{ color: CL.muted }}>
                <SquarePen size={16} />
              </button>
            </>
          )}
          {!isEmpty && (
            <span className="px-2 text-[14px] font-medium truncate" style={{ color: CL.ink }}>{active.title}</span>
          )}
          {/* Account menu */}
          <div className="relative ml-auto">
            <button onClick={() => setMenu(menu === 'account' ? null : 'account')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: CL.ink }}>
              Y
            </button>
            {menu === 'account' && (
              <div className="absolute top-full mt-1 right-0 z-50 w-56 rounded-xl p-1.5"
                style={{ background: CL.surface, border: `1px solid ${CL.hairline}`, boxShadow: '0 12px 32px -8px rgba(41,38,27,0.18)' }}>
                <button onClick={() => { setMenu(null); onBack(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[#F5F4EE] transition-colors" style={{ color: CL.body }}>
                  <LogOut size={15} /> Back to AI hub
                </button>
                <button onClick={clearAll}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#C2410C] hover:bg-[#F5F4EE] transition-colors">
                  <Trash2 size={15} /> Clear conversations
                </button>
              </div>
            )}
          </div>
        </div>

        {isEmpty ? (
          // ── Hero / empty state — the Claude.ai greeting ───────────────────
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
            <h1 className="text-[28px] sm:text-[32px] text-center mb-8" style={{ fontFamily: CL_SERIF, fontWeight: 400, color: CL.ink, letterSpacing: '-0.015em' }}>
              <ClaudeLogo size={30} className="inline-block mr-3.5 align-[-4px]" style={{ color: CL.terracotta }} />
              What can I help you ship?
            </h1>
            <div className="w-full max-w-2xl">{composer}</div>
            <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="px-4 py-2 rounded-xl text-[13px] transition-colors hover:bg-[#F5F4EE]"
                  style={{ background: CL.surface, border: `1px solid ${CL.hairline}`, color: CL.body }}>
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
            <div className="shrink-0 px-4">
              <div className="max-w-3xl mx-auto">{composer}</div>
              <p className="text-center text-[11px] py-2" style={{ color: CL.faint }}>
                Claude can make mistakes. Please double-check responses.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Claude-styled scaffolding shared by the tool views ──────────────────────

// Full-height ivory page with a sticky Claude top bar and a centered column.
const ClaudeShell: React.FC<{ title: string; onBack: () => void; children: React.ReactNode }> = ({ title, onBack, children }) => (
  <div className="min-h-full" style={{ background: CL.bg, color: CL.ink, fontFamily: 'Inter, sans-serif' }}>
    <div className="sticky top-0 z-20 flex items-center gap-1.5 px-3 h-12"
      style={{ background: 'rgba(250,249,245,0.92)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${CL.hairline}` }}>
      <button onClick={onBack}
        className="flex items-center gap-1 pl-1.5 pr-2.5 h-8 rounded-lg text-[13px] transition-colors hover:bg-[#29261B]/[0.05]"
        style={{ color: CL.muted }}>
        <ChevronLeft size={15} /> AI hub
      </button>
      <ClaudeLogo size={13} style={{ color: CL.terracotta }} />
      <span className="text-[13.5px] font-medium" style={{ color: CL.ink }}>{title}</span>
    </div>
    <div className="max-w-2xl mx-auto px-6 pt-10 pb-16">{children}</div>
  </div>
);

const ClaudeThinking: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-2.5 py-1">
    <ClaudeLogo size={15} className="claude-thinking-star shrink-0" style={{ color: CL.terracotta }} />
    <span className="claude-shimmer-text text-[13px] font-medium">{label}</span>
  </div>
);

const ClaudeButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled}
    className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
    style={{ background: CL.send }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = CL.sendHover; }}
    onMouseLeave={e => { e.currentTarget.style.background = CL.send; }}>
    {children}
  </button>
);

// Small ghost icon button for card headers (copy / regenerate).
const GhostIconBtn: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({ title, onClick, children }) => (
  <button type="button" title={title} onClick={onClick}
    className="w-7 h-7 rounded-md flex items-center justify-center text-[#73716C] hover:bg-[#29261B]/[0.06] hover:text-[#29261B] transition-colors">
    {children}
  </button>
);

const prioChip = (p?: string) =>
  p === 'High' ? 'text-[#B3500F] bg-[#D97757]/15'
    : p === 'Medium' ? 'text-amber-700 bg-amber-500/15'
      : 'text-[#73716C] bg-[#29261B]/[0.06]';

const serifH = (size: number): React.CSSProperties =>
  ({ fontFamily: CL_SERIF, fontWeight: 400, color: CL.ink, letterSpacing: '-0.015em', fontSize: size, lineHeight: 1.3 });

// ─── Risk Radar View ──────────────────────────────────────────────────────────

const RiskRadarView: React.FC<{ tasks: Task[]; project: Project; onBack: () => void }> = ({ tasks, project, onBack }) => {
  const data = useMemo(() => analyzeProject(tasks), [tasks]);
  const risk = riskScore(data);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState('');
  const [loadingRec, setLoadingRec] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const SEV: Record<string, { chip: string; num: string; dot: string; label: string }> = {
    high:   { chip: 'text-[#B3500F] bg-[#D97757]/15', num: '#C2410C', dot: '#C2410C', label: 'High' },
    medium: { chip: 'text-amber-700 bg-amber-500/15', num: '#B45309', dot: '#D97706', label: 'Medium' },
    clear:  { chip: 'text-[#3F6B3A] bg-[#7A9B76]/20', num: '#3F6B3A', dot: '#7A9B76', label: 'Clear' },
  };

  const getAiRecommendations = async () => {
    setLoadingRec(true);
    try {
      const detail = [
        data.stalledTasks.length ? `Stalled: ${data.stalledTasks.slice(0, 5).map(t => t.title).join('; ')}` : '',
        data.overdueTasks.length ? `Overdue: ${data.overdueTasks.slice(0, 5).map(t => t.title).join('; ')}` : '',
        data.highPriorityTodo.length ? `High-priority not started: ${data.highPriorityTodo.slice(0, 5).map(t => t.title).join('; ')}` : '',
      ].filter(Boolean).join('\n');
      const msg = `Risk analysis for ${project.name} (risk score ${risk}/100, ${data.completionRate}% of active tasks complete).\n${detail}\nGive 3 specific, actionable recommendations to reduce project risk. Keep each to one or two sentences.`;
      const action = await processUserMessage(msg, tasks);
      setAiRec(action.summary || 'No recommendations generated.');
    } catch { setAiRec('Could not reach Claude — make sure the local AI server is running (npm run ai-server).'); }
    finally { setLoadingRec(false); }
  };

  const gaugeColor = risk >= 60 ? '#C2410C' : risk >= 30 ? '#D97757' : '#7A9B76';
  const gaugeLabel = risk >= 60 ? 'High risk' : risk >= 30 ? 'Moderate' : 'Healthy';
  const GR = 30, GCIRC = 2 * Math.PI * GR;

  return (
    <ClaudeShell title="Risk Radar" onBack={onBack}>
      {/* Serif greeting + animated score ring */}
      <div className="flex items-center gap-6 mb-9">
        <div className="flex-1 min-w-0">
          <h1 style={serifH(28)} className="mb-2">
            <ClaudeLogo size={24} className="inline-block mr-3 align-[-3px]" style={{ color: CL.terracotta }} />
            How healthy is {project.name}?
          </h1>
          <p className="text-[14px]" style={{ color: CL.muted }}>
            Claude scanned {data.totalActive} active task{data.totalActive === 1 ? '' : 's'} for stalls, overdue work and unstarted priorities.
          </p>
        </div>
        <div className="relative w-[88px] h-[88px] shrink-0">
          <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
            <circle cx="36" cy="36" r={GR} fill="none" stroke="#EBE8DE" strokeWidth="6" />
            <motion.circle cx="36" cy="36" r={GR} fill="none" stroke={gaugeColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={GCIRC} initial={{ strokeDashoffset: GCIRC }} animate={{ strokeDashoffset: GCIRC * (1 - risk / 100) }}
              transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] font-semibold leading-none" style={{ color: gaugeColor }}>{risk}</span>
            <span className="text-[9.5px] font-medium mt-1" style={{ color: CL.faint }}>{gaugeLabel}</span>
          </div>
        </div>
      </div>

      {/* Risk cards */}
      <div className="space-y-2.5 mb-9">
        {risks.map((r, i) => {
          const sev = SEV[r.severity];
          const isOpen = expanded === r.id;
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-xl overflow-hidden" style={{ background: CL.surface, border: `1px solid ${CL.hairline}` }}>
              <button onClick={() => setExpanded(isOpen ? null : r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FCFBF8] transition-colors">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-[60px] text-center ${sev.chip}`}>{sev.label}</span>
                <span className="text-[14px] font-medium flex-1" style={{ color: CL.ink }}>{r.label}</span>
                <span className="text-[15px] font-semibold tabular-nums" style={{ color: sev.num }}>
                  {r.count !== null ? r.count : `${data.completionRate}%`}
                </span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} style={{ color: CL.faint }}><ChevronDown size={15} /></motion.span>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="px-4 text-[12.5px]" style={{ color: CL.muted }}>{r.desc}</div>
                    <div className="px-3 pb-3 pt-2 space-y-1.5">
                      {r.tasks.slice(0, 4).map(t => (
                        <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]"
                          style={{ background: '#F5F4EE', color: CL.ink }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sev.dot }} />
                          <span className="flex-1 truncate">{t.title}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${prioChip(t.priority)}`}>{t.priority}</span>
                        </div>
                      ))}
                      {r.tasks.length > 4 && <p className="px-3 pt-1 text-[11px]" style={{ color: CL.faint }}>+{r.tasks.length - 4} more</p>}
                      {r.tasks.length === 0 && <p className="px-3 py-1 text-[12.5px]" style={{ color: CL.faint }}>Nothing here — looking good.</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Claude's recommendations */}
      {!aiRec && !loadingRec && (
        <ClaudeButton onClick={getAiRecommendations}>
          <ClaudeLogo size={14} className="text-white" /> Ask Claude for recommendations
        </ClaudeButton>
      )}
      {loadingRec && <ClaudeThinking label="Analyzing your project…" />}
      {aiRec && !loadingRec && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl overflow-hidden" style={{ background: CL.surface, border: `1px solid ${CL.hairline}` }}>
          <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${CL.hairline}` }}>
            <ClaudeLogo size={12} style={{ color: CL.terracotta }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: CL.muted }}>Claude's recommendations</span>
            <div className="ml-auto flex items-center gap-0.5">
              <GhostIconBtn title="Copy" onClick={() => { navigator.clipboard?.writeText(aiRec).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </GhostIconBtn>
              <GhostIconBtn title="Regenerate" onClick={getAiRecommendations}><RefreshCw size={13} /></GhostIconBtn>
            </div>
          </div>
          <div className="px-4 py-3.5 text-[15px]" style={{ fontFamily: CL_SERIF, color: CL.ink, lineHeight: 1.65 }}>
            <Markdown text={aiRec} />
          </div>
        </motion.div>
      )}
    </ClaudeShell>
  );
};

// ─── Daily Briefing View ──────────────────────────────────────────────────────

const BriefingView: React.FC<{ tasks: Task[]; project: Project; user: User; onBack: () => void }> = ({ tasks, project, user, onBack }) => {
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
    } catch { setStandup('Could not reach Claude — make sure the local AI server is running (npm run ai-server).'); }
    finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard?.writeText(standup).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ClaudeShell title="Daily Briefing" onBack={onBack}>
      {/* Serif greeting, like the Claude.ai home hero */}
      <div className="mb-10">
        <h1 style={serifH(30)} className="mb-2">
          <ClaudeLogo size={26} className="inline-block mr-3 align-[-4px]" style={{ color: CL.terracotta }} />
          {greeting}, {user.name.split(' ')[0]}.
        </h1>
        <p className="text-[14px]" style={{ color: CL.muted }}>
          {project.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — here's where things stand.
        </p>
      </div>

      {/* Today's focus */}
      <section className="mb-9">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: CL.faint }}>Today's focus</p>
        <div className="space-y-2">
          {data.todaysFocus.length === 0 ? (
            <p className="text-[15px] italic" style={{ fontFamily: CL_SERIF, color: CL.muted }}>Nothing pressing — you're all caught up.</p>
          ) : data.todaysFocus.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={i === 0
                ? { background: '#FBF5F0', border: '1px solid #EBD5C8' }
                : { background: CL.surface, border: `1px solid ${CL.hairline}` }}>
              <span className="text-[12px] font-semibold w-5 text-center tabular-nums" style={{ color: i === 0 ? CL.send : CL.faint }}>{i + 1}</span>
              <span className="flex-1 text-[14px] truncate" style={{ color: CL.ink }}>{t.title}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${prioChip(t.priority)}`}>{t.priority}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sprint health */}
      <section className="mb-9">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: CL.faint }}>Sprint health</p>
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          {[
            { label: 'Done', val: data.doneCount },
            { label: 'Active', val: data.inProgressCount + data.testingCount },
            { label: 'Backlog', val: data.todoCount },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3.5" style={{ background: CL.surface, border: `1px solid ${CL.hairline}` }}>
              <p className="text-[20px] font-semibold leading-none tabular-nums" style={{ color: CL.ink }}>{s.val}</p>
              <p className="text-[11px] mt-1.5" style={{ color: CL.faint }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EBE8DE' }}>
          <motion.div className="h-full rounded-full" style={{ background: CL.terracotta }}
            initial={{ width: 0 }} animate={{ width: `${data.completionRate}%` }}
            transition={{ duration: 1, delay: 0.3, ease: [0.23, 1, 0.32, 1] }} />
        </div>
        <p className="text-[12px] mt-1.5" style={{ color: CL.muted }}>{data.completionRate}% of the sprint is complete</p>
      </section>

      {/* Standup */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: CL.faint }}>Standup</p>
        {!standup && !loading && (
          <ClaudeButton onClick={generateStandup}>
            <ClaudeLogo size={14} className="text-white" /> Have Claude write your standup
          </ClaudeButton>
        )}
        {loading && <ClaudeThinking label="Writing your standup…" />}
        {standup && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden" style={{ background: CL.surface, border: `1px solid ${CL.hairline}` }}>
            <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${CL.hairline}` }}>
              <ClaudeLogo size={12} style={{ color: CL.terracotta }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: CL.muted }}>Daily standup</span>
              <div className="ml-auto flex items-center gap-0.5">
                <GhostIconBtn title="Copy" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}</GhostIconBtn>
                <GhostIconBtn title="Regenerate" onClick={generateStandup}><RefreshCw size={13} /></GhostIconBtn>
              </div>
            </div>
            <div className="px-4 py-3.5 text-[15px] whitespace-pre-line" style={{ fontFamily: CL_SERIF, color: CL.ink, lineHeight: 1.65 }}>
              {standup}
            </div>
          </motion.div>
        )}
      </section>
    </ClaudeShell>
  );
};

// ─── Planning View ────────────────────────────────────────────────────────────

const PlanningView: React.FC<{ tasks: Task[]; project: Project; onAction: (a: AIAction) => void; onBack: () => void }> = ({ tasks, project, onAction, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AIAction | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [focus, setFocus] = useState('');
  const [error, setError] = useState('');
  const data = useMemo(() => analyzeProject(tasks), [tasks]);

  const generate = async () => {
    if (loading) return;
    setLoading(true); setPlan(null); setConfirmed(false); setError('');
    try {
      const msg = `Create a sprint plan for ${project.name}. Backlog: ${data.todoCount} To Do, ${data.inProgressCount} in progress, ${data.highPriorityTodo.length} high-priority not started.${focus.trim() ? ` The team wants this sprint to focus on: ${focus.trim()}.` : ''} Generate 3-5 focused tasks for this sprint.`;
      const action = await processUserMessage(msg, tasks);
      if (action.intent === 'CREATE_TASKS' && action.payload?.tasks?.length) setPlan(action);
      else setError('Claude did not propose any tasks — try describing the focus differently.');
    } catch { setError('Could not reach Claude — make sure the local AI server is running (npm run ai-server).'); }
    finally { setLoading(false); }
  };

  return (
    <ClaudeShell title="Sprint Planning" onBack={onBack}>
      {/* Serif greeting */}
      <div className="mb-8">
        <h1 style={serifH(28)} className="mb-2">
          <ClaudeLogo size={24} className="inline-block mr-3 align-[-3px]" style={{ color: CL.terracotta }} />
          Let's plan your sprint.
        </h1>
        <p className="text-[14px]" style={{ color: CL.muted }}>
          Claude reads the {project.name} backlog and drafts the highest-impact sprint for you to review.
        </p>
      </div>

      {/* Backlog snapshot */}
      <div className="grid grid-cols-4 gap-2.5 mb-7">
        {[
          { label: 'Backlog', val: data.todoCount },
          { label: 'Active', val: data.inProgressCount },
          { label: 'High priority', val: data.highPriorityTodo.length },
          { label: 'Done', val: data.doneCount },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3.5" style={{ background: CL.surface, border: `1px solid ${CL.hairline}` }}>
            <p className="text-[20px] font-semibold leading-none tabular-nums" style={{ color: CL.ink }}>{s.val}</p>
            <p className="text-[11px] mt-1.5" style={{ color: CL.faint }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Focus composer — steer Claude's draft */}
      <div className="flex items-center gap-2 rounded-2xl pl-4 pr-2 py-2 mb-3"
        style={{ background: CL.surface, border: `1px solid ${CL.hairlineStrong}`, boxShadow: '0 4px 24px -12px rgba(41,38,27,0.18)' }}>
        <input
          value={focus}
          onChange={e => setFocus(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') generate(); }}
          disabled={loading}
          placeholder="Anything this sprint should focus on? (optional)"
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#A6A39A]"
          style={{ color: CL.ink }}
        />
        <ClaudeButton onClick={generate} disabled={loading}>
          <ClaudeLogo size={14} className="text-white" /> Draft sprint
        </ClaudeButton>
      </div>

      {loading && <div className="mt-5"><ClaudeThinking label="Drafting your sprint…" /></div>}
      {error && !loading && <p className="mt-3 text-[13px]" style={{ color: '#C2410C' }}>{error}</p>}

      {plan && !loading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-xl overflow-hidden" style={{ background: CL.surface, border: `1px solid ${CL.hairline}` }}>
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${CL.hairline}` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <ClaudeLogo size={12} style={{ color: CL.terracotta }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: CL.muted }}>Proposed sprint</span>
            </div>
            <p className="text-[15px]" style={{ fontFamily: CL_SERIF, color: CL.ink, lineHeight: 1.55 }}>{plan.summary}</p>
          </div>
          <div className="p-2 space-y-1">
            {plan.payload?.tasks?.map((t: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#F5F4EE]">
                <span className="text-[11px] font-semibold w-4 text-center tabular-nums" style={{ color: CL.faint }}>{i + 1}</span>
                <p className="text-sm flex-1 truncate" style={{ color: CL.ink }}>{t.title}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${prioChip(t.priority)}`}>{t.priority}</span>
              </motion.div>
            ))}
          </div>
          {!confirmed ? (
            <div className="flex gap-2 px-3 py-3" style={{ borderTop: `1px solid ${CL.hairline}` }}>
              <button onClick={() => { onAction(plan); setConfirmed(true); }}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ background: CL.send }}
                onMouseEnter={e => { e.currentTarget.style.background = CL.sendHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = CL.send; }}>
                Commit sprint
              </button>
              <button onClick={generate}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F0EEE5]"
                style={{ color: CL.body, border: `1px solid ${CL.hairlineStrong}` }}>
                Regenerate
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#618A5C]" style={{ borderTop: `1px solid ${CL.hairline}` }}>
              <CheckCircle2 size={15} /> Sprint committed — tasks added to your board.
            </div>
          )}
        </motion.div>
      )}
    </ClaudeShell>
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
            <motion.div key="launcher" className="h-full overflow-y-auto p-8"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}>
              <Launcher onSelect={setView} />
            </motion.div>
          )}
          {view === 'chat' && (
            <motion.div key="chat" className="h-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <AIChatView tasks={tasks} onAction={onAIAction} onBack={() => setView('launcher')} storageKey={`devtrack-ai-chats-${project.id}`} />
            </motion.div>
          )}
          {view === 'risk' && (
            <motion.div key="risk" className="h-full overflow-y-auto" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <RiskRadarView tasks={tasks} project={project} onBack={() => setView('launcher')} />
            </motion.div>
          )}
          {view === 'planning' && (
            <motion.div key="planning" className="h-full overflow-y-auto" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <PlanningView tasks={tasks} project={project} onAction={onAIAction} onBack={() => setView('launcher')} />
            </motion.div>
          )}
          {view === 'briefing' && (
            <motion.div key="briefing" className="h-full overflow-y-auto" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <BriefingView tasks={tasks} project={project} user={user} onBack={() => setView('launcher')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default AICommandCenter;
