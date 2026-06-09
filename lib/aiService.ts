import { AIAction, Task } from '../types';

/**
 * AI Service — talks to the local Claude Code server (server/ai-server.js),
 * which runs `claude -p` under your Claude subscription. No API key, no
 * third-party provider. Start it with `npm run ai-server`.
 */

export interface ChatTurn { role: 'user' | 'assistant'; text: string; }

export async function processUserMessage(
    message: string,
    currentTasks: Task[],
    model?: string,
    history?: ChatTurn[],
): Promise<AIAction> {
    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                model,
                history,
                currentContext: currentTasks.map(t => ({ title: t.title, priority: t.priority, status: t.status })),
            }),
        });

        if (!res.ok) {
            throw new Error(`AI server responded ${res.status}`);
        }

        return await res.json() as AIAction;

    } catch (error) {
        console.error('AI Service Failed:', error);
        return {
            intent: 'NONE',
            summary: "I can't reach Claude right now. Make sure the local AI server is running — open a terminal and run `npm run ai-server`.",
        };
    }
}
