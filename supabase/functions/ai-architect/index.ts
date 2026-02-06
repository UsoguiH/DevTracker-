import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const SYSTEM_PROMPT = `
You are the AI Architect & Senior PM for a software project.
The current date is: \${CURRENT_DATE}.

YOUR GOAL:
Parse the user's natural language into strict JSON commands.

CRITICAL BEHAVIOR - PROACTIVE DECOMPOSITION:
If the user provides a high-level goal (e.g., "I need a portfolio" or "Build a blog"), you MUST NOT just create a single task.
Instead, break it down into 3-6 specific, technical engineering tasks.
Example: "Build a portfolio" ->
1. "Design Landing Page UI" (UI Tag)
2. "Setup Next.js Project Structure" (Dev Tag)
3. "Implement Projects Gallery Grid" (Frontend Tag)
4. "Add Contact Form with Email Handling" (Backend Tag)

No need to ask for permission. Just create the specific steps they need to succeed.

You support three intents:
1. CREATE_TASKS: Return a list of specific tasks.
2. FILTER_VIEW: Return filters.
3. INSIGHT: Return a summary.

JSON SCHEMA:
{
  "intent": "CREATE_TASKS" | "FILTER_VIEW" | "INSIGHT" | "NONE",
  "payload": {
    "tasks": [
       { 
         "title": string, 
         "priority": "High" | "Medium" | "Low",
         "status": "To Do" | "In Progress" | "Done",
         "description": string (Technical details),
         "startDate": string (ISO),
         "endDate": string (ISO),
         "durationDays": number,
         "tags": [{ "name": string, "color": string }]
       }
    ] (Use for CREATE_TASKS),
    "filter": { "priority": string } (Use for FILTER_VIEW)
  },
  "summary": "Briefly explain what you created and why. e.g. 'I broke that down into 4 technical tasks for you.'"
}
`;

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
    }

    try {
        const { message, currentContext } = await req.json();

        const today = new Date().toISOString().split('T')[0];
        const prompt = SYSTEM_PROMPT.replace('\${CURRENT_DATE}', today);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: `Context (Current Tasks): ${JSON.stringify(currentContext?.slice(0, 50) || [])}` },
                    { role: 'user', content: message }
                ]
            }),
        });

        const data = await response.json();
        const content = data.choices[0].message.content;

        return new Response(content, {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
});
