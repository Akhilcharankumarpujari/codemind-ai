import { spawn } from 'child_process';
import vm from 'vm';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const EXECUTION_TIMEOUT_MS = 5000;
const MODE = process.env.EXECUTION_MODE || 'local'; // 'local' or 'sandbox'

function cleanPythonCode(code) {
  let cleaned = code.replace(/```python/gi, '').replace(/```/g, '');
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');
  cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');
  return cleaned.trim();
}

function isCodeSafePython(code) {
  const blockedPatterns = [
    /\bimport\s+(?:os|sys|subprocess|shutil|socket|urllib|requests|importlib|pty|platform|codecs)\b/,
    /\bfrom\s+(?:os|sys|subprocess|shutil|socket|urllib|requests|importlib|pty|platform|codecs)\b/,
    /\b__import__\b/,
    /\bopen\s*\(/,
    /\beval\s*\(/,
    /\bexec\s*\(/,
    /\bos\.(?:system|popen|spawn|fork|exec|kill|write)\b/
  ];
  return !blockedPatterns.some(p => p.test(code));
}

function isCodeSafeJS(code) {
  const blockedPatterns = [
    /\brequire\s*\(/,
    /\bimport\s+.*from\b/,
    /\bprocess\b/,
    /\bchild_process\b/,
    /\bfs\b/,
    /\bglobal\b/,
    /\bconstructor\b/,
    /\beval\s*\(/,
    /\bFunction\s*\(/
  ];
  return !blockedPatterns.some(p => p.test(code));
}

async function executeLocalJS(code) {
  if (!isCodeSafeJS(code)) {
    throw new Error('Security Error: Code block violates safety guidelines (blocked keywords: process, require, fs, etc.).');
  }

  return new Promise((resolve, reject) => {
    let outputLogs = [];

    const sandboxConsole = {
      log: (...args) => outputLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      error: (...args) => outputLogs.push('[Error] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      warn: (...args) => outputLogs.push('[Warn] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      info: (...args) => outputLogs.push('[Info] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    };

    const context = vm.createContext({
      console: sandboxConsole,
      setTimeout,
      Math, JSON, Date,
    });

    try {
      const script = new vm.Script(code);
      const result = script.runInContext(context, { timeout: EXECUTION_TIMEOUT_MS });
      
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

async function executeLocalPython(code) {
  if (!isCodeSafePython(code)) {
    throw new Error('Security Error: Code block violates safety guidelines (blocked imports: os, sys, subprocess, open, etc.).');
  }

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

// Placeholder for external sandbox execution APIs (e.g. Judge0 or Piston)
async function executeSandbox(code, language) {
  // If user configures sandbox execution, call third-party APIs here.
  throw new Error('Sandbox mode is not configured. Please supply a valid Judge0 / Piston service URL and API keys in your environment configuration.');
}

export async function executeCode(code, language) {
  if (MODE === 'sandbox') {
    return executeSandbox(code, language);
  }

  const normalizedLang = (language || '').toLowerCase().trim();
  if (normalizedLang === 'javascript' || normalizedLang === 'js') {
    return executeLocalJS(code);
  } else if (normalizedLang === 'python' || normalizedLang === 'py') {
    return executeLocalPython(code);
  } else {
    throw new Error(`Unsupported execution language: ${language}`);
  }
}
