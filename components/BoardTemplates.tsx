import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { BoardElement, BoardConnector, ScreenBlock } from '../types';

/**
 * Template gallery for the Space board — Miro-style "stamp a starting layout"
 * system. Every template is built from our own primitives (stickies, shapes,
 * frames, kanban/table/doc/screen widgets) and original generic content.
 */

const genId = () => `el-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export interface TemplateResult { elements: BoardElement[]; connectors: BoardConnector[]; }
export interface BoardTemplate {
    id: string;
    name: string;
    desc: string;
    category: 'Planning' | 'Brainstorming' | 'Agile' | 'Diagramming' | 'Prototyping';
    build: (ox: number, oy: number) => TemplateResult;
    preview: React.ReactNode; // tiny hand-drawn thumbnail
}

// ── builders ─────────────────────────────────────────────────────────────────

const sticky = (x: number, y: number, text: string, color = '#FFF6A5', w = 150, h = 150): BoardElement =>
    ({ id: genId(), type: 'sticky', x, y, w, h, text, color });
const frame = (x: number, y: number, w: number, h: number, text: string): BoardElement =>
    ({ id: genId(), type: 'frame', x, y, w, h, text });
const txt = (x: number, y: number, text: string, w = 260, fontSize?: number): BoardElement =>
    ({ id: genId(), type: 'text', x, y, w, h: 40, text, fontSize });
const shape = (type: 'rect' | 'ellipse' | 'diamond', x: number, y: number, w: number, h: number, text: string, color = '#ffffff'): BoardElement =>
    ({ id: genId(), type, x, y, w, h, text, color });
const node = (x: number, y: number, text: string, color = '#FBF5F0', w = 170, h = 56): BoardElement =>
    ({ id: genId(), type: 'mindmap', x, y, w, h, text, color });
const con = (from: BoardElement, to: BoardElement, label?: string): BoardConnector =>
    ({ id: genId(), from: from.id, to: to.id, label });

const block = (kind: ScreenBlock['kind'], label: string, targetScreenId?: string): ScreenBlock =>
    ({ id: genId(), kind, label, targetScreenId });

// ── the templates ────────────────────────────────────────────────────────────

export const TEMPLATES: BoardTemplate[] = [
    {
        id: 'kanban', name: 'Kanban board', desc: 'To do / In progress / Done flow', category: 'Agile',
        build: (ox, oy) => ({
            elements: [{
                id: genId(), type: 'kanban', x: ox, y: oy, w: 760, h: 440, text: 'Kanban board',
                columns: [
                    { title: 'To do', cards: ['Outline the spec', 'Collect feedback'] },
                    { title: 'In progress', cards: ['Build the first slice'] },
                    { title: 'Done', cards: ['Kickoff meeting'] },
                ],
            }],
            connectors: [],
        }),
        preview: <div className="flex gap-1 p-2 h-full">{[3, 2, 1].map((n, i) => <div key={i} className="flex-1 bg-[#F0EEE5] rounded p-1 flex flex-col gap-1">{Array.from({ length: n }).map((_, j) => <div key={j} className="h-2.5 bg-white rounded-sm border border-[#E8E6DC]" />)}</div>)}</div>,
    },
    {
        id: 'flowchart', name: 'Flowchart', desc: 'Start → steps → decision → end', category: 'Diagramming',
        build: (ox, oy) => {
            const start = shape('ellipse', ox + 200, oy, 180, 70, 'Start', '#E8F2E5');
            const s1 = shape('rect', ox + 190, oy + 130, 200, 80, 'Do the thing');
            const dec = shape('diamond', ox + 180, oy + 270, 220, 120, 'Did it work?');
            const yes = shape('rect', ox, oy + 460, 190, 80, 'Ship it', '#E8F2E5');
            const no = shape('rect', ox + 390, oy + 460, 190, 80, 'Fix and retry', '#FBE9E5');
            const end = shape('ellipse', ox + 200, oy + 600, 180, 70, 'End', '#F0EEE5');
            return {
                elements: [start, s1, dec, yes, no, end],
                connectors: [con(start, s1), con(s1, dec), con(dec, yes, 'Yes'), con(dec, no, 'No'), con(no, s1, 'Retry'), con(yes, end)],
            };
        },
        preview: <div className="flex flex-col items-center gap-1 p-2 h-full justify-center"><div className="w-8 h-3 rounded-full bg-[#DCEEDB]" /><div className="w-8 h-3 bg-white border border-[#E8E6DC] rounded-sm" /><div className="w-5 h-5 bg-[#FBE9E5] rotate-45 rounded-sm" /><div className="w-8 h-3 rounded-full bg-[#F0EEE5]" /></div>,
    },
    {
        id: 'mindmap', name: 'Mind map', desc: 'Central idea with radiating branches', category: 'Brainstorming',
        build: (ox, oy) => {
            const c = node(ox + 300, oy + 220, 'Central idea', '#F3E8FD', 200, 64);
            const around = [
                node(ox, oy, 'Branch one'), node(ox + 600, oy, 'Branch two'),
                node(ox, oy + 220, 'Branch three'), node(ox + 620, oy + 220, 'Branch four'),
                node(ox, oy + 440, 'Branch five'), node(ox + 600, oy + 440, 'Branch six'),
            ];
            return { elements: [c, ...around], connectors: around.map(n => con(c, n)) };
        },
        preview: <div className="relative h-full"><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-4 rounded-full bg-[#F3E8FD] border border-[#D9C7F2]" />{[[6, 6], [44, 6], [6, 40], [44, 40]].map(([l, t], i) => <div key={i} className="absolute w-6 h-3 rounded-full bg-[#FBF5F0] border border-[#EBD5C8]" style={{ left: `${l}%`, top: `${t}%` }} />)}</div>,
    },
    {
        id: 'retro', name: 'Retrospective', desc: 'Start / Stop / Continue', category: 'Agile',
        build: (ox, oy) => {
            const f1 = frame(ox, oy, 380, 480, 'Start doing');
            const f2 = frame(ox + 420, oy, 380, 480, 'Stop doing');
            const f3 = frame(ox + 840, oy, 380, 480, 'Continue doing');
            return {
                elements: [f1, f2, f3,
                    sticky(ox + 30, oy + 30, 'Pair on tricky bugs', '#A9DFBF'),
                    sticky(ox + 200, oy + 110, 'Demo every Friday', '#A9DFBF'),
                    sticky(ox + 450, oy + 30, 'Late scope changes', '#FFB3BA'),
                    sticky(ox + 870, oy + 30, 'Small focused PRs', '#FFF6A5'),
                ],
                connectors: [],
            };
        },
        preview: <div className="flex gap-1 p-2 h-full">{['#A9DFBF', '#FFB3BA', '#FFF6A5'].map((c, i) => <div key={i} className="flex-1 border border-[#E8E6DC] rounded p-1"><div className="w-4 h-4 rounded-sm" style={{ background: c }} /></div>)}</div>,
    },
    {
        id: 'swot', name: 'SWOT analysis', desc: 'Strengths, weaknesses, opportunities, threats', category: 'Planning',
        build: (ox, oy) => {
            const fs = frame(ox, oy, 440, 340, 'Strengths');
            const fw = frame(ox + 470, oy, 440, 340, 'Weaknesses');
            const fo = frame(ox, oy + 380, 440, 340, 'Opportunities');
            const ft = frame(ox + 470, oy + 380, 440, 340, 'Threats');
            return {
                elements: [fs, fw, fo, ft,
                    sticky(ox + 30, oy + 30, 'Fast release cycle', '#A9DFBF'),
                    sticky(ox + 500, oy + 30, 'Single point of failure', '#FFB3BA'),
                    sticky(ox + 30, oy + 410, 'New market segment', '#AED6F1'),
                    sticky(ox + 500, oy + 410, 'Competitor pricing', '#FFD6A5'),
                ],
                connectors: [],
            };
        },
        preview: <div className="grid grid-cols-2 gap-1 p-2 h-full">{['#DCEEDB', '#FBE9E5', '#E3EEF9', '#FCF1DE'].map((c, i) => <div key={i} className="rounded border border-[#E8E6DC]" style={{ background: c }} />)}</div>,
    },
    {
        id: 'matrix', name: 'Prioritization matrix', desc: '2×2 impact / effort grid', category: 'Planning',
        build: (ox, oy) => {
            const f = frame(ox, oy, 820, 620, 'Prioritization matrix');
            return {
                elements: [f,
                    txt(ox + 330, oy - 50, 'High impact ↑', 220),
                    txt(ox + 330, oy + 640, 'Low impact ↓', 220),
                    txt(ox - 170, oy + 290, '← Low effort', 160),
                    txt(ox + 840, oy + 290, 'High effort →', 160),
                    shape('rect', ox + 30, oy + 30, 370, 270, 'Quick wins', '#E8F2E5'),
                    shape('rect', ox + 420, oy + 30, 370, 270, 'Big bets', '#E3EEF9'),
                    shape('rect', ox + 30, oy + 320, 370, 270, 'Fill-ins', '#FCF1DE'),
                    shape('rect', ox + 420, oy + 320, 370, 270, 'Time sinks', '#FBE9E5'),
                    sticky(ox + 80, oy + 80, 'Fix onboarding copy', '#FFF6A5', 130, 130),
                ],
                connectors: [],
            };
        },
        preview: <div className="grid grid-cols-2 gap-1 p-2 h-full">{['#DCEEDB', '#E3EEF9', '#FCF1DE', '#FBE9E5'].map((c, i) => <div key={i} className="rounded" style={{ background: c }} />)}</div>,
    },
    {
        id: 'storymap', name: 'User story map', desc: 'Activities → steps → stories', category: 'Agile',
        build: (ox, oy) => {
            const f = frame(ox, oy, 1060, 600, 'User story map');
            const acts = [shape('rect', ox + 40, oy + 40, 300, 70, 'Discover', '#E3EEF9'),
                shape('rect', ox + 380, oy + 40, 300, 70, 'Decide', '#E3EEF9'),
                shape('rect', ox + 720, oy + 40, 300, 70, 'Purchase', '#E3EEF9')];
            const steps = [sticky(ox + 40, oy + 140, 'Browse catalog', '#FFD6A5', 140, 110),
                sticky(ox + 380, oy + 140, 'Compare options', '#FFD6A5', 140, 110),
                sticky(ox + 720, oy + 140, 'Checkout', '#FFD6A5', 140, 110)];
            const stories = [sticky(ox + 40, oy + 280, 'Search by keyword', '#FFF6A5', 140, 110),
                sticky(ox + 200, oy + 280, 'Filter by price', '#FFF6A5', 140, 110),
                sticky(ox + 380, oy + 280, 'Save favorites', '#FFF6A5', 140, 110),
                sticky(ox + 720, oy + 280, 'Pay with card', '#FFF6A5', 140, 110),
                sticky(ox + 880, oy + 280, 'Order confirmation', '#FFF6A5', 140, 110)];
            return { elements: [f, ...acts, ...steps, ...stories], connectors: [] };
        },
        preview: <div className="flex flex-col gap-1 p-2 h-full"><div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="flex-1 h-3 bg-[#E3EEF9] rounded-sm" />)}</div><div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="flex-1 h-3 bg-[#FCE8CF] rounded-sm" />)}</div><div className="flex gap-1">{[0, 1, 2, 3].map(i => <div key={i} className="flex-1 h-3 bg-[#FDF6C9] rounded-sm" />)}</div></div>,
    },
    {
        id: 'roadmap', name: 'Roadmap timeline', desc: 'Quarter-by-quarter plan', category: 'Planning',
        build: (ox, oy) => {
            const f = frame(ox, oy, 1040, 480, 'Roadmap');
            const qs = ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => shape('rect', ox + 30 + i * 250, oy + 30, 230, 60, q, '#F0EEE5'));
            return {
                elements: [f, ...qs,
                    sticky(ox + 40, oy + 120, 'Foundation work', '#AED6F1', 200, 90),
                    sticky(ox + 290, oy + 120, 'First beta', '#A9DFBF', 200, 90),
                    sticky(ox + 290, oy + 230, 'Feedback loop', '#FFF6A5', 200, 90),
                    sticky(ox + 540, oy + 120, 'Public launch', '#FFD6A5', 200, 90),
                    sticky(ox + 790, oy + 120, 'Scale + polish', '#D7BDE2', 200, 90),
                ],
                connectors: [],
            };
        },
        preview: <div className="flex flex-col gap-1 p-2 h-full"><div className="flex gap-1">{[0, 1, 2, 3].map(i => <div key={i} className="flex-1 h-2.5 bg-[#F0EEE5] rounded-sm" />)}</div><div className="flex gap-1"><div className="w-1/4 h-3 bg-[#E3EEF9] rounded-sm" /><div className="w-1/4 h-3 bg-[#DCEEDB] rounded-sm" /></div><div className="flex gap-1 pl-[26%]"><div className="w-1/4 h-3 bg-[#FCE8CF] rounded-sm" /></div></div>,
    },
    {
        id: 'standup', name: 'Daily standup', desc: 'Yesterday / Today / Blockers', category: 'Agile',
        build: (ox, oy) => {
            const f1 = frame(ox, oy, 360, 440, 'Yesterday');
            const f2 = frame(ox + 400, oy, 360, 440, 'Today');
            const f3 = frame(ox + 800, oy, 360, 440, 'Blockers');
            return {
                elements: [f1, f2, f3,
                    sticky(ox + 30, oy + 30, 'Shipped the header', '#A9DFBF', 140, 120),
                    sticky(ox + 430, oy + 30, 'Wire up the API', '#FFF6A5', 140, 120),
                    sticky(ox + 830, oy + 30, 'Waiting on review', '#FFB3BA', 140, 120),
                ],
                connectors: [],
            };
        },
        preview: <div className="flex gap-1 p-2 h-full">{['#DCEEDB', '#FDF6C9', '#FBE9E5'].map((c, i) => <div key={i} className="flex-1 border border-[#E8E6DC] rounded p-1"><div className="w-4 h-4 rounded-sm" style={{ background: c }} /></div>)}</div>,
    },
    {
        id: 'brainstorm', name: 'Brainstorm grid', desc: 'Prompt + a wall of blank stickies', category: 'Brainstorming',
        build: (ox, oy) => {
            const f = frame(ox, oy, 880, 560, 'Brainstorm');
            const colors = ['#FFF6A5', '#FFD6A5', '#FFB3BA', '#D7BDE2', '#AED6F1', '#A9DFBF'];
            const stickies = Array.from({ length: 12 }).map((_, i) =>
                sticky(ox + 40 + (i % 4) * 210, oy + 110 + Math.floor(i / 4) * 145, '', colors[i % colors.length], 180, 125));
            return { elements: [f, txt(ox + 40, oy + 35, 'How might we…?', 600, 24), ...stickies], connectors: [] };
        },
        preview: <div className="grid grid-cols-4 gap-1 p-2 h-full">{['#FDF6C9', '#FCE8CF', '#FBE9E5', '#EFE3F7', '#E3EEF9', '#DCEEDB', '#FDF6C9', '#FCE8CF'].map((c, i) => <div key={i} className="rounded-sm" style={{ background: c }} />)}</div>,
    },
    {
        id: 'prototype', name: 'Mobile app prototype', desc: '3 linked screens with hotspots', category: 'Prototyping',
        build: (ox, oy) => {
            const welcomeId = genId(), loginId = genId(), homeId = genId();
            const welcome: BoardElement = {
                id: welcomeId, type: 'screen', x: ox, y: oy, w: 250, h: 460, text: 'Welcome',
                blocks: [block('image', 'Hero illustration'), block('header', 'Welcome aboard'),
                    block('text', 'Plan, track and ship together.'),
                    block('button', 'Sign in', loginId), block('button', 'Create account', loginId)],
            };
            const login: BoardElement = {
                id: loginId, type: 'screen', x: ox + 330, y: oy, w: 250, h: 460, text: 'Log in',
                blocks: [block('header', 'Log in'), block('input', 'Email'), block('input', 'Password'),
                    block('button', 'Log in', homeId), block('text', 'Forgot password?')],
            };
            const home: BoardElement = {
                id: homeId, type: 'screen', x: ox + 660, y: oy, w: 250, h: 460, text: 'Home',
                blocks: [block('header', 'Today'), block('list', 'Your tasks'),
                    block('button', 'Add a task'), block('image', 'Activity chart')],
            };
            return {
                elements: [welcome, login, home],
                connectors: [{ id: genId(), from: welcomeId, to: loginId, label: 'sign in' }, { id: genId(), from: loginId, to: homeId, label: 'log in' }],
            };
        },
        preview: <div className="flex gap-1.5 p-2 h-full items-center justify-center">{[0, 1, 2].map(i => <div key={i} className="w-5 h-10 bg-white border border-[#DAD7CB] rounded flex flex-col gap-0.5 p-0.5"><div className="h-1 bg-[#29261B]/70 rounded-sm" /><div className="h-1 bg-[#F0EEE5] rounded-sm" /><div className="h-1 bg-[#C96442] rounded-sm" /></div>)}</div>,
    },
];

export const TEMPLATE_CATEGORIES = ['All', 'Planning', 'Brainstorming', 'Agile', 'Diagramming', 'Prototyping'] as const;

// ── modal ────────────────────────────────────────────────────────────────────

const TemplatesModal: React.FC<{ onPick: (t: BoardTemplate) => void; onClose: () => void }> = ({ onPick, onClose }) => {
    const [cat, setCat] = useState<string>('All');
    const [q, setQ] = useState('');
    const list = TEMPLATES.filter(t =>
        (cat === 'All' || t.category === cat) &&
        (t.name + ' ' + t.desc).toLowerCase().includes(q.trim().toLowerCase()));

    return (
        <div data-board-ui className="fixed inset-0 z-[80] bg-[#29261B]/30 backdrop-blur-[2px] flex items-center justify-center p-6"
            onPointerDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-3xl h-[560px] rounded-2xl flex overflow-hidden shadow-2xl"
                style={{ background: '#FAF9F5', border: '1px solid #E8E6DC' }}>
                {/* Categories */}
                <div className="w-48 shrink-0 p-3 flex flex-col gap-0.5" style={{ background: '#F2F0E8', borderRight: '1px solid #E8E6DC' }}>
                    <p className="px-2.5 pt-1 pb-2 text-[15px] font-semibold text-[#29261B]">Templates</p>
                    {TEMPLATE_CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCat(c)}
                            className={`text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${cat === c ? 'bg-[#EBE8DE] text-[#29261B] font-medium' : 'text-[#52504A] hover:bg-[#EBE8DE]'}`}>
                            {c}
                        </button>
                    ))}
                </div>
                {/* Gallery */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid #E8E6DC' }}>
                        <div className="flex-1 flex items-center gap-2 px-3 h-9 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #DAD7CB' }}>
                            <Search size={14} className="text-[#9C998D]" />
                            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates"
                                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#A6A39A] text-[#29261B]" />
                        </div>
                        <button onClick={onClose} className="p-2 rounded-lg text-[#73716C] hover:bg-[#29261B]/[0.05]"><X size={16} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3 content-start">
                        {list.map(t => (
                            <button key={t.id} onClick={() => onPick(t)}
                                className="text-left rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg group"
                                style={{ background: '#FFFFFF', border: '1px solid #E8E6DC' }}>
                                <div className="h-24 border-b" style={{ borderColor: '#F0EEE5', background: '#FCFBF8' }}>{t.preview}</div>
                                <div className="p-2.5">
                                    <p className="text-[13px] font-medium text-[#29261B]">{t.name}</p>
                                    <p className="text-[11px] text-[#9C998D] mt-0.5 leading-snug">{t.desc}</p>
                                </div>
                            </button>
                        ))}
                        {list.length === 0 && <p className="col-span-3 text-center text-[13px] text-[#9C998D] py-10">No templates match.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemplatesModal;
