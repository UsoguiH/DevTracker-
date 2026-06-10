import React, { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';

/**
 * Tiny global toast system (no context plumbing needed).
 * Call `toast('Task deleted', { action: { label: 'Undo', onClick } })`
 * from anywhere; <ToastHost /> (rendered once in App) displays them.
 */

type ToastAction = { label: string; onClick: () => void };
type ToastItem = { id: number; message: string; action?: ToastAction; duration: number };

type Listener = (t: ToastItem) => void;
let listeners: Listener[] = [];
let counter = 0;

export function toast(message: string, opts?: { action?: ToastAction; duration?: number }) {
    const item: ToastItem = { id: ++counter, message, action: opts?.action, duration: opts?.duration ?? 5000 };
    listeners.forEach(l => l(item));
}

export const ToastHost: React.FC = () => {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => {
        const add: Listener = (t) => {
            setItems(prev => [...prev, t]);
            setTimeout(() => setItems(prev => prev.filter(i => i.id !== t.id)), t.duration);
        };
        listeners.push(add);
        return () => { listeners = listeners.filter(l => l !== add); };
    }, []);

    const dismiss = (id: number) => setItems(prev => prev.filter(i => i.id !== id));

    if (items.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col items-center gap-2 pointer-events-none">
            {items.map(t => (
                <div
                    key={t.id}
                    className="pointer-events-auto flex items-center gap-2 bg-ink text-canvas pl-4 pr-1.5 py-2 rounded-lg shadow-[0_8px_30px_rgba(38,37,30,0.35)] animate-pop-in"
                >
                    <span className="text-sm whitespace-nowrap max-w-[420px] truncate">{t.message}</span>
                    {t.action && (
                        <button
                            onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 px-2 py-1 rounded-md transition-opacity shrink-0"
                        >
                            <Undo2 size={14} /> {t.action.label}
                        </button>
                    )}
                    <button onClick={() => dismiss(t.id)} className="p-1.5 text-canvas/50 hover:text-canvas transition-colors shrink-0">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};
