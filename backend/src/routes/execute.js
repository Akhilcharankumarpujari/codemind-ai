/**
 * CodeMind AI — Code Execution Service
 * Safely executes Python and JavaScript code snippets.
 */

import { Router } from 'express';
import { spawn } from 'child_process';
import vm from 'vm';

export const executeRouter = Router();

const EXECUTION_TIMEOUT_MS = 5000; // 5 seconds max

executeRouter.post('/execute', async (req, res, next) => {
  try {
    const { code, language } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'No code provided to execute.' });
    }

    if (language === 'javascript' || language === 'js') {
      const output = await executeJavaScript(code);
      return res.json({ language: 'javascript', output });
    } else if (language === 'python' || language === 'py') {
      const output = await executePython(code);
      return res.json({ language: 'python', output });
    } else {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }
  } catch (err) {
    // Return execution errors as normal response data, not 500 server errors
    return res.json({ language: req.body.language, output: err.message || String(err), error: true });
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
 * Execute Python code via a child process.
 */
function executePython(code) {
  return new Promise((resolve, reject) => {
    // Check if on windows or linux
    const pyCommand = process.platform === 'win32' ? 'python' : 'python3';
    
    // Spawn python with -c to pass code string
    const processInstance = spawn(pyCommand, ['-c', code]);
    
    let output = '';
    let errorOutput = '';

    // Timeout control
    const timeoutHandle = setTimeout(() => {
      processInstance.kill('SIGKILL');
      reject('Python Execution Error:\nProcess timed out after 5 seconds.');
    }, EXECUTION_TIMEOUT_MS);

    processInstance.stdout.on('data', (data) => {
      output += data.toString();
    });

    processInstance.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    processInstance.on('close', (code) => {
      clearTimeout(timeoutHandle);
      if (code !== 0) {
        reject(`Python Runtime Error:\n${errorOutput.trim() || 'Unknown exit code ' + code}`);
      } else {
        resolve(output.trim() || 'Execution complete (no output).');
      }
    });

    processInstance.on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(`Failed to spawn Python process. Is Python installed?\n${err.message}`);
    });
  });
}
