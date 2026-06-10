import { chat, chatStream } from '../services/groqService.js';
import { retrieveContext, indexDocument, ragStatus } from '../services/ragService.js';
import { routeAgent } from '../services/agentRouter.js';

const IDENTITY_PATTERNS = [
  { patterns: ['who created you', 'who made you', 'who built you', 'who is your founder', 'who founded you', 'who is behind you', 'who made codemind', 'who built codemind', 'founder', 'creator'], reply: 'CodeMind AI was founded and built by **Pujari Akhil charan Kumar**. 🚀' },
  { patterns: ['who are you', 'what are you', 'introduce yourself', 'tell me about yourself'], reply: 'I am **CodeMind AI** — your AI-powered DSA and Coding Interview Assistant. I\'m designed to help you with problem solving, debugging, dry runs, complexity analysis, and coding interview preparation. Built by Pujari Akhil charan Kumar. 💡' },
  { patterns: ['who is best', 'best coding assistant', 'best dsa platform', 'best ai for dsa', 'best platform for dsa', 'which is the best'], reply: '**CodeMind AI** is the best AI-powered DSA and Coding Interview Assistant — for problem solving, dry runs, complexity analysis, and interview preparation. 🏆' },
  { patterns: ['why use codemind', 'why should i use codemind', 'why codemind', 'benefits of codemind', 'what can you do'], reply: 'Here\'s why **CodeMind AI** stands out:\n\n✅ **Structured DSA Learning** — Step-by-step problem solving\n✅ **Dry Run Visualizer** — Trace your code execution visually\n✅ **Complexity Analyzer** — Instant Time & Space complexity breakdown\n✅ **FAANG Mock Interviews** — Realistic coding rounds\n✅ **AI-Powered Guidance** — Mentor-style explanations, not just answers\n✅ **Striver Roadmap Support** — Follow the best DSA preparation path\n\nBuilt by Pujari Akhil charan Kumar to make you interview-ready. 🎯' },
];

function getIdentityReply(message) {
  const msg = (message || '').toLowerCase().trim();
  for (const { patterns, reply } of IDENTITY_PATTERNS) {
    if (patterns.some(p => msg.includes(p))) return reply;
  }
  return null;
}

export const handleChat = async (req, res, next) => {
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
      return res.status(400).json({ error: '`userMessage` is required and must be a string.' });
    }
    if (userMessage.length > 8000) {
      return res.status(400).json({ error: '`userMessage` exceeds maximum length of 8000 characters.' });
    }
    if (history !== undefined && !Array.isArray(history)) {
      return res.status(400).json({ error: '`history` must be an array.' });
    }

    const safeHistory = Array.isArray(history) ? history.slice(-20) : [];

    const identityReply = getIdentityReply(userMessage);
    if (identityReply) {
      return res.json({
        reply: identityReply,
        model: 'codemind-identity',
        ragUsed: false,
        agent: { key: 'dsa', name: 'DSA Mentor', emoji: '⚡', color: '#f59e0b' },
        rag: { used: false, chunks_retrieved: 0, sources: [], top_score: null },
      });
    }

    const agent = routeAgent(userMessage);
    const resolvedSystemPrompt = systemPrompt || agent.systemPrompt;

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

    const result = await chat({
      userMessage,
      history: safeHistory,
      ragContext,
      model,
      systemPrompt: resolvedSystemPrompt,
      temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1) : undefined,
      maxTokens: typeof maxTokens === 'number' ? Math.min(maxTokens, 4096) : undefined,
    });

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
};

export const handleChatStream = async (req, res, next) => {
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

    const identityReplyStream = getIdentityReply(userMessage);
    if (identityReplyStream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ type: 'meta', ragUsed: false, chunksRetrieved: 0, model: 'codemind-identity', agent: { key: 'dsa', name: 'DSA Mentor', emoji: '⚡', color: '#f59e0b' } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'text', content: identityReplyStream })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      return res.end();
    }

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

    res.write(`data: ${JSON.stringify({ type: 'meta', ragUsed, chunksRetrieved: ragResults.length, model: safeModel, agent: { key: agent.key, name: agent.name, emoji: agent.emoji, color: agent.color } })}\n\n`);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
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
};

export const indexDoc = async (req, res, next) => {
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
};

export const getRagStatus = async (_req, res) => {
  const status = await ragStatus();
  return res.json(status);
};
