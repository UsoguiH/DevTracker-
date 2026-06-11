import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    MousePointer2, Hand, StickyNote, Square, Circle, Diamond, Type, Pencil,
    ArrowUpRight, Undo2, Redo2, Trash2, Copy, ChevronsUp, ChevronsDown,
    ZoomIn, ZoomOut, Maximize, ClipboardList, Frame as FrameIcon, Eraser,
    LayoutTemplate, Table as TableIcon, Columns, FileText, Network, Smartphone,
    Timer as TimerIcon, ThumbsUp, Presentation, Play, Map as MapIcon, Grid3x3,
    Eye, EyeOff, X, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';
import { BoardData, BoardElement, BoardElementType, BoardConnector, Task, KanbanColumn, ScreenBlock } from '../types';
import BoardAIPanel from '../components/BoardAIPanel';
import ClaudeLogo from '../components/ClaudeLogo';
import TemplatesModal, { BoardTemplate } from '../components/BoardTemplates';
import { ScreenEditor, PrototypePlayModal, ScreenBlockView } from '../components/PrototypePlayer';
import { BoardAIResult } from '../lib/boardAIService';
import { toast } from '../components/Toast';

/**
 * Space — DevTracker's Miro-grade infinite whiteboard.
 * Pan/zoom world, stickies (16 colors, bulk paste), shapes, text, pen, eraser,
 * frames (panel + presentation mode), blue-dot quick diagramming, connectors,
 * tables, kanban, docs, mind-map nodes, prototype screens with hotspots and
 * play mode, voting + reactions + timer, minimap, a template gallery — and
 * Claude as a copilot that can see and edit the whole board.
 */

type Tool = 'select' | 'hand' | 'sticky' | 'rect' | 'ellipse' | 'diamond' | 'text' | 'pen' | 'eraser' | 'connector' | 'frame';

// Miro-style tool stickiness: everything is one-shot except these.
const PERSISTENT_TOOLS = new Set<Tool>(['select', 'hand', 'pen', 'eraser']);

type BlueDir = 'n' | 'e' | 's' | 'w';

type Drag =
    | { kind: 'pan'; sx: number; sy: number; otx: number; oty: number }
    | { kind: 'move'; sx: number; sy: number; orig: Map<string, { x: number; y: number; points?: [number, number][] }> }
    | { kind: 'create'; id: string; sx: number; sy: number }
    | { kind: 'draw'; id: string }
    | { kind: 'marquee'; sx: number; sy: number }
    | { kind: 'resize'; id: string; handle: 'nw' | 'ne' | 'sw' | 'se'; orig: { x: number; y: number; w: number; h: number } }
    | { kind: 'bluedot'; fromId: string; dir: BlueDir; sx: number; sy: number; moved: boolean };

// 16 preset sticky colors (Miro-style fixed palette — no custom colors).
const STICKY_COLORS = [
    '#FFF6A5', '#FFE38F', '#FFD6A5', '#FFC07A', '#FFB3BA', '#F8A5C2', '#E8B7E8', '#D7BDE2',
    '#C5CAE9', '#AED6F1', '#A5E8E0', '#A9DFBF', '#C8E6A0', '#E6EE9C', '#E0D6C2', '#D9D9D4',
];
const ELEMENT_TYPES: BoardElementType[] = ['sticky', 'rect', 'ellipse', 'diamond', 'text', 'draw', 'frame', 'table', 'kanban', 'doc', 'mindmap', 'screen'];
const DEFAULT_SIZE: Record<BoardElementType, { w: number; h: number }> = {
    sticky: { w: 170, h: 170 }, rect: { w: 200, h: 110 }, ellipse: { w: 200, h: 110 },
    diamond: { w: 180, h: 140 }, text: { w: 260, h: 44 }, draw: { w: 0, h: 0 },
    frame: { w: 640, h: 440 }, table: { w: 460, h: 240 }, kanban: { w: 720, h: 420 },
    doc: { w: 320, h: 400 }, mindmap: { w: 170, h: 56 }, screen: { w: 250, h: 460 },
};
const REACTION_EMOJIS = ['👍', '❤️', '🔥', '⭐'];

const genId = () => `el-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const num = (v: any, dflt: number) => (typeof v === 'number' && isFinite(v) ? v : dflt);
const center = (el: BoardElement) => ({ x: el.x + el.w / 2, y: el.y + el.h / 2 });

/** Where a center→target ray exits an element's bounding box (connector endpoints). */
function edgePoint(el: BoardElement, toward: { x: number; y: number }) {
    const c = center(el);
    const dx = toward.x - c.x, dy = toward.y - c.y;
    if (dx === 0 && dy === 0) return c;
    const sx = dx !== 0 ? (el.w / 2) / Math.abs(dx) : Infinity;
    const sy = dy !== 0 ? (el.h / 2) / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy);
    return { x: c.x + dx * s, y: c.y + dy * s };
}

const containsCenter = (frame: BoardElement, el: BoardElement) => {
    const c = center(el);
    return el.id !== frame.id && c.x >= frame.x && c.x <= frame.x + frame.w && c.y >= frame.y && c.y <= frame.y + frame.h;
};

const sanitizeBlocks = (raw: any): ScreenBlock[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    const kinds = ['header', 'text', 'button', 'input', 'image', 'list'];
    return raw.filter((b: any) => b && kinds.includes(b.kind)).slice(0, 12).map((b: any) => ({
        id: genId(), kind: b.kind, label: typeof b.label === 'string' ? b.label : '',
        targetScreenId: typeof b.targetScreenId === 'string' ? b.targetScreenId : (typeof b.target === 'string' ? b.target : undefined),
    }));
};

const Whiteboard: React.FC<{ projectId: string; projectName: string; tasks: Task[] }> = ({ projectId, projectName, tasks }) => {
    const storageKey = `devtracker-board-${projectId}`;

    const [board, setBoard] = useState<BoardData>(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.elements)) return { elements: parsed.elements, connectors: parsed.connectors || [] };
            }
        } catch { /* corrupt board — start fresh */ }
        return { elements: [], connectors: [] };
    });

    const [cam, setCam] = useState({ tx: 0, ty: 0, z: 1 });
    const [tool, setTool] = useState<Tool>('select');
    const [selection, setSelection] = useState<Set<string>>(new Set());
    const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [pendingFrom, setPendingFrom] = useState<string | null>(null);
    const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [aiOpen, setAiOpen] = useState(false);
    const [activeColor, setActiveColor] = useState(STICKY_COLORS[0]);
    const [spaceHeld, setSpaceHeld] = useState(false);
    const [bluePoint, setBluePoint] = useState<{ x: number; y: number } | null>(null);

    // chrome state
    const [showGrid, setShowGrid] = useState(true);
    const [showMinimap, setShowMinimap] = useState(true);
    const [framesOpen, setFramesOpen] = useState(false);
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [votingMode, setVotingMode] = useState(false);
    const [timerEnd, setTimerEnd] = useState<number | null>(null);
    const [timerOpen, setTimerOpen] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [presentIdx, setPresentIdx] = useState<number | null>(null);
    const [playOpen, setPlayOpen] = useState(false);
    const [screenEditId, setScreenEditId] = useState<string | null>(null);
    const [subEdit, setSubEdit] = useState<
        | { elId: string; kind: 'cell'; r: number; c: number }
        | { elId: string; kind: 'card'; col: number; idx: number }
        | { elId: string; kind: 'kcol'; col: number }
        | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<Drag | null>(null);
    const undoStack = useRef<BoardData[]>([]);
    const redoStack = useRef<BoardData[]>([]);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Mirror of `board` so mutations & undo bookkeeping happen OUTSIDE React
    // state updaters (StrictMode double-invokes updaters; side effects there
    // would double-push undo snapshots).
    const boardRef = useRef(board);
    boardRef.current = board;

    // ── Persistence (debounced localStorage) ─────────────────────────────
    useEffect(() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            try { localStorage.setItem(storageKey, JSON.stringify(board)); } catch { /* storage full */ }
        }, 400);
        return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    }, [board, storageKey]);

    // ── Mutation helper with undo snapshots ──────────────────────────────
    const commit = (next: BoardData) => {
        boardRef.current = next;
        setBoard(next);
    };
    const mutate = (fn: (prev: BoardData) => BoardData, snapshot = true) => {
        const prev = boardRef.current;
        if (snapshot) {
            undoStack.current.push(prev);
            if (undoStack.current.length > 60) undoStack.current.shift();
            redoStack.current = [];
        }
        commit(fn(prev));
    };
    const snapshot = () => mutate(b => b);
    const undo = () => {
        const prev = undoStack.current.pop();
        if (!prev) return;
        redoStack.current.push(boardRef.current);
        commit(prev);
        setSelection(new Set());
    };
    const redo = () => {
        const next = redoStack.current.pop();
        if (!next) return;
        undoStack.current.push(boardRef.current);
        commit(next);
        setSelection(new Set());
    };

    const patchEl = (id: string, patch: Partial<BoardElement>, snap = false) =>
        mutate(b => ({ ...b, elements: b.elements.map(e => e.id === id ? { ...e, ...patch } : e) }), snap);

    // ── Coordinate helpers ───────────────────────────────────────────────
    const toWorld = (clientX: number, clientY: number) => {
        const rect = containerRef.current!.getBoundingClientRect();
        return { x: (clientX - rect.left - cam.tx) / cam.z, y: (clientY - rect.top - cam.ty) / cam.z };
    };

    // ── Wheel zoom (native non-passive so the page never scrolls) ────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if ((e.target as HTMLElement)?.closest?.('[data-board-ui]')) return;
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
            setCam(c => {
                const factor = Math.exp(-e.deltaY * 0.0012);
                const z = Math.min(4, Math.max(0.08, c.z * factor));
                const wx = (sx - c.tx) / c.z, wy = (sy - c.ty) / c.z;
                return { z, tx: sx - wx * z, ty: sy - wy * z };
            });
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // ── Timer tick ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!timerEnd) return;
        const iv = setInterval(() => {
            setNow(Date.now());
            if (Date.now() >= timerEnd) {
                setTimerEnd(null);
                toast('⏰ Time is up!', { duration: 6000 });
            }
        }, 500);
        return () => clearInterval(iv);
    }, [timerEnd]);

    // ── Bulk paste: multiline text → a grid of stickies (Miro behavior) ──
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const t = document.activeElement?.tagName;
            if (t === 'TEXTAREA' || t === 'INPUT' || editingId || subEdit) return;
            const text = e.clipboardData?.getData('text/plain');
            if (!text || !text.trim()) return;
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 50);
            if (!lines.length) return;
            e.preventDefault();
            const rect = containerRef.current?.getBoundingClientRect();
            const cx = rect ? (rect.width / 2 - cam.tx) / cam.z : 200;
            const cy = rect ? (rect.height / 2 - cam.ty) / cam.z : 200;
            const cols = Math.ceil(Math.sqrt(lines.length));
            const added: BoardElement[] = lines.map((line, i) => ({
                id: genId(), type: 'sticky',
                x: cx - (cols * 190) / 2 + (i % cols) * 190,
                y: cy - (Math.ceil(lines.length / cols) * 190) / 2 + Math.floor(i / cols) * 190,
                w: 170, h: 170, text: line, color: STICKY_COLORS[i % STICKY_COLORS.length],
            }));
            mutate(b => ({ ...b, elements: [...b.elements, ...added] }));
            setSelection(new Set(added.map(a => a.id)));
            toast(`${added.length} sticky note${added.length === 1 ? '' : 's'} pasted`);
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    });

    // ── Derived collections ──────────────────────────────────────────────
    const frames = useMemo(() => board.elements.filter(e => e.type === 'frame'), [board.elements]);
    const screens = useMemo(() => board.elements.filter(e => e.type === 'screen'), [board.elements]);
    const hiddenIds = useMemo(() => {
        const ids = new Set<string>();
        frames.filter(f => f.hidden).forEach(f => {
            ids.add(f.id);
            board.elements.forEach(e => { if (e.type !== 'frame' && containsCenter(f, e)) ids.add(e.id); });
        });
        return ids;
    }, [frames, board.elements]);

    // ── Selection ops ────────────────────────────────────────────────────
    const deleteSelection = () => {
        if (selection.size === 0 && !selectedConnector) return;
        mutate(b => ({
            elements: b.elements.filter(el => !selection.has(el.id)),
            connectors: b.connectors.filter(c => !selection.has(c.from) && !selection.has(c.to) && c.id !== selectedConnector),
        }));
        setSelection(new Set());
        setSelectedConnector(null);
    };

    const duplicateSelection = () => {
        if (selection.size === 0) return;
        const idMap = new Map<string, string>();
        const clones: BoardElement[] = [];
        board.elements.forEach(el => {
            if (!selection.has(el.id)) return;
            const nid = genId();
            idMap.set(el.id, nid);
            clones.push({
                ...el, id: nid, x: el.x + 28, y: el.y + 28,
                points: el.points ? el.points.map(([px, py]) => [px + 28, py + 28] as [number, number]) : undefined,
            });
        });
        const cloneCons: BoardConnector[] = board.connectors
            .filter(c => idMap.has(c.from) && idMap.has(c.to))
            .map(c => ({ ...c, id: genId(), from: idMap.get(c.from)!, to: idMap.get(c.to)! }));
        mutate(b => ({ elements: [...b.elements, ...clones], connectors: [...b.connectors, ...cloneCons] }));
        setSelection(new Set(clones.map(c => c.id)));
    };

    const reorderSelection = (toFront: boolean) => {
        if (selection.size === 0) return;
        mutate(b => {
            const sel = b.elements.filter(el => selection.has(el.id));
            const rest = b.elements.filter(el => !selection.has(el.id));
            return { ...b, elements: toFront ? [...rest, ...sel] : [...sel, ...rest] };
        });
    };

    const setSelectionColor = (color: string) => {
        setActiveColor(color);
        if (selection.size === 0) return;
        mutate(b => ({ ...b, elements: b.elements.map(el => selection.has(el.id) && el.type !== 'text' ? { ...el, color } : el) }));
    };

    const reactToSelection = (emoji: string) => {
        if (selection.size === 0) return;
        mutate(b => ({
            ...b, elements: b.elements.map(el => selection.has(el.id)
                ? { ...el, reactions: { ...(el.reactions || {}), [emoji]: ((el.reactions || {})[emoji] || 0) + 1 } }
                : el)
        }));
    };

    // ── Suite inserts (one-shot: drop at view center, select, back to V) ─
    const insertWidget = (type: 'table' | 'kanban' | 'doc' | 'mindmap' | 'screen') => {
        const rect = containerRef.current?.getBoundingClientRect();
        const cx = rect ? (rect.width / 2 - cam.tx) / cam.z : 200;
        const cy = rect ? (rect.height / 2 - cam.ty) / cam.z : 200;
        const d = DEFAULT_SIZE[type];
        const el: BoardElement = { id: genId(), type, x: cx - d.w / 2, y: cy - d.h / 2, w: d.w, h: d.h, text: '' };
        if (type === 'table') el.cells = [['', '', ''], ['', '', ''], ['', '', '']];
        if (type === 'kanban') el.columns = [{ title: 'To do', cards: [] }, { title: 'Doing', cards: [] }, { title: 'Done', cards: [] }];
        if (type === 'doc') { el.text = 'Untitled doc\n\nStart writing…'; }
        if (type === 'mindmap') { el.text = 'Idea'; el.color = '#FBF5F0'; }
        if (type === 'screen') { el.text = 'Screen'; el.blocks = [{ id: genId(), kind: 'header', label: 'Title' }, { id: genId(), kind: 'text', label: 'Describe this view…' }, { id: genId(), kind: 'button', label: 'Continue' }]; }
        mutate(b => ({ ...b, elements: [...b.elements, el] }));
        setSelection(new Set([el.id]));
        setTool('select');
    };

    const stampTemplate = (t: BoardTemplate) => {
        const rect = containerRef.current?.getBoundingClientRect();
        const cx = rect ? (rect.width / 2 - cam.tx) / cam.z : 200;
        const cy = rect ? (rect.height / 2 - cam.ty) / cam.z : 200;
        const { elements, connectors } = t.build(cx - 400, cy - 280);
        mutate(b => ({ elements: [...b.elements, ...elements], connectors: [...b.connectors, ...connectors] }));
        setTemplatesOpen(false);
        setSelection(new Set());
        setTimeout(() => fitView(elements), 60);
        toast(`${t.name} added to the board`);
    };

    // ── Keyboard shortcuts ───────────────────────────────────────────────
    useEffect(() => {
        const isTyping = () => {
            const t = document.activeElement?.tagName;
            return t === 'TEXTAREA' || t === 'INPUT' || t === 'SELECT';
        };
        const down = (e: KeyboardEvent) => {
            if (presentIdx !== null) {
                if (e.key === 'Escape') setPresentIdx(null);
                if (e.key === 'ArrowRight') setPresentIdx(i => Math.min((i ?? 0) + 1, visibleFrames.length - 1));
                if (e.key === 'ArrowLeft') setPresentIdx(i => Math.max((i ?? 0) - 1, 0));
                return;
            }
            if (e.code === 'Space' && !isTyping()) { setSpaceHeld(true); e.preventDefault(); return; }
            if (isTyping()) return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelection(); return; }
            if (e.ctrlKey || e.metaKey) return;
            if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelection(); return; }
            if (e.key === 'Escape') {
                setSelection(new Set()); setSelectedConnector(null); setPendingFrom(null); setEditingId(null);
                setMarquee(null); setTemplatesOpen(false); setVotingMode(false); setSubEdit(null); setScreenEditId(null); setTool('select');
                return;
            }
            const map: Record<string, Tool> = {
                v: 'select', h: 'hand', s: 'sticky', n: 'sticky', r: 'rect', o: 'ellipse',
                d: 'diamond', t: 'text', p: 'pen', e: 'eraser', c: 'connector', l: 'connector', f: 'frame',
            };
            const t = map[e.key.toLowerCase()];
            if (t) setTool(t);
        };
        const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    });

    // ── Canvas pointer handlers ──────────────────────────────────────────
    const onCanvasPointerDown = (e: React.PointerEvent) => {
        if (editingId) { setEditingId(null); return; }
        if (subEdit) { setSubEdit(null); return; }
        containerRef.current?.setPointerCapture(e.pointerId);
        const { x, y } = toWorld(e.clientX, e.clientY);

        if (e.button === 1 || spaceHeld || tool === 'hand') {
            dragRef.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, otx: cam.tx, oty: cam.ty };
            return;
        }
        if (e.button !== 0) return;

        if (tool === 'sticky' || tool === 'text') {
            const d = DEFAULT_SIZE[tool];
            const el: BoardElement = {
                id: genId(), type: tool, x: x - d.w / 2, y: y - d.h / 2, w: d.w, h: d.h,
                text: '', color: tool === 'sticky' ? activeColor : undefined,
            };
            mutate(b => ({ ...b, elements: [...b.elements, el] }));
            setSelection(new Set([el.id]));
            setEditingId(el.id);
            setTool('select'); // one-shot
            return;
        }
        if (tool === 'rect' || tool === 'ellipse' || tool === 'diamond' || tool === 'frame') {
            const el: BoardElement = {
                id: genId(), type: tool, x, y, w: 1, h: 1, text: tool === 'frame' ? `Frame ${frames.length + 1}` : '',
                color: tool === 'frame' ? undefined : '#ffffff',
            };
            mutate(b => ({ ...b, elements: [...b.elements, el] }));
            dragRef.current = { kind: 'create', id: el.id, sx: x, sy: y };
            return;
        }
        if (tool === 'pen') {
            const el: BoardElement = { id: genId(), type: 'draw', x, y, w: 0, h: 0, points: [[x, y]], color: '#26251e' };
            mutate(b => ({ ...b, elements: [...b.elements, el] }));
            dragRef.current = { kind: 'draw', id: el.id };
            return;
        }
        if (tool === 'connector' || tool === 'eraser') { if (tool === 'connector') setPendingFrom(null); return; }

        // select tool on empty space → marquee
        setSelection(new Set());
        setSelectedConnector(null);
        dragRef.current = { kind: 'marquee', sx: x, sy: y };
        setMarquee({ x, y, w: 0, h: 0 });
    };

    const onCanvasPointerMove = (e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        if (d.kind === 'pan') {
            setCam(c => ({ ...c, tx: d.otx + e.clientX - d.sx, ty: d.oty + e.clientY - d.sy }));
            return;
        }
        const { x, y } = toWorld(e.clientX, e.clientY);
        if (d.kind === 'bluedot') {
            if (Math.hypot(x - d.sx, y - d.sy) > 6 / cam.z) d.moved = true;
            setBluePoint({ x, y });
            return;
        }
        if (d.kind === 'create') {
            mutate(b => ({
                ...b, elements: b.elements.map(el => el.id === d.id
                    ? { ...el, x: Math.min(d.sx, x), y: Math.min(d.sy, y), w: Math.abs(x - d.sx), h: Math.abs(y - d.sy) }
                    : el)
            }), false);
        }
        if (d.kind === 'draw') {
            mutate(b => ({
                ...b, elements: b.elements.map(el => el.id === d.id && el.points
                    ? { ...el, points: [...el.points, [x, y] as [number, number]] }
                    : el)
            }), false);
        }
        if (d.kind === 'marquee') {
            setMarquee({ x: Math.min(d.sx, x), y: Math.min(d.sy, y), w: Math.abs(x - d.sx), h: Math.abs(y - d.sy) });
        }
        if (d.kind === 'move') {
            const dx = x - d.sx, dy = y - d.sy;
            mutate(b => ({
                ...b, elements: b.elements.map(el => {
                    const o = d.orig.get(el.id);
                    if (!o) return el;
                    return {
                        ...el, x: o.x + dx, y: o.y + dy,
                        points: o.points ? o.points.map(([px, py]) => [px + dx, py + dy] as [number, number]) : el.points,
                    };
                })
            }), false);
        }
        if (d.kind === 'resize') {
            const o = d.orig;
            mutate(b => ({
                ...b, elements: b.elements.map(el => {
                    if (el.id !== d.id) return el;
                    let nx = o.x, ny = o.y, nw = o.w, nh = o.h;
                    if (d.handle.includes('e')) nw = Math.max(30, x - o.x);
                    if (d.handle.includes('s')) nh = Math.max(30, y - o.y);
                    if (d.handle.includes('w')) { nx = Math.min(x, o.x + o.w - 30); nw = o.x + o.w - nx; }
                    if (d.handle.includes('n')) { ny = Math.min(y, o.y + o.h - 30); nh = o.y + o.h - ny; }
                    return { ...el, x: nx, y: ny, w: nw, h: nh };
                })
            }), false);
        }
    };

    const onCanvasPointerUp = (e: React.PointerEvent) => {
        const d = dragRef.current;
        dragRef.current = null;
        if (!d) return;
        if (d.kind === 'bluedot') {
            const src = boardRef.current.elements.find(el => el.id === d.fromId);
            setBluePoint(null);
            if (!src) return;
            const { x, y } = toWorld(e.clientX, e.clientY);
            if (d.moved) {
                // drag: connect to the element under the cursor, or create a twin there
                const hit = [...boardRef.current.elements].reverse().find(el =>
                    el.type !== 'draw' && el.type !== 'frame' && el.id !== src.id &&
                    x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h);
                if (hit) {
                    mutate(b => ({ ...b, connectors: [...b.connectors, { id: genId(), from: src.id, to: hit.id }] }));
                } else {
                    const twin: BoardElement = { ...src, id: genId(), x: x - src.w / 2, y: y - src.h / 2, text: '', points: undefined, votes: undefined, reactions: undefined };
                    mutate(b => ({
                        elements: [...b.elements, twin],
                        connectors: [...b.connectors, { id: genId(), from: src.id, to: twin.id }],
                    }));
                    setSelection(new Set([twin.id]));
                    setEditingId(twin.id);
                }
            } else {
                // click: auto-create a connected twin one gap away in the dot's direction
                const GAP = 70;
                const pos = {
                    n: { x: src.x, y: src.y - GAP - src.h }, s: { x: src.x, y: src.y + src.h + GAP },
                    e: { x: src.x + src.w + GAP, y: src.y }, w: { x: src.x - GAP - src.w, y: src.y },
                }[d.dir];
                const twin: BoardElement = { ...src, id: genId(), ...pos, text: '', points: undefined, votes: undefined, reactions: undefined };
                mutate(b => ({
                    elements: [...b.elements, twin],
                    connectors: [...b.connectors, { id: genId(), from: src.id, to: twin.id }],
                }));
                setSelection(new Set([twin.id]));
                setEditingId(twin.id);
            }
            return;
        }
        if (d.kind === 'create') {
            mutate(b => ({ ...b, elements: b.elements.map(el => el.id === d.id ? { ...el, w: Math.max(el.w, 40), h: Math.max(el.h, 30) } : el) }), false);
            setSelection(new Set([d.id]));
            setTool('select'); // one-shot
        }
        if (d.kind === 'draw') {
            mutate(b => ({
                ...b, elements: b.elements.map(el => {
                    if (el.id !== d.id || !el.points || el.points.length === 0) return el;
                    const xs = el.points.map(p => p[0]), ys = el.points.map(p => p[1]);
                    const minX = Math.min(...xs), minY = Math.min(...ys);
                    return { ...el, x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
                })
            }), false);
        }
        if (d.kind === 'marquee' && marquee) {
            const hit = board.elements.filter(el =>
                el.x < marquee.x + marquee.w && el.x + el.w > marquee.x &&
                el.y < marquee.y + marquee.h && el.y + el.h > marquee.y
            ).map(el => el.id);
            if (hit.length) setSelection(new Set(hit));
            setMarquee(null);
        }
    };

    // ── Element interaction ──────────────────────────────────────────────
    const eraseElement = (el: BoardElement) => {
        mutate(b => ({
            elements: b.elements.filter(e2 => e2.id !== el.id),
            connectors: b.connectors.filter(c => c.from !== el.id && c.to !== el.id),
        }));
    };

    const onElementPointerDown = (e: React.PointerEvent, el: BoardElement) => {
        if (el.locked) return;
        if (tool === 'eraser') { e.stopPropagation(); eraseElement(el); return; }
        if (votingMode && tool === 'select') {
            e.stopPropagation();
            patchEl(el.id, { votes: Math.max(0, (el.votes || 0) + (e.altKey ? -1 : 1)) }, true);
            return;
        }
        if (tool === 'connector') {
            e.stopPropagation();
            if (!pendingFrom) { setPendingFrom(el.id); return; }
            if (pendingFrom !== el.id) {
                mutate(b => ({ ...b, connectors: [...b.connectors, { id: genId(), from: pendingFrom, to: el.id }] }));
            }
            setPendingFrom(null);
            setTool('select'); // one-shot once the connection completes
            return;
        }
        if (tool !== 'select' || editingId === el.id) return;
        e.stopPropagation();
        containerRef.current?.setPointerCapture(e.pointerId);
        setSelectedConnector(null);

        let sel = new Set(selection);
        if (e.shiftKey) { sel.has(el.id) ? sel.delete(el.id) : sel.add(el.id); }
        else if (!sel.has(el.id)) sel = new Set([el.id]);
        setSelection(sel);

        const { x, y } = toWorld(e.clientX, e.clientY);
        const orig = new Map<string, { x: number; y: number; points?: [number, number][] }>();
        const moveIds = new Set(sel);
        // dragging a frame carries everything whose center sits inside it
        board.elements.forEach(f => {
            if (f.type === 'frame' && sel.has(f.id)) {
                board.elements.forEach(e2 => { if (containsCenter(f, e2)) moveIds.add(e2.id); });
            }
        });
        board.elements.forEach(e2 => { if (moveIds.has(e2.id) && !e2.locked) orig.set(e2.id, { x: e2.x, y: e2.y, points: e2.points }); });
        snapshot();
        dragRef.current = { kind: 'move', sx: x, sy: y, orig };
    };

    const startBlueDot = (e: React.PointerEvent, el: BoardElement, dir: BlueDir) => {
        e.stopPropagation();
        containerRef.current?.setPointerCapture(e.pointerId);
        const { x, y } = toWorld(e.clientX, e.clientY);
        snapshot();
        dragRef.current = { kind: 'bluedot', fromId: el.id, dir, sx: x, sy: y, moved: false };
        setBluePoint({ x, y });
    };

    const startResize = (e: React.PointerEvent, el: BoardElement, handle: 'nw' | 'ne' | 'sw' | 'se') => {
        e.stopPropagation();
        containerRef.current?.setPointerCapture(e.pointerId);
        snapshot();
        dragRef.current = { kind: 'resize', id: el.id, handle, orig: { x: el.x, y: el.y, w: el.w, h: el.h } };
    };

    const startEditing = (el: BoardElement) => {
        if (el.type === 'draw' || el.type === 'table' || el.type === 'kanban') return;
        if (el.type === 'screen') { setScreenEditId(el.id); return; }
        snapshot();
        setEditingId(el.id);
    };

    // ── View controls ────────────────────────────────────────────────────
    const zoomBy = (factor: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const sx = rect.width / 2, sy = rect.height / 2;
        setCam(c => {
            const z = Math.min(4, Math.max(0.08, c.z * factor));
            const wx = (sx - c.tx) / c.z, wy = (sy - c.ty) / c.z;
            return { z, tx: sx - wx * z, ty: sy - wy * z };
        });
    };

    const fitView = (elements?: BoardElement[]) => {
        const els = elements && elements.length ? elements : boardRef.current.elements;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        if (!els.length) { setCam({ tx: rect.width / 2, ty: rect.height / 2, z: 1 }); return; }
        const minX = Math.min(...els.map(e => e.x)), maxX = Math.max(...els.map(e => e.x + e.w));
        const minY = Math.min(...els.map(e => e.y)), maxY = Math.max(...els.map(e => e.y + e.h));
        const bw = Math.max(maxX - minX, 50), bh = Math.max(maxY - minY, 50);
        const pad = 90;
        const z = Math.min(1.6, Math.max(0.08, Math.min((rect.width - pad * 2) / bw, (rect.height - pad * 2) / bh)));
        setCam({ z, tx: (rect.width - bw * z) / 2 - minX * z, ty: (rect.height - bh * z) / 2 - minY * z });
    };

    const visibleFrames = useMemo(() => frames.filter(f => !f.hidden), [frames]);

    // Presentation mode: zoom to each frame like a slide.
    useEffect(() => {
        if (presentIdx === null) return;
        const f = visibleFrames[presentIdx];
        if (!f) { setPresentIdx(null); return; }
        fitView([f]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [presentIdx]);

    const clearBoard = () => {
        if (board.elements.length === 0) return;
        const old = board;
        mutate(() => ({ elements: [], connectors: [] }));
        setSelection(new Set());
        toast('Board cleared', { duration: 6000, action: { label: 'Undo', onClick: () => commit(old) } });
    };

    // ── Import project tasks as stickies ─────────────────────────────────
    const importTasks = () => {
        const existing = new Set(board.elements.map(e => (e.text || '').trim()));
        const fresh = tasks.filter(t => !existing.has(t.title.trim()));
        if (!fresh.length) { toast('All tasks are already on the board'); return; }
        const startX = board.elements.length ? Math.max(...board.elements.map(e => e.x + e.w)) + 120 : 100;
        const colorFor = (p: string) => p === 'High' ? '#FFB3BA' : p === 'Low' ? '#A9DFBF' : '#FFF6A5';
        const added: BoardElement[] = fresh.map((t, i) => ({
            id: genId(), type: 'sticky' as const,
            x: startX + (i % 4) * 200, y: 100 + Math.floor(i / 4) * 200,
            w: 170, h: 170, text: t.title, color: colorFor(t.priority),
        }));
        mutate(b => ({ ...b, elements: [...b.elements, ...added] }));
        fitView([...board.elements, ...added]);
        toast(`${added.length} task${added.length === 1 ? '' : 's'} added to the board`);
    };

    // ── Apply Claude's board mutations ───────────────────────────────────
    const applyAIResult = (r: BoardAIResult) => {
        const prev = boardRef.current;
        let added = 0, updated = 0, removed = 0;
        let els = [...prev.elements];
        let cons = [...prev.connectors];

        (r.remove || []).forEach(id => {
            const before = els.length;
            els = els.filter(e => e.id !== id);
            if (els.length < before) { removed++; cons = cons.filter(c => c.from !== id && c.to !== id); }
        });

        (r.update || []).forEach(u => {
            els = els.map(e => {
                if (e.id !== u.id) return e;
                updated++;
                return {
                    ...e,
                    x: num(u.x, e.x), y: num(u.y, e.y),
                    w: num(u.w, e.w), h: num(u.h, e.h),
                    text: typeof u.text === 'string' ? u.text : e.text,
                    color: typeof u.color === 'string' ? u.color : e.color,
                };
            });
        });

        const refMap = new Map<string, string>();
        const pendingScreens: BoardElement[] = [];
        (r.add?.elements || []).forEach((raw: any) => {
            const type: BoardElementType = ELEMENT_TYPES.includes(raw?.type) && raw.type !== 'draw' ? raw.type : 'sticky';
            const d = DEFAULT_SIZE[type];
            const el: BoardElement = {
                id: genId(), type,
                x: num(raw?.x, 100 + added * 30), y: num(raw?.y, 100 + added * 30),
                w: num(raw?.w, d.w), h: num(raw?.h, d.h),
                text: typeof raw?.text === 'string' ? raw.text : '',
                color: typeof raw?.color === 'string' ? raw.color : (type === 'sticky' ? STICKY_COLORS[added % STICKY_COLORS.length] : type === 'mindmap' ? '#FBF5F0' : type === 'frame' ? undefined : '#ffffff'),
            };
            if (type === 'table') el.cells = Array.isArray(raw?.cells) && raw.cells.every((row: any) => Array.isArray(row))
                ? raw.cells.map((row: any[]) => row.map(c => String(c ?? ''))) : [['', '', ''], ['', '', ''], ['', '', '']];
            if (type === 'kanban') el.columns = Array.isArray(raw?.columns)
                ? raw.columns.filter((c: any) => c && typeof c.title === 'string').map((c: any) => ({ title: c.title, cards: Array.isArray(c.cards) ? c.cards.map((x: any) => String(x)) : [] }))
                : [{ title: 'To do', cards: [] }, { title: 'Doing', cards: [] }, { title: 'Done', cards: [] }];
            if (type === 'screen') { el.blocks = sanitizeBlocks(raw?.blocks) || [{ id: genId(), kind: 'header', label: el.text || 'Screen' }]; pendingScreens.push(el); }
            if (raw?.ref) refMap.set(String(raw.ref), el.id);
            if (raw?.id) refMap.set(String(raw.id), el.id);
            els.push(el);
            added++;
        });

        // Remap screen hotspot targets that referenced AI-side refs/ids.
        pendingScreens.forEach(s => {
            s.blocks = (s.blocks || []).map(b => b.targetScreenId
                ? { ...b, targetScreenId: refMap.get(b.targetScreenId) || (els.some(e => e.id === b.targetScreenId) ? b.targetScreenId : undefined) }
                : b);
        });

        (r.add?.connectors || []).forEach(c => {
            const from = refMap.get(String(c.from)) || String(c.from);
            const to = refMap.get(String(c.to)) || String(c.to);
            if (els.some(e => e.id === from) && els.some(e => e.id === to) && from !== to) {
                cons.push({ id: genId(), from, to, label: typeof c.label === 'string' ? c.label : undefined });
            }
        });

        if (added || updated || removed) {
            undoStack.current.push(prev);
            if (undoStack.current.length > 60) undoStack.current.shift();
            redoStack.current = [];
            commit({ elements: els, connectors: cons });
            if (added > 0) setTimeout(() => fitView(els), 60);
        }
        return { added, updated, removed };
    };

    // ── Derived render data ──────────────────────────────────────────────
    const singleSel = useMemo(
        () => selection.size === 1 ? board.elements.find(e => selection.has(e.id)) || null : null,
        [selection, board.elements]
    );

    const selectionBBox = useMemo(() => {
        const sel = board.elements.filter(e => selection.has(e.id));
        if (!sel.length) return null;
        const minX = Math.min(...sel.map(e => e.x)), minY = Math.min(...sel.map(e => e.y));
        const maxX = Math.max(...sel.map(e => e.x + e.w));
        return { minX, minY, maxX };
    }, [selection, board.elements]);

    const cursor = tool === 'hand' || spaceHeld ? 'grab'
        : tool === 'select' ? 'default'
        : tool === 'connector' ? 'pointer'
        : 'crosshair';

    const TOOLS: { id: Tool; icon: any; label: string; key: string }[] = [
        { id: 'select', icon: MousePointer2, label: 'Select', key: 'V' },
        { id: 'hand', icon: Hand, label: 'Pan', key: 'H' },
        { id: 'sticky', icon: StickyNote, label: 'Sticky note', key: 'N' },
        { id: 'rect', icon: Square, label: 'Rectangle', key: 'R' },
        { id: 'ellipse', icon: Circle, label: 'Ellipse', key: 'O' },
        { id: 'diamond', icon: Diamond, label: 'Decision', key: 'D' },
        { id: 'text', icon: Type, label: 'Text', key: 'T' },
        { id: 'pen', icon: Pencil, label: 'Draw', key: 'P' },
        { id: 'eraser', icon: Eraser, label: 'Eraser', key: 'E' },
        { id: 'connector', icon: ArrowUpRight, label: 'Connector', key: 'L' },
        { id: 'frame', icon: FrameIcon, label: 'Frame', key: 'F' },
    ];

    const SUITE: { type: 'table' | 'kanban' | 'doc' | 'mindmap' | 'screen'; icon: any; label: string }[] = [
        { type: 'table', icon: TableIcon, label: 'Table' },
        { type: 'kanban', icon: Columns, label: 'Kanban' },
        { type: 'doc', icon: FileText, label: 'Doc' },
        { type: 'mindmap', icon: Network, label: 'Mind map node' },
        { type: 'screen', icon: Smartphone, label: 'Prototype screen' },
    ];

    const renderShapeSvg = (el: BoardElement, stroke: string) => {
        const common = { fill: el.color || '#ffffff', stroke, strokeWidth: 2, vectorEffect: 'non-scaling-stroke' as const };
        return (
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {el.type === 'rect' && <rect x="1" y="1" width="98" height="98" rx="4" {...common} />}
                {el.type === 'ellipse' && <ellipse cx="50" cy="50" rx="49" ry="49" {...common} />}
                {el.type === 'diamond' && <polygon points="50,1 99,50 50,99 1,50" {...common} />}
            </svg>
        );
    };

    // ── Widget body renderers ────────────────────────────────────────────
    const stopAll = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };

    const renderTable = (el: BoardElement, isSel: boolean) => {
        const cells = el.cells || [['']];
        const cols = Math.max(...cells.map(r => r.length));
        const setCell = (r: number, c: number, v: string) =>
            patchEl(el.id, { cells: cells.map((row, ri) => ri === r ? row.map((cv, ci) => ci === c ? v : cv) : row) });
        return (
            <div className="w-full h-full bg-white rounded-lg overflow-hidden flex flex-col" style={{ border: '1.5px solid #CFCDC4' }}>
                {cells.map((row, r) => (
                    <div key={r} className="flex flex-1 min-h-0" style={{ background: r === 0 ? '#F5F4EE' : '#fff', borderBottom: r < cells.length - 1 ? '1px solid #E8E6DC' : 'none' }}>
                        {Array.from({ length: cols }).map((_, c) => {
                            const editing = subEdit?.kind === 'cell' && subEdit.elId === el.id && subEdit.r === r && subEdit.c === c;
                            return (
                                <div key={c} className={`flex-1 min-w-0 px-2 flex items-center text-[12px] ${r === 0 ? 'font-semibold' : ''}`}
                                    style={{ borderRight: c < cols - 1 ? '1px solid #E8E6DC' : 'none', color: '#43412f' }}
                                    onDoubleClick={(e) => { e.stopPropagation(); setSubEdit({ elId: el.id, kind: 'cell', r, c }); }}>
                                    {editing ? (
                                        <input autoFocus {...stopAll} value={row[c] || ''} onChange={e => setCell(r, c, e.target.value)}
                                            onBlur={() => setSubEdit(null)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') setSubEdit(null); }}
                                            className="w-full bg-transparent outline-none text-[12px]" />
                                    ) : <span className="truncate">{row[c]}</span>}
                                </div>
                            );
                        })}
                    </div>
                ))}
                {isSel && (
                    <>
                        <button {...stopAll} onClick={(e) => { e.stopPropagation(); patchEl(el.id, { cells: [...cells, Array(cols).fill('')] }, true); }}
                            title="Add row"
                            className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 h-5 rounded bg-white border border-hairline text-[10px] text-muted hover:text-ink">+ row</button>
                        <button {...stopAll} onClick={(e) => { e.stopPropagation(); patchEl(el.id, { cells: cells.map(r2 => [...r2, '']) }, true); }}
                            title="Add column"
                            className="absolute top-1/2 -right-10 -translate-y-1/2 px-2 h-5 rounded bg-white border border-hairline text-[10px] text-muted hover:text-ink">+ col</button>
                    </>
                )}
            </div>
        );
    };

    const renderKanban = (el: BoardElement) => {
        const columns = el.columns || [];
        const setCols = (next: KanbanColumn[], snap = true) => patchEl(el.id, { columns: next }, snap);
        return (
            <div className="w-full h-full bg-white rounded-xl overflow-hidden flex flex-col" style={{ border: '1.5px solid #CFCDC4' }}>
                <div className="px-3 h-8 flex items-center text-[12px] font-semibold shrink-0" style={{ background: '#F5F4EE', borderBottom: '1px solid #E8E6DC', color: '#43412f' }}>
                    {el.text || 'Kanban'}
                </div>
                <div className="flex-1 flex gap-2 p-2 overflow-x-auto min-h-0">
                    {columns.map((col, ci) => (
                        <div key={ci} className="w-44 shrink-0 rounded-lg p-1.5 flex flex-col gap-1.5 min-h-0" style={{ background: '#F5F4EE' }}>
                            <div className="px-1 text-[11px] font-semibold flex items-center justify-between" style={{ color: '#73716C' }}
                                onDoubleClick={(e) => { e.stopPropagation(); setSubEdit({ elId: el.id, kind: 'kcol', col: ci }); }}>
                                {subEdit?.kind === 'kcol' && subEdit.elId === el.id && subEdit.col === ci ? (
                                    <input autoFocus {...stopAll} value={col.title}
                                        onChange={e => setCols(columns.map((c2, j) => j === ci ? { ...c2, title: e.target.value } : c2), false)}
                                        onBlur={() => setSubEdit(null)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') setSubEdit(null); }}
                                        className="w-full bg-transparent outline-none text-[11px] font-semibold" />
                                ) : <><span className="truncate">{col.title}</span><span className="opacity-50">{col.cards.length}</span></>}
                            </div>
                            <div className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0">
                                {col.cards.map((card, idx) => {
                                    const editing = subEdit?.kind === 'card' && subEdit.elId === el.id && subEdit.col === ci && subEdit.idx === idx;
                                    return (
                                        <div key={idx} className="group/card relative bg-white rounded-md px-2 py-1.5 text-[11.5px]" style={{ border: '1px solid #E8E6DC', color: '#43412f' }}
                                            onDoubleClick={(e) => { e.stopPropagation(); setSubEdit({ elId: el.id, kind: 'card', col: ci, idx }); }}>
                                            {editing ? (
                                                <input autoFocus {...stopAll} value={card}
                                                    onChange={e => setCols(columns.map((c2, j) => j === ci ? { ...c2, cards: c2.cards.map((x, k) => k === idx ? e.target.value : x) } : c2), false)}
                                                    onBlur={() => setSubEdit(null)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') setSubEdit(null); }}
                                                    className="w-full bg-transparent outline-none text-[11.5px]" />
                                            ) : <span className="break-words pr-3">{card || '…'}</span>}
                                            <span className="absolute right-1 top-1 hidden group-hover/card:flex gap-0.5">
                                                {ci > 0 && <button {...stopAll} onClick={(e) => { e.stopPropagation(); setCols(columns.map((c2, j) => j === ci ? { ...c2, cards: c2.cards.filter((_, k) => k !== idx) } : j === ci - 1 ? { ...c2, cards: [...c2.cards, card] } : c2)); }} className="text-[9px] text-muted hover:text-ink">‹</button>}
                                                {ci < columns.length - 1 && <button {...stopAll} onClick={(e) => { e.stopPropagation(); setCols(columns.map((c2, j) => j === ci ? { ...c2, cards: c2.cards.filter((_, k) => k !== idx) } : j === ci + 1 ? { ...c2, cards: [...c2.cards, card] } : c2)); }} className="text-[9px] text-muted hover:text-ink">›</button>}
                                                <button {...stopAll} onClick={(e) => { e.stopPropagation(); setCols(columns.map((c2, j) => j === ci ? { ...c2, cards: c2.cards.filter((_, k) => k !== idx) } : c2)); }} className="text-[9px] text-muted hover:text-error">×</button>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <button {...stopAll}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCols(columns.map((c2, j) => j === ci ? { ...c2, cards: [...c2.cards, 'New card'] } : c2));
                                    setSubEdit({ elId: el.id, kind: 'card', col: ci, idx: col.cards.length });
                                }}
                                className="h-6 rounded-md text-[10.5px] text-muted hover:text-ink hover:bg-white transition-colors shrink-0">+ Card</button>
                        </div>
                    ))}
                    <button {...stopAll} onClick={(e) => { e.stopPropagation(); setCols([...columns, { title: `Column ${columns.length + 1}`, cards: [] }]); }}
                        className="w-9 shrink-0 rounded-lg text-muted hover:text-ink hover:bg-[#F5F4EE] transition-colors flex items-center justify-center" style={{ border: '1px dashed #DAD7CB' }}>
                        <Plus size={14} />
                    </button>
                </div>
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────
    const presenting = presentIdx !== null;

    return (
        <div
            ref={containerRef}
            className="-m-8 h-[calc(100vh-5rem)] relative overflow-hidden bg-canvas select-none"
            style={{
                cursor, touchAction: 'none',
                backgroundImage: showGrid ? 'radial-gradient(rgba(38,37,30,0.13) 1px, transparent 1px)' : undefined,
                backgroundSize: `${24 * cam.z}px ${24 * cam.z}px`,
                backgroundPosition: `${cam.tx}px ${cam.ty}px`,
            }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
        >
            {/* ── World (transformed) ─────────────────────────────────── */}
            <div className="absolute top-0 left-0" style={{ transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`, transformOrigin: '0 0' }}>

                {/* Frames (always behind content) */}
                {frames.filter(f => !f.hidden).map(el => {
                    const isSel = selection.has(el.id);
                    const isEditing = editingId === el.id;
                    return (
                        <div key={el.id} className="absolute" style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
                            onPointerDown={(e) => onElementPointerDown(e, el)}
                            onDoubleClick={() => startEditing(el)}>
                            <div className="absolute -top-7 left-0 flex items-center gap-1.5" style={{ fontSize: 13 / Math.min(cam.z, 1) }}>
                                {isEditing ? (
                                    <input autoFocus value={el.text || ''} {...stopAll}
                                        onChange={(e) => patchEl(el.id, { text: e.target.value })}
                                        onBlur={() => setEditingId(null)}
                                        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null); }}
                                        className="bg-white border border-hairline rounded px-1.5 outline-none font-medium text-ink" />
                                ) : (
                                    <span className="font-medium text-muted px-0.5">{el.text || 'Frame'}</span>
                                )}
                            </div>
                            <div className="w-full h-full rounded-xl"
                                style={{
                                    background: 'rgba(255,255,255,0.55)',
                                    border: `2px solid ${isSel ? '#D97757' : '#D5D2C6'}`,
                                }} />
                            {isSel && singleSel?.id === el.id && (['nw', 'ne', 'sw', 'se'] as const).map(h => (
                                <div key={h} onPointerDown={(e) => startResize(e, el, h)} className="absolute bg-white"
                                    style={{
                                        width: 9 / cam.z, height: 9 / cam.z, border: `${1.5 / cam.z}px solid #D97757`, borderRadius: 2 / cam.z,
                                        left: h.includes('w') ? -5 / cam.z : undefined, right: h.includes('e') ? -5 / cam.z : undefined,
                                        top: h.includes('n') ? -5 / cam.z : undefined, bottom: h.includes('s') ? -5 / cam.z : undefined,
                                        cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize',
                                    }} />
                            ))}
                        </div>
                    );
                })}

                {/* Connectors + freehand strokes (SVG underlay) */}
                <svg className="absolute top-0 left-0" width="1" height="1" style={{ overflow: 'visible' }}>
                    <defs>
                        <marker id="board-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b6857" />
                        </marker>
                    </defs>
                    {board.connectors.map(c => {
                        const from = board.elements.find(e => e.id === c.from);
                        const to = board.elements.find(e => e.id === c.to);
                        if (!from || !to || hiddenIds.has(from.id) || hiddenIds.has(to.id)) return null;
                        const p1 = edgePoint(from, center(to));
                        const p2 = edgePoint(to, center(from));
                        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                        const isSel = selectedConnector === c.id;
                        return (
                            <g key={c.id}>
                                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                    stroke={isSel ? '#D97757' : '#6b6857'} strokeWidth={isSel ? 3 : 2}
                                    markerEnd="url(#board-arrow)" />
                                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={14}
                                    style={{ cursor: 'pointer' }}
                                    onPointerDown={(e) => { e.stopPropagation(); setSelection(new Set()); setSelectedConnector(c.id); }} />
                                {c.label && (
                                    <text x={mid.x} y={mid.y - 6} textAnchor="middle"
                                        fontSize={13} fill="#6b6857" fontFamily="Inter, sans-serif"
                                        style={{ paintOrder: 'stroke', stroke: '#f7f7f4', strokeWidth: 4 }}>
                                        {c.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    {/* blue-dot temp line */}
                    {dragRef.current?.kind === 'bluedot' && bluePoint && (() => {
                        const src = board.elements.find(e => e.id === (dragRef.current as any).fromId);
                        if (!src) return null;
                        const p1 = edgePoint(src, bluePoint);
                        return <line x1={p1.x} y1={p1.y} x2={bluePoint.x} y2={bluePoint.y} stroke="#4A8FE7" strokeWidth={2} strokeDasharray="6 4" markerEnd="url(#board-arrow)" />;
                    })()}
                    {board.elements.filter(e => e.type === 'draw' && e.points && e.points.length > 1 && !hiddenIds.has(e.id)).map(el => (
                        <g key={el.id}>
                            <path d={`M ${el.points!.map(p => `${p[0]} ${p[1]}`).join(' L ')}`}
                                fill="none" stroke={el.color || '#26251e'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                            <path d={`M ${el.points!.map(p => `${p[0]} ${p[1]}`).join(' L ')}`}
                                fill="none" stroke="transparent" strokeWidth={16}
                                onPointerDown={(e) => onElementPointerDown(e as any, el)} />
                            {selection.has(el.id) && (
                                <rect x={el.x - 4} y={el.y - 4} width={el.w + 8} height={el.h + 8}
                                    fill="none" stroke="#D97757" strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                            )}
                        </g>
                    ))}
                </svg>

                {/* Elements */}
                {board.elements.filter(e => e.type !== 'draw' && e.type !== 'frame' && !hiddenIds.has(e.id)).map(el => {
                    const isSel = selection.has(el.id);
                    const isEditing = editingId === el.id;
                    const isPendingSrc = pendingFrom === el.id;
                    const showDots = isSel && singleSel?.id === el.id && tool === 'select' && !isEditing &&
                        ['sticky', 'rect', 'ellipse', 'diamond', 'mindmap', 'screen', 'doc'].includes(el.type);
                    return (
                        <div
                            key={el.id}
                            className="absolute"
                            style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
                            onPointerDown={(e) => onElementPointerDown(e, el)}
                            onDoubleClick={() => startEditing(el)}
                        >
                            {el.type === 'sticky' && (
                                <div className="w-full h-full rounded-[3px] flex items-center justify-center p-3 overflow-hidden"
                                    style={{ background: el.color || STICKY_COLORS[0], boxShadow: '0 7px 16px -7px rgba(38,37,30,0.4)' }}>
                                    {!isEditing && <span className="text-[14px] font-medium text-center whitespace-pre-wrap break-words" style={{ color: '#43412f' }}>{el.text}</span>}
                                </div>
                            )}
                            {(el.type === 'rect' || el.type === 'ellipse' || el.type === 'diamond') && (
                                <div className="w-full h-full relative">
                                    {renderShapeSvg(el, '#6b6857')}
                                    {!isEditing && (
                                        <div className="absolute inset-0 flex items-center justify-center p-2 overflow-hidden">
                                            <span className="text-[13px] font-medium text-center whitespace-pre-wrap break-words text-ink">{el.text}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {el.type === 'text' && !isEditing && (
                                <div className="w-full h-full overflow-hidden">
                                    <span className="font-semibold text-ink whitespace-pre-wrap break-words" style={{ fontSize: el.fontSize || 17 }}>{el.text}</span>
                                </div>
                            )}
                            {el.type === 'mindmap' && (
                                <div className="w-full h-full rounded-full flex items-center justify-center px-4 overflow-hidden"
                                    style={{ background: el.color || '#FBF5F0', border: '1.5px solid #D9A98F', boxShadow: '0 4px 10px -6px rgba(38,37,30,0.3)' }}>
                                    {!isEditing && <span className="text-[13px] font-medium text-center truncate" style={{ color: '#43412f' }}>{el.text}</span>}
                                </div>
                            )}
                            {el.type === 'doc' && (
                                <div className="w-full h-full bg-white rounded-lg overflow-hidden flex flex-col" style={{ border: '1.5px solid #CFCDC4', boxShadow: '0 7px 18px -8px rgba(38,37,30,0.3)' }}>
                                    <div className="h-6 px-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide shrink-0" style={{ background: '#F5F4EE', color: '#9C998D', borderBottom: '1px solid #E8E6DC' }}>
                                        <FileText size={9} /> Doc
                                    </div>
                                    {!isEditing && <div className="flex-1 p-3 text-[12px] leading-relaxed whitespace-pre-wrap break-words overflow-hidden" style={{ color: '#43412f' }}>{el.text}</div>}
                                    {isEditing && <div className="flex-1" />}
                                </div>
                            )}
                            {el.type === 'table' && renderTable(el, isSel)}
                            {el.type === 'kanban' && renderKanban(el)}
                            {el.type === 'screen' && (
                                <div className="w-full h-full bg-white rounded-2xl flex flex-col overflow-hidden"
                                    style={{ border: `2px solid ${isSel ? '#D97757' : '#DAD7CB'}`, boxShadow: '0 10px 24px -10px rgba(38,37,30,0.35)' }}>
                                    <div className="h-5 flex items-center justify-center shrink-0"><div className="w-10 h-1 rounded-full" style={{ background: '#E8E5DB' }} /></div>
                                    <div className="px-2 pb-1 text-[10px] font-semibold text-center truncate shrink-0" style={{ color: '#29261B' }}>{el.text || 'Screen'}</div>
                                    <div className="flex-1 flex flex-col gap-1.5 p-2 overflow-hidden">
                                        {(el.blocks || []).map(b => <ScreenBlockView key={b.id} b={b} />)}
                                    </div>
                                </div>
                            )}

                            {/* Inline text editing */}
                            {isEditing && el.type !== 'frame' && (
                                <textarea
                                    // Deferred focus: autoFocus during the creating pointerdown gets
                                    // blurred by the browser's default mousedown focus handling.
                                    ref={(ta) => { if (ta && document.activeElement !== ta) setTimeout(() => ta.focus({ preventScroll: true }), 0); }}
                                    value={el.text || ''}
                                    onChange={(e) => patchEl(el.id, { text: e.target.value })}
                                    onBlur={() => setEditingId(null)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') setEditingId(null); }}
                                    className={`absolute w-full bg-transparent resize-none focus:outline-none p-2 ${
                                        el.type === 'text' ? 'inset-0 h-full text-[17px] font-semibold text-left'
                                        : el.type === 'doc' ? 'left-0 right-0 bottom-0 top-6 text-[12px] text-left leading-relaxed p-3'
                                        : 'inset-0 h-full text-[14px] font-medium text-center'}`}
                                    style={{ color: el.type === 'sticky' || el.type === 'mindmap' ? '#43412f' : '#26251e' }}
                                />
                            )}

                            {/* votes + reactions badges */}
                            {(el.votes || 0) > 0 && (
                                <div className="absolute -top-2.5 -right-2.5 min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow"
                                    style={{ background: '#C2410C', transform: `scale(${1 / Math.min(cam.z, 1.4)})`, transformOrigin: 'top right' }}>
                                    {el.votes}
                                </div>
                            )}
                            {el.reactions && Object.keys(el.reactions).length > 0 && (
                                <div className="absolute -bottom-6 left-0 flex gap-1" style={{ transform: `scale(${1 / Math.min(cam.z, 1.4)})`, transformOrigin: 'top left' }}>
                                    {Object.entries(el.reactions).map(([em, n]) => (
                                        <span key={em} className="px-1.5 h-5 rounded-full bg-white border border-hairline text-[10px] flex items-center gap-0.5 shadow-sm">{em} {n}</span>
                                    ))}
                                </div>
                            )}

                            {/* Selection / connector-source ring */}
                            {(isSel || isPendingSrc) && (
                                <div className="absolute pointer-events-none"
                                    style={{
                                        inset: -3 / cam.z,
                                        border: `${1.8 / cam.z}px solid ${isPendingSrc ? '#1f8a65' : '#D97757'}`,
                                        borderRadius: 4,
                                    }} />
                            )}

                            {/* Blue dots — click to spawn a connected twin, drag to connect */}
                            {showDots && (['n', 'e', 's', 'w'] as BlueDir[]).map(dir => (
                                <div key={dir}
                                    onPointerDown={(e) => startBlueDot(e, el, dir)}
                                    title="Click: add connected copy · Drag: connect"
                                    className="absolute rounded-full hover:scale-125 transition-transform"
                                    style={{
                                        width: 12 / cam.z, height: 12 / cam.z, background: '#4A8FE7',
                                        border: `${2 / cam.z}px solid #fff`, boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                        cursor: 'crosshair',
                                        left: dir === 'w' ? -18 / cam.z : dir === 'e' ? undefined : '50%',
                                        right: dir === 'e' ? -18 / cam.z : undefined,
                                        top: dir === 'n' ? -18 / cam.z : dir === 's' ? undefined : '50%',
                                        bottom: dir === 's' ? -18 / cam.z : undefined,
                                        transform: dir === 'n' || dir === 's' ? 'translateX(-50%)' : dir === 'e' || dir === 'w' ? 'translateY(-50%)' : undefined,
                                        marginTop: (dir === 'e' || dir === 'w') ? -6 / cam.z : undefined,
                                        marginLeft: (dir === 'n' || dir === 's') ? -6 / cam.z : undefined,
                                    }} />
                            ))}

                            {/* Resize handles (single selection) */}
                            {isSel && singleSel?.id === el.id && (['nw', 'ne', 'sw', 'se'] as const).map(h => (
                                <div key={h}
                                    onPointerDown={(e) => startResize(e, el, h)}
                                    className="absolute bg-white"
                                    style={{
                                        width: 9 / cam.z, height: 9 / cam.z,
                                        border: `${1.5 / cam.z}px solid #D97757`, borderRadius: 2 / cam.z,
                                        left: h.includes('w') ? -5 / cam.z : undefined,
                                        right: h.includes('e') ? -5 / cam.z : undefined,
                                        top: h.includes('n') ? -5 / cam.z : undefined,
                                        bottom: h.includes('s') ? -5 / cam.z : undefined,
                                        cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize',
                                    }} />
                            ))}
                        </div>
                    );
                })}

                {/* Marquee */}
                {marquee && (
                    <div className="absolute bg-[#D97757]/10 border border-[#D97757]/60 pointer-events-none"
                        style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />
                )}
            </div>

            {/* ── Empty-state hint ─────────────────────────────────────── */}
            {board.elements.length === 0 && !presenting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <p className="display text-[28px] text-ink/30 mb-2">Your Space is empty</p>
                    <p className="text-sm text-muted mb-4">Press <kbd className="font-mono bg-surface-card border border-hairline rounded px-1.5">N</kbd> for a sticky — or ask Claude to plan something <ClaudeLogo size={13} className="inline text-[#D97757]" /></p>
                    <button data-board-ui onPointerDown={(e) => e.stopPropagation()} onClick={() => setTemplatesOpen(true)}
                        className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-card border border-hairline text-body hover:text-ink hover:border-[#D97757]/60 shadow-sm transition-all">
                        <LayoutTemplate size={15} /> Browse templates
                    </button>
                </div>
            )}

            {/* ── Left creation toolbar ────────────────────────────────── */}
            {!presenting && (
                <div data-board-ui onPointerDown={(e) => e.stopPropagation()}
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 bg-surface-card border border-hairline rounded-xl p-1.5 shadow-[0_10px_30px_-10px_rgba(38,37,30,0.3)] z-20 max-h-[calc(100%-32px)] overflow-y-auto">
                    {TOOLS.map(t => (
                        <button key={t.id}
                            onClick={() => { setTool(t.id); setPendingFrom(null); }}
                            title={`${t.label} (${t.key})`}
                            className={`p-2.5 rounded-lg transition-colors ${tool === t.id ? 'bg-[#D97757] text-white' : 'text-body hover:bg-ink/[0.05] hover:text-ink'}`}>
                            <t.icon size={18} />
                        </button>
                    ))}
                    <div className="h-px bg-hairline my-1 mx-1.5" />
                    {SUITE.map(s => (
                        <button key={s.type} onClick={() => insertWidget(s.type)} title={s.label}
                            className="p-2.5 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink transition-colors">
                            <s.icon size={18} />
                        </button>
                    ))}
                    <div className="h-px bg-hairline my-1 mx-1.5" />
                    <button onClick={() => setTemplatesOpen(true)} title="Templates"
                        className="p-2.5 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink transition-colors"><LayoutTemplate size={18} /></button>
                    <button onClick={undo} title="Undo (Ctrl+Z)" className="p-2.5 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink transition-colors"><Undo2 size={18} /></button>
                    <button onClick={redo} title="Redo (Ctrl+Shift+Z)" className="p-2.5 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink transition-colors"><Redo2 size={18} /></button>
                    <button onClick={clearBoard} title="Clear board" className="p-2.5 rounded-lg text-body hover:bg-error/10 hover:text-error transition-colors"><Trash2 size={18} /></button>
                </div>
            )}

            {/* ── Top-right: collaboration cluster + Claude ────────────── */}
            {!presenting && (
                <div data-board-ui onPointerDown={(e) => e.stopPropagation()} className="absolute right-4 top-4 flex items-center gap-2 z-20">
                    {/* timer */}
                    <div className="relative">
                        <button onClick={() => setTimerOpen(o => !o)} title="Timer"
                            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium shadow-sm border transition-all ${timerEnd ? 'bg-[#29261B] text-white border-[#29261B]' : 'bg-surface-card border-hairline text-body hover:text-ink'}`}>
                            <TimerIcon size={15} />
                            {timerEnd && <span className="font-mono text-[12.5px]">{(() => { const s = Math.max(0, Math.ceil((timerEnd - now) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; })()}</span>}
                        </button>
                        {timerOpen && (
                            <div className="absolute top-full mt-1 right-0 w-40 bg-surface-card border border-hairline rounded-xl p-1.5 shadow-xl">
                                {[1, 5, 10, 15].map(m => (
                                    <button key={m} onClick={() => { setTimerEnd(Date.now() + m * 60000); setNow(Date.now()); setTimerOpen(false); }}
                                        className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-body hover:bg-ink/[0.04]">{m} minute{m > 1 ? 's' : ''}</button>
                                ))}
                                {timerEnd && <button onClick={() => { setTimerEnd(null); setTimerOpen(false); }} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-error hover:bg-error/10">Stop timer</button>}
                            </div>
                        )}
                    </div>
                    {/* voting */}
                    <button onClick={() => setVotingMode(v => !v)} title="Voting mode — click items to vote (Alt-click removes)"
                        className={`p-2.5 rounded-xl shadow-sm border transition-all ${votingMode ? 'bg-[#29261B] text-white border-[#29261B]' : 'bg-surface-card border-hairline text-body hover:text-ink'}`}>
                        <ThumbsUp size={15} />
                    </button>
                    {/* present frames */}
                    {visibleFrames.length > 0 && (
                        <button onClick={() => setPresentIdx(0)} title="Present frames as slides"
                            className="p-2.5 rounded-xl bg-surface-card border border-hairline text-body hover:text-ink shadow-sm transition-all">
                            <Presentation size={15} />
                        </button>
                    )}
                    {/* play prototype */}
                    {screens.length > 0 && (
                        <button onClick={() => setPlayOpen(true)} title="Play prototype"
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#29261B] text-white shadow-sm hover:bg-[#3a372c] transition-all">
                            <Play size={14} /> <span className="hidden lg:inline">Play</span>
                        </button>
                    )}
                    <button onClick={importTasks}
                        className="flex items-center gap-2 px-3.5 py-2.5 bg-surface-card border border-hairline rounded-xl text-sm text-body hover:text-ink hover:border-[#D97757]/50 shadow-sm transition-all">
                        <ClipboardList size={16} />
                        <span className="hidden xl:inline">Tasks → board</span>
                    </button>
                    <button onClick={() => setAiOpen(o => !o)}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all border
                            ${aiOpen ? 'bg-[#D97757] text-white border-[#D97757]' : 'bg-surface-card border-hairline text-body hover:text-ink hover:border-[#D97757]/60'}`}>
                        <ClaudeLogo size={16} />
                        <span className="hidden lg:inline">Claude</span>
                    </button>
                </div>
            )}

            {/* ── Mode banners ─────────────────────────────────────────── */}
            {tool === 'connector' && !presenting && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-ink text-canvas text-[13px] px-4 py-2 rounded-lg shadow-lg z-20 animate-pop-in pointer-events-none">
                    {pendingFrom ? 'Now click the target element' : 'Click the source element'} · <span className="opacity-60">Esc to cancel</span>
                </div>
            )}
            {votingMode && !presenting && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-ink text-canvas text-[13px] px-4 py-2 rounded-lg shadow-lg z-20 animate-pop-in pointer-events-none">
                    Voting mode — click items to vote · <span className="opacity-60">Alt-click removes · Esc to exit</span>
                </div>
            )}

            {/* ── Floating selection toolbar ───────────────────────────── */}
            {selection.size > 0 && selectionBBox && !editingId && !presenting && (
                <div data-board-ui onPointerDown={(e) => e.stopPropagation()}
                    className="absolute z-20 flex items-center gap-1 bg-surface-card border border-hairline rounded-xl p-1.5 shadow-[0_10px_30px_-10px_rgba(38,37,30,0.35)] animate-pop-in max-w-[calc(100%-32px)] flex-wrap"
                    style={{
                        left: Math.max(80, Math.min((selectionBBox.minX + selectionBBox.maxX) / 2 * cam.z + cam.tx - 200, (containerRef.current?.clientWidth || 800) - 430)),
                        top: Math.max(8, selectionBBox.minY * cam.z + cam.ty - 54),
                    }}>
                    {STICKY_COLORS.slice(0, 8).map(c => (
                        <button key={c} onClick={() => setSelectionColor(c)}
                            className="w-5 h-5 rounded-md border border-ink/10 hover:scale-110 transition-transform"
                            style={{ background: c }} />
                    ))}
                    {STICKY_COLORS.slice(8).map(c => (
                        <button key={c} onClick={() => setSelectionColor(c)}
                            className="w-5 h-5 rounded-md border border-ink/10 hover:scale-110 transition-transform hidden xl:block"
                            style={{ background: c }} />
                    ))}
                    <button onClick={() => setSelectionColor('#ffffff')}
                        className="w-5 h-5 rounded-md border border-hairline-strong bg-white hover:scale-110 transition-transform" />
                    <div className="w-px h-5 bg-hairline mx-1" />
                    {REACTION_EMOJIS.map(em => (
                        <button key={em} onClick={() => reactToSelection(em)} title={`React ${em}`}
                            className="w-6 h-6 rounded-md text-[13px] hover:bg-ink/[0.05] hover:scale-110 transition-all">{em}</button>
                    ))}
                    <div className="w-px h-5 bg-hairline mx-1" />
                    <button onClick={duplicateSelection} title="Duplicate (Ctrl+D)" className="p-1.5 rounded-md text-body hover:bg-ink/[0.05] hover:text-ink"><Copy size={15} /></button>
                    <button onClick={() => reorderSelection(true)} title="Bring to front" className="p-1.5 rounded-md text-body hover:bg-ink/[0.05] hover:text-ink"><ChevronsUp size={15} /></button>
                    <button onClick={() => reorderSelection(false)} title="Send to back" className="p-1.5 rounded-md text-body hover:bg-ink/[0.05] hover:text-ink"><ChevronsDown size={15} /></button>
                    <button onClick={deleteSelection} title="Delete" className="p-1.5 rounded-md text-body hover:bg-error/10 hover:text-error"><Trash2 size={15} /></button>
                </div>
            )}

            {/* ── Frames panel ─────────────────────────────────────────── */}
            {framesOpen && !presenting && (
                <div data-board-ui onPointerDown={(e) => e.stopPropagation()}
                    className="absolute right-4 bottom-16 w-60 max-h-[50%] bg-surface-card border border-hairline rounded-xl shadow-xl z-20 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-3 h-10 border-b border-hairline shrink-0">
                        <span className="text-[13px] font-semibold text-ink">Frames</span>
                        <div className="flex items-center gap-1">
                            {visibleFrames.length > 0 && (
                                <button onClick={() => setPresentIdx(0)} title="Present"
                                    className="p-1.5 rounded-md text-body hover:bg-ink/[0.05] hover:text-ink"><Presentation size={14} /></button>
                            )}
                            <button onClick={() => setFramesOpen(false)} className="p-1.5 rounded-md text-muted hover:text-ink"><X size={14} /></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1.5">
                        {frames.length === 0 && <p className="px-2 py-3 text-[12px] text-muted">No frames yet — press <kbd className="font-mono bg-canvas border border-hairline rounded px-1">F</kbd> and drag.</p>}
                        {frames.map((f, i) => (
                            <div key={f.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink/[0.04] cursor-pointer"
                                onClick={() => { fitView([f]); setSelection(new Set([f.id])); }}>
                                <span className="text-[10px] font-mono text-muted-soft w-4">{i + 1}</span>
                                <span className="flex-1 text-[12.5px] text-body truncate">{f.text || 'Frame'}</span>
                                <button onClick={(e) => { e.stopPropagation(); patchEl(f.id, { hidden: !f.hidden }, true); }}
                                    title={f.hidden ? 'Show frame' : 'Hide frame'}
                                    className="p-1 rounded text-muted hover:text-ink opacity-0 group-hover:opacity-100">
                                    {f.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Minimap ──────────────────────────────────────────────── */}
            {showMinimap && board.elements.length > 0 && !presenting && (() => {
                const els = board.elements;
                const minX = Math.min(...els.map(e => e.x)), maxX = Math.max(...els.map(e => e.x + e.w));
                const minY = Math.min(...els.map(e => e.y)), maxY = Math.max(...els.map(e => e.y + e.h));
                const W = 176, H = 110, pad = 8;
                const s = Math.min((W - pad * 2) / Math.max(maxX - minX, 1), (H - pad * 2) / Math.max(maxY - minY, 1));
                const rect = containerRef.current?.getBoundingClientRect();
                const view = rect ? {
                    x: (-cam.tx / cam.z - minX) * s + pad, y: (-cam.ty / cam.z - minY) * s + pad,
                    w: rect.width / cam.z * s, h: rect.height / cam.z * s,
                } : null;
                return (
                    <div data-board-ui onPointerDown={(e) => e.stopPropagation()}
                        className="absolute right-4 bottom-16 bg-surface-card/95 border border-hairline rounded-xl shadow-lg z-10 overflow-hidden cursor-pointer"
                        style={{ width: W, height: H, display: framesOpen ? 'none' : 'block' }}
                        onClick={(e) => {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const wx = (e.clientX - r.left - pad) / s + minX;
                            const wy = (e.clientY - r.top - pad) / s + minY;
                            const c = containerRef.current?.getBoundingClientRect();
                            if (c) setCam(cm => ({ ...cm, tx: c.width / 2 - wx * cm.z, ty: c.height / 2 - wy * cm.z }));
                        }}>
                        {els.filter(e => e.type !== 'draw').slice(0, 400).map(e => (
                            <div key={e.id} className="absolute rounded-[1px]"
                                style={{
                                    left: (e.x - minX) * s + pad, top: (e.y - minY) * s + pad,
                                    width: Math.max(2, e.w * s), height: Math.max(2, e.h * s),
                                    background: e.type === 'frame' ? 'transparent' : (e.color || '#C9C5B8'),
                                    border: e.type === 'frame' ? '1px solid #C9C5B8' : 'none',
                                }} />
                        ))}
                        {view && <div className="absolute border-2 border-[#D97757] rounded-sm pointer-events-none" style={{ left: view.x, top: view.y, width: view.w, height: view.h }} />}
                    </div>
                );
            })()}

            {/* ── Bottom-right navigation toolbar ──────────────────────── */}
            {!presenting && (
                <div data-board-ui onPointerDown={(e) => e.stopPropagation()}
                    className="absolute right-4 bottom-4 flex items-center gap-0.5 bg-surface-card border border-hairline rounded-xl p-1 shadow-[0_10px_30px_-10px_rgba(38,37,30,0.3)] z-20">
                    <button onClick={() => setFramesOpen(o => !o)} title="Frames" className={`p-2 rounded-lg transition-colors ${framesOpen ? 'bg-ink/[0.07] text-ink' : 'text-body hover:bg-ink/[0.05] hover:text-ink'}`}>
                        <FrameIcon size={15} />{frames.length > 0 && <span className="sr-only">{frames.length}</span>}
                    </button>
                    <button onClick={() => setShowMinimap(m => !m)} title="Minimap" className={`p-2 rounded-lg transition-colors ${showMinimap ? 'bg-ink/[0.07] text-ink' : 'text-body hover:bg-ink/[0.05] hover:text-ink'}`}><MapIcon size={15} /></button>
                    <button onClick={() => setShowGrid(g => !g)} title="Grid" className={`p-2 rounded-lg transition-colors ${showGrid ? 'bg-ink/[0.07] text-ink' : 'text-body hover:bg-ink/[0.05] hover:text-ink'}`}><Grid3x3 size={15} /></button>
                    <div className="w-px h-5 bg-hairline mx-0.5" />
                    <button onClick={() => zoomBy(1 / 1.25)} className="p-2 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink"><ZoomOut size={15} /></button>
                    <button onClick={() => setCam(c => ({ ...c, z: 1 }))} className="px-1 text-[12px] font-mono text-muted hover:text-ink w-11 text-center">{Math.round(cam.z * 100)}%</button>
                    <button onClick={() => zoomBy(1.25)} className="p-2 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink"><ZoomIn size={15} /></button>
                    <button onClick={() => fitView()} title="Fit to content" className="p-2 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink"><Maximize size={15} /></button>
                </div>
            )}

            {/* ── Presentation overlay ─────────────────────────────────── */}
            {presenting && (
                <div data-board-ui onPointerDown={(e) => e.stopPropagation()}
                    className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-ink text-canvas rounded-full px-3 py-2 shadow-2xl z-30">
                    <button onClick={() => setPresentIdx(i => Math.max((i ?? 0) - 1, 0))} className="p-1.5 rounded-full hover:bg-white/15"><ChevronLeft size={16} /></button>
                    <span className="text-[13px] font-medium px-1 min-w-[90px] text-center">
                        {visibleFrames[presentIdx!]?.text || 'Frame'} · {presentIdx! + 1}/{visibleFrames.length}
                    </span>
                    <button onClick={() => setPresentIdx(i => Math.min((i ?? 0) + 1, visibleFrames.length - 1))} className="p-1.5 rounded-full hover:bg-white/15"><ChevronRight size={16} /></button>
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    <button onClick={() => setPresentIdx(null)} className="p-1.5 rounded-full hover:bg-white/15"><X size={15} /></button>
                </div>
            )}

            {/* ── Modals ───────────────────────────────────────────────── */}
            {templatesOpen && <TemplatesModal onPick={stampTemplate} onClose={() => setTemplatesOpen(false)} />}
            {screenEditId && (() => {
                const s = board.elements.find(e => e.id === screenEditId);
                if (!s) return null;
                return <ScreenEditor screen={s} screens={screens}
                    onChange={(patch) => patchEl(screenEditId, patch)}
                    onClose={() => setScreenEditId(null)} />;
            })()}
            {playOpen && screens.length > 0 && (
                <PrototypePlayModal screens={screens} startId={singleSel?.type === 'screen' ? singleSel.id : undefined} onClose={() => setPlayOpen(false)} />
            )}

            {/* ── Claude copilot dock ──────────────────────────────────── */}
            <BoardAIPanel
                isOpen={aiOpen && !presenting}
                onClose={() => setAiOpen(false)}
                board={board}
                taskTitles={tasks.map(t => t.title)}
                projectName={projectName}
                onApply={applyAIResult}
            />
        </div>
    );
};

export default Whiteboard;
