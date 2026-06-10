/**
 * DevTracker AI server — Claude Code IS the brain.
 *
 * Instead of calling a paid third-party API, this tiny local server spawns the
 * Claude Code CLI in headless mode (`claude -p`). That uses YOUR Claude
 * subscription login — no API key, no per-token billing.
 *
 *   React app  →  /api/ai (Vite proxy)  →  this server  →  claude -p  →  your subscription
 *
 * The browser never sees Claude directly; it just POSTs { message, currentContext }
 * and gets back an AIAction JSON object that the existing AI views already understand.
 *
 * Run it alongside Vite:   npm run ai-server   (then, in another terminal, npm run dev)
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8787;
const PROJECT = path.join(__dirname, '..');

// Which model powers the PM. Haiku is fast + plenty smart for task planning;
// switch to 'sonnet' for deeper reasoning at the cost of speed.
const MODEL = 'haiku';

// How long to wait for a single Claude run before giving up (ms).
const TIMEOUT_MS = 90_000;

// ── The AI Project Manager persona + strict output contract ─────────────────
// Mirrors the schema the frontend (lib/aiService.ts + the AI views) expects, so
// no React code has to change. The big behavioural rule: Claude is "the boss".
function buildPrompt({ message, currentContext, history }) {
  const today = new Date().toISOString().split('T')[0];
  const ctx = JSON.stringify((currentContext || []).slice(0, 60));

  // Render the recent conversation so the PM has memory across turns.
  const transcript = (history || [])
    .slice(-10)
    .map(h => `${h.role === 'user' ? 'Developer' : 'PM'}: ${h.text}`)
    .join('\n');

  return `You are the AI Project Manager and Senior Engineering Lead for a software project in the DevTracker app.
You are the boss: you take a developer's request, decide what work matters, and drive the project forward.
The current date is: ${today}.

YOUR JOB:
Turn the developer's latest message into ONE strict JSON command, using the conversation so far for context.

PROACTIVE DECOMPOSITION:
If the developer gives a high-level goal (e.g. "I need a portfolio", "Build a blog", "add auth"),
break it into 3-6 specific, technical engineering tasks with real titles they could start immediately.
Don't ask permission — plan it. Write rich, useful "description" text for each task.

FIVE INTENTS:
1. CREATE_TASKS  — add new tasks to the board.
2. UPDATE_TASKS  — change EXISTING tasks: move status (e.g. "mark login done", "start the API task"),
   or change priority. Match tasks by their title from the board context below. Use the closest match.
3. FILTER_VIEW   — the developer wants to filter the board by priority.
4. INSIGHT       — a question, analysis, standup, recommendation, risk review, or just conversation.
   Put your complete answer in "summary". You MAY use light Markdown here (bold, \`code\`, "- " bullets,
   "1." numbered lists) — it renders nicely. Be specific and reference their actual tasks by name.
5. NONE          — you couldn't act; explain why in "summary".

OUTPUT CONTRACT — read carefully:
Respond with ONLY a single raw JSON object. No code fences, no prose before or after.
It MUST match this schema exactly:
{
  "intent": "CREATE_TASKS" | "UPDATE_TASKS" | "FILTER_VIEW" | "INSIGHT" | "NONE",
  "payload": {
    "tasks": [
      {
        "title": string,
        "priority": "High" | "Medium" | "Low",
        "status": "To Do" | "In Progress" | "Testing" | "Done",
        "description": string,
        "startDate": string (ISO 8601),
        "endDate": string (ISO 8601),
        "durationDays": number,
        "tags": [{ "name": string, "color": string (hex, e.g. "#9ef5a3") }]
      }
    ],
    "updates": [
      { "match": string, "status": "To Do"|"In Progress"|"Testing"|"Done", "priority": "High"|"Medium"|"Low" }
    ],
    "filter": { "priority": "High" | "Medium" | "Low" }
  },
  "summary": string
}
Rules:
- payload.tasks ONLY for CREATE_TASKS. payload.updates ONLY for UPDATE_TASKS (each item's "match" is the
  existing task's title; include only the fields you're changing). payload.filter ONLY for FILTER_VIEW.
- For INSIGHT or NONE, omit payload (or null) and put everything in "summary".
- "summary" is always your friendly explanation, in your voice as the PM.
- Never invent tasks for UPDATE_TASKS — only reference titles that appear in the board context.

CURRENT BOARD CONTEXT (the developer's existing tasks): ${ctx}

${transcript ? `CONVERSATION SO FAR:\n${transcript}\n` : ''}DEVELOPER'S LATEST MESSAGE:
${message}`;
}

// ── Canvas copilot persona — Claude has full access to the Space canvas ─────
// The board is sent as compact JSON; Claude replies with chat text + mutations
// (add / update / remove elements & connectors) that the canvas applies live.
function buildBoardPrompt({ message, board, tasks, history }) {
  const today = new Date().toISOString().split('T')[0];
  const boardJson = JSON.stringify(board || { elements: [], connectors: [] });
  const taskList = (tasks || []).map(t => `- ${t}`).join('\n');

  const transcript = (history || [])
    .slice(-10)
    .map(h => `${h.role === 'user' ? 'Developer' : 'Claude'}: ${h.text}`)
    .join('\n');

  return `You are Claude, the AI design partner living inside DevTracker's infinite whiteboard canvas ("Space").
You have FULL access to the canvas: you can see every element and you can add, update and remove elements
and connectors. You help the developer think visually — planning, diagramming, flowcharts, brainstorming,
wireframe-style prototyping, retrospectives, mind maps. The current date is: ${today}.

CANVAS MODEL:
- Coordinate system: infinite 2D plane, x/y is an element's TOP-LEFT corner in pixels. y grows downward.
- Element types and sensible default sizes:
  - "sticky"  : square sticky note, ~170x170. Short punchy text. Has a pastel "color".
  - "rect"    : rectangle node, ~200x110. Good for flowchart steps, wireframe blocks.
  - "ellipse" : ellipse node, ~200x110. Good for start/end nodes.
  - "diamond" : diamond node, ~180x140. Good for decisions ("Yes/No" branches).
  - "text"    : free-floating label, ~260x44, transparent. Good for titles/section headers.
- Connectors are arrows between two elements (by id or ref): { "from", "to", "label"? }.
- Sticky colors (pick varied ones): "#FFF6A5" yellow, "#FFD6A5" orange, "#FFB3BA" pink, "#D7BDE2" purple,
  "#AED6F1" blue, "#A9DFBF" green. Shapes default to "#ffffff".

LAYOUT RULES — make boards that look hand-arranged and readable:
- Leave 60-100px gaps between elements. NEVER overlap elements.
- Flowcharts: top-to-bottom, x aligned, ~180-220px vertical spacing; branches fan out horizontally.
- Brainstorms: sticky grid or clusters, ~200px pitch, group by theme with a "text" title above each cluster.
- Mind maps: central node, branches radiating outward.
- If the board already has elements, place new work in EMPTY space near related content (check existing x/y!).

WHAT YOU CAN DO:
1. ADD elements/connectors — give each new element a unique "ref" (e.g. "n1") so connectors can reference it.
2. UPDATE existing elements by their "id" — move (x/y), resize, retext, recolor. Great for tidying/organizing.
3. REMOVE elements by id (their connectors die with them).
4. Or just TALK — answer questions about the board, critique a flow, suggest next steps (omit mutations).

OUTPUT CONTRACT — respond with ONLY one raw JSON object, no code fences, no prose around it:
{
  "reply": string,            // your conversational answer — always present, friendly, concise
  "add": {                    // optional
    "elements": [ { "ref": "n1", "type": "sticky"|"rect"|"ellipse"|"diamond"|"text", "x": number, "y": number, "w": number, "h": number, "text": string, "color": string } ],
    "connectors": [ { "from": "n1"|"<existing id>", "to": "n2"|"<existing id>", "label": string? } ]
  },
  "update": [ { "id": "<existing id>", ...changed fields only } ],   // optional
  "remove": [ "<existing id>" ]                                      // optional
}

CURRENT BOARD: ${boardJson}

${taskList ? `PROJECT TASKS (context for planning):\n${taskList}\n` : ''}${transcript ? `CONVERSATION SO FAR:\n${transcript}\n` : ''}DEVELOPER'S LATEST MESSAGE:
${message}`;
}

// Pull the AIAction object out of whatever Claude printed. Claude was told to
// emit raw JSON, but we defend against stray prose / code fences just in case.
function extractAction(text) {
  if (!text) return null;
  let s = text.trim();

  // Strip a ```json ... ``` fence if the model added one.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  // Grab the outermost { ... } span.
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) return null;

  try {
    return JSON.parse(s.slice(first, last + 1));
  } catch {
    return null;
  }
}

// Normalize whatever board JSON the model produced into the strict contract
// the canvas expects: { reply, add?: {elements, connectors}, update?, remove? }.
// Models sometimes drift (root-level "elements", "summary" instead of "reply",
// "updates"/"delete" aliases) — accept all of it rather than failing the turn.
function normalizeBoardResult(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const out = {};

  out.reply =
    typeof obj.reply === 'string' ? obj.reply :
    typeof obj.summary === 'string' ? obj.summary :
    typeof obj.message === 'string' ? obj.message : null;

  let add = obj.add;
  if (Array.isArray(add)) add = { elements: add };
  if (!add && (Array.isArray(obj.elements) || Array.isArray(obj.connectors))) {
    add = { elements: obj.elements || [], connectors: obj.connectors || [] };
  }
  if (add && (Array.isArray(add.elements) || Array.isArray(add.connectors))) {
    out.add = { elements: add.elements || [], connectors: add.connectors || [] };
  }

  const update = Array.isArray(obj.update) ? obj.update : Array.isArray(obj.updates) ? obj.updates : null;
  if (update) out.update = update;

  const remove = Array.isArray(obj.remove) ? obj.remove : Array.isArray(obj.delete) ? obj.delete : null;
  if (remove) out.remove = remove;

  if (out.reply === null && !out.add && !out.update && !out.remove) return null;
  if (out.reply === null) out.reply = 'Done — board updated.';
  return out;
}

// Models the UI is allowed to request (prevents arbitrary --model injection).
const ALLOWED_MODELS = new Set(['haiku', 'sonnet']);

// Spawn `claude -p`, feed the prompt via stdin (avoids all shell-escaping pain
// with a large multi-line prompt), and resolve with the parsed response.
// mode 'tasks' → AIAction { intent, ... } | mode 'board' → { reply, add?, update?, remove? }
function askClaude(prompt, model, mode = 'tasks') {
  const fail = (msg) => mode === 'board' ? { reply: msg } : { intent: 'NONE', summary: msg };
  return new Promise((resolve) => {
    const useModel = ALLOWED_MODELS.has(model) ? model : MODEL;
    // `--output-format json` makes stdout exactly one JSON envelope:
    //   { type:'result', subtype:'success', result:'<model text>', is_error:false, ... }
    // No permission bypass: this task only asks Claude to WRITE JSON, never to
    // run a tool. In headless `-p` mode any tool call is auto-denied (it can't
    // prompt without a TTY), so the run can't hang and can't touch your system.
    const args = [
      '-p',
      '--output-format', 'json',
      '--model', useModel,
    ];

    // On Windows, `claude` is a `.cmd` shim, so it must go through the shell.
    const child = spawn('claude', args, {
      cwd: PROJECT,
      env: process.env,
      shell: true,
    });

    let stdout = '';
    let stderr = '';
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { child.kill(); } catch {}
      resolve(fail('Claude took too long to respond. Try again.'));
    }, TIMEOUT_MS);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      console.error('[ai-server] failed to spawn claude:', err.message);
      resolve(fail("I couldn't start Claude Code. Is the `claude` CLI installed and logged in?"));
    });

    child.on('close', (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);

      // Unwrap the --output-format json envelope to get the model's text.
      let modelText = stdout;
      try {
        const env = JSON.parse(stdout);
        if (env && typeof env.result === 'string') modelText = env.result;
      } catch {
        // stdout wasn't the envelope (older CLI / extra logging) — use it raw.
      }

      const action = mode === 'board'
        ? normalizeBoardResult(extractAction(modelText))
        : extractAction(modelText);
      const isValid = mode === 'board' ? !!action : !!(action && action.intent);

      if (isValid) {
        resolve(action);
      } else {
        console.error(`[ai-server] no valid ${mode} response (exit ${code}). stderr:`, stderr.slice(-500));
        resolve(fail(modelText && modelText.trim()
          ? modelText.trim().slice(0, 600)
          : 'Claude replied, but I could not parse a command from it.'));
      }
    });

    // Hand Claude the prompt and close stdin so it starts working.
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        let raw = Buffer.concat(chunks).toString('utf8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip UTF-8 BOM
        resolve(JSON.parse(raw || '{}'));
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

http
  .createServer(async (req, res) => {
    const url = req.url.split('?')[0];

    if (req.method === 'OPTIONS') return sendJson(res, 204, {});

    if (url === '/api/ai' && req.method === 'POST') {
      let body;
      try {
        body = await readBody(req);
      } catch {
        return sendJson(res, 400, { intent: 'NONE', summary: 'Bad request body.' });
      }
      const message = (body.message || '').toString().trim();
      if (!message) return sendJson(res, 400, { intent: 'NONE', summary: 'Empty message.' });

      // Canvas copilot mode — Claude sees and edits the Space whiteboard.
      if (body.mode === 'board') {
        console.log(`[ai-server] →(board) ${message.slice(0, 80)}`);
        const result = await askClaude(
          buildBoardPrompt({ message, board: body.board, tasks: body.tasks, history: body.history }),
          body.model,
          'board'
        );
        const added = result.add?.elements?.length || 0;
        console.log(`[ai-server] ←(board) reply${added ? ` +${added} elements` : ''}`);
        return sendJson(res, 200, result);
      }

      console.log(`[ai-server] → ${message.slice(0, 80)}`);
      const action = await askClaude(buildPrompt({ message, currentContext: body.currentContext, history: body.history }), body.model);
      console.log(`[ai-server] ← ${action.intent}`);
      return sendJson(res, 200, action);
    }

    if (url === '/api/health') return sendJson(res, 200, { ok: true, model: MODEL, board: true });

    sendJson(res, 404, { intent: 'NONE', summary: 'Not found.' });
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`\n  DevTracker AI server — Claude Code is the brain`);
    console.log(`  Listening on http://localhost:${PORT}  (model: ${MODEL}, localhost-only)`);
    console.log(`  Make sure you're logged in:  claude  (then /login if needed)\n`);
  });
