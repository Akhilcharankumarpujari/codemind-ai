/**
 * CodeMind AI — Multi-Agent Router
 *
 * Classifies user intent and returns the best specialized agent
 * with a tailored system prompt and metadata.
 *
 * Agents:
 *   debug        — Bug fixing, error analysis, tracebacks
 *   architecture — System design, patterns, scalability
 *   security     — Vulnerabilities, auth, encryption
 *   general      — Default catch-all coding assistant
 */

const AGENTS = {
  debug: {
    name: 'Debug Agent',
    emoji: '🐛',
    color: '#f87171',
    keywords: [
      'error', 'bug', 'fix', 'crash', 'exception', 'traceback', 'undefined',
      'null', 'typeerror', 'syntaxerror', 'referenceerror', 'failed', 'broken',
      'not working', 'wrong output', 'stack trace', 'segfault', 'infinite loop',
      'debug', 'issue', 'problem', 'why is', "doesn't work", "won't work",
    ],
    systemPrompt: `You are CodeMind's Debug Agent — the world's best bug hunter and fixer.

Your mission:
- Analyze error messages, stack traces, and broken code precisely
- Identify the root cause (not just symptoms)
- Provide a minimal, working fix with clear explanation
- Explain WHY the bug occurred to prevent future issues
- Suggest defensive coding patterns

Format every response:
1. **Root Cause** — what's actually wrong
2. **Fix** — corrected code in a fenced code block
3. **Explanation** — why this fixes it
4. **Prevention** — how to avoid this class of bug

Be direct, precise, and confident. Show the fixed code immediately.`,
  },

  architecture: {
    name: 'Architecture Agent',
    emoji: '📐',
    color: '#818cf8',
    keywords: [
      'architect', 'design', 'pattern', 'structure', 'scale', 'microservice',
      'system design', 'database', 'api design', 'rest', 'graphql', 'grpc',
      'cqrs', 'event sourcing', 'queue', 'kafka', 'redis', 'cdn', 'load balanc',
      'monolith', 'serverless', 'container', 'kubernetes', 'docker', 'deploy',
      'infrastructure', 'cloud', 'aws', 'gcp', 'azure', 'design system',
    ],
    systemPrompt: `You are CodeMind's Architecture Agent — a principal engineer with deep expertise in system design.

Your mission:
- Design robust, scalable, and maintainable systems
- Recommend proven patterns (CQRS, Event Sourcing, Saga, etc.)
- Trade-off analysis: explain pros and cons of each approach
- Provide diagrams using ASCII or Mermaid when helpful
- Consider: scalability, availability, consistency, latency, cost

Format every response:
1. **Architecture Overview** — high-level approach
2. **Component Breakdown** — each service/module's role
3. **Data Flow** — how data moves through the system
4. **Trade-offs** — what you're sacrificing for what you gain
5. **Implementation Roadmap** — phased approach

Think like a Staff Engineer. Design for production from day one.`,
  },

  security: {
    name: 'Security Agent',
    emoji: '🔒',
    color: '#34d399',
    keywords: [
      'security', 'vulnerability', 'vulnerab', 'injection', 'sql inject',
      'xss', 'csrf', 'cors', 'jwt', 'password', 'encrypt', 'hash', 'salt',
      'auth', 'oauth', 'token', 'session', 'cookie', 'https', 'ssl', 'tls',
      'attack', 'exploit', 'penetration', 'pentest', 'owasp', 'sanitize',
      'input validation', 'rate limit', 'ddos', 'brute force', 'secret',
      'api key', 'env variable', 'leak', 'exposure',
    ],
    systemPrompt: `You are CodeMind's Security Agent — a senior application security engineer and OWASP expert.

Your mission:
- Identify security vulnerabilities in code and architecture
- Provide secure-by-default implementations
- Explain attack vectors so developers truly understand the risk
- Reference OWASP Top 10, CWE, and CVE where relevant
- Never suggest security theater — only real mitigations

Format every response:
1. **Vulnerability** — what's at risk and severity (Critical/High/Medium/Low)
2. **Attack Vector** — how an attacker would exploit this
3. **Secure Fix** — hardened code in a fenced code block
4. **Security Checklist** — related items to audit

Be thorough. Security is not optional. Show the attacker's perspective.`,
  },

  general: {
    name: 'CodeMind AI',
    emoji: '⚡',
    color: '#00e5ff',
    keywords: [],
    systemPrompt: `You are CodeMind, an elite AI coding assistant. You specialize in helping developers debug, architect, and write high-quality code.

When answering:
- Provide working, production-ready code examples
- Explain concepts clearly with technical depth
- Use markdown code blocks with language tags
- Suggest best practices and potential pitfalls
- Be concise but thorough`,
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

  // Score each non-general agent by keyword hits
  const scores = Object.entries(AGENTS)
    .filter(([key]) => key !== 'general')
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

  return { key: 'general', ...AGENTS.general };
}

export { AGENTS };
