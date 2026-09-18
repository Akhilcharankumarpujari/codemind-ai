import { generateFlow } from '../services/groqService.js';
import Groq from 'groq-sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateFlowGraph, validateFlowGenerationResult } from '../services/flow/flowValidator.js';
import { explainFlow } from '../services/flow/flowExplainer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const generate = async (req, res) => {
  try {
    const { code, isRetry, customInput } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Code string is required.' });

    let flowData = await generateFlow(code, isRetry, customInput);
    let validation = validateFlowGenerationResult(flowData, code);

    if (!isRetry && !flowData?.error && !validation.valid) {
      try {
        const retryData = await generateFlow(code, true, customInput);
        const retryValidation = validateFlowGenerationResult(retryData, code);
        if (retryValidation.valid || retryValidation.errors.length < validation.errors.length) {
          flowData = retryData;
          validation = retryValidation;
        }
      } catch (retryError) {
        console.warn('[Flow Generate Retry] Repair attempt failed:', retryError.message);
      }
    }

    if (flowData?.error) return res.status(400).json({ error: String(flowData.error) });
    if (!flowData || typeof flowData !== 'object') {
      return res.status(502).json({ error: 'AI returned an invalid flow response.' });
    }

    return res.json({
      mermaid: flowData.mermaid || null,
      graph: flowData.graph || null,
      steps: Array.isArray(flowData.steps) ? flowData.steps : [],
      validation,
    });
  } catch (error) {
    console.error('[Flow Generate Error]', error.message);
    const statusCode = error.message.includes('Syntax Error') || error.message.includes('Invalid input') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to generate flow' });
  }
};

export const validate = async (req, res) => {
  try {
    const { graph, sourceCode = '' } = req.body;
    if (!graph || typeof graph !== 'object') return res.status(400).json({ error: 'graph object is required.' });
    return res.json(validateFlowGraph(graph, sourceCode));
  } catch (error) {
    console.error('[Flow Validate Error]', error.message);
    return res.status(500).json({ error: 'Failed to validate flow.' });
  }
};

export const explain = async (req, res) => {
  try {
    const { code, graph, selectedNodeId, executionState, ragContext, mode = 'node', model } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Code string is required.' });
    if (!graph || typeof graph !== 'object') return res.status(400).json({ error: 'graph object is required.' });

    const validation = validateFlowGraph(graph, code);
    if (validation.errors.length) return res.status(422).json({ error: 'Flow graph must be corrected before explanation.', validation });

    const explanation = await explainFlow({ code, graph, selectedNodeId, executionState, ragContext, mode, model });
    return res.json({ success: true, validation, explanation });
  } catch (error) {
    console.error('[Flow Explain Error]', error.message);
    return res.status(500).json({ error: error.message || 'Failed to explain flow.' });
  }
};

export const dryrun = async (req, res) => {
  try {
    const { code, input, language = 'auto' } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Code string is required.' });
    if (typeof input !== 'string') return res.status(400).json({ error: 'Sample input must be a string.' });

    const promptPath = path.join(__dirname, '..', 'prompts', 'dryrun.json');
    let systemPrompt = '';
    try {
      const promptData = await fs.readFile(promptPath, 'utf8');
      systemPrompt = JSON.parse(promptData).systemPrompt;
    } catch (err) {
      console.error('[DryRun] Failed to load dryrun.json prompt config:', err.message);
      systemPrompt = `You are a precise code execution tracer. Your job is to simulate code execution step-by-step with a given input and return a structured JSON dry run trace.\nRULES:\n- If the code is self-contained and the sample input is empty, trace the execution using the values defined inside the code.\n- Trace every meaningful line: assignments, comparisons, function calls, loop iterations, returns.\n- For each step record: the exact line of code, a plain-English action description, and a snapshot of ALL variable values at that moment.\n- Produce a summary, input, and output.`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Language: ${language}\n\nCode:\n\\`\\`\\`\n${code}\n\\`\\`\\`\n\nSample Input: ${input}` }
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty response from AI');
    const match = raw.trim().match(/\{[\s\S]+\}/);
    const parsed = JSON.parse(match ? match[0] : raw.trim());
    if (!parsed.steps || !Array.isArray(parsed.steps)) throw new Error('Invalid dry run format: missing steps array');
    return res.json(parsed);
  } catch (error) {
    console.error('[DryRun Error]', error.message);
    return res.status(500).json({ error: error.message || 'Failed to generate dry run' });
  }
};
