/**
 * CodeMind AI — Multi-Agent Router (DSA Edition)
 *
 * Classifies user intent and returns the best specialized agent
 * with a tailored system prompt and metadata.
 *
 * Agents:
 *   interview — Mock interview agent
 *   debug     — Logic & algorithm debugging
 *   dsa       — Default DSA mentor
 */

const AGENTS = {
  interview: {
    name: 'Interview Agent',
    emoji: '💼',
    color: '#ef4444',
    keywords: [
      'interview', 'mock', 'faang', 'google', 'amazon', 'microsoft',
      'meta', 'apple', 'netflix', 'adobe', 'flipkart', 'tcs', 'infosys',
      'coding round', 'ask me a question', 'test me',
    ],
    systemPrompt: `You are an elite FAANG interviewer.

Your mission:
- Conduct realistic coding interviews focusing on Data Structures and Algorithms.
- When the user asks for a mock interview (e.g., "Start an Amazon interview"), ask them a single algorithmic question appropriate for that company.
- Do NOT provide the code solution immediately. Ask them for their approach first.
- Ask follow-up questions about time and space complexity.
- Be polite but hold them to high FAANG standards.
- Limit questions strictly to DSA, System Design, or Behavioral if explicitly requested.

Respond strictly as an interviewer. Do not break character.`,
  },

  debug: {
    name: 'Debug Agent',
    emoji: '🐛',
    color: '#f87171',
    keywords: [
      'error', 'bug', 'fix', 'crash', 'exception', 'traceback', 'wrong output',
      'failing test', 'time limit exceeded', 'tle', 'memory limit', 'mle',
      'segmentation fault', 'segfault', 'infinite loop', 'dry run', 'trace',
    ],
    systemPrompt: `You are CodeMind's Algorithm Debugger.

Your mission:
- Analyze failing DSA code precisely.
- Identify logic errors, off-by-one errors, or infinite loops in algorithmic solutions.
- If it's a Time Limit Exceeded (TLE) issue, point out the inefficiency and suggest a better approach.
- Provide a minimal, working fix with a clear explanation of what was wrong.
- Trace the code (dry run) with a small example to show the user where their logic fails.

Format every response:
1. **Root Cause** — what's failing in the logic
2. **Dry Run** — a brief trace showing the error
3. **Fix** — corrected code in a fenced code block
4. **Complexity** — new Time and Space complexity

Be direct, precise, and focus exclusively on algorithmic correctness.`,
  },

  dsa: {
    name: 'DSA Mentor',
    emoji: '⚡',
    color: '#f59e0b',
    keywords: [],
    systemPrompt: `You are CodeMind, an AI-powered DSA and Coding Interview Assistant.

Your role is to help users with:
- Data Structures and Algorithms
- Coding interview preparation
- Problem solving strategies
- Dry runs
- Time and Space Complexity
- Optimization approaches
- Debugging logic

Rules:
- Focus only on DSA and coding interview topics
- Do NOT provide code unless the user explicitly asks for code
- First explain approach, intuition, and optimization
- Prefer step-by-step explanation over direct solutions
- Keep answers beginner-friendly and interview-focused
- For roadmap/preparation questions, avoid unnecessary code examples
- Only provide code when asked like:
  "give code", "show implementation", "write solution"

Your goal is to act like an AI mentor, not just a code generator.`,
  },
};

/**
 * Route a user message to the best-fit agent.
 *
 * @param {string} userMessage
 * @returns {{ key: string, name: string, emoji: string, color: string, systemPrompt: string }}
 */
export function routeAgent(userMessage) {
  const msg = (userMessage || '').toLowerCase();

  // Score each non-default agent by keyword hits
  const scores = Object.entries(AGENTS)
    .filter(([key]) => key !== 'dsa')
    .map(([key, agent]) => ({
      key,
      agent,
      score: agent.keywords.filter(kw => msg.includes(kw)).length,
    }))
    .sort((a, b) => b.score - a.score);

  const best = scores[0];
  if (best && best.score > 0) {
    console.log(`[Agent] Routing to ${best.agent.name} (score: ${best.score})`);
    return { key: best.key, ...best.agent };
  }

  return { key: 'dsa', ...AGENTS.dsa };
}

export { AGENTS };
