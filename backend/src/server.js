/**
 * CodeMind AI — Express Server (Entry Point)
 * Starts the HTTP server and mounts all route modules.
 */

import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 CodeMind AI backend running at http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Groq model  : ${process.env.GROQ_DEFAULT_MODEL || 'llama-3.3-70b-versatile'}\n`);
});
