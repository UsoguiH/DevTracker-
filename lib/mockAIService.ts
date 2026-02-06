import { AIAction, Priority, Task } from '../types';

/**
 * Mock AI Service to simulate the Edge Function's "Intent Parsing" logic.
 * In production, this would be an API call to Supabase Edge Functions.
 */

// Simulated "LLM" latency
const SIMULATED_DELAY_MS = 1500;

export async function processUserMessage(message: string, currentTasks: Task[]): Promise<AIAction> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const lowerMsg = message.toLowerCase();

            // --- INTENT: CREATE TASK ---
            // Regex to catch "create task", "add task"
            if (lowerMsg.includes('create') || lowerMsg.includes('add') || lowerMsg.includes('remind me')) {

                // Extract Priority
                let priority: Priority = 'Medium';
                if (lowerMsg.includes('high') || lowerMsg.includes('urgent')) priority = 'High';
                if (lowerMsg.includes('low')) priority = 'Low';

                // Extract Title (very naive extraction: everything after the command words)
                // In real LLM, this is trivial. Here, we hack it.
                const cleanTitle = message
                    .replace(/create a task|create task|add a task|add task|remind me to/gi, '')
                    .replace(/high priority|urgent|low priority/gi, '')
                    .replace(/tomorrow|today/gi, '')
                    .trim();

                // Extract Date
                const startDate = new Date();
                const endDate = new Date();
                if (lowerMsg.includes('tomorrow')) {
                    startDate.setDate(startDate.getDate() + 1);
                    endDate.setDate(endDate.getDate() + 1);
                }

                resolve({
                    intent: 'CREATE_TASK',
                    payload: {
                        title: cleanTitle || 'New AI Task',
                        priority,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString(),
                        status: 'To Do',
                        tags: [],
                        assignees: [], // Default to none or current user if available
                        subtasks: []
                    },
                    summary: `I've created a new ${priority} priority task: "${cleanTitle}".`
                });
                return;
            }

            // --- INTENT: QUERY / FILTER ---
            if (lowerMsg.includes('show') || lowerMsg.includes('filter') || lowerMsg.includes('list')) {

                if (lowerMsg.includes('high')) {
                    resolve({
                        intent: 'FILTER_VIEW',
                        payload: { priority: 'High' },
                        summary: "I've filtered the view to show only High Priority tasks."
                    });
                    return;
                }

                if (lowerMsg.includes('all') || lowerMsg.includes('everything')) {
                    resolve({
                        intent: 'FILTER_VIEW',
                        payload: null, // Clear filter
                        summary: "I've cleared all filters. Showing all tasks."
                    });
                    return;
                }
            }

            // --- INTENT: INSIGHTS ---
            if (lowerMsg.includes('workload') || lowerMsg.includes('summary') || lowerMsg.includes('help')) {
                const highCount = currentTasks.filter(t => t.priority === 'High').length;
                const total = currentTasks.length;

                resolve({
                    intent: 'INSIGHT',
                    summary: `You have ${total} tasks in this project. ${highCount} of them are High Priority. You're doing great!`
                });
                return;
            }

            // --- FALLBACK ---
            resolve({
                intent: 'NONE',
                summary: "I didn't quite catch that. Try saying 'Create a high priority task' or 'Show high priority tasks'."
            });

        }, SIMULATED_DELAY_MS);
    });
}
