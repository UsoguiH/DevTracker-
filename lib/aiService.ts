import { supabase } from '../src/supabaseClient';
import { AIAction, Task } from '../types';

/**
 * Real AI Service calling Supabase Edge Function 'ai-architect'.
 */

export async function processUserMessage(message: string, currentTasks: Task[]): Promise<AIAction> {
    try {
        const { data, error } = await supabase.functions.invoke('ai-architect', {
            body: {
                message,
                currentContext: currentTasks.map(t => ({ title: t.title, priority: t.priority, status: t.status }))
            }
        });

        if (error) {
            console.error('Edge Function Error:', error);
            throw error;
        }

        return data as AIAction;

    } catch (error) {
        console.error('AI Service Failed:', error);
        return {
            intent: 'NONE',
            summary: "I'm having trouble connecting to my brain (OpenAI). Please check the Edge Function logs or API keys.",
        };
    }
}
