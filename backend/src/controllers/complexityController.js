import Groq from 'groq-sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java', 'c++', 'cpp'];

export const analyzeComplexity = async (req, res, next) => {
  try {
    const { code, language } = req.body;

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

    console.log(`[Complexity] Analyzing ${normalizedLang} code (${codeLength} chars)`);

    const promptPath = path.join(__dirname, '..', 'prompts', 'complexity.json');
    let systemPrompt = '';
    let userPrompt = '';
    
    try {
      const promptData = await fs.readFile(promptPath, 'utf8');
      const parsed = JSON.parse(promptData);
      systemPrompt = parsed.systemPrompt;
      userPrompt = parsed.userPromptTemplate
        .replace(/{language}/g, normalizedLang)
        .replace(/{code}/g, code.trim());
    } catch (err) {
      console.error('[Complexity] Failed to load complexity.json prompt config:', err.message);
      systemPrompt = 'You are a DSA expert. Always respond with valid JSON only — no markdown, no prose outside the JSON object.';
      userPrompt = `Analyze the following ${normalizedLang} code and provide a complexity analysis:\n\n${code.trim()}`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2048,
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
      console.error('[Complexity] JSON parse error:', parseErr.message);
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

    const required = ['timeComplexity', 'spaceComplexity', 'timeReason', 'spaceReason'];
    const missing = required.filter(k => !analysis[k]);
    if (missing.length) {
      return res.status(500).json({
        error: 'Incomplete analysis returned. Please try again.'
      });
    }

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
};
