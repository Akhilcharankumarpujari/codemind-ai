/**
 * CodeMind AI — Chat & RAG Routes
 *
 * POST /api/chat   — Main chat endpoint (RAG → Groq)
 * POST /api/index  — Index a new document into the RAG store
 * GET  /api/rag/status — RAG service stats
 */

import { Router } from 'express';
import { chat, chatStream } from '../services/groqService.js';
import { retrieveContext, indexDocument, ragStatus } from '../services/ragService.js';
import { routeAgent } from '../services/agentRouter.js';
import { optionalAuth } from '../middleware/auth.js';

export const chatRouter = Router();

// ── POST /api/chat ─────────────────────────────────────────────────────────────
/**
 * Full RAG → LLM pipeline:
 *
 *  1. Receive user message + conversation history
 *  2. Call RAG service → get top-k relevant chunks (semantic search)
 *  3. Inject retrieved context into Groq system prompt
 *  4. Call Groq LLM → get AI reply
 *  5. Return reply + metadata
 */
chatRouter.post('/chat', async (req, res, next) => {
  try {
    const {
      userMessage,
      history,
      model,
      systemPrompt,
      temperature,
      maxTokens,
      ragEnabled = true,  // client can opt out of RAG
      ragTopK = 4,
    } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: '`userMessage` is required and must be a string.' });
    }
    if (userMessage.length > 8000) {
      return res.status(400).json({ error: '`userMessage` exceeds maximum length of 8000 characters.' });
    }
    if (history !== undefined && !Array.isArray(history)) {
      return res.status(400).json({ error: '`history` must be an array.' });
    }

    // Clamp history to last 20 turns to avoid token overflow
    const safeHistory = Array.isArray(history) ? history.slice(-20) : [];

    // ── Step 1: Agent routing ───────────────────────────────────────────────
    const agent = routeAgent(userMessage);
    const resolvedSystemPrompt = systemPrompt || agent.systemPrompt;

    // ── Step 2: RAG retrieval ───────────────────────────────────────────────
    // Retrieve relevant chunks from the FAISS vector store.
    // Falls back to empty context if RAG service is unavailable.
    let ragContext = '';
    let ragResults = [];

    if (ragEnabled) {
      const rag = await retrieveContext(userMessage, ragTopK);
      ragContext = rag.context;
      ragResults = rag.results;

      if (ragContext) {
        console.log(`[RAG] Retrieved ${ragResults.length} chunks for query: "${userMessage.slice(0, 60)}..."`);
      }
    }

    // ── Step 3: Call Groq with agent system prompt + RAG context ───────────
    const result = await chat({
      userMessage,
      history: safeHistory,
      ragContext,
      model,
      systemPrompt: resolvedSystemPrompt,
      temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1) : undefined,
      maxTokens: typeof maxTokens === 'number' ? Math.min(maxTokens, 4096) : undefined,
    });

    // ── Step 4: Return reply + agent + RAG metadata ────────────────────────
    return res.json({
      ...result,
      agent: { key: agent.key, name: agent.name, emoji: agent.emoji, color: agent.color },
      rag: {
        used: result.ragUsed,
        chunks_retrieved: ragResults.length,
        sources: [...new Set(ragResults.map(r => r.source))],
        top_score: ragResults[0]?.score ?? null,
      },
    });

  } catch (err) {
    next(err);
  }
});

// ── POST /api/chat/stream ─────────────────────────────────────────────────────────────
chatRouter.post('/chat/stream', async (req, res, next) => {
  try {
    const {
      userMessage,
      history,
      model,
      systemPrompt,
      temperature,
      maxTokens,
      ragEnabled = true,
      ragTopK = 4,
    } = req.body;

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: '`userMessage` is required.' });
    }

    const safeHistory = Array.isArray(history) ? history.slice(-20) : [];
    let ragContext = '';
    let ragResults = [];

    // Agent routing
    const agent = routeAgent(userMessage);
    const resolvedSystemPrompt = systemPrompt || agent.systemPrompt;

    if (ragEnabled) {
      const rag = await retrieveContext(userMessage, ragTopK);
      ragContext = rag.context;
      ragResults = rag.results;
    }

    const { stream, model: safeModel, ragUsed } = await chatStream({
      userMessage,
      history: safeHistory,
      ragContext,
      model,
      systemPrompt: resolvedSystemPrompt,
      temperature,
      maxTokens,
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send metadata first (includes agent routing decision for UI badge)
    res.write(`data: ${JSON.stringify({ type: 'meta', ragUsed, chunksRetrieved: ragResults.length, model: safeModel, agent: { key: agent.key, name: agent.name, emoji: agent.emoji, color: agent.color } })}\n\n`);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // Send actual text chunks
        res.write(`data: ${JSON.stringify({ type: 'text', content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (err) {
    console.error('Stream error:', err);
    if (!res.headersSent) {
      next(err);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

// ── POST /api/index ────────────────────────────────────────────────────────────
/**
 * Index a new document into the RAG vector store.
 * Body: { text: string, source?: string }
 */
chatRouter.post('/index', async (req, res, next) => {
  try {
    const { text, source } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return res.status(400).json({ error: '`text` must be a non-empty string (min 10 chars).' });
    }

    const result = await indexDocument(text.trim(), source || 'user_upload');
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/rag/status ────────────────────────────────────────────────────────
chatRouter.get('/rag/status', async (_req, res) => {
  const status = await ragStatus();
  return res.json(status);
});
