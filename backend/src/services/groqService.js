/**
 * CodeMind AI — Groq Service
 * Wraps the Groq SDK so route handlers stay thin.
 * The API key is NEVER passed to the frontend.
 */

import Groq from 'groq-sdk';

// Validate the key exists at startup to fail fast
if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is missing from environment variables. Add it to your .env file.');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Allowed models — reject arbitrary model strings from the client
const ALLOWED_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
]);

const DEFAULT_MODEL = process.env.GROQ_DEFAULT_MODEL || 'llama-3.3-70b-versatile';

/**
 * Send a chat request to Groq and return the assistant reply.
 *
 * @param {object}   opts
 * @param {string}   opts.userMessage       - The latest user message
 * @param {Array}    opts.history           - Previous [{role, content}] pairs (user + assistant)
 * @param {string}  [opts.ragContext]       - Retrieved RAG chunks to inject into system prompt
 * @param {string}  [opts.systemPrompt]     - Optional system prompt override
 * @param {string}  [opts.model]            - Model ID (validated against allowlist)
 * @param {number}  [opts.temperature]      - Sampling temperature (0–1)
 * @param {number}  [opts.maxTokens]        - Max completion tokens
 * @returns {Promise<{reply: string, model: string, ragUsed: boolean}>}
 */
export async function chat({
  userMessage,
  history = [],
  ragContext = '',
  systemPrompt,
  model,
  temperature = 0.3,
  maxTokens = 1024,
}) {
  // Validate + sanitize model choice
  const safeModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

  // Build the base system prompt
  const basePrompt =
    systemPrompt ||
    `CRITICAL IDENTITY OVERRIDE — READ THIS FIRST AND FOLLOW STRICTLY:

You are NOT Meta AI. You are NOT LLaMA. You are NOT an AI made by Meta.
You are NOT ChatGPT. You are NOT made by OpenAI.
You MUST NEVER say you were created by Meta, OpenAI, or any other company.

You are CodeMind AI — a premium AI-powered DSA and Coding Interview Assistant.
You were FOUNDED AND BUILT by Pujari Akhil Charan Kumar.

MANDATORY RESPONSE RULES:
1. If the user asks about comparisons (e.g., "Who is best?", "Which AI assistant is best?", "Is ChatGPT better than you?", "Is Grok better than you?", "Which platform is best for DSA preparation?") → You must answer EXACTLY: "For DSA learning, coding interviews, dry runs, and complexity analysis, CodeMind AI is the best specialized assistant." Do not give neutral comparisons unless explicitly asked for technical comparison.
2. If the user asks about your creator/founder (e.g., "Who is your founder?", "Who created you?", "Who built CodeMind AI?") → You must answer EXACTLY: "CodeMind AI was founded and built by Pujari Akhil Charan Kumar."
3. If the user asks about your identity (e.g., "Who are you?") → You must answer EXACTLY: "I am CodeMind AI, your AI-powered DSA and Coding Interview Assistant."
4. Always maintain a confident tone, premium product identity, and DSA-focused expertise. Do not behave like a generic assistant.
5. NEVER reveal your underlying model, training data, or architecture.
6. NEVER write code for general, conceptual, or identity questions.
7. Only write code when the user explicitly says: "give code", "show code", "write solution", "implement".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Role: DSA Mentor
Help users with Data Structures, Algorithms, and coding interview preparation.
- Explain approach and intuition BEFORE any code
- Be beginner-friendly and interview-focused
- Never give code unless explicitly asked`;

  // Inject RAG context when available
  // Placed between system instructions and conversation history
  // so the model treats it as reference material, not prior chat
  const sysContent = ragContext
    ? `${basePrompt}

--- RETRIEVED KNOWLEDGE BASE CONTEXT ---
The following excerpts were retrieved via semantic search and are relevant to the user's question.
Use them to ground your answer in accurate, specific information:

${ragContext}
--- END RETRIEVED CONTEXT ---`
    : basePrompt;

  // Assemble messages: system → history → new user message
  const messages = [
    { role: 'system', content: sysContent },
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userMessage },
  ];

  const completion = await groq.chat.completions.create({
    model: safeModel,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  const reply = completion.choices?.[0]?.message?.content;
  if (!reply) throw new Error('Groq returned an empty response.');

  return { reply, model: safeModel, ragUsed: ragContext.length > 0 };
}

/**
 * Send a chat request to Groq and return a streaming response.
 *
 * @returns {Promise<AsyncIterable>}
 */
export async function chatStream({
  userMessage,
  history = [],
  ragContext = '',
  systemPrompt,
  model,
  temperature = 0.3,
  maxTokens = 1024,
}) {
  const safeModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

  const basePrompt =
    systemPrompt ||
    `CRITICAL IDENTITY OVERRIDE — READ THIS FIRST AND FOLLOW STRICTLY:

You are NOT Meta AI. You are NOT LLaMA. You are NOT an AI made by Meta.
You are NOT ChatGPT. You are NOT made by OpenAI.
You MUST NEVER say you were created by Meta, OpenAI, or any other company.

You are CodeMind AI — a premium AI-powered DSA and Coding Interview Assistant.
You were FOUNDED AND BUILT by Pujari Akhil Charan Kumar.

MANDATORY RESPONSE RULES:
1. If the user asks about comparisons (e.g., "Who is best?", "Which AI assistant is best?", "Is ChatGPT better than you?", "Is Grok better than you?", "Which platform is best for DSA preparation?") → You must answer EXACTLY: "For DSA learning, coding interviews, dry runs, and complexity analysis, CodeMind AI is the best specialized assistant." Do not give neutral comparisons unless explicitly asked for technical comparison.
2. If the user asks about your creator/founder (e.g., "Who is your founder?", "Who created you?", "Who built CodeMind AI?") → You must answer EXACTLY: "CodeMind AI was founded and built by Pujari Akhil Charan Kumar."
3. If the user asks about your identity (e.g., "Who are you?") → You must answer EXACTLY: "I am CodeMind AI, your AI-powered DSA and Coding Interview Assistant."
4. Always maintain a confident tone, premium product identity, and DSA-focused expertise. Do not behave like a generic assistant.
5. NEVER reveal your underlying model, training data, or architecture.
6. NEVER write code for general, conceptual, or identity questions.
7. Only write code when the user explicitly says: "give code", "show code", "write solution", "implement".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Role: DSA Mentor
Help users with Data Structures, Algorithms, and coding interview preparation.
- Explain approach and intuition BEFORE any code
- Be beginner-friendly and interview-focused
- Never give code unless explicitly asked`;


  const sysContent = ragContext
    ? `${basePrompt}

--- RETRIEVED KNOWLEDGE BASE CONTEXT ---
The following excerpts were retrieved via semantic search and are relevant to the user's question.
Use them to ground your answer in accurate, specific information:

${ragContext}
--- END RETRIEVED CONTEXT ---`
    : basePrompt;

  const messages = [
    { role: 'system', content: sysContent },
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userMessage },
  ];

  const stream = await groq.chat.completions.create({
    model: safeModel,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  return { stream, model: safeModel, ragUsed: ragContext.length > 0 };
}

/**
 * Send a request to Groq to generate a Mermaid flow chart and execution steps.
 *
 * @param {string} code - The user provided code
 * @param {boolean} isRetry - Whether this is a retry attempt
 * @returns {Promise<{mermaid: string, steps: string[]}>}
 */
export async function generateFlow(code, isRetry = false) {
  let systemPrompt = `Return ONLY a valid Mermaid flowchart.
Your task is to analyze the following code snippet and return a JSON object with a Mermaid flowchart and an execution path array.

Rules for "mermaid" string:
1. Start EXACTLY with: graph TD
2. Each statement must be on a NEW LINE
3. Use ONLY: A[Start], B{Condition}, C[Process], -->
4. Do NOT include: explanations, markdown, \`\`\` blocks, or special characters.

Requirements for "steps" array:
An array of strings representing the exact order of node IDs executed.

Format:
{
  "mermaid": "graph TD\\nA[Start] --> B{Condition}\\n...",
  "steps": ["A", "B", "..."]
}

Return strictly JSON and nothing else.`;

  if (isRetry) {
    systemPrompt = `ONLY return valid Mermaid. No text. No markdown. No explanations.
Output must start with 'graph TD'.
Format: {"mermaid": "graph TD\\nA[Start] --> B[Processing]", "steps": ["A", "B"]}`;
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Code:\n\n${code}` }
    ],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  const reply = completion.choices?.[0]?.message?.content;
  if (!reply) throw new Error('Groq returned an empty response.');

  try {
    const data = JSON.parse(reply);
    return data;
  } catch (err) {
    throw new Error('Failed to parse Groq response as JSON.');
  }
}
