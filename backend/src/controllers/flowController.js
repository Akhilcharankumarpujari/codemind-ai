import { generateFlow } from '../services/groqService.js';
import Groq from 'groq-sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const generate = async (req, res) => {
  try {
    const { code, isRetry, customInput } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code string is required.' });
    }

    const flowData = await generateFlow(code, isRetry, customInput);

    res.json({
      mermaid: flowData.mermaid,
      steps: flowData.steps
    });
  } catch (error) {
    console.error('[Flow Generate Error]', error.message);
    const statusCode = error.message.includes('Syntax Error') || error.message.includes('Invalid input') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to generate flow' });
  }
};

export const dryrun = async (req, res) => {
  try {
    const { code, input, language = 'auto' } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code string is required.' });
    }
    if (typeof input !== 'string') {
      return res.status(400).json({ error: 'Sample input must be a string.' });
    }

    const promptPath = path.join(__dirname, '..', 'prompts', 'dryrun.json');
    let systemPrompt = '';
    try {
      const promptData = await fs.readFile(promptPath, 'utf8');
      systemPrompt = JSON.parse(promptData).systemPrompt;
    } catch (err) {
      console.error('[DryRun] Failed to load dryrun.json prompt config:', err.message);
      systemPrompt = `You are a precise code execution tracer. Your job is to simulate code execution step-by-step with a given input and return a structured JSON dry run trace.
RULES:
- If the code is self-contained and the sample input is empty, trace the execution using the values defined inside the code.
- Trace every meaningful line: assignments, comparisons, function calls, loop iterations, returns.
- For each step record: the exact line of code, a plain-English action description, and a snapshot of ALL variable values at that moment.
- Produce a "summary" (1-2 sentences explaining what the code does), "input" (echo the input, or "None" if empty), and "output" (the final return value or print output).`;
    }

    console.log(`[DryRun] Tracing ${language} code with input: "${input ? input.slice(0, 60) : '(None)'}"`);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Language: ${language}\n\nCode:\n\`\`\`\n${code}\n\`\`\`\n\nSample Input: ${input}` }
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty response from AI');

    let cleanRaw = raw.trim();
    const jsonMatch = cleanRaw.match(/\{[\s\S]+\}/);
    if (jsonMatch) {
      cleanRaw = jsonMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanRaw);
    } catch {
      throw new Error('Failed to parse dry run JSON from AI');
    }

    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error('Invalid dry run format: missing steps array');
    }

    res.json(parsed);
  } catch (error) {
    console.error('[DryRun Error]', error.message);
    res.status(500).json({ error: error.message || 'Failed to generate dry run' });
  }
};
