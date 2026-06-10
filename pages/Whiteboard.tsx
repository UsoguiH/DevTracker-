import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    MousePointer2, Hand, StickyNote, Square, Circle, Diamond, Type, Pencil,
    ArrowUpRight, Undo2, Redo2, Trash2, Copy, ChevronsUp, ChevronsDown,
    ZoomIn, ZoomOut, Maximize, ClipboardList,
} from 'lucide-react';
import { BoardData, BoardElement, BoardElementType, BoardConnector, Task } from '../types';
import BoardAIPanel from '../components/BoardAIPanel';
import ClaudeLogo from '../components/ClaudeLogo';
import { BoardAIResult } from '../lib/boardAIService';
import { toast } from '../components/Toast';

/**
 * Space — DevTracker's infinite whiteboard canvas.
 * Pan/zoom world, sticky notes, shapes, text, freehand pen, connectors,
 * multi-select, resize, undo/redo, local persistence — with Claude Code
 * as a copilot that can see and edit the whole board.
 */

type Tool = 'select' | 'hand' | 'sticky' | 'rect' | 'ellipse' | 'diamond' | 'text' | 'pen' | 'connector';

type Drag =
    | { kind: 'pan'; sx: number; sy: number; otx: number; oty: number }
    | { kind: 'move'; sx: number; sy: number; orig: Map<string, { x: number; y: number; points?: [number, number][] }> }
    | { kind: 'create'; id: string; sx: number; sy: number }
    | { kind: 'draw'; id: string }
    | { kind: 'marquee'; sx: number; sy: number }
    | { kind: 'resize'; id: string; handle: 'nw' | 'ne' | 'sw' | 'se'; orig: { x: number; y: number; w: number; h: number } };

const STICKY_COLORS = ['#FFF6A5', '#FFD6A5', '#FFB3BA', '#D7BDE2', '#AED6F1', '#A9DFBF'];
const ELEMENT_TYPES: BoardElementType[] = ['sticky', 'rect', 'ellipse', 'diamond', 'text', 'draw'];
const DEFAULT_SIZE: Record<BoardElementType, { w: number; h: number }> = {
    sticky: { w: 170, h: 170 }, rect: { w: 200, h: 110 }, ellipse: { w: 200, h: 110 },
    diamond: { w: 180, h: 140 }, text: { w: 260, h: 44 }, draw: { w: 0, h: 0 },
};

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
    const snapshot = () => mutate(b => b); // push current state onto undo stack
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
            // Let UI overlays (AI chat, toolbars) scroll normally.
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

    // ── Keyboard shortcuts ───────────────────────────────────────────────
    useEffect(() => {
        const isTyping = () => {
            const t = document.activeElement?.tagName;
            return t === 'TEXTAREA' || t === 'INPUT';
        };
        const down = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isTyping()) { setSpaceHeld(true); e.preventDefault(); return; }
            if (isTyping()) return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelection(); return; }
            if (e.ctrlKey || e.metaKey) return;
            if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelection(); return; }
            if (e.key === 'Escape') { setSelection(new Set()); setSelectedConnector(null); setPendingFrom(null); setEditingId(null); setMarquee(null); setTool('select'); return; }
            const map: Record<string, Tool> = { v: 'select', h: 'hand', s: 'sticky', n: 'sticky', r: 'rect', o: 'ellipse', d: 'diamond', t: 'text', p: 'pen', c: 'connector' };
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
            setTool('select');
            return;
        }
        if (tool === 'rect' || tool === 'ellipse' || tool === 'diamond') {
            const el: BoardElement = { id: genId(), type: tool, x, y, w: 1, h: 1, text: '', color: '#ffffff' };
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
        if (tool === 'connector') { setPendingFrom(null); return; }

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

    const onCanvasPointerUp = () => {
        const d = dragRef.current;
        dragRef.current = null;
        if (!d) return;
        if (d.kind === 'create') {
            mutate(b => ({ ...b, elements: b.elements.map(el => el.id === d.id ? { ...el, w: Math.max(el.w, 40), h: Math.max(el.h, 30) } : el) }), false);
            setSelection(new Set([d.id]));
            setTool('select');
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
    const onElementPointerDown = (e: React.PointerEvent, el: BoardElement) => {
        if (tool === 'connector') {
            e.stopPropagation();
            if (!pendingFrom) { setPendingFrom(el.id); return; }
            if (pendingFrom !== el.id) {
                mutate(b => ({ ...b, connectors: [...b.connectors, { id: genId(), from: pendingFrom, to: el.id }] }));
            }
            setPendingFrom(null);
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
        board.elements.forEach(e2 => { if (sel.has(e2.id)) orig.set(e2.id, { x: e2.x, y: e2.y, points: e2.points }); });
        snapshot();
        dragRef.current = { kind: 'move', sx: x, sy: y, orig };
    };

    const startResize = (e: React.PointerEvent, el: BoardElement, handle: 'nw' | 'ne' | 'sw' | 'se') => {
        e.stopPropagation();
        containerRef.current?.setPointerCapture(e.pointerId);
        snapshot();
        dragRef.current = { kind: 'resize', id: el.id, handle, orig: { x: el.x, y: el.y, w: el.w, h: el.h } };
    };

    const startEditing = (el: BoardElement) => {
        if (el.type === 'draw') return;
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
        const els = elements && elements.length ? elements : board.elements;
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
    // Computed synchronously against boardRef (NOT inside a state updater) so
    // the returned counts are real and undo bookkeeping runs exactly once.
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
        (r.add?.elements || []).forEach((raw: any) => {
            const type: BoardElementType = ELEMENT_TYPES.includes(raw?.type) && raw.type !== 'draw' ? raw.type : 'sticky';
            const d = DEFAULT_SIZE[type];
            const el: BoardElement = {
                id: genId(), type,
                x: num(raw?.x, 100 + added * 30), y: num(raw?.y, 100 + added * 30),
                w: num(raw?.w, d.w), h: num(raw?.h, d.h),
                text: typeof raw?.text === 'string' ? raw.text : '',
                color: typeof raw?.color === 'string' ? raw.color : (type === 'sticky' ? STICKY_COLORS[added % STICKY_COLORS.length] : '#ffffff'),
            };
            if (raw?.ref) refMap.set(String(raw.ref), el.id);
            if (raw?.id) refMap.set(String(raw.id), el.id);
            els.push(el);
            added++;
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
        { id: 'sticky', icon: StickyNote, label: 'Sticky note', key: 'S' },
        { id: 'rect', icon: Square, label: 'Rectangle', key: 'R' },
        { id: 'ellipse', icon: Circle, label: 'Ellipse', key: 'O' },
        { id: 'diamond', icon: Diamond, label: 'Decision', key: 'D' },
        { id: 'text', icon: Type, label: 'Text', key: 'T' },
        { id: 'pen', icon: Pencil, label: 'Draw', key: 'P' },
        { id: 'connector', icon: ArrowUpRight, label: 'Connector', key: 'C' },
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

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="-m-8 h-[calc(100vh-5rem)] relative overflow-hidden bg-canvas select-none"
            style={{
                cursor, touchAction: 'none',
                backgroundImage: 'radial-gradient(rgba(38,37,30,0.13) 1px, transparent 1px)',
                backgroundSize: `${24 * cam.z}px ${24 * cam.z}px`,
                backgroundPosition: `${cam.tx}px ${cam.ty}px`,
            }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
        >
            {/* ── World (transformed) ─────────────────────────────────── */}
            <div className="absolute top-0 left-0" style={{ transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`, transformOrigin: '0 0' }}>

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
                        if (!from || !to) return null;
                        const p1 = edgePoint(from, center(to));
                        const p2 = edgePoint(to, center(from));
                        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                        const isSel = selectedConnector === c.id;
                        return (
                            <g key={c.id}>
                                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                    stroke={isSel ? '#f54e00' : '#6b6857'} strokeWidth={isSel ? 3 : 2}
                                    markerEnd="url(#board-arrow)" />
                                {/* fat invisible hit area */}
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
                    {board.elements.filter(e => e.type === 'draw' && e.points && e.points.length > 1).map(el => (
                        <g key={el.id}>
                            <path d={`M ${el.points!.map(p => `${p[0]} ${p[1]}`).join(' L ')}`}
                                fill="none" stroke={el.color || '#26251e'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                            <path d={`M ${el.points!.map(p => `${p[0]} ${p[1]}`).join(' L ')}`}
                                fill="none" stroke="transparent" strokeWidth={16}
                                onPointerDown={(e) => onElementPointerDown(e as any, el)} />
                            {selection.has(el.id) && (
                                <rect x={el.x - 4} y={el.y - 4} width={el.w + 8} height={el.h + 8}
                                    fill="none" stroke="#f54e00" strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                            )}
                        </g>
                    ))}
                </svg>

                {/* Elements */}
                {board.elements.filter(e => e.type !== 'draw').map(el => {
                    const isSel = selection.has(el.id);
                    const isEditing = editingId === el.id;
                    const isPendingSrc = pendingFrom === el.id;
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
                                    <span className="text-[17px] font-semibold text-ink whitespace-pre-wrap break-words">{el.text}</span>
                                </div>
                            )}

                            {/* Inline text editing */}
                            {isEditing && (
                                <textarea
                                    autoFocus
                                    value={el.text || ''}
                                    onChange={(e) => mutate(b => ({ ...b, elements: b.elements.map(e2 => e2.id === el.id ? { ...e2, text: e.target.value } : e2) }), false)}
                                    onBlur={() => setEditingId(null)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') setEditingId(null); }}
                                    className={`absolute inset-0 w-full h-full bg-transparent resize-none focus:outline-none p-2 ${el.type === 'text' ? 'text-[17px] font-semibold text-left' : 'text-[14px] font-medium text-center'}`}
                                    style={{ color: el.type === 'sticky' ? '#43412f' : '#26251e' }}
                                />
                            )}

                            {/* Selection / connector-source ring */}
                            {(isSel || isPendingSrc) && (
                                <div className="absolute pointer-events-none"
                                    style={{
                                        inset: -3 / cam.z,
                                        border: `${1.8 / cam.z}px solid ${isPendingSrc ? '#1f8a65' : '#f54e00'}`,
                                        borderRadius: 4,
                                    }} />
                            )}

                            {/* Resize handles (single selection) */}
                            {isSel && singleSel?.id === el.id && (['nw', 'ne', 'sw', 'se'] as const).map(h => (
                                <div key={h}
                                    onPointerDown={(e) => startResize(e, el, h)}
                                    className="absolute bg-white"
                                    style={{
                                        width: 9 / cam.z, height: 9 / cam.z,
                                        border: `${1.5 / cam.z}px solid #f54e00`, borderRadius: 2 / cam.z,
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
                    <div className="absolute bg-primary/10 border border-primary/60 pointer-events-none"
                        style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />
                )}
            </div>

            {/* ── Empty-state hint ─────────────────────────────────────── */}
            {board.elements.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <p className="display text-[28px] text-ink/30 mb-2">Your Space is empty</p>
                    <p className="text-sm text-muted">Press <kbd className="font-mono bg-surface-card border border-hairline rounded px-1.5">S</kbd> for a sticky note — or ask Claude to plan something <ClaudeLogo size={13} className="inline text-primary" /></p>
                </div>
            )}

            {/* ── Left toolbar ─────────────────────────────────────────── */}
            <div data-board-ui onPointerDown={(e) => e.stopPropagation()}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 bg-surface-card border border-hairline rounded-xl p-1.5 shadow-[0_10px_30px_-10px_rgba(38,37,30,0.3)] z-20">
                {TOOLS.map(t => (
                    <button key={t.id}
                        onClick={() => { setTool(t.id); setPendingFrom(null); }}
                        title={`${t.label} (${t.key})`}
                        className={`p-2.5 rounded-lg transition-colors ${tool === t.id ? 'bg-primary text-on-primary' : 'text-body hover:bg-ink/[0.05] hover:text-ink'}`}>
                        <t.icon size={18} />
                    </button>
                ))}
                <div className="h-px bg-hairline my-1 mx-1.5" />
                <button onClick={undo} title="Undo (Ctrl+Z)" className="p-2.5 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink transition-colors"><Undo2 size={18} /></button>
                <button onClick={redo} title="Redo (Ctrl+Shift+Z)" className="p-2.5 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink transition-colors"><Redo2 size={18} /></button>
                <div className="h-px bg-hairline my-1 mx-1.5" />
                <button onClick={clearBoard} title="Clear board" className="p-2.5 rounded-lg text-body hover:bg-error/10 hover:text-error transition-colors"><Trash2 size={18} /></button>
            </div>

            {/* ── Top-right actions ────────────────────────────────────── */}
            <div data-board-ui onPointerDown={(e) => e.stopPropagation()} className="absolute right-4 top-4 flex items-center gap-2 z-20">
                <button onClick={importTasks}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-surface-card border border-hairline rounded-xl text-sm text-body hover:text-ink hover:border-primary/50 shadow-[0_10px_30px_-10px_rgba(38,37,30,0.3)] transition-all">
                    <ClipboardList size={16} />
                    <span className="hidden lg:inline">Tasks → board</span>
                </button>
                <button onClick={() => setAiOpen(o => !o)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium shadow-[0_10px_30px_-10px_rgba(38,37,30,0.3)] transition-all border
                        ${aiOpen ? 'bg-[#D97757] text-white border-[#D97757]' : 'bg-surface-card border-hairline text-body hover:text-ink hover:border-[#D97757]/60'}`}>
                    <ClaudeLogo size={16} />
                    <span className="hidden lg:inline">Claude</span>
                </button>
            </div>

            {/* ── Connector-pending banner ─────────────────────────────── */}
            {tool === 'connector' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-ink text-canvas text-[13px] px-4 py-2 rounded-lg shadow-lg z-20 animate-pop-in pointer-events-none">
                    {pendingFrom ? 'Now click the target element' : 'Click the source element'} · <span className="opacity-60">Esc to cancel</span>
                </div>
            )}

            {/* ── Floating selection toolbar ───────────────────────────── */}
            {selection.size > 0 && selectionBBox && !editingId && (
                <div data-board-ui onPointerDown={(e) => e.stopPropagation()}
                    className="absolute z-20 flex items-center gap-1 bg-surface-card border border-hairline rounded-xl p-1.5 shadow-[0_10px_30px_-10px_rgba(38,37,30,0.35)] animate-pop-in"
                    style={{
                        left: Math.max(80, Math.min((selectionBBox.minX + selectionBBox.maxX) / 2 * cam.z + cam.tx - 140, (containerRef.current?.clientWidth || 800) - 300)),
                        top: Math.max(8, selectionBBox.minY * cam.z + cam.ty - 54),
                    }}>
                    {STICKY_COLORS.map(c => (
                        <button key={c} onClick={() => setSelectionColor(c)}
                            className="w-6 h-6 rounded-md border border-ink/10 hover:scale-110 transition-transform"
                            style={{ background: c }} />
                    ))}
                    <button onClick={() => setSelectionColor('#ffffff')}
                        className="w-6 h-6 rounded-md border border-hairline-strong bg-white hover:scale-110 transition-transform" />
                    <div className="w-px h-5 bg-hairline mx-1" />
                    <button onClick={duplicateSelection} title="Duplicate (Ctrl+D)" className="p-1.5 rounded-md text-body hover:bg-ink/[0.05] hover:text-ink"><Copy size={15} /></button>
                    <button onClick={() => reorderSelection(true)} title="Bring to front" className="p-1.5 rounded-md text-body hover:bg-ink/[0.05] hover:text-ink"><ChevronsUp size={15} /></button>
                    <button onClick={() => reorderSelection(false)} title="Send to back" className="p-1.5 rounded-md text-body hover:bg-ink/[0.05] hover:text-ink"><ChevronsDown size={15} /></button>
                    <button onClick={deleteSelection} title="Delete" className="p-1.5 rounded-md text-body hover:bg-error/10 hover:text-error"><Trash2 size={15} /></button>
                </div>
            )}

            {/* ── Zoom controls ────────────────────────────────────────── */}
            <div data-board-ui onPointerDown={(e) => e.stopPropagation()}
                className="absolute left-4 bottom-4 flex items-center gap-0.5 bg-surface-card border border-hairline rounded-xl p-1 shadow-[0_10px_30px_-10px_rgba(38,37,30,0.3)] z-20">
                <button onClick={() => zoomBy(1 / 1.25)} className="p-2 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink"><ZoomOut size={16} /></button>
                <button onClick={() => setCam(c => ({ ...c, z: 1 }))} className="px-1.5 text-[12px] font-mono text-muted hover:text-ink w-12 text-center">{Math.round(cam.z * 100)}%</button>
                <button onClick={() => zoomBy(1.25)} className="p-2 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink"><ZoomIn size={16} /></button>
                <div className="w-px h-5 bg-hairline mx-0.5" />
                <button onClick={() => fitView()} title="Fit to content" className="p-2 rounded-lg text-body hover:bg-ink/[0.05] hover:text-ink"><Maximize size={16} /></button>
            </div>

            {/* ── Claude copilot dock ──────────────────────────────────── */}
            <BoardAIPanel
                isOpen={aiOpen}
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
