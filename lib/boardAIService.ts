import { BoardData, BoardElement } from '../types';
import { ChatTurn } from './aiService';

/**
 * Canvas AI Service — Claude Code with full access to the Space canvas.
 * Sends the serialized board (+ project task context) to the local
 * `claude -p` server; gets back a reply plus board mutations to apply.
 */

export interface BoardAIResult {
    reply: string;
    add?: {
        elements?: (Partial<BoardElement> & { ref?: string })[];
        connectors?: { from: string; to: string; label?: string }[];
    };
    update?: (Partial<BoardElement> & { id: string })[];
    remove?: string[];
}

export async function processBoardMessage(
    message: string,
    board: BoardData,
    taskTitles: string[],
    history: ChatTurn[],
    model?: string,
): Promise<BoardAIResult> {
    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'board',
                message,
                model,
                history: history.slice(-10),
                board: {
                    elements: board.elements.map(e => ({
                        id: e.id,
                        type: e.type,
                        x: Math.round(e.x),
                        y: Math.round(e.y),
                        w: Math.round(e.w),
                        h: Math.round(e.h),
                        text: (e.text || '').slice(0, 160),
                        color: e.color,
                        cells: e.cells,
                        columns: e.columns,
                        blocks: e.blocks?.map(b => ({ kind: b.kind, label: b.label.slice(0, 60), targetScreenId: b.targetScreenId })),
                    })),
                    connectors: board.connectors.map(c => ({ id: c.id, from: c.from, to: c.to, label: c.label })),
                },
                tasks: taskTitles.slice(0, 40),
            }),
        });

        if (!res.ok) throw new Error(`AI server responded ${res.status}`);
        const data = await res.json();

        // An AI server started before the Space update doesn't know board mode
        // and answers with the task-AI shape ({ intent, summary }) instead.
        if (data && data.intent && !data.reply && !data.add && !data.update && !data.remove) {
            return {
                reply: data.summary && data.intent !== 'NONE'
                    ? data.summary
                    : 'Your AI server is running an older version that doesn\'t know the canvas yet. Restart it: stop it with Ctrl+C, then run `npm run ai-server` again.',
            };
        }

        return data as BoardAIResult;
    } catch (error) {
        console.error('Board AI Service Failed:', error);
        return {
            reply: "I can't reach Claude right now. Make sure the local AI server is running — open a terminal and run `npm run ai-server`.",
        };
    }
}
