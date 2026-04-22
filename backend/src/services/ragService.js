/**
 * CodeMind AI — RAG Service Client (Node.js)
 *
 * Calls the Python RAG microservice (FastAPI on port 8000) to:
 *   1. Retrieve relevant document chunks for a query
 *   2. Index new documents uploaded by the user
 *
 * If the RAG service is unreachable, functions fail gracefully
 * so the chat still works (just without RAG context).
 */

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';
const RAG_TIMEOUT_MS = 5000; // don't block chat for more than 5s

/**
 * Retrieve relevant context for a user query.
 *
 * @param {string} query   - The user's question
 * @param {number} [topK=4] - Number of chunks to retrieve
 * @returns {Promise<{context: string, results: Array}>}
 *          context: formatted string ready to inject into prompt
 *          results: raw chunk array with scores
 */
export async function retrieveContext(query, topK = 4) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS);

    const resp = await fetch(`${RAG_SERVICE_URL}/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`[RAG] Retrieve failed: HTTP ${resp.status}`);
      return { context: '', results: [] };
    }

    const data = await resp.json();
    return { context: data.context || '', results: data.results || [] };

  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[RAG] Retrieve timed out — continuing without context');
    } else {
      console.warn('[RAG] Service unreachable:', err.message);
    }
    return { context: '', results: [] };
  }
}

/**
 * Index a new document into the RAG vector store.
 *
 * @param {string} text   - Raw document text
 * @param {string} source - Friendly name (e.g. "my_notes")
 * @returns {Promise<{indexed_chunks: number, total_chunks: number}>}
 */
export async function indexDocument(text, source = 'user_upload') {
  const resp = await fetch(`${RAG_SERVICE_URL}/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `RAG index failed: HTTP ${resp.status}`);
  }

  return resp.json();
}

/**
 * Get RAG service status and store stats.
 * @returns {Promise<object>}
 */
export async function ragStatus() {
  try {
    const resp = await fetch(`${RAG_SERVICE_URL}/status`);
    return resp.ok ? resp.json() : { status: 'unreachable' };
  } catch {
    return { status: 'unreachable' };
  }
}

/**
 * List all indexed documents with chunk counts.
 * @returns {Promise<{documents: Array, total_documents: number, total_chunks: number}>}
 */
export async function listDocuments() {
  try {
    const resp = await fetch(`${RAG_SERVICE_URL}/documents`);
    return resp.ok ? resp.json() : { documents: [], total_documents: 0, total_chunks: 0 };
  } catch {
    return { documents: [], total_documents: 0, total_chunks: 0 };
  }
}

/**
 * Delete a document from the RAG store by its source name.
 * @param {string} source - The document source name (filename stem)
 * @returns {Promise<object>}
 */
export async function deleteDocument(source) {
  const resp = await fetch(`${RAG_SERVICE_URL}/documents/${encodeURIComponent(source)}`, {
    method: 'DELETE',
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `Delete failed: HTTP ${resp.status}`);
  }
  return resp.json();
}

/**
 * Upload a PDF or TXT file to the RAG service for indexing.
 * Forwards the raw file buffer as multipart/form-data.
 *
 * @param {Buffer} buffer       - Raw file bytes
 * @param {string} originalname - Original filename (e.g. "report.pdf")
 * @param {string} mimetype     - MIME type (e.g. "application/pdf")
 * @returns {Promise<object>}
 */
export async function uploadFileToRag(buffer, originalname, mimetype) {
  const blob = new Blob([buffer], { type: mimetype });
  const formData = new FormData();
  formData.append('file', blob, originalname);

  const resp = await fetch(`${RAG_SERVICE_URL}/index/file`, {
    method: 'POST',
    body: formData,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: HTTP ${resp.status}`);
  }
  return resp.json();
}

