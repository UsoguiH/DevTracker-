import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, ArrowUp, ChevronDown, ClipboardList, GitBranch, Lightbulb, LayoutGrid, Check } from 'lucide-react';
import ClaudeLogo from './ClaudeLogo';
import { BoardData } from '../types';
import { processBoardMessage, BoardAIResult } from '../lib/boardAIService';
import { ChatTurn } from '../lib/aiService';

/**
 * Claude copilot dock for the Space canvas, styled to match Claude.ai:
 * ivory canvas, terracotta starburst, serif assistant prose, beige user
 * bubbles, "Reply to Claude…" composer with model picker + square send.
 * Claude sees the whole board on every turn and can add / move /
 * retext / remove elements — the canvas applies its mutations live.
 */

export interface BoardMsg {
    role: 'user' | 'assistant';
    text: string;
    meta?: string; // e.g. "+6 elements · 2 updated"
}

interface BoardAIPanelProps {
    isOpen: boolean;
    onClose: () => void;
    board: BoardData;
    taskTitles: string[];
    projectName: string;
    onApply: (r: BoardAIResult) => { added: number; updated: number; removed: number };
    previewSeed?: BoardMsg[]; // dev harness only
    previewBusy?: boolean;    // dev harness only
}

// ── Claude.ai light palette ───────────────────────────────────────────────────
const C = {
    bg: '#FAF9F5',          // ivory chat canvas
    surface: '#FFFFFF',
    bubble: '#F0EEE5',      // user message beige
    hairline: '#E8E6DC',
    hairlineStrong: '#DAD7CB',
    ink: '#29261B',         // warm near-black prose
    body: '#52504A',
    muted: '#73716C',
    faint: '#9C998D',
    terracotta: '#D97757',  // Claude brand starburst
    send: '#C96442',        // composer send button
    sendHover: '#B85B3D',
};

const SERIF = '"Source Serif 4", "Tiempos Text", Georgia, serif';

const QUICK_PROMPTS = [
    { icon: ClipboardList, text: 'Turn my project tasks into a planning board' },
    { icon: GitBranch, text: 'Create a flowchart for user authentication' },
    { icon: Lightbulb, text: 'Brainstorm 8 feature ideas as sticky notes' },
    { icon: LayoutGrid, text: 'Organize and tidy up my board' },
];

const THINKING_WORDS = ['Thinking', 'Pondering', 'Shaping', 'Sketching', 'Arranging'];

const BoardAIPanel: React.FC<BoardAIPanelProps> = ({ isOpen, onClose, board, taskTitles, projectName, onApply, previewSeed, previewBusy }) => {
    const [messages, setMessages] = useState<BoardMsg[]>(previewSeed ?? []);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(previewBusy ?? false);
    const [thinkingWord] = useState(() => THINKING_WORDS[Math.floor(Math.random() * THINKING_WORDS.length)]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, busy]);

    useEffect(() => {
        if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
    }, [isOpen]);

    const send = async (text: string) => {
        const message = text.trim();
        if (!message || busy) return;
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setBusy(true);
        setMessages(prev => [...prev, { role: 'user', text: message }]);

        const history: ChatTurn[] = messages.map(m => ({ role: m.role, text: m.text }));
        const result = await processBoardMessage(message, board, taskTitles, history);

        let meta: string | undefined;
        if (result.add || result.update || result.remove) {
            const { added, updated, removed } = onApply(result);
            const parts = [];
            if (added) parts.push(`+${added} element${added === 1 ? '' : 's'}`);
            if (updated) parts.push(`${updated} updated`);
            if (removed) parts.push(`${removed} removed`);
            meta = parts.join(' · ') || undefined;
        }

        setMessages(prev => [...prev, { role: 'assistant', text: result.reply || 'Done.', meta }]);
        setBusy(false);
    };

    const autoGrow = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    };

    const isEmpty = messages.length === 0 && !busy;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    data-board-ui
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute right-4 top-[68px] bottom-4 w-[400px] rounded-2xl flex flex-col overflow-hidden z-30"
                    style={{ background: C.bg, border: `1px solid ${C.hairline}`, boxShadow: '0 24px 60px -12px rgba(41,38,27,0.28), 0 4px 16px -8px rgba(41,38,27,0.1)' }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
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
                        .claude-scroll::-webkit-scrollbar { width: 8px; }
                        .claude-scroll::-webkit-scrollbar-track { background: transparent; }
                        .claude-scroll::-webkit-scrollbar-thumb { background: #DAD7CB; border-radius: 9999px; border: 2px solid #FAF9F5; }
                    `}</style>

                    {/* ── Header ─────────────────────────────────────────── */}
                    <div className="flex items-center gap-2 px-4 h-12 shrink-0" style={{ borderBottom: `1px solid ${C.hairline}` }}>
                        <ClaudeLogo size={15} className="shrink-0" style={{ color: C.terracotta }} />
                        <span className="text-[14px] font-semibold tracking-[-0.01em]" style={{ color: C.ink }}>Claude</span>
                        <span className="text-[12px] truncate" style={{ color: C.faint }}>· {projectName} canvas</span>
                        <button onClick={onClose} aria-label="Close"
                            className="ml-auto p-1.5 rounded-lg transition-colors hover:bg-[#29261B]/[0.05]" style={{ color: C.muted }}>
                            <X size={15} />
                        </button>
                    </div>

                    {/* ── Messages ───────────────────────────────────────── */}
                    <div ref={scrollRef} className="claude-scroll flex-1 overflow-y-auto px-4 pt-4 pb-2">
                        {isEmpty ? (
                            <div className="h-full flex flex-col justify-center pb-6">
                                <h2 className="text-[22px] leading-snug mb-6 px-1" style={{ fontFamily: SERIF, fontWeight: 400, color: C.ink, letterSpacing: '-0.015em' }}>
                                    <ClaudeLogo size={23} className="inline-block mr-3 align-[-3px]" style={{ color: C.terracotta }} />
                                    What are we making on this canvas?
                                </h2>
                                <div className="flex flex-col gap-2">
                                    {QUICK_PROMPTS.map(({ icon: Icon, text }) => (
                                        <button key={text} onClick={() => send(text)}
                                            className="group flex items-center gap-2.5 text-left text-[13px] px-3.5 py-2.5 rounded-xl transition-colors"
                                            style={{ background: C.surface, border: `1px solid ${C.hairline}`, color: C.body }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F4EE'; e.currentTarget.style.borderColor = C.hairlineStrong; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.hairline; }}>
                                            <Icon size={14} style={{ color: C.muted }} className="shrink-0" />
                                            {text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5">
                                {messages.map((m, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}
                                        className={m.role === 'user' ? 'flex justify-end' : ''}>
                                        {m.role === 'user' ? (
                                            <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words"
                                                style={{ background: C.bubble, color: C.ink }}>
                                                {m.text}
                                            </div>
                                        ) : (
                                            <div className="px-0.5">
                                                <div className="text-[15px] whitespace-pre-wrap break-words"
                                                    style={{ fontFamily: SERIF, color: C.ink, lineHeight: 1.65 }}>
                                                    {m.text}
                                                </div>
                                                {m.meta && (
                                                    <div className="mt-2.5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                                                        style={{ background: C.surface, border: `1px solid ${C.hairline}`, color: C.muted }}>
                                                        <ClaudeLogo size={11} style={{ color: C.terracotta }} />
                                                        <span className="font-medium" style={{ color: C.body }}>Canvas updated</span>
                                                        <span style={{ color: C.faint }}>{m.meta}</span>
                                                        <Check size={12} style={{ color: '#7A9B76' }} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}

                                {busy && (
                                    <div className="flex items-center gap-2.5 px-0.5">
                                        <ClaudeLogo size={15} className="claude-thinking-star shrink-0" style={{ color: C.terracotta }} />
                                        <span className="claude-shimmer-text text-[13px] font-medium">{thinkingWord}…</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Composer ───────────────────────────────────────── */}
                    <div className="px-3 pt-1 shrink-0">
                        <div className="rounded-2xl transition-colors"
                            style={{ background: C.surface, border: `1px solid ${C.hairlineStrong}`, boxShadow: '0 4px 16px -8px rgba(41,38,27,0.12)' }}>
                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={(e) => { setInput(e.target.value); autoGrow(e.target); }}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
                                }}
                                placeholder="Reply to Claude…"
                                className="w-full bg-transparent resize-none text-[14px] focus:outline-none px-4 pt-3 pb-1 placeholder:text-[#A6A39A]"
                                style={{ color: C.ink, lineHeight: 1.5 }}
                            />
                            <div className="flex items-center px-2.5 pb-2.5 pt-0.5">
                                <button aria-label="Add content" className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F5F4EE]"
                                    style={{ border: `1px solid ${C.hairline}`, color: C.muted }}>
                                    <Plus size={14} />
                                </button>
                                <div className="ml-auto flex items-center gap-1.5">
                                    <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] transition-colors hover:bg-[#F5F4EE]" style={{ color: C.faint }}>
                                        Claude Sonnet 4.6 <ChevronDown size={12} />
                                    </button>
                                    <button onClick={() => send(input)} disabled={busy || !input.trim()} aria-label="Send message"
                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                        style={input.trim() && !busy
                                            ? { background: C.send, color: '#FFFFFF' }
                                            : { background: '#E8E5DB', color: '#B3B0A4', cursor: 'not-allowed' }}
                                        onMouseEnter={(e) => { if (input.trim() && !busy) e.currentTarget.style.background = C.sendHover; }}
                                        onMouseLeave={(e) => { if (input.trim() && !busy) e.currentTarget.style.background = C.send; }}>
                                        <ArrowUp size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-[11px] py-2" style={{ color: C.faint }}>
                            Claude can make mistakes. Please double-check responses.
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BoardAIPanel;
