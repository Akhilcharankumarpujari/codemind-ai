import express from 'express';
import { generateFlow } from '../services/groqService.js';

export const flowRouter = express.Router();

/**
 * POST /api/flow/generate
 * Analyzes code and returns Mermaid flowchart syntax + execution steps
 * Note: no auth required — available to all users
 */
flowRouter.post('/flow/generate', async (req, res) => {
  try {
    const { code, isRetry } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code string is required.' });
    }

    const flowData = await generateFlow(code, isRetry);

    res.json({
      mermaid: flowData.mermaid,
      steps: flowData.steps
    });
  } catch (error) {
    console.error('[Flow Generate Error]', error.message);
    res.status(500).json({ error: error.message || 'Failed to generate flow' });
  }
});
