/**
 * CodeMind AI — Complexity Analyzer Route
 *
 * POST /api/complexity/analyze
 *
 * Accepts user code + language, uses Groq to return:
 *   - Time Complexity (Big O)
 *   - Space Complexity (Big O)
 *   - Explanation / Reasoning
 *   - Optimization Suggestions
 *   - Better Approach (if any)
 *   - Brute Force vs Optimal comparison (if applicable)
 *   - Interview Tips
 */

import { Router } from 'express';
import Groq from 'groq-sdk';

export const complexityRouter = Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java', 'c++', 'cpp'];

/**
 * Builds the DSA-mentor system prompt for complexity analysis.
 */
function buildComplexityPrompt(code, language) {
  return `You are an elite DSA (Data Structures & Algorithms) mentor and competitive programmer with deep expertise in algorithm analysis. Your role is to analyze code like a FAANG interviewer would.

Analyze the following ${language} code and provide a **thorough, accurate, DSA-focused complexity analysis**.

STRICT RULES:
- Be precise with Big O notation. Never give vague answers.
- Identify the EXACT algorithmic pattern (nested loop, recursion, divide & conquer, DP, etc.)
- Explain WHY the complexity is what it is — trace through the logic
- If a better approach exists, show actual code for it
- Use real algorithmic terminology (amortized, worst/average/best case where relevant)

Return your response in this EXACT JSON format (no markdown, no code fences, just valid JSON):

{
  "timeComplexity": "O(n log n)",
  "spaceComplexity": "O(n)",
  "timeReason": "Detailed explanation of why time complexity is this value. Mention specific loops, recursion depth, etc.",
  "spaceReason": "Detailed explanation of why space complexity is this value. Mention stack frames, auxiliary arrays, etc.",
  "algorithmPattern": "Divide and Conquer / Dynamic Programming / Two Pointers / etc.",
  "bruteForceComplexity": "O(n²) — if the current code IS the brute force, say so",
  "optimalComplexity": "O(n log n) — the best achievable complexity for this problem",
  "isAlreadyOptimal": false,
  "optimizationSuggestion": "Detailed suggestion: e.g., Use a HashMap to reduce the inner loop lookup from O(n) to O(1)",
  "betterApproach": {
    "exists": true,
    "explanation": "Brief explanation of the better algorithm",
    "code": "def twoSum(nums, target):\\n    seen = {}\\n    for i, num in enumerate(nums):\\n        if target - num in seen:\\n            return [seen[target - num], i]\\n        seen[num] = i\\n    return []",
    "language": "${language}"
  },
  "interviewTips": [
    "Always clarify if the input is sorted before choosing a search strategy",
    "Mention trade-offs between time and space complexity",
    "This pattern (Two Pointers) is extremely common in FAANG interviews"
  ],
  "commonMistakes": [
    "Forgetting to handle edge cases like empty arrays",
    "Not accounting for duplicate elements"
  ],
  "dsaCategory": "Array / String / Tree / Graph / DP / Sorting / Searching / etc."
}

The code to analyze:
\`\`\`${language}
${code}
\`\`\`

Return ONLY valid JSON. No explanation outside JSON. No markdown code fences.`;
}

complexityRouter.post('/complexity/analyze', async (req, res, next) => {
  try {
    const { code, language } = req.body;

    // ── Input validation ─────────────────────────────────────────────────────
    if (!code || typeof code !== 'string' || code.trim().length < 5) {
      return res.status(400).json({
        error: 'Please provide valid code to analyze (minimum 5 characters).'
      });
    }

    const normalizedLang = (language || 'python').toLowerCase().trim();
    if (!SUPPORTED_LANGUAGES.includes(normalizedLang)) {
      return res.status(400).json({
        error: `Unsupported language: "${language}". Supported: Python, JavaScript, Java, C++`
      });
    }

    const codeLength = code.trim().length;
    if (codeLength > 8000) {
      return res.status(400).json({
        error: 'Code is too long. Please paste a focused snippet (under 8000 characters).'
      });
    }

    // ── Groq API call ────────────────────────────────────────────────────────
    console.log(`[Complexity] Analyzing ${normalizedLang} code (${codeLength} chars)`);

    const prompt = buildComplexityPrompt(code.trim(), normalizedLang);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a DSA expert. Always respond with valid JSON only — no markdown, no prose outside the JSON object.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for accurate, deterministic analysis
      max_tokens: 2048,
      response_format: { type: 'json_object' }
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return res.status(500).json({ error: 'AI returned an empty response. Please try again.' });
    }

    // ── Parse & validate JSON response ───────────────────────────────────────
    let analysis;
    try {
      analysis = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('[Complexity] JSON parse error:', parseErr.message);
      console.error('[Complexity] Raw content:', rawContent.slice(0, 500));

      // Attempt to extract JSON from raw text (fallback)
      const jsonMatch = rawContent.match(/\{[\s\S]+\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch {
          return res.status(500).json({
            error: 'Unable to analyze complexity. The AI response was malformed. Please try again.'
          });
        }
      } else {
        return res.status(500).json({
          error: 'Unable to analyze complexity. Please check your code syntax and try again.'
        });
      }
    }

    // ── Ensure required fields exist ─────────────────────────────────────────
    const required = ['timeComplexity', 'spaceComplexity', 'timeReason', 'spaceReason'];
    const missing = required.filter(k => !analysis[k]);
    if (missing.length) {
      return res.status(500).json({
        error: 'Incomplete analysis returned. Please try again.'
      });
    }

    // ── Return structured result ─────────────────────────────────────────────
    return res.json({
      success: true,
      language: normalizedLang,
      analysis,
      analyzedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Complexity] Error:', err.message);
    next(err);
  }
});
