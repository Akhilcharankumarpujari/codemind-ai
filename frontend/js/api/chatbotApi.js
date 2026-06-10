(function() {
  const BACKEND_URL = window.location.port === '3001'
    ? ''
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'))
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : '';

  window.ChatbotApi = {
    async listDocuments() {
      const resp = await fetch(`${BACKEND_URL}/api/documents`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to load documents');
      return resp.json();
    },
    async uploadFile(formData) {
      const resp = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      return resp.json();
    },
    async deleteDocument(source) {
      const resp = await fetch(`${BACKEND_URL}/api/documents/${encodeURIComponent(source)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      return resp.json();
    },
    async executeCode(code, language) {
      const resp = await fetch(`${BACKEND_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
        credentials: 'include'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Execution failed');
      }
      return resp.json();
    },
    async checkHealth() {
      const resp = await fetch(`${BACKEND_URL}/health`);
      if (!resp.ok) throw new Error('Unhealthy');
      return resp.json();
    },
    async sendChatMessageStream(chatBody, onMeta, onText, onDone, onError) {
      try {
        console.log('[ChatbotApi] Sending chat stream request...', chatBody);
        const resp = await fetch(`${BACKEND_URL}/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatBody),
          credentials: 'include'
        });
        console.log('[ChatbotApi] Received response headers. Status:', resp.status);
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          console.error('[ChatbotApi] Error response received:', err);
          onError(err.error || 'Error streaming response');
          return;
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[ChatbotApi] Reader finished reading stream.');
            break;
          }
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop();
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(trimmedLine.slice(6).trim());
              console.log('[ChatbotApi] SSE event received:', evt.type);
              if (evt.type === 'meta') {
                onMeta(evt);
              } else if (evt.type === 'text') {
                onText(evt.content);
              } else if (evt.type === 'done') {
                console.log('[ChatbotApi] SSE Stream completed (done event).');
                onDone();
                break outer;
              } else if (evt.type === 'error') {
                console.error('[ChatbotApi] SSE Stream error event:', evt.error);
                onError(evt.error);
                break outer;
              }
            } catch (e) {
              console.error('Error parsing SSE line:', e, 'Raw line:', line);
            }
          }
        }
      } catch (err) {
        console.error('[ChatbotApi] Network/fetch error caught:', err);
        onError(err.message || 'Cannot reach backend');
      }
    }
  };
})();
