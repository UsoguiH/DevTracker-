import React, { useState } from 'react';
import { X, Plus, Trash2, ChevronLeft, Play } from 'lucide-react';
import { BoardElement, ScreenBlock } from '../types';

/**
 * Prototype tooling for the Space board:
 *  - ScreenEditor: edit a screen's title + wireframe blocks, wire hotspots
 *  - PrototypePlayModal: full-screen clickable walkthrough of linked screens
 */

const genId = () => `blk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const KINDS: ScreenBlock['kind'][] = ['header', 'text', 'button', 'input', 'image', 'list'];

// ── Shared block renderer (scales for canvas vs play mode) ──────────────────
export const ScreenBlockView: React.FC<{
    b: ScreenBlock; big?: boolean; screens?: BoardElement[]; onNavigate?: (id: string) => void;
}> = ({ b, big, screens, onNavigate }) => {
    const interactive = !!(b.targetScreenId && onNavigate && screens?.some(s => s.id === b.targetScreenId));
    const go = (e: React.MouseEvent) => { if (interactive) { e.stopPropagation(); onNavigate!(b.targetScreenId!); } };
    const fs = big ? 'text-[15px]' : 'text-[9px]';
    switch (b.kind) {
        case 'header':
            return <div className={`${big ? 'h-12 px-4' : 'h-6 px-1.5'} rounded-md flex items-center font-semibold text-white ${fs}`} style={{ background: '#29261Bd9' }}>{b.label}</div>;
        case 'text':
            return <div className={`${fs} leading-snug px-0.5`} style={{ color: '#73716C' }}>{b.label}</div>;
        case 'button':
            return (
                <button onClick={go} className={`${big ? 'h-12' : 'h-6'} w-full rounded-lg flex items-center justify-center font-medium text-white ${fs} ${interactive ? 'cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all' : 'cursor-default'}`}
                    style={{ background: '#C96442' }}>
                    {b.label}{!big && b.targetScreenId && <span className="ml-1 opacity-70">↗</span>}
                </button>
            );
        case 'input':
            return <div className={`${big ? 'h-12 px-4' : 'h-6 px-1.5'} rounded-lg flex items-center ${fs}`} style={{ background: '#FAF9F5', border: '1px solid #DAD7CB', color: '#A6A39A' }}>{b.label}</div>;
        case 'image':
            return <div className={`${big ? 'h-36' : 'h-14'} rounded-lg flex items-center justify-center ${fs}`} style={{ background: '#F0EEE5', color: '#B3B0A4' }}>▦ {b.label}</div>;
        case 'list':
            return (
                <div onClick={go} className={`rounded-lg overflow-hidden ${interactive ? 'cursor-pointer' : ''}`} style={{ border: '1px solid #E8E6DC' }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} className={`${big ? 'h-11 px-4' : 'h-5 px-1.5'} flex items-center gap-1.5 ${fs}`}
                            style={{ borderBottom: i < 2 ? '1px solid #F0EEE5' : 'none', color: '#52504A', background: '#fff' }}>
                            <span className={`${big ? 'w-2 h-2' : 'w-1 h-1'} rounded-full shrink-0`} style={{ background: '#D97757' }} />
                            <span className="truncate">{i === 0 ? b.label : ''}</span>
                        </div>
                    ))}
                </div>
            );
    }
};

// ── Screen editor modal ──────────────────────────────────────────────────────
export const ScreenEditor: React.FC<{
    screen: BoardElement;
    screens: BoardElement[]; // all screens on the board (hotspot targets)
    onChange: (patch: Partial<BoardElement>) => void;
    onClose: () => void;
}> = ({ screen, screens, onChange, onClose }) => {
    const blocks = screen.blocks || [];
    const setBlocks = (next: ScreenBlock[]) => onChange({ blocks: next });
    const others = screens.filter(s => s.id !== screen.id);

    return (
        <div data-board-ui className="fixed inset-0 z-[80] bg-[#29261B]/30 backdrop-blur-[2px] flex items-center justify-center p-6"
            onPointerDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-lg max-h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
                style={{ background: '#FAF9F5', border: '1px solid #E8E6DC' }}>
                <div className="flex items-center gap-2 px-4 h-12 shrink-0" style={{ borderBottom: '1px solid #E8E6DC' }}>
                    <span className="text-[14px] font-semibold text-[#29261B]">Edit screen</span>
                    <input value={screen.text || ''} onChange={e => onChange({ text: e.target.value })} placeholder="Screen name"
                        className="ml-2 flex-1 bg-transparent text-[13px] outline-none px-2 h-8 rounded-lg text-[#29261B] placeholder:text-[#A6A39A]"
                        style={{ border: '1px solid #DAD7CB', background: '#fff' }} />
                    <button onClick={onClose} className="p-2 rounded-lg text-[#73716C] hover:bg-[#29261B]/[0.05]"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {blocks.map((b, i) => (
                        <div key={b.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: '#fff', border: '1px solid #E8E6DC' }}>
                            <select value={b.kind}
                                onChange={e => setBlocks(blocks.map((x, j) => j === i ? { ...x, kind: e.target.value as ScreenBlock['kind'] } : x))}
                                className="h-8 px-1.5 rounded-lg text-[12px] text-[#52504A] outline-none" style={{ border: '1px solid #DAD7CB', background: '#FAF9F5' }}>
                                {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <input value={b.label}
                                onChange={e => setBlocks(blocks.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                                placeholder="Label"
                                className="flex-1 min-w-0 h-8 px-2 rounded-lg text-[12px] text-[#29261B] outline-none placeholder:text-[#A6A39A]"
                                style={{ border: '1px solid #DAD7CB', background: '#FAF9F5' }} />
                            {(b.kind === 'button' || b.kind === 'list') && (
                                <select value={b.targetScreenId || ''}
                                    onChange={e => setBlocks(blocks.map((x, j) => j === i ? { ...x, targetScreenId: e.target.value || undefined } : x))}
                                    title="Hotspot — navigate to screen"
                                    className="h-8 px-1.5 rounded-lg text-[12px] outline-none max-w-[120px]"
                                    style={{ border: '1px solid #DAD7CB', background: b.targetScreenId ? '#FBF5F0' : '#FAF9F5', color: b.targetScreenId ? '#B3500F' : '#52504A' }}>
                                    <option value="">No link</option>
                                    {others.map(s => <option key={s.id} value={s.id}>→ {s.text || 'Screen'}</option>)}
                                </select>
                            )}
                            <button onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}
                                className="p-1.5 rounded-lg text-[#9C998D] hover:text-[#C2410C] hover:bg-[#C2410C]/10"><Trash2 size={14} /></button>
                        </div>
                    ))}
                    <button onClick={() => setBlocks([...blocks, { id: genId(), kind: 'text', label: 'New block' }])}
                        className="w-full h-9 rounded-xl flex items-center justify-center gap-1.5 text-[12.5px] text-[#73716C] hover:bg-[#F0EEE5] transition-colors"
                        style={{ border: '1px dashed #DAD7CB' }}>
                        <Plus size={14} /> Add block
                    </button>
                </div>
                <div className="px-4 py-2.5 text-[11px] text-[#9C998D]" style={{ borderTop: '1px solid #E8E6DC' }}>
                    Link buttons or lists to other screens, then press <span className="font-medium text-[#73716C]">Play</span> to walk the prototype.
                </div>
            </div>
        </div>
    );
};

// ── Play mode ────────────────────────────────────────────────────────────────
export const PrototypePlayModal: React.FC<{
    screens: BoardElement[];
    startId?: string;
    onClose: () => void;
}> = ({ screens, startId, onClose }) => {
    const [currentId, setCurrentId] = useState(startId && screens.some(s => s.id === startId) ? startId : screens[0]?.id);
    const [trail, setTrail] = useState<string[]>([]);
    const current = screens.find(s => s.id === currentId);
    if (!current) return null;

    const navigate = (id: string) => { setTrail(t => [...t, currentId!]); setCurrentId(id); };
    const back = () => setTrail(t => { const last = t[t.length - 1]; if (last) setCurrentId(last); return t.slice(0, -1); });

    return (
        <div data-board-ui className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
            style={{ background: 'rgba(24,22,16,0.88)', backdropFilter: 'blur(4px)' }}
            onPointerDown={(e) => e.stopPropagation()}>
            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 h-14 flex items-center px-4 gap-3">
                <span className="flex items-center gap-2 text-[13px] font-medium text-white/85"><Play size={14} className="text-[#D97757]" /> Prototype · {current.text || 'Screen'}</span>
                <div className="ml-auto flex items-center gap-2">
                    {trail.length > 0 && (
                        <button onClick={back} className="flex items-center gap-1 px-3 h-8 rounded-lg text-[12.5px] text-white/80 hover:bg-white/10 transition-colors">
                            <ChevronLeft size={14} /> Back
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"><X size={17} /></button>
                </div>
            </div>

            {/* Phone */}
            <div className="w-[340px] h-[660px] rounded-[2.2rem] flex flex-col overflow-hidden shadow-2xl"
                style={{ background: '#FFFFFF', border: '6px solid #29261B' }}>
                <div className="h-8 flex items-center justify-center shrink-0"><div className="w-20 h-1.5 rounded-full" style={{ background: '#E8E5DB' }} /></div>
                <div className="px-3 pb-1 text-[14px] font-semibold text-center shrink-0" style={{ color: '#29261B' }}>{current.text || 'Screen'}</div>
                <div className="flex-1 flex flex-col gap-2.5 p-4 overflow-y-auto">
                    {(current.blocks || []).map(b => (
                        <ScreenBlockView key={b.id} b={b} big screens={screens} onNavigate={navigate} />
                    ))}
                    {(current.blocks || []).length === 0 && <p className="text-center text-[13px] mt-10" style={{ color: '#A6A39A' }}>This screen has no blocks yet.</p>}
                </div>
            </div>

            {/* Screen switcher dots */}
            <div className="absolute bottom-5 flex items-center gap-2">
                {screens.map(s => (
                    <button key={s.id} onClick={() => navigate(s.id)} title={s.text || 'Screen'}
                        className="rounded-full transition-all"
                        style={{ width: s.id === currentId ? 22 : 8, height: 8, background: s.id === currentId ? '#D97757' : 'rgba(255,255,255,0.35)' }} />
                ))}
            </div>
        </div>
    );
};
