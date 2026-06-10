import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `You are CodeMind AI's Universal Code Analysis Engine — an elite code intelligence system.

Your job: analyze ANY code snippet and return a structured JSON object describing:
1. What language is it
2. What category of code it is
3. What specific pattern or algorithm is used
4. What's the best way to visualize it
5. Step-by-step execution trace for the code
6. Any errors or issues
7. Complexity analysis

RESPOND ONLY WITH VALID JSON. No markdown. No prose. No code fences.`;

function buildAnalysisPrompt(code, preferredMode) {
  return `Analyze this code and return a complete JSON analysis.

CODE:
\`\`\`
${code.slice(0, 6000)}
\`\`\`

PREFERRED_MODE: ${preferredMode || 'auto'}

Return this EXACT JSON structure (fill in real values, no placeholders):

{
  "language": "Python",
  "languageConfidence": 98,
  "category": "DSA",
  "categoryOptions": ["DSA", "General", "API", "UI/Component", "Database", "Utility", "Authentication", "Microservice"],
  "pattern": "Bubble Sort",
  "patternFamily": "Sorting Algorithm",
  "vizMode": "dsa",
  "vizModeOptions": ["dsa", "general", "debug", "systemflow"],
  "confidence": 97,
  "timeComplexity": "O(n²)",
  "spaceComplexity": "O(1)",
  "bestCase": "O(n)",
  "worstCase": "O(n²)",
  "dsaCategory": "Sorting",
  "executionSteps": [
    {
      "stepNumber": 1,
      "line": 1,
      "action": "Function defined",
      "description": "Define the bubble_sort function that takes an array",
      "variables": { "arr": [64, 25, 12, 22, 11] },
      "callStack": ["bubble_sort"]
    },
    {
      "stepNumber": 2,
      "line": 2,
      "action": "Loop starts",
      "description": "Outer loop begins: i = 0, iterate n times",
      "variables": { "i": 0, "n": 5, "arr": [64, 25, 12, 22, 11] },
      "callStack": ["bubble_sort"]
    }
  ],
  "functionFlow": [
    { "name": "main", "calls": ["bubble_sort"], "returns": "sorted array" },
    { "name": "bubble_sort", "calls": ["swap"], "returns": "void" }
  ],
  "errors": [],
  "warnings": [
    {
      "line": 3,
      "type": "Performance",
      "message": "Could add early exit flag for best-case O(n)",
      "severity": "low",
      "fix": "Add 'swapped = False' flag and break if no swaps in a pass"
    }
  ],
  "systemFlow": [
    { "icon": "💻", "label": "Client Request", "action": "POST /api/login with email & password", "color": "user", "line": 1 },
    { "icon": "🔒", "label": "Auth Service", "action": "Verify credentials & hash", "color": "auth", "line": 5 },
    { "icon": "🗄️", "label": "User DB", "action": "Query user by email", "color": "db", "line": 8 },
    { "icon": "🎫", "label": "JWT Generate", "action": "Create signed session token", "color": "cache", "line": 12 },
    { "icon": "✅", "label": "Response", "action": "Send 200 OK + JWT payload", "color": "response", "line": 15 }
  ],
  "optimizations": [
    "Add a 'swapped' boolean flag to detect already-sorted arrays early (best case O(n))",
    "Consider using built-in sort() for production code (Timsort, O(n log n))"
  ],
  "aiSummary": "This is a classic Bubble Sort implementation using nested loops. The outer loop runs n times and the inner loop compares adjacent elements, swapping them if out of order. Each pass bubbles the largest unsorted element to its correct position.",
  "testInput": "[64, 25, 12, 22, 11]",
  "dsaVisualizationHint": "bubble_sort"
}

RULES:
- "vizMode" must be one of: "dsa", "general", "debug", "systemflow"
- "category" must be one of: "DSA", "General", "API", "UI/Component", "Database", "Utility", "Authentication", "Microservice"
- For DSA code: set vizMode="dsa". If it matches a built-in algorithm, fill "dsaVisualizationHint" with: bubble_sort, selection_sort, insertion_sort, merge_sort, quick_sort, linear_search, binary_search, two_pointers, sliding_window, fibonacci_dp, linked_list_traversal, linked_list_reverse, stack_ops, queue_ops, bst_insert, bfs_tree, dfs_tree. If it is a custom algorithm (e.g. swap values, custom sort, binary tree node creation), set vizMode="dsa", "dsaVisualizationHint"="custom_array" (or "custom_list", "custom_stack", "custom_queue"), and ensure the executionSteps variables include the array/list state so the visualizer can render it.
- For recursive functions (e.g. factorial, fibonacci, recursion, backtracking), ensure the "callStack" array contains all active frames (e.g. ["factorial(5)", "factorial(4)", "factorial(3)"]) and "variables" contains local variables for the top frame.
- For simple logic (e.g. swap two numbers, compare three numbers, check prime, palindrome): set "vizMode" to "general" or "dsa", and ensure "variables" tracks variable states (e.g. a=5, b=10, temp=5) while "action" explicitly describes comparisons (e.g. "Compare a > b") or assignments (e.g. "Assign temp = a" or "Swap a and b") so the visualizer can animate it.
- For React/Vue/Angular components or front-end UI code: set vizMode="systemflow", category="UI/Component", and generate a custom "systemFlow" showing the mounting, hooks, events, and re-rendering sequence.
- For Express/FastAPI/Django routes/controllers/backend API logic: set vizMode="systemflow", category="API" (or "Database", "Authentication", "Microservice"), and generate a custom "systemFlow" showing request parsing, middleware/auth, business logic, DB queries, caching, and responses.
- For utility functions, helper scripts, or generic classes: set vizMode="general", category="Utility".
- For code with syntax errors or structural issues: add to "errors" array with line, type, message, fix, and set vizMode="debug".
- "executionSteps" should have 4-12 meaningful steps describing what the code actually does line-by-line.
- "systemFlow" MUST be an array of nodes containing {icon, label, action, color, line} objects representing the architecture/execution sequence. Do NOT use null for API, UI/Component, Auth, Database, or Microservice categories. Generate a custom, real flow diagram.
- Valid "color" values for systemFlow nodes are: "user", "api", "backend", "db", "auth", "cache", "response", "default".
- The "line" property in systemFlow should specify the line number of the code corresponding to that flow layer.

Return ONLY the JSON object. Nothing else.`;
}

export const analyze = async (req, res, next) => {
  try {
    const { code, mode } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide valid code (minimum 5 characters).' });
    }

    if (code.length > 12000) {
      return res.status(400).json({ error: 'Code is too long (max 12,000 characters). Paste a focused snippet.' });
    }

    console.log(`[Analyze] Analyzing code (${code.length} chars), mode=${mode || 'auto'}`);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: buildAnalysisPrompt(code.trim(), mode) }
      ],
      temperature: 0.05,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return res.status(500).json({ error: 'AI returned an empty response. Please try again.' });
    }

    let analysis;
    try {
      analysis = JSON.parse(rawContent);
    } catch (parseErr) {
      const jsonMatch = rawContent.match(/\{[\s\S]+\}/);
      if (jsonMatch) {
        try { analysis = JSON.parse(jsonMatch[0]); }
        catch { return res.status(500).json({ error: 'Unable to parse analysis. Please try again.' }); }
      } else {
        return res.status(500).json({ error: 'AI response malformed. Please try again.' });
      }
    }

    const safe = {
      language: analysis.language || 'Unknown',
      languageConfidence: analysis.languageConfidence || 70,
      category: analysis.category || 'General',
      pattern: analysis.pattern || 'Custom Code',
      patternFamily: analysis.patternFamily || 'General',
      vizMode: ['dsa', 'general', 'debug', 'systemflow'].includes(analysis.vizMode) ? analysis.vizMode : 'general',
      confidence: Math.min(100, Math.max(0, analysis.confidence || 70)),
      timeComplexity: analysis.timeComplexity || '—',
      spaceComplexity: analysis.spaceComplexity || '—',
      bestCase: analysis.bestCase || '—',
      worstCase: analysis.worstCase || '—',
      dsaCategory: analysis.dsaCategory || '',
      executionSteps: Array.isArray(analysis.executionSteps) ? analysis.executionSteps.slice(0, 20) : [],
      functionFlow: Array.isArray(analysis.functionFlow) ? analysis.functionFlow : [],
      errors: Array.isArray(analysis.errors) ? analysis.errors : [],
      warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
      systemFlow: analysis.systemFlow || null,
      optimizations: Array.isArray(analysis.optimizations) ? analysis.optimizations : [],
      aiSummary: analysis.aiSummary || 'Analysis complete.',
      testInput: analysis.testInput || '',
      dsaVisualizationHint: analysis.dsaVisualizationHint || '',
    };

    console.log(`[Analyze] Result: ${safe.language} | ${safe.category} | ${safe.pattern} | mode=${safe.vizMode} | confidence=${safe.confidence}%`);

    return res.json({ success: true, analysis: safe, analyzedAt: new Date().toISOString() });

  } catch (err) {
    console.error('[Analyze] Error:', err.message);
    next(err);
  }
};
