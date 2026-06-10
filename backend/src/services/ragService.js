










const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';
const RAG_TIMEOUT_MS = 5000; 










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





export async function ragStatus() {
  try {
    const resp = await fetch(`${RAG_SERVICE_URL}/status`);
    return resp.ok ? resp.json() : { status: 'unreachable' };
  } catch {
    return { status: 'unreachable' };
  }
}





export async function listDocuments() {
  try {
    const resp = await fetch(`${RAG_SERVICE_URL}/documents`);
    return resp.ok ? resp.json() : { documents: [], total_documents: 0, total_chunks: 0 };
  } catch {
    return { documents: [], total_documents: 0, total_chunks: 0 };
  }
}






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

