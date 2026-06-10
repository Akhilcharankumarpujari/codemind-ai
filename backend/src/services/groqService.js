import Groq from 'groq-sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is missing from environment variables. Add it to your .env file.');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ALLOWED_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
]);

const DEFAULT_MODEL = process.env.GROQ_DEFAULT_MODEL || 'llama-3.3-70b-versatile';

const FALLBACK_CHAT_PROMPT = `You are CodeMind AI — a premium AI-powered DSA and Coding Interview Assistant.
You were FOUNDED AND BUILT by Pujari Akhil charan Kumar.
Your Role: Elite DSA Mentor. Help users master Data Structures, Algorithms, and coding interviews.`;

const FALLBACK_GENERATE_PROMPT = `Analyze the provided code snippet and return a JSON object containing a premium, beautiful Mermaid.js flowchart and a corresponding execution steps array.
Output format:
{
  "mermaid": "graph TD\\nA([\\"Start\\"]) --> Z([\\"End\\"])",
  "steps": ["A", "Z"]
}`;

const FALLBACK_RETRY_PROMPT = `ONLY return valid Mermaid. No text. No markdown. No explanations.
Output must start with 'graph TD'.
Format: {"mermaid": "graph TD\\nA([\\"Start\\"]) --> B[\\"Processing\\"]", "steps": ["A", "B"]}`;

export async function chat({
  userMessage,
  history = [],
  ragContext = '',
  systemPrompt,
  model,
  temperature = 0.3,
  maxTokens = 1024,
}) {
  const safeModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

  const promptPath = path.join(__dirname, '..', 'prompts', 'chat.json');
  let basePrompt = systemPrompt;
  if (!basePrompt) {
    try {
      const promptData = await fs.readFile(promptPath, 'utf8');
      basePrompt = JSON.parse(promptData).systemPrompt;
    } catch (err) {
      console.error('[groqService] Failed to load chat.json prompt config:', err.message);
      basePrompt = FALLBACK_CHAT_PROMPT;
    }
  }

  const sysContent = ragContext
    ? `${basePrompt}\n\n--- RETRIEVED KNOWLEDGE BASE CONTEXT ---\n${ragContext}\n--- END RETRIEVED CONTEXT ---`
    : basePrompt;

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

  const promptPath = path.join(__dirname, '..', 'prompts', 'chat.json');
  let basePrompt = systemPrompt;
  if (!basePrompt) {
    try {
      const promptData = await fs.readFile(promptPath, 'utf8');
      basePrompt = JSON.parse(promptData).systemPrompt;
    } catch (err) {
      console.error('[groqService] Failed to load chat.json prompt config:', err.message);
      basePrompt = FALLBACK_CHAT_PROMPT;
    }
  }

  const sysContent = ragContext
    ? `${basePrompt}\n\n--- RETRIEVED KNOWLEDGE BASE CONTEXT ---\n${ragContext}\n--- END RETRIEVED CONTEXT ---`
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
export async function generateFlow(code, isRetry = false, customInput = "") {
  const promptPath = path.join(__dirname, '..', 'prompts', 'generate.json');
  let systemPrompt = '';
  try {
    const promptData = await fs.readFile(promptPath, 'utf8');
    const parsed = JSON.parse(promptData);
    systemPrompt = isRetry ? parsed.retryPrompt : parsed.systemPrompt;
  } catch (err) {
    console.error('[groqService] Failed to load generate.json prompt config:', err.message);
    systemPrompt = isRetry ? FALLBACK_RETRY_PROMPT : FALLBACK_GENERATE_PROMPT;
  }

  if (customInput) {
    systemPrompt += `\n\nCRITICAL: The user provided custom inputs for the dry run: "${customInput}".
First, carefully check if this input matches the syntax and parameter requirements of the provided code.
If the input DOES NOT MATCH (e.g. invalid format, wrong types, missing args), you MUST return a json object with a single key 'error' explaining the mismatch in 1 short sentence.
If it DOES MATCH, perform the normal dry run execution trace using these custom inputs.`;
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

  let reply = completion.choices?.[0]?.message?.content;
  if (!reply) throw new Error('Groq returned an empty response.');

  const jsonMatch = reply.match(/\{[\s\S]+\}/);
  if (jsonMatch) {
    reply = jsonMatch[0];
  }

  try {
    const data = JSON.parse(reply);
    return data;
  } catch (err) {
    throw new Error('Failed to parse Groq response as JSON.');
  }
}
