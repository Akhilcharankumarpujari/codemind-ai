/**
 * CodeMind AI — Code Execution Service
 * Safely executes Python and JavaScript code snippets.
 */

import { Router } from 'express';
import { spawn } from 'child_process';
import vm from 'vm';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export const executeRouter = Router();

/**
 * Cleans user python input by removing markdown formatting and docstrings.
 */
function cleanPythonCode(code) {
  let cleaned = code.replace(/```python/gi, '').replace(/```/g, '');
  cleaned = cleaned.replace(/\r\n/g, '\n');
  
  // Safely strip multi-line string literals acting as docstrings.
  cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');
  cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');
  
  return cleaned.trim();
}

const EXECUTION_TIMEOUT_MS = 5000; // 5 seconds max

executeRouter.post('/execute', async (req, res, next) => {
  try {
    const { code, language } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'No code provided to execute.' });
    }

    if (language === 'javascript' || language === 'js') {
      const output = await executeJavaScript(code);
      return res.json({ success: true, language: 'javascript', output, error: null });
    } else if (language === 'python' || language === 'py') {
      const output = await executePython(code);
      return res.json({ success: true, language: 'python', output, error: null });
    } else {
      return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
    }
  } catch (err) {
    // Return execution errors as normal response data, not 500 server errors
    return res.json({ success: false, language: req.body.language, output: '', error: err.message || String(err) });
  }
});

/**
 * Execute JS code in a V8 sandbox using the native Node.js 'vm' module.
 */
function executeJavaScript(code) {
  return new Promise((resolve, reject) => {
    let outputLogs = [];

    // Mock console to capture logs
    const sandboxConsole = {
      log: (...args) => outputLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      error: (...args) => outputLogs.push('[Error] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      warn: (...args) => outputLogs.push('[Warn] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      info: (...args) => outputLogs.push('[Info] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    };

    const context = vm.createContext({
      console: sandboxConsole,
      setTimeout, // Optional, allow async execution (with caution)
      Math, JSON, Date,
    });

    try {
      const script = new vm.Script(code);
      const result = script.runInContext(context, { timeout: EXECUTION_TIMEOUT_MS });
      
      // If code didn't console.log, but returned a value, display it
      if (outputLogs.length === 0 && result !== undefined) {
        if (typeof result === 'object') {
          outputLogs.push(JSON.stringify(result, null, 2));
        } else {
          outputLogs.push(String(result));
        }
      }

      resolve(outputLogs.join('\n') || 'Execution complete (no output).');
    } catch (err) {
      reject(`JavaScript Runtime Error:\n${err.message}`);
    }
  });
}

/**
 * Execute Python code via a child process and temporary file.
 */
function executePython(code) {
  return new Promise(async (resolve, reject) => {
    const pyCommand = process.platform === 'win32' ? 'python' : 'python3';
    
    const cleanedCode = cleanPythonCode(code);
    const tempFileName = `exec_${crypto.randomUUID()}.py`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    
    try {
      await fs.writeFile(tempFilePath, cleanedCode, 'utf8');
      
      const processInstance = spawn(pyCommand, [tempFilePath]);
      
      let output = '';
      let errorOutput = '';

      const timeoutHandle = setTimeout(() => {
        processInstance.kill('SIGKILL');
        errorOutput += '\n[Timeout] Execution took longer than 5 seconds.';
      }, EXECUTION_TIMEOUT_MS);

      processInstance.stdout.on('data', (data) => {
        output += data.toString();
      });

      processInstance.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      processInstance.on('close', async (exitCode) => {
        clearTimeout(timeoutHandle);
        try { await fs.unlink(tempFilePath); } catch (e) {}
        
        if (exitCode !== 0 || errorOutput) {
          reject(`Python Runtime Error:\n${errorOutput.trim() || 'Unknown exit code ' + exitCode}`);
        } else {
          resolve(output.trim() || 'Execution complete (no output).');
        }
      });

      processInstance.on('error', async (err) => {
        clearTimeout(timeoutHandle);
        try { await fs.unlink(tempFilePath); } catch (e) {}
        reject(`Failed to spawn Python process. Is Python installed?\n${err.message}`);
      });
      
    } catch (err) {
      reject(`Internal Error preparing execution: ${err.message}`);
    }
  });
}
