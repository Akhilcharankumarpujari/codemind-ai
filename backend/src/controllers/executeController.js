import { executeCode } from '../services/executeService.js';

export const execute = async (req, res, next) => {
  try {
    const { code, language } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'No code provided to execute.' });
    }

    const normalizedLang = (language || '').toLowerCase().trim();
    const output = await executeCode(code, normalizedLang);
    return res.json({
      success: true,
      language: normalizedLang,
      output,
      error: null
    });
  } catch (err) {
    return res.json({
      success: false,
      language: req.body.language,
      output: '',
      error: err.message || String(err)
    });
  }
};
